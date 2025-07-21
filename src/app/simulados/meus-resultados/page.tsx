'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaEye, FaRedo, FaCalendarAlt, FaClock, FaTrophy, FaCheckCircle, FaClipboard, FaChartPie } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { ExamAttempt, ExamsService } from '@/services/exams.service';
import Loading from '@/components/Loading';
import DisciplinePerformanceChart, { DisciplinePerformance } from '@/components/DisciplinePerformanceChart';

export default function MeusResultadosPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [disciplinePerformance, setDisciplinePerformance] = useState<DisciplinePerformance[]>([]);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  
  useEffect(() => {
    loadAttempts();
    loadDisciplinePerformance();
  }, []);
  
  const loadAttempts = async () => {
    setLoading(true);
    try {
      // Carregar todas as tentativas do usuário
      const userAttempts = await ExamsService.getUserAttempts();
      
      // Ordenar por data, do mais recente para o mais antigo
      const sortedAttempts = userAttempts.sort((a, b) => {
        const dateA = a.completed_at || a.started_at || '';
        const dateB = b.completed_at || b.started_at || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      
      setAttempts(sortedAttempts);
    } catch (error) {
      console.error('Erro ao carregar tentativas:', error);
      toast.error('Ocorreu um erro ao carregar seus resultados');
    } finally {
      setLoading(false);
    }
  };
  
  const loadDisciplinePerformance = async () => {
    setLoadingPerformance(true);
    try {
      const performanceData = await ExamsService.getUserPerformanceByDiscipline();
      setDisciplinePerformance(performanceData);
    } catch (error) {
      console.error('Erro ao carregar desempenho por disciplina:', error);
      toast.error('Não foi possível carregar o desempenho por disciplina');
    } finally {
      setLoadingPerformance(false);
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data indisponível';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const formatDuration = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 'Duração indisponível';
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const durationMs = end - start;
    
    // Converter para minutos e segundos
    const minutes = Math.floor(durationMs / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (minutes < 60) {
      return `${minutes}min ${seconds}s`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}min`;
    }
  };
  
  const getScoreClass = (score?: number) => {
    if (score === undefined) return 'text-gray-500';
    
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  if (loading) {
    return <Loading message="Carregando seus resultados..." />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link 
              href="/simulados" 
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
              aria-label="Voltar"
            >
              <FaArrowLeft className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Meus Resultados</h1>
              <p className="text-gray-600">Histórico de todas as suas tentativas de simulados</p>
            </div>
          </div>
        </div>
        
        {/* Desempenho por Disciplina */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5">
            <h2 className="text-xl font-bold text-white flex items-center">
              <FaChartPie className="mr-2" />
              Desempenho por Disciplina
            </h2>
          </div>
          
          <div className="p-6">
            {loadingPerformance ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
              </div>
            ) : disciplinePerformance.length > 0 ? (
              <DisciplinePerformanceChart data={disciplinePerformance} height={350} />
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500">
                  Você ainda não possui dados suficientes para visualizar o desempenho por disciplina.
                  Complete alguns simulados para ver suas estatísticas aqui.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Results List */}
        <h2 className="text-xl font-bold text-gray-800 mb-4">Histórico de Simulados</h2>
        
        {attempts.length > 0 ? (
          <div className="space-y-6">
            {attempts.map(attempt => {
              const isCompleted = !!attempt.completed_at;
              
              return (
                <div key={attempt.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                      <div className="mb-2 md:mb-0">
                        <h2 className="text-lg font-semibold text-gray-800 mb-1">
                          {attempt.exam?.title || 'Simulado'}
                        </h2>
                        <div className="flex items-center text-gray-500 text-sm">
                          <FaCalendarAlt className="mr-1" />
                          <span>Realizado em {formatDate(attempt.started_at)}</span>
                        </div>
                      </div>
                      
                      {isCompleted ? (
                        <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                          <FaCheckCircle className="mr-1" /> Concluído
                        </div>
                      ) : (
                        <div className="flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                          Em progresso
                        </div>
                      )}
                    </div>
                    
                    {isCompleted && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center">
                          <div className="bg-blue-50 p-2 rounded-lg mr-3">
                            <FaTrophy className="text-blue-500" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Pontuação</div>
                            <div className={`font-bold text-lg ${getScoreClass(attempt.score)}`}>
                              {attempt.score !== undefined ? `${Math.round(attempt.score)}%` : '--'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="bg-green-50 p-2 rounded-lg mr-3">
                            <FaCheckCircle className="text-green-500" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Acertos</div>
                            <div className="font-bold text-lg">
                              {attempt.correct_answers || 0}/{attempt.total_questions || 0}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="bg-purple-50 p-2 rounded-lg mr-3">
                            <FaClock className="text-purple-500" />
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Tempo</div>
                            <div className="font-bold">
                              {formatDuration(attempt.started_at, attempt.completed_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-3">
                      {isCompleted && (
                        <Link 
                          href={`/simulados/resultado/${attempt.id}`}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-300"
                        >
                          <FaEye className="mr-2" /> Ver Resultado Detalhado
                        </Link>
                      )}
                      
                      <Link 
                        href={`/simulados/${attempt.exam_id}/iniciar`}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 hover:bg-gray-50 bg-white text-gray-700 text-sm font-medium rounded-lg transition-colors duration-300"
                      >
                        <FaRedo className="mr-2" /> Refazer Simulado
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="bg-blue-100 inline-block p-4 rounded-full mb-4">
              <FaClipboard className="text-blue-500 text-3xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhum resultado encontrado</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Você ainda não realizou nenhum simulado. Escolha um simulado disponível para começar a praticar.
            </p>
            <Link 
              href="/simulados" 
              className="inline-flex items-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-300"
            >
              Ver Simulados Disponíveis
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 
