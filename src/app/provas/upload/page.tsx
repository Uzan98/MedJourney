'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaCheck, FaFileExport, FaListOl, FaEye, FaEdit } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { ExamsService } from '@/services/exams.service';
import { QuestionsBankService } from '@/services/questions-bank.service';

interface ExamType {
  id: number;
  name: string;
  description: string;
}

interface ParsedQuestion {
  id: string;
  text: string;
  alternatives: string[];
  correctAnswer: number;
  explanation?: string;
}

const Loading = ({ message = "Carregando..." }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh]">
    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-gray-600 font-medium">{message}</p>
  </div>
);

export default function UploadProvaPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examTypeId, setExamTypeId] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState(60);
  const [isPublic, setIsPublic] = useState(false);
  const [questionsText, setQuestionsText] = useState('');
  const [answerKey, setAnswerKey] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadExamTypes();
  }, [user, router]);
  
  const loadExamTypes = async () => {
    try {
      setLoadingTypes(true);
      const types = await ExamsService.getExamTypes();
      setExamTypes(types);
    } catch (error) {
      console.error('Erro ao carregar tipos de exames:', error);
      toast.error('Erro ao carregar categorias de provas');
    } finally {
      setLoadingTypes(false);
    }
  };
  
  // Padrões para identificar questões
  const QUESTION_PATTERNS = [
    /^(\d+)\)\s*(.+?)$/m,           // 1) Texto da questão
    /^(\d+)\.\s*(.+?)$/m,          // 1. Texto da questão
    /^(\d+)\s*[-–—]\s*(.+?)$/m,    // 1 - Texto da questão
    /^(\d+)\s+(.+?)$/m,            // 1 Texto da questão
    /^Questão\s+(\d+)[\)\.]?\s*(.+?)$/mi, // Questão 1) ou Questão 1.
    /^Q\s*(\d+)[\)\.]?\s*(.+?)$/mi,       // Q1) ou Q1.
  ];

  // Padrões para identificar alternativas
  const OPTION_PATTERNS = [
    /^([A-E])\)\s*(.+?)$/m,        // A) Alternativa
    /^([A-E])\.\s*(.+?)$/m,       // A. Alternativa
    /^([A-E])\s*[-–—]\s*(.+?)$/m, // A - Alternativa
    /^([A-E])\s+(.+?)$/m,         // A Alternativa
    /^\(([A-E])\)\s*(.+?)$/m,     // (A) Alternativa
  ];

  // Padrões para identificar gabarito
  const ANSWER_KEY_PATTERNS = [
    /(\d+)\)\s*([A-E])\s*[-–—]?/g,  // 1) A - ou 1) A
    /(\d+)\.\s*([A-E])\s*[-–—]?/g,  // 1. A - ou 1. A
    /(\d+)\s*[-–—]\s*([A-E])\s*[-–—]?/g, // 1 - A -
    /(\d+)\s+([A-E])\s*[-–—]?/g,    // 1 A -
  ];

  const normalizeText = (text: string): string => {
    return text
      // Normalizar quebras de linha
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remover espaços extras
      .replace(/[ \t]+/g, ' ')
      // Remover linhas vazias excessivas
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Trim geral
      .trim();
  };

  const parseAnswerKey = (answerKeyText: string): { [key: number]: number } => {
    const answers: { [key: number]: number } = {};
    const normalizedText = normalizeText(answerKeyText);
    
    for (const pattern of ANSWER_KEY_PATTERNS) {
      const matches = [...normalizedText.matchAll(pattern)];
      if (matches.length > 0) {
        matches.forEach(match => {
          const questionNum = parseInt(match[1]);
          const letter = match[2].toUpperCase();
          const answerIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
          if (answerIndex >= 0 && answerIndex <= 4) {
            answers[questionNum] = answerIndex;
          }
        });
        break; // Use o primeiro padrão que encontrar matches
      }
    }
    
    return answers;
  };

  const extractQuestions = (text: string): Array<{questionNum: number, content: string}> => {
    const normalizedText = normalizeText(text);
    const questions: Array<{questionNum: number, content: string}> = [];
    
    for (const pattern of QUESTION_PATTERNS) {
      const lines = normalizedText.split('\n');
      let currentQuestion: {questionNum: number, content: string} | null = null;
      
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          // Se já temos uma questão em andamento, salve-a
          if (currentQuestion) {
            questions.push(currentQuestion);
          }
          // Inicie uma nova questão
          currentQuestion = {
            questionNum: parseInt(match[1]),
            content: match[2] || ''
          };
        } else if (currentQuestion && line.trim()) {
          // Continue adicionando conteúdo à questão atual
          currentQuestion.content += '\n' + line;
        }
      }
      
      // Adicione a última questão
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      
      if (questions.length > 0) break; // Use o primeiro padrão que encontrar questões
    }
    
    return questions;
  };

  const extractAlternatives = (questionContent: string): string[] => {
    const alternatives: string[] = [];
    const normalizedContent = normalizeText(questionContent);
    
    for (const pattern of OPTION_PATTERNS) {
      const tempAlternatives: {[key: string]: string} = {};
      const lines = normalizedContent.split('\n');
      let currentOption: {letter: string, content: string} | null = null;
      
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) {
          // Se já temos uma alternativa em andamento, salve-a
          if (currentOption) {
            tempAlternatives[currentOption.letter] = currentOption.content.trim();
          }
          // Inicie uma nova alternativa
          currentOption = {
            letter: match[1].toUpperCase(),
            content: match[2] || ''
          };
        } else if (currentOption && line.trim() && !line.match(/^[A-E][\)\.]?\s/)) {
          // Continue adicionando conteúdo à alternativa atual
          currentOption.content += ' ' + line.trim();
        }
      }
      
      // Adicione a última alternativa
      if (currentOption) {
        tempAlternatives[currentOption.letter] = currentOption.content.trim();
      }
      
      // Converta para array ordenado
      const letters = ['A', 'B', 'C', 'D', 'E'];
      for (const letter of letters) {
        if (tempAlternatives[letter]) {
          alternatives.push(tempAlternatives[letter]);
        }
      }
      
      if (alternatives.length >= 4) break; // Use o primeiro padrão que encontrar alternativas suficientes
    }
    
    return alternatives;
  };

  const parseQuestions = () => {
    if (!questionsText.trim() || !answerKey.trim()) {
      toast.error('Preencha o texto das questões e o gabarito');
      return;
    }

    try {
      // Parse do gabarito
      const answers = parseAnswerKey(answerKey);
      
      if (Object.keys(answers).length === 0) {
        toast.error('Nenhuma resposta foi encontrada no gabarito. Verifique o formato.');
        return;
      }

      // Extrair questões
      const extractedQuestions = extractQuestions(questionsText);
      
      if (extractedQuestions.length === 0) {
        toast.error('Nenhuma questão foi encontrada. Verifique o formato do texto.');
        return;
      }

      const parsed: ParsedQuestion[] = [];

      extractedQuestions.forEach(({questionNum, content}) => {
        // Separar enunciado das alternativas
        const alternatives = extractAlternatives(content);
        
        if (alternatives.length < 4) {
          console.warn(`Questão ${questionNum}: apenas ${alternatives.length} alternativas encontradas`);
          return;
        }
        
        // Extrair o enunciado (tudo antes das alternativas)
        let questionText = content;
        for (const pattern of OPTION_PATTERNS) {
          const match = content.search(pattern);
          if (match !== -1) {
            questionText = content.substring(0, match).trim();
            break;
          }
        }
        
        if (questionText && alternatives.length >= 4) {
          parsed.push({
            id: `q${questionNum}`,
            text: normalizeText(questionText),
            alternatives: alternatives.slice(0, 5), // Máximo 5 alternativas
            correctAnswer: answers[questionNum] ?? 0
          });
        }
      });

      if (parsed.length === 0) {
        toast.error('Nenhuma questão válida foi processada. Verifique o formato.');
        return;
      }

      setParsedQuestions(parsed);
      setShowPreview(true);
      toast.success(`${parsed.length} questões parseadas com sucesso!`);

    } catch (error) {
      console.error('Erro ao parsear questões:', error);
      toast.error('Erro ao processar as questões. Verifique o formato.');
    }
  };
  
  const editQuestion = (index: number, field: keyof ParsedQuestion, value: any) => {
    setParsedQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const removeQuestion = (index: number) => {
    setParsedQuestions(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Você precisa estar logado para criar uma prova');
      return;
    }

    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    
    if (!examTypeId) {
      toast.error('Selecione uma categoria');
      return;
    }
    
    if (parsedQuestions.length === 0) {
      toast.error('Parse pelo menos uma questão');
      return;
    }
    
    try {
      setLoading(true);
      
      // Criar a prova
      const newExam = {
        title: title.trim(),
        description: description.trim(),
        time_limit: timeLimit,
        is_public: isPublic,
        exam_type_id: examTypeId,
        user_id: user.id
      };
      
      const createdExam = await ExamsService.addExam(newExam);
      
      // Criar questões no banco e adicionar à prova
      const questionIds: number[] = [];
      
      for (const question of parsedQuestions) {
        const questionId = await QuestionsBankService.addQuestion({
          content: question.text,
          question_type: 'multiple_choice',
          correct_answer: question.correctAnswer.toString(),
          difficulty: 'média',
          is_public: false
        }, question.alternatives.map((alt, index) => ({
          text: alt,
          is_correct: index === question.correctAnswer
        })));
        
        if (questionId) {
          questionIds.push(questionId);
        }
      }

      // Adicionar todas as questões à prova
        if (questionIds.length > 0) {
          if (!createdExam) {
            throw new Error('Falha ao criar a prova');
          }
          
          await ExamsService.addQuestionsToExam(createdExam, questionIds);
        }
        
        toast.success(`Prova criada com ${parsedQuestions.length} questões!`);
        
        // Redirecionar para a página da prova criada
        router.push(`/provas/${createdExam}`);
      
    } catch (error) {
      console.error('Erro ao criar prova:', error);
      toast.error('Erro ao criar prova. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) {
    return <Loading message="Verificando autenticação..." />;
  }
  
  if (loadingTypes) {
    return <Loading message="Carregando categorias..." />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/provas" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
        >
          <FaArrowLeft className="mr-2" /> Voltar para Provas
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Criar Nova Prova
        </h1>
        <p className="text-gray-600">
          Cole o texto das questões e o gabarito para criar automaticamente um novo simulado.
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Informações da Prova
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Título da Prova *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: ENEM 2023 - Ciências da Natureza"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descrição opcional da prova..."
              />
            </div>
            
            <div>
              <label htmlFor="examType" className="block text-sm font-medium text-gray-700 mb-2">
                Categoria da Prova *
              </label>
              <select
                id="examType"
                value={examTypeId || ''}
                onChange={(e) => setExamTypeId(Number(e.target.value) || null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Selecione uma categoria</option>
                {examTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700 mb-2">
                Tempo Limite (minutos)
              </label>
              <input
                type="number"
                id="timeLimit"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                min="1"
                max="480"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Tornar esta prova pública (outros usuários poderão acessar)
                </span>
              </label>
            </div>
          </div>
        </div>
        
        {/* Parser de Questões */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            <FaFileExport className="inline mr-2" />
            Texto das Questões
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="questionsText" className="block text-sm font-medium text-gray-700 mb-2">
                Cole o texto completo das questões *
              </label>
              <textarea
                id="questionsText"
                value={questionsText}
                onChange={(e) => setQuestionsText(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder={`Exemplo de formato:

1. Qual é a capital do Brasil?
A) São Paulo
B) Rio de Janeiro
C) Brasília
D) Belo Horizonte
E) Salvador

2. Quanto é 2 + 2?
A) 3
B) 4
C) 5
D) 6
E) 7`}
                required
              />
            </div>
            
            <div>
              <label htmlFor="answerKey" className="block text-sm font-medium text-gray-700 mb-2">
                Gabarito *
              </label>
              <textarea
                id="answerKey"
                value={answerKey}
                onChange={(e) => setAnswerKey(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder={`Exemplo de formato:

1-C
2-B
3-A
4-D
5-E`}
                required
              />
            </div>
            
            <div className="flex justify-center">
              <button
                type="button"
                onClick={parseQuestions}
                disabled={!questionsText.trim() || !answerKey.trim()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                <FaListOl className="mr-2" />
                Processar Questões
              </button>
            </div>
          </div>
        </div>
        
        {/* Preview das Questões Parseadas */}
        {parsedQuestions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                <FaEye className="inline mr-2" />
                Questões Processadas ({parsedQuestions.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showPreview ? 'Ocultar' : 'Mostrar'} Preview
              </button>
            </div>
            
            {showPreview && (
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {parsedQuestions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">
                        Questão {index + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-red-500 hover:text-red-700 transition-colors text-sm"
                      >
                        Remover
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Enunciado:
                        </label>
                        <textarea
                          value={question.text}
                          onChange={(e) => editQuestion(index, 'text', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                          rows={2}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Alternativas:
                        </label>
                        {question.alternatives.map((alt, altIndex) => (
                          <div key={altIndex} className="flex items-center space-x-2 mb-1">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              altIndex === question.correctAnswer 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              {String.fromCharCode(65 + altIndex)}
                            </span>
                            <input
                              type="text"
                              value={alt}
                              onChange={(e) => {
                                const newAlts = [...question.alternatives];
                                newAlts[altIndex] = e.target.value;
                                editQuestion(index, 'alternatives', newAlts);
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => editQuestion(index, 'correctAnswer', altIndex)}
                              className={`px-2 py-1 rounded text-xs ${
                                altIndex === question.correctAnswer
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Correta
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Botões de Ação */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/provas"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || parsedQuestions.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Criando...
              </>
            ) : (
              <>
                <FaCheck className="mr-2" />
                Criar Prova ({parsedQuestions.length} questões)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}