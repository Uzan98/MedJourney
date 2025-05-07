"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionsBankService, Question, AnswerOption } from '@/services/questions-bank.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline, Subject } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Edit, 
  Trash2, 
  FileText, 
  Book, 
  AlertCircle,
  Tag,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  HelpCircle,
  Bookmark,
  ArrowLeft
} from 'lucide-react';

export default function QuestionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = params;
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadQuestionData();
  }, [id]);
  
  const loadQuestionData = async () => {
    setLoading(true);
    try {
      // Em uma aplicação real, usaríamos os serviços para carregar os dados
      // const questionData = await QuestionsBankService.getQuestionById(parseInt(id));
      // let optionsData: AnswerOption[] = [];
      // if (questionData && (questionData.question_type === 'multiple_choice' || questionData.question_type === 'true_false')) {
      //   optionsData = await QuestionsBankService.getAnswerOptions(questionData.id!);
      // }
      
      // Para desenvolvimento, usamos dados de exemplo
      const mockQuestions = QuestionsBankService.getMockQuestions();
      const questionData = mockQuestions.find(q => q.id === parseInt(id)) || null;
      
      if (!questionData) {
        toast.error('Questão não encontrada');
        router.push('/banco-questoes');
        return;
      }
      
      setQuestion(questionData);
      
      // Opções de resposta simuladas para demonstração
      if (questionData.question_type === 'multiple_choice') {
        setAnswerOptions([
          { id: 1, question_id: parseInt(id), text: 'IECA ou BRA', is_correct: true },
          { id: 2, question_id: parseInt(id), text: 'Beta-bloqueadores', is_correct: false },
          { id: 3, question_id: parseInt(id), text: 'Bloqueadores de canais de cálcio', is_correct: false },
          { id: 4, question_id: parseInt(id), text: 'Diuréticos tiazídicos', is_correct: false },
        ]);
      } else if (questionData.question_type === 'true_false') {
        // Para verdadeiro/falso, a propriedade correct_answer já contém a resposta
      }
      
      // Carregar disciplina se o ID estiver disponível
      if (questionData.discipline_id) {
        try {
          const disciplinesData = await DisciplinesRestService.getDisciplines();
          const foundDiscipline = disciplinesData?.find(d => d.id === questionData.discipline_id);
          setDiscipline(foundDiscipline || null);
          
          // Carregar assunto se o ID estiver disponível
          if (foundDiscipline && questionData.subject_id) {
            const subjectsData = await DisciplinesRestService.getSubjects(foundDiscipline.id);
            const foundSubject = subjectsData?.find(s => s.id === questionData.subject_id);
            setSubject(foundSubject || null);
          }
        } catch (error) {
          console.error('Erro ao carregar disciplina/assunto:', error);
        }
      }
      
      toast.success('Questão carregada com sucesso');
    } catch (error) {
      console.error('Erro ao carregar questão:', error);
      toast.error('Erro ao carregar dados da questão');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteQuestion = async () => {
    if (window.confirm('Tem certeza que deseja excluir esta questão?')) {
      try {
        // Em uma aplicação real, usaríamos o serviço
        // const success = await QuestionsBankService.deleteQuestion(parseInt(id));
        
        // Para desenvolvimento, simulamos o sucesso
        const success = true;
        
        if (success) {
          toast.success('Questão excluída com sucesso');
          router.push('/banco-questoes');
        } else {
          toast.error('Não foi possível excluir a questão');
        }
      } catch (error) {
        console.error('Erro ao excluir questão:', error);
        toast.error('Ocorreu um erro ao excluir a questão');
      }
    }
  };
  
  // Função para formatar a data
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return '';
    }
  };
  
  // Função para obter o label do tipo de questão
  const getQuestionTypeLabel = (type?: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Múltipla Escolha';
      case 'true_false':
        return 'Verdadeiro/Falso';
      case 'essay':
        return 'Dissertativa';
      default:
        return 'Outro';
    }
  };
  
  // Função para obter a cor da dificuldade
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'baixa':
        return 'bg-green-100 text-green-800';
      case 'média':
        return 'bg-yellow-100 text-yellow-800';
      case 'alta':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (!question) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Questão não encontrada</h2>
          <p className="text-gray-600 mb-6">A questão solicitada não existe ou foi removida.</p>
          <Link 
            href="/banco-questoes"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para o Banco de Questões
          </Link>
        </div>
      </div>
    );
  }
  
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-blue-600" />
            Detalhes da Questão
          </h1>
          
          <div className="flex space-x-2 mt-4 md:mt-0">
            <Link 
              href={`/banco-questoes/questao/${id}/editar`}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 inline-flex items-center text-sm"
            >
              <Edit className="h-4 w-4 mr-1.5" />
              Editar
            </Link>
            
            <button
              onClick={handleDeleteQuestion}
              className="px-3 py-1.5 border border-red-300 rounded-md text-red-700 hover:bg-red-50 inline-flex items-center text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Excluir
            </button>
          </div>
        </div>
        
        {/* Metadados da questão */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm inline-flex items-center">
            <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
            {getQuestionTypeLabel(question.question_type)}
          </div>
          
          {discipline && (
            <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm inline-flex items-center">
              <Book className="h-3.5 w-3.5 mr-1.5" />
              {discipline.name}
            </div>
          )}
          
          {subject && (
            <div className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm inline-flex items-center">
              <Bookmark className="h-3.5 w-3.5 mr-1.5" />
              {subject.title || subject.name}
            </div>
          )}
          
          {question.difficulty && (
            <div className={`px-3 py-1 rounded-full text-sm inline-flex items-center ${getDifficultyColor(question.difficulty)}`}>
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              Dificuldade: {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
            </div>
          )}
          
          {question.created_at && (
            <div className="px-3 py-1 bg-gray-50 text-gray-700 rounded-full text-sm inline-flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Criada em: {formatDate(question.created_at)}
            </div>
          )}
        </div>
        
        {/* Conteúdo da questão */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Conteúdo</h2>
          <div className="bg-gray-50 p-4 rounded-lg text-gray-800 whitespace-pre-line">
            {question.content}
          </div>
        </div>
        
        {/* Opções de resposta para Múltipla Escolha */}
        {question.question_type === 'multiple_choice' && answerOptions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Opções de Resposta</h2>
            <div className="space-y-3">
              {answerOptions.map((option, index) => (
                <div
                  key={option.id}
                  className={`p-3 rounded-lg border ${
                    option.is_correct
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      {option.is_correct ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm ${option.is_correct ? 'font-medium text-green-800' : 'text-gray-800'}`}>
                        {option.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Resposta Verdadeiro/Falso */}
        {question.question_type === 'true_false' && question.correct_answer && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Resposta Correta</h2>
            <div className={`p-3 rounded-lg border ${
              question.correct_answer === 'true'
                ? 'border-green-300 bg-green-50'
                : 'border-red-300 bg-red-50'
            }`}>
              <div className="flex items-center">
                {question.correct_answer === 'true' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="ml-2 font-medium text-green-800">Verdadeiro</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="ml-2 font-medium text-red-800">Falso</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Resposta Esperada (para questões dissertativas) */}
        {question.question_type === 'essay' && question.correct_answer && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Resposta Esperada</h2>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-gray-800 whitespace-pre-line">
              {question.correct_answer}
            </div>
          </div>
        )}
        
        {/* Explicação */}
        {question.explanation && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Explicação</h2>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-gray-800 whitespace-pre-line">
              {question.explanation}
            </div>
          </div>
        )}
        
        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {question.tags.map((tag, index) => (
                <div 
                  key={index} 
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center"
                >
                  <Tag className="h-3 w-3 mr-1.5" />
                  {tag}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 