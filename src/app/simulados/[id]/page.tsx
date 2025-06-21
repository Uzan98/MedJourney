'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  FaArrowLeft, FaPlay, FaEdit, FaClock, FaQuestion, 
  FaChartBar, FaCheck, FaEye, FaEyeSlash, FaRandom
} from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { Exam, ExamQuestion, ExamsService } from '@/services/exams.service';
import Loading from '@/components/Loading';
import { supabase } from '@/lib/supabase';

export default function SimuladoDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const examId = parseInt(params.id);
  
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  
  useEffect(() => {
    loadData();
  }, [examId]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar dados do simulado
      const examData = await ExamsService.getExamById(examId);
      if (!examData) {
        toast.error('Simulado não encontrado');
        router.push('/simulados');
        return;
      }
      
      // Se for um simulado público e não for do usuário atual, buscar informações do criador
      if (examData.is_public && examData.user_id !== user?.id) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('id', examData.user_id)
            .single();
          
          if (data) {
            examData.creator_name = data.full_name || data.username || 'Usuário anônimo';
          }
        } catch (error) {
          console.error('Erro ao buscar informações do criador:', error);
        }
      }
      
      setExam(examData);
      setIsOwner(examData.user_id === user?.id);
      
      // Carregar questões do simulado
      const questionsData = await ExamsService.getExamQuestions(examId);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Erro ao carregar simulado:', error);
      toast.error('Ocorreu um erro ao carregar o simulado');
    } finally {
      setLoading(false);
    }
  };
  
  const formatTime = (minutes: number | null | undefined) => {
    if (!minutes) return 'Sem limite de tempo';
    
    if (minutes < 60) {
      return `${minutes} minutos`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}min`
        : `${hours} horas`;
    }
  };
  
  if (loading) {
    return <Loading message="Carregando detalhes do simulado..." />;
  }
  
  if (!exam) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Simulado não encontrado</h2>
            <p className="text-gray-600 mb-6">O simulado que você está procurando não existe ou foi removido.</p>
            <Link 
              href="/simulados"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center"
            >
              <FaArrowLeft className="mr-2" /> Voltar para Simulados
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div className="flex items-center mb-4 md:mb-0">
            <Link 
              href="/simulados" 
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
              aria-label="Voltar"
            >
              <FaArrowLeft className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{exam.title}</h1>
              <p className="text-gray-600">Detalhes do Simulado</p>
            </div>
          </div>
          <div className="flex space-x-3">
            {isOwner && (
              <Link
                href={`/simulados/${examId}/editar`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
              >
                <FaEdit className="mr-2" /> Editar
              </Link>
            )}
            <Link
              href={`/simulados/${examId}/iniciar`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
            >
              <FaPlay className="mr-2" /> Iniciar Simulado
            </Link>
          </div>
        </div>
        
        {/* Informações do Simulado */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Informações do Simulado</h2>
            
            {exam.description && (
              <div className="mb-6">
                <p className="text-gray-700">{exam.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg flex items-start">
                <FaQuestion className="text-blue-500 mt-1 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-800">Questões</h3>
                  <p className="text-blue-700 font-medium">{questions.length} questões</p>
                </div>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-lg flex items-start">
                <FaClock className="text-indigo-500 mt-1 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-800">Tempo</h3>
                  <p className="text-indigo-700 font-medium">{formatTime(exam.time_limit)}</p>
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg flex items-start">
                <FaChartBar className="text-purple-500 mt-1 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-800">Visibilidade</h3>
                  <p className="text-purple-700 font-medium">{exam.is_public ? 'Público' : 'Privado'}</p>
                </div>
              </div>
              
              {/* Mostrar criador se for público e não for o proprietário */}
              {exam.is_public && exam.creator_name && !isOwner && (
                <div className="bg-amber-50 p-4 rounded-lg flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="text-amber-500 mt-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <h3 className="font-medium text-gray-800">Criado por</h3>
                    <p className="text-amber-700 font-medium">{exam.creator_name}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center text-sm">
                <div className={`p-1.5 rounded-full ${exam.shuffle_questions ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'} mr-2`}>
                  {exam.shuffle_questions ? <FaRandom className="h-3 w-3" /> : <FaCheck className="h-3 w-3" />}
                </div>
                <span>
                  {exam.shuffle_questions ? 'Ordem aleatória de questões' : 'Ordem fixa de questões'}
                </span>
              </div>
              
              <div className="flex items-center text-sm">
                <div className={`p-1.5 rounded-full ${exam.show_answers ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'} mr-2`}>
                  {exam.show_answers ? <FaEye className="h-3 w-3" /> : <FaEyeSlash className="h-3 w-3" />}
                </div>
                <span>
                  {exam.show_answers ? 'Mostra respostas corretas' : 'Apenas pontuação final'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Questões do Simulado */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="flex justify-between items-center text-xl font-semibold text-gray-800 mb-4">
              <span>Questões ({questions.length})</span>
              {isOwner && (
                <Link
                  href={`/simulados/${examId}/editar/questoes`}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <FaEdit className="mr-1 h-3 w-3" /> Gerenciar questões
                </Link>
              )}
            </h2>
            
            {questions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {isOwner ? 'Este simulado ainda não possui questões. Adicione questões para que possa ser realizado.' : 'Este simulado não possui questões disponíveis.'}
                </p>
                {isOwner && (
                  <Link
                    href={`/simulados/${examId}/editar/questoes`}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  >
                    Adicionar Questões
                  </Link>
                )}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b border-gray-200 text-sm font-medium text-gray-500">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-1">#</div>
                    <div className="col-span-9">Questão</div>
                    <div className="col-span-2">Tipo</div>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {questions.map((question, index) => (
                    <div key={question.id} className="p-3 hover:bg-gray-50">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-1 text-gray-500 font-medium">{index + 1}</div>
                        <div className="col-span-9 text-gray-700 truncate">
                          {question.question?.content ? (
                            <div dangerouslySetInnerHTML={{ 
                              __html: question.question.content.length > 100 
                                ? question.question.content.substring(0, 100) + '...'
                                : question.question.content 
                            }} />
                          ) : (
                            <span className="text-gray-400">Conteúdo não disponível</span>
                          )}
                        </div>
                        <div className="col-span-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {question.question?.question_type === 'multiple_choice' ? 'Múltipla Escolha' : 
                             question.question?.question_type === 'true_false' ? 'Verdadeiro/Falso' : 
                             question.question?.question_type === 'essay' ? 'Dissertativa' : 'Desconhecido'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Botão de iniciar simulado */}
        <div className="text-center">
          <Link
            href={`/simulados/${examId}/iniciar`}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            <FaPlay className="mr-2" /> Iniciar Simulado
          </Link>
        </div>
      </div>
    </div>
  );
} 