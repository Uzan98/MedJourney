"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionsBankService, Question } from '@/services/questions-bank.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline, Subject } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Edit, 
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Tag,
  CalendarDays,
  BookOpen,
  BookText,
  BarChart4,
  CheckCircle2,
  XCircle
} from 'lucide-react';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function QuestionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = params;
  
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [answerOptions, setAnswerOptions] = useState<any[]>([]);
  
  // Carregar dados da questão
  useEffect(() => {
    const loadQuestionData = async () => {
      setLoading(true);
      try {
        // Buscar questão do banco de dados
        const questionData = await QuestionsBankService.getQuestionById(parseInt(id));
        
        if (!questionData) {
          toast.error('Questão não encontrada');
          router.push('/banco-questoes');
          return;
        }
        
        setQuestion(questionData);
        
        // Buscar detalhes da disciplina
        if (questionData.discipline_id) {
          try {
            const disciplinesData = await DisciplinesRestService.getDisciplines(true);
            const disciplineData = disciplinesData?.find(d => d.id === questionData.discipline_id) || null;
            setDiscipline(disciplineData);
            
            // Buscar detalhes do assunto se existir
            if (questionData.subject_id && disciplineData) {
              const subjectsData = await DisciplinesRestService.getSubjects(disciplineData.id);
              const subjectData = subjectsData?.find(s => s.id === questionData.subject_id) || null;
              setSubject(subjectData);
            }
          } catch (error) {
            console.error('Erro ao carregar disciplina ou assunto:', error);
          }
        }
        
        // Para questões de múltipla escolha, carregar opções de resposta
        if (questionData.question_type === 'multiple_choice') {
          const options = await QuestionsBankService.getAnswerOptions(parseInt(id));
          setAnswerOptions(options);
        }
      } catch (error) {
        console.error('Erro ao carregar questão:', error);
        toast.error('Erro ao carregar dados da questão');
        router.push('/banco-questoes');
      } finally {
        setLoading(false);
      }
    };
    
    loadQuestionData();
  }, [id, router]);
  
  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (error) {
      return 'Data não disponível';
    }
  };
  
  // Obter rótulo para tipo de questão
  const getQuestionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      multiple_choice: 'Múltipla Escolha',
      true_false: 'Verdadeiro/Falso',
      essay: 'Dissertativa'
    };
    return types[type] || type;
  };
  
  // Obter rótulo para nível de dificuldade
  const getDifficultyLabel = (difficulty: string) => {
    const levels: Record<string, { label: string, color: string }> = {
      baixa: { label: 'Baixa', color: 'bg-green-100 text-green-800' },
      média: { label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
      alta: { label: 'Alta', color: 'bg-red-100 text-red-800' }
    };
    return levels[difficulty] || { label: difficulty, color: 'bg-gray-100 text-gray-800' };
  };
  
  // Excluir questão
  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    setDeleting(true);
    try {
      // Chamar o serviço para excluir a questão
      const success = await QuestionsBankService.deleteQuestion(parseInt(id));
      
      if (success) {
        toast.success('Questão excluída com sucesso');
        router.push('/banco-questoes');
      } else {
        toast.error('Erro ao excluir questão');
      }
    } catch (error) {
      console.error('Erro ao excluir questão:', error);
      toast.error('Ocorreu um erro ao excluir a questão');
    } finally {
      setDeleting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-md">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-500 border-t-transparent mb-3"></div>
          <p className="text-gray-600 font-medium">Carregando questão...</p>
        </div>
      </div>
    );
  }
  
  if (!question) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-col items-center py-8">
            <AlertTriangle className="text-amber-500 w-16 h-16 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Questão não encontrada</h2>
            <p className="text-gray-600 mb-6">A questão que você está procurando não existe ou foi removida.</p>
            <Link
              href="/banco-questoes"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para o Banco de Questões
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  const difficultyInfo = getDifficultyLabel(question.difficulty || 'média');
  
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
      
      {/* Cabeçalho */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-white text-xl font-bold">Detalhes da Questão</h1>
            <div className="flex space-x-3">
              <Link
                href={`/banco-questoes/questao/${id}/editar`}
                className="px-3 py-1.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 inline-flex items-center"
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Editar
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 inline-flex items-center"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1.5"></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Excluir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Conteúdo da questão */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {/* Card principal */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            <div className="p-6">
              <div className="mb-6">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficultyInfo.color}`}>
                  {difficultyInfo.label}
                </span>
                <span className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {getQuestionTypeLabel(question.question_type || 'multiple_choice')}
                </span>
              </div>
              
              <div className="prose max-w-none">
                <p className="text-lg leading-relaxed mb-6">{question.content}</p>
              </div>
              
              {/* Opções de resposta para múltipla escolha */}
              {question.question_type === 'multiple_choice' && answerOptions.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Alternativas</h2>
                  <div className="space-y-3">
                    {answerOptions.map((option) => (
                      <div 
                        key={option.id} 
                        className={`p-4 border rounded-xl flex items-start ${
                          option.is_correct 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className={`mt-0.5 mr-3 p-1 rounded-full ${
                          option.is_correct 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {option.is_correct ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className={`${option.is_correct ? 'font-medium text-green-800' : 'text-gray-700'}`}>
                            {option.text}
                          </p>
                          {option.is_correct && question.explanation && (
                            <p className="mt-2 text-sm text-green-700 italic">
                              {question.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Resposta para verdadeiro/falso */}
              {question.question_type === 'true_false' && (
                <div className="mt-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Resposta Correta</h2>
                  <div className={`p-4 border rounded-xl ${
                    question.correct_answer === 'true' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-red-500 bg-red-50'
                  }`}>
                    <div className="flex items-center">
                      {question.correct_answer === 'true' ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                          <span className="font-medium text-green-800">Verdadeiro</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-600 mr-2" />
                          <span className="font-medium text-red-800">Falso</span>
                        </>
                      )}
                    </div>
                    {question.explanation && (
                      <p className="mt-3 text-sm italic">
                        {question.explanation}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Resposta para dissertativa */}
              {question.question_type === 'essay' && question.correct_answer && (
                <div className="mt-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Resposta Esperada</h2>
                  <div className="p-4 border border-blue-200 bg-blue-50 rounded-xl">
                    <p className="text-blue-800">{question.correct_answer}</p>
                  </div>
                </div>
              )}
              
              {/* Explicação quando não estiver junto com as alternativas */}
              {question.explanation && (question.question_type !== 'multiple_choice' && question.question_type !== 'true_false') && (
                <div className="mt-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Explicação</h2>
                  <div className="p-4 border border-gray-200 bg-gray-50 rounded-xl">
                    <p className="text-gray-700">{question.explanation}</p>
                  </div>
                </div>
              )}
              
              {/* Tags */}
              {question.tags && question.tags.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {question.tags.map((tag, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Sidebar com metadados */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Informações</h2>
              
              <ul className="space-y-4">
                {discipline && (
                  <li className="flex items-start">
                    <div className="bg-blue-100 p-2 rounded-lg mr-3">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Disciplina</p>
                      <p className="font-medium">{discipline.name}</p>
                    </div>
                  </li>
                )}
                
                {subject && (
                  <li className="flex items-start">
                    <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                      <BookText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Assunto</p>
                      <p className="font-medium">{subject.title || subject.name}</p>
                    </div>
                  </li>
                )}
                
                <li className="flex items-start">
                  <div className="bg-amber-100 p-2 rounded-lg mr-3">
                    <BarChart4 className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dificuldade</p>
                    <p className="font-medium">{difficultyInfo.label}</p>
                  </div>
                </li>
                
                {question.created_at && (
                  <li className="flex items-start">
                    <div className="bg-green-100 p-2 rounded-lg mr-3">
                      <CalendarDays className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Criado em</p>
                      <p className="font-medium">{formatDate(question.created_at)}</p>
                    </div>
                  </li>
                )}
                
                {question.tags && question.tags.length > 0 && (
                  <li className="flex items-start">
                    <div className="bg-purple-100 p-2 rounded-lg mr-3">
                      <Tag className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Número de tags</p>
                      <p className="font-medium">{question.tags.length} tags</p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 