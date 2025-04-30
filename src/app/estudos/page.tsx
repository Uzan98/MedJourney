"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { Clock, BookOpen, Zap, Brain, Calendar, ChevronRight, Check, ArrowUpRight, Award, BookMarked, GraduationCap, Plus } from 'lucide-react';
import { getStudyMetrics, getStudySessions } from '../../lib/api';
import { setupOfflineDetection } from '../../lib/utils/offline';
import { StudySession } from '../../lib/types/dashboard';
import StudySessionModal from '../../components/estudos/StudySessionModal';
import StudyTimer from '../../components/estudos/StudyTimer';
import { toast } from '../../components/ui/Toast';
import { useRouter } from 'next/navigation';

export default function EstudosPage() {
  const router = useRouter();

  // Estados para armazenar dados obtidos da API
  const [metrics, setMetrics] = useState({
    hoursThisWeek: 0,
    completedSessions: 0,
    streak: 0,
    reviewedTopics: 0
  });
  const [upcomingSessions, setUpcomingSessions] = useState<StudySession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showStudyTimer, setShowStudyTimer] = useState(false);
  const [isSchedulingMode, setIsSchedulingMode] = useState(true);
  const [currentSession, setCurrentSession] = useState<{
    id: string;
    title: string;
    disciplineName: string;
    duration: number;
  } | null>(null);

  // Detectar estado offline
  useEffect(() => {
    const offlineDetection = setupOfflineDetection(
      () => setIsOffline(true),
      () => setIsOffline(false)
    );
    
    // Verificar a conexão imediatamente
    offlineDetection.checkConnection().then(isOnline => {
      setIsOffline(!isOnline);
    });
    
    // Cleanup quando o componente for desmontado
    return () => {
      offlineDetection.cleanup();
    };
  }, []);

  // Carregar dados
  useEffect(() => {
    loadStudyData();
  }, []);

    async function loadStudyData() {
      try {
        setLoading(true);

        // Carregar métricas
        const metricsResponse = await getStudyMetrics();
        if (metricsResponse.success && metricsResponse.metrics) {
          setMetrics({
            hoursThisWeek: metricsResponse.metrics.hoursThisWeek || 0,
            completedSessions: metricsResponse.metrics.totalSessions || 0,
            streak: metricsResponse.metrics.streak || 0,
            reviewedTopics: metricsResponse.metrics.totalTopics || 0
          });
        }
        
        // Carregar sessões agendadas
        const upcomingResponse = await getStudySessions({ completed: false, upcoming: true, limit: 5 });
        if (upcomingResponse.success && upcomingResponse.sessions) {
          setUpcomingSessions(upcomingResponse.sessions);
        }
        
        // Carregar sessões concluídas
        const completedResponse = await getStudySessions({ completed: true, limit: 5 });
        if (completedResponse.success && completedResponse.sessions) {
          setCompletedSessions(completedResponse.sessions);
        }

        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar dados de estudo:', err);
        setError('Erro ao carregar dados. Tente novamente mais tarde.');
        setLoading(false);
      }
    }
    
  // Abrir modal de nova sessão
  const handleNewSessionClick = () => {
    setIsSchedulingMode(false); // Sessão para iniciar agora
    setShowSessionModal(true);
  };

  // Iniciar uma sessão rápida
  const startQuickSession = (disciplineName: string, duration: number) => {
    // Verificar se há disciplinas cadastradas
    const hasDisciplines = (upcomingSessions.length > 0 && upcomingSessions[0].disciplineName) ||
                          (completedSessions.length > 0 && completedSessions[0].disciplineName);
                          
    if (!hasDisciplines) {
      // Se não houver disciplinas, mostrar modal para adicionar uma
      alert('Você precisa cadastrar pelo menos uma disciplina antes de iniciar uma sessão rápida. Clique em "Adicionar Disciplina".');
      return;
    }
    
    // Criar uma sessão rápida com valores predefinidos
    const quickSession = {
      id: `temp-${Date.now()}`, // ID temporário
      title: `Sessão rápida: ${disciplineName}`,
      disciplineName: disciplineName,
      duration: duration
    };
    
    setCurrentSession(quickSession);
    setShowStudyTimer(true);
  };

  // Função auxiliar para obter uma disciplina aleatória ou a primeira disponível
  const getDefaultDiscipline = (): string => {
    // Verificar se há disciplinas nas sessões agendadas e usar uma delas
    if (upcomingSessions.length > 0 && upcomingSessions[0].disciplineName) {
      return upcomingSessions[0].disciplineName;
    }
    
    // Ou usar a primeira disciplina das sessões concluídas
    if (completedSessions.length > 0 && completedSessions[0].disciplineName) {
      return completedSessions[0].disciplineName;
    }
    
    // Fallback para um valor padrão
    return "Estudo Geral";
  };

  // Abrir modal para agendar sessão
  const handleScheduleSessionClick = () => {
    setIsSchedulingMode(true); // Sessão para agendar no futuro
    setShowSessionModal(true);
  };

  // Redirecionar para a página de disciplinas
  const handleAddDisciplineClick = () => {
    router.push('/disciplinas');
  };

  // Fechar modals
  const handleCloseSessionModal = () => {
    setShowSessionModal(false);
  };

  // Após criação bem-sucedida de sessão
  const handleSessionCreated = () => {
    // Recarregar dados para exibir a nova sessão
    loadStudyData();
  };

  // Iniciar uma sessão específica
  const handleStartSession = (sessionId: string) => {
    console.log('Iniciando sessão:', sessionId);
    // Encontrar a sessão pelo ID
    const session = upcomingSessions.find(s => s.id === sessionId);
    
    if (session) {
      setCurrentSession({
        id: session.id,
        title: session.title,
        disciplineName: session.disciplineName,
        duration: session.duration
      });
      setShowStudyTimer(true);
    } else {
      alert('Sessão não encontrada. Tente novamente.');
    }
  };

  // Fechar o timer de estudo
  const handleCloseStudyTimer = () => {
    setShowStudyTimer(false);
    setCurrentSession(null);
  };

  // Callback após completar a sessão de estudo
  const handleStudyComplete = () => {
    // Mostrar toast de atualização
    toast.info('Atualizando dados de estudo...', 2000);
    
    // Recarregar dados para refletir a sessão concluída
    loadStudyData();
    
    // Oferecer ao usuário ver as estatísticas atualizadas no dashboard
    setTimeout(() => {
      toast.info(
        'Acesse o Dashboard para ver suas estatísticas atualizadas!',
        5000
      );
    }, 2500);
  };

  // Função para converter minutos em formato de horas
  const formatMinutesToHours = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}min`;
  };

  // Formatadores
  const formatDate = (dateString: string | Date): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short'
      }).replace('.', '');
    } catch (e) {
      return '';
    }
  };

  const formatTime = (dateString: string | Date): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  // Componente para estado de carregamento
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados do painel de estudos...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Componente para estado de erro
  if (error) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 my-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button 
                  className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
                  onClick={() => window.location.reload()}
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Exibir mensagem offline quando necessário
  const OfflineAlert = () => isOffline ? (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-amber-700">
            Você está offline. Alguns dados podem não estar atualizados.
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isOffline && <OfflineAlert />}
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Painel de Estudos</h1>
            <p className="text-gray-600">Organize seus estudos e acompanhe seu progresso.</p>
          </div>
          <div className="flex space-x-3 mt-4 md:mt-0">
            <button
              onClick={handleScheduleSessionClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Agendar Sessão</span>
            </button>
            
            <div className="relative group">
          <button 
            onClick={handleNewSessionClick}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Iniciar Sessão</span>
            </button>
              
              {/* Menu dropdown para iniciar sessão rápida */}
              <div className="absolute right-0 mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-10">
                <div className="bg-white rounded-md shadow-lg border border-gray-200 py-2">
                  <div className="px-4 py-2 text-sm text-gray-700 font-medium border-b border-gray-100">
                    Sessão rápida
                  </div>
                  <button 
                    onClick={() => startQuickSession(getDefaultDiscipline(), 25)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Pomodoro 25 min
                  </button>
                  <button 
                    onClick={() => startQuickSession(getDefaultDiscipline(), 45)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sessão de 45 min
                  </button>
                  <button 
                    onClick={() => startQuickSession(getDefaultDiscipline(), 60)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sessão de 1 hora
                  </button>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleAddDisciplineClick}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Disciplina</span>
          </button>
          </div>
        </div>
        
        {/* Métricas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-blue-500 bg-blue-100 px-2 py-1 rounded-full">
                {metrics.hoursThisWeek > 0 ? formatMinutesToHours(metrics.hoursThisWeek) + ' esta semana' : 'Sem dados'}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Tempo de estudo</h3>
            <div className="text-blue-600 text-2xl font-bold">{formatMinutesToHours(metrics.hoursThisWeek)}</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-green-500 rounded-lg">
                <Check className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-green-500 bg-green-100 px-2 py-1 rounded-full">
                {metrics.completedSessions > 0 ? `${metrics.completedSessions} concluídas` : 'Comece hoje'}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Sessões concluídas</h3>
            <div className="text-green-600 text-2xl font-bold">{metrics.completedSessions}</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-purple-500 bg-purple-100 px-2 py-1 rounded-full">
                {metrics.streak > 0 ? `+${metrics.streak} dias` : 'Inicie uma sequência'}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Sequência atual</h3>
            <div className="text-purple-600 text-2xl font-bold">{metrics.streak > 0 ? `${metrics.streak} dias` : 'Não iniciado'}</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-orange-500 bg-orange-100 px-2 py-1 rounded-full">
                {metrics.reviewedTopics > 0 ? `${metrics.reviewedTopics} tópicos` : 'Sem revisões'}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Tópicos revisados</h3>
            <div className="text-orange-600 text-2xl font-bold">{metrics.reviewedTopics}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seção Esquerda - Sessões Pendentes */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500 rounded-md">
                    <BookMarked className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="font-semibold text-gray-800">Sessões de Estudo Agendadas</h2>
                </div>
                <button 
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                  onClick={() => handleScheduleSessionClick()}
                >
                  Agendar nova
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
              
              <div className="p-6 divide-y divide-gray-100 flex-1">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.map((session, index) => (
                    <div key={session.id || index} className="py-4 first:pt-0 last:pb-0 hover:bg-blue-50 p-3 rounded-lg transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-500 rounded-lg mt-1">
                            <BookOpen className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800">{session.title}</h3>
                            <div className="flex items-center mt-1">
                              <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                              <span className="text-xs text-gray-500 mr-3">
                                {formatDate(session.scheduledDate)}, {formatTime(session.scheduledDate)}
                              </span>
                              <Clock className="h-3 w-3 text-gray-400 mr-1" />
                              <span className="text-xs text-gray-500">{session.duration}min</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {session.disciplineName || 'Geral'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center ml-10">
                        <span className="text-xs text-gray-500">
                          {session.notes ? session.notes.substring(0, 50) + '...' : 'Sem anotações'}
                        </span>
                        <button 
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors flex items-center gap-1"
                          onClick={() => handleStartSession(session.id)}
                        >
                          Iniciar
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                      <Calendar className="h-6 w-6 text-blue-500" />
                    </div>
                    <h3 className="text-gray-800 font-medium mb-2">Sem sessões agendadas</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto">
                      Você não tem nenhuma sessão de estudo agendada. Crie uma nova sessão para começar a estudar.
                    </p>
                    <button 
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                      onClick={handleScheduleSessionClick}
                    >
                      Agendar Nova Sessão
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Seção Direita - Histórico */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500 rounded-md">
                    <Award className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="font-semibold text-gray-800">Histórico Recente</h2>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                  Ver tudo
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
              
              <div className="p-6 divide-y divide-gray-100 flex-1">
                {completedSessions.length > 0 ? (
                  completedSessions.map((session, index) => (
                    <div key={session.id || index} className="py-3 first:pt-0 hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <div className="flex gap-3">
                        <div className="p-2 bg-green-500 rounded-lg flex-shrink-0">
                          <BookOpen className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{session.title}</h4>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                            <span>{formatDate(session.scheduledDate)}</span>
                            <span className="mx-2">•</span>
                            <Clock className="h-3 w-3 text-gray-400 mr-1" />
                            <span>{session.actualDuration || session.duration}min</span>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              {session.disciplineName || 'Geral'}
                            </span>
                            <div className="flex items-center">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full w-full rounded-full"></div>
                              </div>
                              <span className="text-xs font-medium text-green-500 ml-2">100%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <Award className="h-6 w-6 text-green-500" />
                    </div>
                    <h3 className="text-gray-800 font-medium mb-2">Sem histórico</h3>
                    <p className="text-gray-500 text-sm mx-auto">
                      Você ainda não concluiu nenhuma sessão de estudo.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Nova Sessão de Estudo */}
        <StudySessionModal 
          isOpen={showSessionModal}
          onClose={handleCloseSessionModal}
          onSuccess={handleSessionCreated}
          isScheduling={isSchedulingMode}
        />

        {/* Componente de Timer para sessão de estudo */}
        {currentSession && (
          <StudyTimer
            isOpen={showStudyTimer}
            onClose={handleCloseStudyTimer}
            onComplete={handleStudyComplete}
            sessionData={currentSession}
          />
        )}
      </div>
    </AppLayout>
  );
} 