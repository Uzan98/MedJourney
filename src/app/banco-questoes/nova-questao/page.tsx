"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { QuestionsBankService, Question, AnswerOption } from '@/services/questions-bank.service';
import { Discipline, Subject } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Save, 
  Book, 
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function NovaQuestaoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Estados do formulário
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');
  const [disciplineId, setDisciplineId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<'baixa' | 'média' | 'alta'>('média');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'essay'>('multiple_choice');
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  // Estados para opções de resposta (para questões de múltipla escolha)
  const [options, setOptions] = useState<{ text: string; is_correct: boolean }[]>([
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false }
  ]);
  
  // Estado para resposta V/F (para questões de verdadeiro/falso)
  const [isTrueSelected, setIsTrueSelected] = useState<boolean | null>(null);
  
  // Carregar disciplinas na inicialização
  useEffect(() => {
    const loadDisciplines = async () => {
      try {
        const disciplinesData = await DisciplinesRestService.getDisciplines(true);
        setDisciplines(disciplinesData || []);
      } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
        toast.error('Erro ao carregar disciplinas');
      }
    };
    
    loadDisciplines();
  }, []);
  
  // Carregar assuntos quando a disciplina mudar
  useEffect(() => {
    if (disciplineId) {
      loadSubjects(disciplineId);
    } else {
      setSubjects([]);
      setSubjectId(null);
    }
  }, [disciplineId]);
  
  // Carregar assuntos de uma disciplina
  const loadSubjects = async (disciplineId: number) => {
    try {
      const subjectsData = await DisciplinesRestService.getSubjects(disciplineId);
      setSubjects(subjectsData || []);
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error);
      toast.error('Erro ao carregar assuntos');
    }
  };
  
  // Adicionar tag
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };
  
  // Remover tag
  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };
  
  // Adicionar tecla Enter para adicionar tag
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };
  
  // Atualizar texto de uma opção de resposta
  const handleOptionTextChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index].text = text;
    setOptions(newOptions);
  };
  
  // Atualizar estado de correção de uma opção de resposta
  const handleOptionCorrectChange = (index: number) => {
    const newOptions = [...options];
    
    // Se for múltipla escolha, pode ter várias corretas
    if (questionType === 'multiple_choice') {
      newOptions[index].is_correct = !newOptions[index].is_correct;
    } 
    // Se for verdadeiro/falso, só pode ter uma correta
    else {
      newOptions.forEach((option, i) => {
        option.is_correct = i === index;
      });
    }
    
    setOptions(newOptions);
  };
  
  // Adicionar nova opção de resposta
  const addOption = () => {
    setOptions([...options, { text: '', is_correct: false }]);
  };
  
  // Remover opção de resposta
  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    } else {
      toast.error('Uma questão deve ter pelo menos 2 opções');
    }
  };
  
  // Validar o formulário
  const validateForm = () => {
    if (!content.trim()) {
      toast.error('O conteúdo da questão é obrigatório');
      return false;
    }
    
    if (!disciplineId) {
      toast.error('Selecione uma disciplina');
      return false;
    }
    
    if (questionType === 'multiple_choice') {
      // Verificar se todas as opções têm texto
      const emptyOptions = options.filter(option => !option.text.trim());
      if (emptyOptions.length > 0) {
        toast.error('Todas as opções devem ter um texto');
        return false;
      }
      
      // Verificar se pelo menos uma opção está marcada como correta
      const correctOptions = options.filter(option => option.is_correct);
      if (correctOptions.length === 0) {
        toast.error('Pelo menos uma opção deve ser marcada como correta');
        return false;
      }
    }
    
    if (questionType === 'true_false' && isTrueSelected === null) {
      toast.error('Selecione se a afirmação é verdadeira ou falsa');
      return false;
    }
    
    if (questionType === 'essay' && !correctAnswer.trim()) {
      toast.error('Forneça uma resposta esperada para a questão dissertativa');
      return false;
    }
    
    return true;
  };
  
  // Salvar questão
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Montar objeto da questão
      const question: Question = {
        content,
        explanation,
        discipline_id: disciplineId || undefined,
        subject_id: subjectId || undefined,
        difficulty,
        question_type: questionType,
        tags,
      };
      
      // Definir a resposta correta com base no tipo de questão
      if (questionType === 'true_false') {
        question.correct_answer = isTrueSelected ? 'true' : 'false';
      } else if (questionType === 'essay') {
        question.correct_answer = correctAnswer;
      }
      
      // Para questões de múltipla escolha, as respostas vão no array de opções
      const answerOptions = questionType === 'multiple_choice' 
        ? options.map(option => ({
            text: option.text,
            is_correct: option.is_correct,
            question_id: 0, // será preenchido pelo serviço
          }))
        : [];
      
      // Usar o serviço real para adicionar a questão
      const questionId = await QuestionsBankService.addQuestion(question, answerOptions);
      
      if (questionId) {
        toast.success('Questão adicionada com sucesso');
        console.log('Questão adicionada com ID:', questionId);
        router.push('/banco-questoes');
      } else {
        toast.error('Erro ao adicionar questão');
      }
    } catch (error) {
      console.error('Erro ao adicionar questão:', error);
      toast.error('Ocorreu um erro ao adicionar a questão');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href="/banco-questoes"
          className="text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar para o Banco de Questões
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <FileText className="h-6 w-6 mr-2 text-blue-600" />
          Nova Questão
        </h1>
        
        <form onSubmit={handleSalvar}>
          <div className="space-y-6">
            {/* Tipo de questão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Questão <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div 
                  onClick={() => setQuestionType('multiple_choice')}
                  className={`p-4 border rounded-lg cursor-pointer flex items-center ${
                    questionType === 'multiple_choice'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="question_type"
                    checked={questionType === 'multiple_choice'}
                    onChange={() => setQuestionType('multiple_choice')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">Múltipla Escolha</span>
                </div>
                
                <div 
                  onClick={() => setQuestionType('true_false')}
                  className={`p-4 border rounded-lg cursor-pointer flex items-center ${
                    questionType === 'true_false'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="question_type"
                    checked={questionType === 'true_false'}
                    onChange={() => setQuestionType('true_false')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">Verdadeiro/Falso</span>
                </div>
                
                <div 
                  onClick={() => setQuestionType('essay')}
                  className={`p-4 border rounded-lg cursor-pointer flex items-center ${
                    questionType === 'essay'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="question_type"
                    checked={questionType === 'essay'}
                    onChange={() => setQuestionType('essay')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">Dissertativa</span>
                </div>
              </div>
            </div>
            
            {/* Conteúdo da questão */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Conteúdo da Questão <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder={
                  questionType === 'multiple_choice'
                    ? 'Ex: Qual é o tratamento de primeira linha para hipertensão em pacientes com diabetes?'
                    : questionType === 'true_false'
                    ? 'Ex: Pacientes com fibrilação atrial devem sempre receber anticoagulação.'
                    : 'Ex: Descreva os mecanismos fisiopatológicos da insuficiência cardíaca com fração de ejeção preservada.'
                }
                required
              />
            </div>
            
            {/* Opções de resposta para Múltipla Escolha */}
            {questionType === 'multiple_choice' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Opções de Resposta <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar opção
                  </button>
                </div>
                
                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div 
                        onClick={() => handleOptionCorrectChange(index)}
                        className={`p-2 border rounded-md cursor-pointer ${
                          option.is_correct
                            ? 'bg-green-100 border-green-300 text-green-800'
                            : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <CheckCircle className={`h-5 w-5 ${option.is_correct ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => handleOptionTextChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Opção ${index + 1}`}
                      />
                      
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  Marque as opções corretas clicando no ícone à esquerda de cada opção.
                </p>
              </div>
            )}
            
            {/* Resposta para Verdadeiro/Falso */}
            {questionType === 'true_false' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  A afirmação é: <span className="text-red-500">*</span>
                </label>
                
                <div className="flex space-x-4">
                  <div 
                    onClick={() => setIsTrueSelected(true)}
                    className={`px-4 py-3 border rounded-lg cursor-pointer flex items-center ${
                      isTrueSelected === true
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="is_true"
                      checked={isTrueSelected === true}
                      onChange={() => setIsTrueSelected(true)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="ml-2 font-medium">Verdadeira</span>
                  </div>
                  
                  <div 
                    onClick={() => setIsTrueSelected(false)}
                    className={`px-4 py-3 border rounded-lg cursor-pointer flex items-center ${
                      isTrueSelected === false
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="is_true"
                      checked={isTrueSelected === false}
                      onChange={() => setIsTrueSelected(false)}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <span className="ml-2 font-medium">Falsa</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Resposta para Dissertativa */}
            {questionType === 'essay' && (
              <div>
                <label htmlFor="correct_answer" className="block text-sm font-medium text-gray-700 mb-1">
                  Resposta Esperada <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="correct_answer"
                  rows={3}
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descreva os pontos principais que uma boa resposta deve conter"
                  required
                />
              </div>
            )}
            
            {/* Explicação */}
            <div>
              <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-1">
                Explicação
              </label>
              <textarea
                id="explanation"
                rows={3}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Forneça uma explicação detalhada sobre a resposta correta"
              />
            </div>
            
            {/* Disciplina e Assunto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 mb-1">
                  Disciplina <span className="text-red-500">*</span>
                </label>
                <select
                  id="discipline"
                  value={disciplineId?.toString() || ''}
                  onChange={(e) => setDisciplineId(e.target.value ? parseInt(e.target.value) : null)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecione uma disciplina</option>
                  {disciplines.map(discipline => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Assunto
                </label>
                <select
                  id="subject"
                  value={subjectId?.toString() || ''}
                  onChange={(e) => setSubjectId(e.target.value ? parseInt(e.target.value) : null)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  disabled={!disciplineId || subjects.length === 0}
                >
                  <option value="">Selecione um assunto</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.title || subject.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Dificuldade */}
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                Dificuldade <span className="text-red-500">*</span>
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'baixa' | 'média' | 'alta')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="baixa">Baixa</option>
                <option value="média">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            
            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite uma tag e pressione Enter"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                >
                  Adicionar
                </button>
              </div>
              
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <div 
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="ml-1.5 text-blue-600 hover:text-blue-800"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Botões de ação */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
            <Link
              href="/banco-questoes"
              className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Questão
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 