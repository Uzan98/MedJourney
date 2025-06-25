"use client";

import React, { useState, useEffect } from 'react';
import { getGreeting } from '../../lib/utils';
import StudySummary from './StudySummary';
import QuickActions from './QuickActions';
import NextTask from './NextTask';
import NextStudySession from './NextStudySession';
import RecentNote from './RecentNote';
import PerformanceCharts from './PerformanceCharts';
import ImageCarousel from './ImageCarousel';
import Notifications from './Notifications';
import AppLayout from '../layout/AppLayout';
import { BarChart, Clock, FileText, TrendingUp, BarChart2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { getStudyMetrics, getStudySessions, getTasks, getNotes, getSimulatedTests } from '../../lib/api';
import { StudyMetrics, Task, StudySession, Note, StudyData, SimulatedTest } from '../../lib/types/dashboard';
import { setupOfflineDetection } from '../../lib/utils/offline';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: 'task' | 'session' | 'revision';
  title: string;
  message: string;
  date: Date;
}

// Funções de fallback para criar dados vazios quando necessário
const createEmptyMetrics = (): StudyMetrics => ({
  hoursToday: 0,
  hoursThisWeek: 0,
  hoursChange: 0,
  completedTasks: 0,
  totalTasksCompleted: 0,
  totalTasksPending: 0,
  tasksChange: 0,
  streak: 0,
  streakChange: 0,
  focusScore: 0,
  efficiencyRate: 0
});

const createEmptyTask = (): Task => ({
  id: '0',
  title: 'Comece criando uma tarefa',
  description: 'Você não tem tarefas pendentes no momento. Clique no botão "Nova Tarefa" para começar a organizar seus estudos.',
  dueDate: new Date(),
  status: 'pending',
  priority: 'medium',
  discipline: ''
});

const createEmptySession = (): StudySession => ({
  id: '0',
  title: 'Agende sua primeira sessão',
  disciplineName: '',
  scheduledDate: new Date(),
  duration: 0,
  completed: false
});

const createEmptyNote = (): Note => ({
  id: '0',
  title: 'Crie sua primeira nota',
  content: 'Você ainda não criou nenhuma nota de estudo. Clique no botão "Nova Anotação" para começar a organizar seu conhecimento.',
  createdAt: new Date(),
  disciplineName: ''
});

// Função para gerar dados de estudo para os últimos 7 dias quando não há dados reais
const generateEmptyStudyData = (): StudyData[] => {
  const data: StudyData[] = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: format(date, 'dd/MM'),
      minutes: 0
    });
  }
  
  return data;
};

const Dashboard = () => {
  // Estado para armazenar dados obtidos da API
  const [metrics, setMetrics] = useState<StudyMetrics | null>(null);
  const [nextTask, setNextTask] = useState<Task | null>(null);
  const [nextSession, setNextSession] = useState<StudySession | null>(null);
  const [lastNote, setLastNote] = useState<Note | null>(null);
  const [studyData, setStudyData] = useState<StudyData[]>([]);
  const [testData, setTestData] = useState<SimulatedTest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Configurar detector de offline/online
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

  // Função para carregar dados do dashboard
  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        
        // Carregar dados de métricas
        const metricsResp = await getStudyMetrics();
        
        // Obter sessões de estudo para processar localmente se offline
        const sessionsResp = await getStudySessions({ limit: 50 });
        
        // Obter tarefas
        const tasksResp = await getTasks({ limit: 5 });
        
        // Obter notas recentes
        const notesResp = await getNotes({ limit: 3 });
        
        // Obter dados de simulados
        const testsResp = await getSimulatedTests({ limit: 10 });
        
        // Processar dados de sessões de estudo para o gráfico
        const sessions = sessionsResp.success ? sessionsResp.sessions || [] : [];
        const sessionsData = processStudySessionsData(sessions);
        setStudyData(sessionsData);
        
        // Obter próxima tarefa
        const tasks = tasksResp.success ? tasksResp.tasks || [] : [];
        const nextPendingTask = tasks.find((task: Task) => task.status === 'pending');
        setNextTask(nextPendingTask || null);
        
        // Obter próxima sessão não concluída
        const upcomingSessions = sessions.filter((session: StudySession) => 
          !session.completed && new Date(session.scheduledDate) >= new Date()
        ).sort((a: StudySession, b: StudySession) => 
          new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
        );
        setNextSession(upcomingSessions.length > 0 ? upcomingSessions[0] : null);
        
        // Obter nota mais recente
        const notes = notesResp.success ? notesResp.notes || [] : [];
        setLastNote(notes.length > 0 ? notes[0] : null);
        
        // Obter dados de simulados para gráficos
        const testResults = testsResp.success ? testsResp.tests || [] : [];
        setTestData(testResults);
        
        // Processar métricas - Usar valores da API se disponíveis, caso contrário calcular localmente
        if (metricsResp.success && metricsResp.metrics) {
          setMetrics(metricsResp.metrics);
        } else {
          // Calcular métricas localmente se offline ou se a API falhou
          const completedSessions = sessions.filter((s: StudySession) => s.completed);
          const today = new Date();
          const todayString = today.toISOString().split('T')[0];
          
          // Calcular horas de estudo hoje
          const hoursToday = completedSessions
            .filter((s: StudySession) => new Date(s.scheduledDate).toISOString().split('T')[0] === todayString)
            .reduce((sum: number, s: StudySession) => sum + (s.actualDuration || s.duration), 0);
          
          // Calcular horas de estudo esta semana (últimos 7 dias)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 6);
          
          const hoursThisWeek = completedSessions
            .filter((s: StudySession) => new Date(s.scheduledDate) >= sevenDaysAgo && new Date(s.scheduledDate) <= today)
            .reduce((sum: number, s: StudySession) => sum + (s.actualDuration || s.duration), 0);
          
          // Verificar sequência de dias de estudo (streak)
          // Agrupar sessões concluídas por data
          const sessionsByDate = new Map<string, boolean>();
          completedSessions.forEach((s: StudySession) => {
            const dateStr = new Date(s.scheduledDate).toISOString().split('T')[0];
            sessionsByDate.set(dateStr, true);
          });
          
          // Verificar dias consecutivos
          let streak = 0;
          let currentDate = new Date();
          let checkDate: Date;
          let dateStr: string;
          
          // Verificar hoje
          dateStr = currentDate.toISOString().split('T')[0];
          if (sessionsByDate.has(dateStr)) {
            streak = 1;
            // Verificar dias anteriores
            checkDate = new Date();
            let daysContinue = true;
            
            while (daysContinue) {
              checkDate.setDate(checkDate.getDate() - 1);
              dateStr = checkDate.toISOString().split('T')[0];
              
              if (sessionsByDate.has(dateStr)) {
                streak++;
              } else {
                daysContinue = false;
              }
            }
          }
          
          // Criar objeto de métricas locais
          const localMetrics: StudyMetrics = {
            hoursToday,
            hoursThisWeek,
            hoursChange: 0, // Não temos os dados da semana anterior para calcular
            completedTasks: tasks.filter((t: Task) => t.status === 'completed').length,
            totalTasksCompleted: tasks.filter((t: Task) => t.status === 'completed').length,
            totalTasksPending: tasks.filter((t: Task) => t.status === 'pending').length,
            tasksChange: 0, // Não temos dados anteriores para calcular
            streak,
            streakChange: 0, // Não temos dados anteriores para calcular
            focusScore: 85, // Valor padrão
            efficiencyRate: 78 // Valor padrão
          };
          
          setMetrics(localMetrics);
          
          // Mostrar aviso de dados calculados localmente se estiver offline
          if (isOffline) {
            console.log('Métricas calculadas localmente devido ao modo offline');
          }
        }
        
        // Gerar notificações com base nos dados
        const generatedNotifications = await generateNotifications(nextPendingTask, upcomingSessions[0], tasks);
        setNotifications(generatedNotifications);
        
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
        setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    }
    
    loadDashboardData();
    
    // Adicionar um listener para quando a página se torna visível (usuário voltou para a página)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Dashboard: Página tornou-se visível, recarregando dados...');
        
        // Verificar se há uma flag para recarregar o dashboard
        const shouldReload = localStorage.getItem('@medjourney:reload_dashboard');
        if (shouldReload === 'true') {
          loadDashboardData();
          // Limpar a flag após a recarga
          localStorage.removeItem('@medjourney:reload_dashboard');
        }
      }
    };
    
    // Adicionar um listener para o evento personalizado 'dashboard:update'
    const handleDashboardUpdate = () => {
      console.log('Dashboard: Recebido evento de atualização, recarregando dados...');
      loadDashboardData();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('dashboard:update', handleDashboardUpdate);
    
    // Verificar se há uma flag para recarregar imediatamente
    const shouldReload = localStorage.getItem('@medjourney:reload_dashboard');
    if (shouldReload === 'true') {
      console.log('Dashboard: Flag de recarga detectada, recarregando dados imediatamente...');
      loadDashboardData();
      // Limpar a flag após a recarga
      localStorage.removeItem('@medjourney:reload_dashboard');
    }
    
    // Limpar listeners
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('dashboard:update', handleDashboardUpdate);
    };
  }, []);

  // Processar dados de sessão para criar dados de estudo diários
  const processStudySessionsData = (sessions: StudySession[]): StudyData[] => {
    // Inicializar com dados vazios para os últimos 7 dias
    const emptyData = generateEmptyStudyData();
    const dataMap = new Map<string, number>();
    
    // Preencher o mapa com dias vazios
    emptyData.forEach(item => {
      dataMap.set(item.date, 0);
    });
    
    // Processar sessões reais
    sessions.forEach(session => {
      if (session.completed && session.scheduledDate) {
        // Garantir que scheduledDate é um objeto Date
        let sessionDate: Date;
        
        try {
          if (typeof session.scheduledDate === 'string') {
            // Se for string, converter para Date
            sessionDate = new Date(session.scheduledDate);
          } else if (session.scheduledDate instanceof Date) {
            // Se já for Date, usar diretamente
            sessionDate = session.scheduledDate;
          } else {
            // Para outros tipos, usar uma string vazia e pular
            console.error('Tipo de data não suportado:', typeof session.scheduledDate);
            return; // Pular essa sessão
          }
          
          // Verificar se é um Date válido
          if (isNaN(sessionDate.getTime())) {
            console.error('Data inválida:', session.scheduledDate);
            return; // Pular essa sessão
          }
          
          // Considerar apenas os últimos 7 dias
          const today = new Date();
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 6);
          
          if (sessionDate >= sevenDaysAgo && sessionDate <= today) {
            const dateKey = format(sessionDate, 'dd/MM');
            const existingMinutes = dataMap.get(dateKey) || 0;
            dataMap.set(dateKey, existingMinutes + (session.duration || 0));
          }
        } catch (e) {
          console.error('Erro ao processar data da sessão:', e, session);
          // Pular essa sessão em caso de erro
        }
      }
    });
    
    // Converter mapa de volta para array
    return emptyData.map(item => ({
      date: item.date,
      minutes: dataMap.get(item.date) || 0
    }));
  };

  // Gerar notificações com base nos dados reais
  const generateNotifications = async (
    currentTask: Task | null, 
    currentSession: StudySession | null,
    tasks: Task[]
  ): Promise<Notification[]> => {
    const notifications: Notification[] = [];
    
    // Verificar tarefas atrasadas
    const today = new Date();
    const overdueTasks = tasks.filter(task => 
      task.status === 'pending' && new Date(task.dueDate) < today
    );
    
    if (overdueTasks.length > 0) {
      notifications.push({
        id: '1',
        type: 'task',
        title: 'Tarefas Atrasadas',
        message: `Você tem ${overdueTasks.length} ${overdueTasks.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}.`,
        date: new Date()
      });
    }
    
    // Verificar próxima sessão de estudo
    if (currentSession && currentSession.id !== '0') {
      const sessionDate = new Date(currentSession.scheduledDate);
      if (sessionDate.getDate() === today.getDate()) {
        notifications.push({
          id: '2',
          type: 'session',
          title: 'Sessão Hoje',
          message: `Você tem uma sessão de ${currentSession.disciplineName} programada para hoje.`,
          date: new Date()
        });
      }
    }
    
    // Verificar revisões recomendadas (simulação simplificada)
    const revisionsResp = await getNotes({ limit: 5 });
    if (revisionsResp.success && revisionsResp.notes && revisionsResp.notes.length > 0) {
      // Simplesmente pegar a nota mais recente e sugerir revisão
      const latestNote = revisionsResp.notes[0];
      notifications.push({
        id: '3',
        type: 'revision',
        title: 'Revisão Recomendada',
        message: `Considere revisar suas anotações sobre "${latestNote.title}".`,
        date: new Date()
      });
    }
    
    return notifications;
  };

  // Sample carousel images - you can replace these with actual images from your app
  const carouselImages = [
    {
      src: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1000&auto=format&fit=crop",
      alt: "Estudante lendo livros",
      title: "Dicas de Estudo",
      description: "Conheça técnicas eficientes para memorização de conteúdo"
    },
    {
      src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1000&auto=format&fit=crop",
      alt: "Estudante fazendo anotações",
      title: "Organização é Fundamental",
      description: "Aprenda a criar um cronograma de estudos eficiente"
    },
    {
      src: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1000&auto=format&fit=crop",
      alt: "Grupo de estudos",
      title: "Estude em Grupo",
      description: "Participe das salas de estudo e aumente seu desempenho"
    }
  ];

  // Get username from auth - this would come from a real auth state
  const username = 'Usuário';
  const greeting = getGreeting();
  
  // Exibir mensagem de carregamento
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados do dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  // Exibir mensagem de erro
  if (error) {
    return (
      <AppLayout>
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
      </AppLayout>
    );
  }

  // Exibir alerta offline quando necessário
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
      <div className="container mx-auto px-4 py-8">
        <OfflineAlert />
        
        <div className="flex flex-col md:flex-row justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{getGreeting()}</h1>
            <p className="text-gray-600">Aqui está um resumo da sua jornada de estudos</p>
          </div>
          
          {isOffline && <OfflineAlert />}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content - 2/3 width on large screens */}
          <div className="lg:col-span-2 space-y-8">
            {/* Study Summary */}
          <StudySummary metrics={metrics || createEmptyMetrics()} />
            
            {/* Performance Charts */}
            <PerformanceCharts studyData={studyData} testData={testData} />
            
            {/* Image Carousel */}
            <Card className="p-6 border-0 shadow-md bg-white">
              <h2 className="text-xl font-semibold mb-4">Dicas e Recursos</h2>
              <ImageCarousel images={carouselImages} />
            </Card>
        
        {/* Quick Actions */}
          <QuickActions />
        </div>
        
          {/* Sidebar - 1/3 width on large screens */}
          <div className="space-y-8">
            {/* Next Task */}
            <NextTask task={nextTask || createEmptyTask()} />
            
            {/* Next Study Session */}
            <NextStudySession 
              studySessions={[nextSession || createEmptySession()]} 
              onStartSession={(session) => {
                console.log('Starting session:', session);
                // Implement session start logic here
              }}
            />
            
            {/* Recent Note */}
            <RecentNote note={lastNote || createEmptyNote()} />
            
            {/* Notifications */}
            <Notifications notifications={notifications} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard; 
