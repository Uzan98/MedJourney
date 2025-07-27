"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { StudySessionService } from '@/services/study-sessions.service';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  Plus, 
  BookOpen, 
  BarChart, 
  CheckCircle, 
  AlertCircle,
  Flame,
  CalendarClock,
  ArrowRight,
  BookMarked,
  PlusCircle,
  BrainCircuit,
  Target,
  Award,
  X as CloseIcon,
  History,
  Search,
  CalendarDays,
  FileText,
  SortDesc,
  SortAsc
} from 'lucide-react';
import StudySessionModal from '@/components/estudos/StudySessionModal';
import QuickStudySessionModal from '@/components/estudos/QuickStudySessionModal';
import StudySessionTimer from '@/components/estudos/StudySessionTimer';
import GrowingTimer from '@/components/estudos/GrowingTimer';
import StudyPomodoroTimer from '@/components/estudos/StudyPomodoroTimer';
import { DisciplinesRestService } from '@/lib/supabase-rest';

// Interfaces para tipagem
interface StudySession {
  id?: number;
  user_id: string;
  discipline_id?: number;
  subject_id?: number;
  title: string;
  scheduled_date?: string;
  duration_minutes: number;
  actual_duration_minutes?: number;
  notes?: string;
  completed?: boolean;
  status?: string;
  disciplineName?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
}

interface StudyMetrics {
  totalSessions: number;
  completedSessions: number;
  totalMinutes: number;
  streakDays: number;
}

interface Discipline {
  id: number;
  name: string;
}

export default function EstudosPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [upcomingSessions, setUpcomingSessions] = useState<StudySession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<StudySession[]>([]);
  const [metrics, setMetrics] = useState<StudyMetrics>({
    totalSessions: 0,
    completedSessions: 0,
    totalMinutes: 0,
    streakDays: 0
  });
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isQuickSessionModalOpen, setIsQuickSessionModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [filteredHistory, setFilteredHistory] = useState<StudySession[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historySort, setHistorySort] = useState<'newest' | 'oldest'>('newest');
  
  // Estado para controlar a sessão em andamento (cronômetro)
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  // Estado para controlar a sessão rápida em andamento (cronômetro crescente)
  const [activeQuickSession, setActiveQuickSession] = useState<{ 
    disciplineId?: number; 
    disciplineName?: string;
    elapsedMinutes?: number;
    notes?: string;
  } | null>(null);

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);

  // Carregar dados de estudo quando a página for montada
  useEffect(() => {
    loadStudyData();
    loadDisciplines();

    // Verificar estado de conexão
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Verificar parâmetros de URL para iniciar sessão automaticamente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session');
      const autoStart = params.get('start');
      
      // Se temos um ID de sessão e start=true
      if (sessionId && autoStart === 'true' && !activeSession) {
        console.log(`Iniciando sessão automaticamente: ${sessionId}`);
        
        // Carregar a sessão específica e iniciá-la
        const startSessionFromUrl = async () => {
          try {
            // Buscar a sessão diretamente pelo ID usando o novo método
            const sessionToStart = await StudySessionService.getSessionById(Number(sessionId));
            console.log("Sessão encontrada para iniciar:", sessionToStart);
            
            if (sessionToStart) {
              handleStartSession(sessionToStart);
              
              // Limpar parâmetros da URL para evitar iniciar novamente em refresh
              if (window.history.replaceState) {
                const newUrl = window.location.pathname;
                window.history.replaceState({ path: newUrl }, '', newUrl);
              }
            } else {
              console.error(`Sessão não encontrada: ${sessionId}`);
              toast.error("Sessão não encontrada");
            }
          } catch (error) {
            console.error("Erro ao iniciar sessão automaticamente:", error);
          }
        };
        
        startSessionFromUrl();
      }
    }
  }, []);

    async function loadStudyData() {
      try {
        setLoading(true);
      console.log("Carregando dados de estudo...");

      // Tentar carregar sessões do serviço
      try {
        console.log("Tentando carregar sessões do StudySessionService");
        
        // Primeiro, vamos buscar TODAS as sessões não completadas do usuário
        // Isso irá capturar as sessões criadas em qualquer parte do aplicativo
        const allNonCompletedSessions = await StudySessionService.getUserSessions(false);
        console.log("Todas as sessões não completadas:", allNonCompletedSessions);
        
        // Filtrar apenas as sessões do dia atual (usando métodos que preservam o fuso horário)
        const today = new Date();
        
        // Filtrar sessões com data agendada apenas para hoje
        const upcoming = allNonCompletedSessions.filter(session => {
          if (!session.scheduled_date) return false;
          
          const sessionDate = new Date(session.scheduled_date);
          
          // Comparar ano, mês e dia localmente (sem conversão para UTC)
          return (
            sessionDate.getFullYear() === today.getFullYear() &&
            sessionDate.getMonth() === today.getMonth() &&
            sessionDate.getDate() === today.getDate()
          );
        });
        
        console.log("Sessões agendadas para hoje:", upcoming);
        
        if (upcoming && upcoming.length > 0) {
          // Garantir que temos o nome da disciplina
          const upcomingWithNames = upcoming.map(session => ({
            ...session,
            disciplineName: session.title.split(' - ')[0] || '',
          }));
          
          // Ordenar por data
          const sortedUpcoming = upcomingWithNames.sort((a, b) => {
            const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
            const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
            return dateA - dateB;
          });
          
          setUpcomingSessions(sortedUpcoming);
        } else {
          // Como fallback, tente o método específico apenas para hoje
          const upcomingSessions = await StudySessionService.getUpcomingSessions(1);
          if (upcomingSessions && upcomingSessions.length > 0) {
            const upcomingWithNames = upcomingSessions.map(session => ({
              ...session,
              disciplineName: session.title.split(' - ')[0] || '',
            }));
            
            const sortedUpcoming = upcomingWithNames.sort((a, b) => {
              const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
              const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
              return dateA - dateB;
            });
            
            setUpcomingSessions(sortedUpcoming);
          } else {
            setUpcomingSessions([]);
          }
        }

        // Carregar sessões completadas
        const allSessions = await StudySessionService.getUserSessions(true);
        console.log("Todas as sessões carregadas:", allSessions);
        
        if (allSessions) {
          const completed = allSessions.filter(s => s.completed);
          setCompletedSessions(completed.map(session => ({
            ...session,
            disciplineName: session.title.split(' - ')[0] || '',
          })));

          // Calcular a sequência de dias de estudo (streak)
          let streakDays = 0;
          
          // Agrupar sessões por dia
          const sessionsByDay = new Map<string, boolean>();
          
          completed.forEach(session => {
            if (session.completed) {
              // Usar scheduled_date ou created_at como data da sessão
              const date = session.scheduled_date || session.created_at;
              if (date) {
                // Extrair apenas a data (sem o horário) como string YYYY-MM-DD
                const dateStr = new Date(date).toISOString().split('T')[0];
                sessionsByDay.set(dateStr, true);
              }
            }
          });
          
          // Verificar dias consecutivos até hoje
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          // Verificar se estudou hoje ou ontem para iniciar a contagem
          if (sessionsByDay.has(todayStr)) {
            // Estudou hoje
            streakDays = 1;
            
            // Verificar dias anteriores
            let checkDate = new Date(today);
            let checkingDays = true;
            
            while (checkingDays) {
              // Avançar para o dia anterior
              checkDate.setDate(checkDate.getDate() - 1);
              const dateStr = checkDate.toISOString().split('T')[0];
              
              if (sessionsByDay.has(dateStr)) {
                // Se estudou neste dia, incrementar a sequência
                streakDays++;
              } else {
                // Se não estudou, encerrar a verificação
                checkingDays = false;
              }
              
              // Limitar a verificação a 60 dias no passado para evitar loops infinitos
              if (streakDays > 60) {
                checkingDays = false;
              }
            }
          } else if (sessionsByDay.has(yesterdayStr)) {
            // Não estudou hoje, mas estudou ontem
            streakDays = 1;
            
            // Verificar dias anteriores a ontem
            let checkDate = new Date(yesterday);
            let checkingDays = true;
            
            while (checkingDays) {
              // Avançar para o dia anterior
              checkDate.setDate(checkDate.getDate() - 1);
              const dateStr = checkDate.toISOString().split('T')[0];
              
              if (sessionsByDay.has(dateStr)) {
                // Se estudou neste dia, incrementar a sequência
                streakDays++;
              } else {
                // Se não estudou, encerrar a verificação
                checkingDays = false;
              }
              
              // Limitar a verificação a 60 dias no passado para evitar loops infinitos
              if (streakDays > 60) {
                checkingDays = false;
              }
            }
          }
          // Se não estudou nem hoje nem ontem, a sequência é zero

          // Calcular métricas
          setMetrics({
            totalSessions: allSessions.length,
            completedSessions: completed.length,
            totalMinutes: allSessions.reduce((total, s) => 
              total + (s.completed ? (s.actual_duration_minutes || s.duration_minutes) : 0), 0),
            streakDays: streakDays
          });
        }
      } catch (error) {
        console.error("Erro ao carregar sessões do serviço:", error);
        // Tente o método de fallback via API direta
        loadSessionsFromSupabase();
      }
    } catch (error) {
      console.error("Erro ao carregar dados de estudo:", error);
      toast.error("Não foi possível carregar as sessões de estudo");
    } finally {
        setLoading(false);
      }
    }
    
  async function loadSessionsFromSupabase() {
    if (!user) return;
    
    try {
      console.log("Carregando sessões diretamente do Supabase");
      
      // Obter a data atual em loadSessionsFromSupabase
      const today = new Date();
      
      // Abordagem 1: Obter todas as sessões não completadas primeiro
      const { data: allSessions, error: allSessionsError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('scheduled_date', { ascending: true });
      
      if (allSessionsError) {
        throw allSessionsError;
      }
      
      console.log("Todas as sessões do Supabase:", allSessions);
      
      // Filtrar apenas as sessões de hoje (usando métodos que preservam o fuso horário)
      const todaySessions = allSessions ? allSessions.filter(session => {
        if (!session.scheduled_date) return false;
        
        const sessionDate = new Date(session.scheduled_date);
        
        // Comparar ano, mês e dia localmente (sem conversão para UTC)
        return (
          sessionDate.getFullYear() === today.getFullYear() &&
          sessionDate.getMonth() === today.getMonth() &&
          sessionDate.getDate() === today.getDate()
        );
      }) : [];
      
      console.log("Sessões de hoje do Supabase:", todaySessions);
      
      // Garantir que temos o nome da disciplina e ordenar da mesma forma que o método principal
      if (todaySessions && todaySessions.length > 0) {
        const upcomingWithNames = todaySessions.map(session => ({
          ...session,
          disciplineName: session.title.split(' - ')[0] || '',
        }));
        
        // Ordenar por data
        const sortedUpcoming = upcomingWithNames.sort((a, b) => {
          const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
          const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
          return dateA - dateB;
        });
        
        setUpcomingSessions(sortedUpcoming);
      } else {
        // Abordagem 2 (Fallback): Usar a consulta específica para o dia atual
        // Construir datas de início e fim do dia respeitando o fuso horário local
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        
        // Formatar as datas para ISO string (necessário para o Supabase)
        const startIso = startOfDay.toISOString();
        const endIso = endOfDay.toISOString();
        
        const { data: fallbackUpcoming, error: fallbackError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .gte('scheduled_date', startIso)
        .lt('scheduled_date', endIso)
        .order('scheduled_date', { ascending: true });
      
        if (fallbackError) {
          throw fallbackError;
        }
        
        if (fallbackUpcoming && fallbackUpcoming.length > 0) {
          const upcomingWithNames = fallbackUpcoming.map(session => ({
            ...session,
            disciplineName: session.title.split(' - ')[0] || '',
          }));
          
        const sortedUpcoming = upcomingWithNames.sort((a, b) => {
          const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
          const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
          return dateA - dateB;
        });
        
        setUpcomingSessions(sortedUpcoming);
      } else {
        setUpcomingSessions([]);
        }
      }
      
      // Carregar sessões completadas
      const { data: completedData, error: completedError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('scheduled_date', { ascending: false });
      
      if (completedError) {
        throw completedError;
      }
      
      console.log("Sessões completadas do Supabase:", completedData);
      const completedSessions = completedData || [];
      setCompletedSessions(completedSessions.slice(0, 10)); // Mostrar apenas as 10 mais recentes na UI
      
      // Calcular a sequência de dias de estudo (streak)
      let streakDays = 0;
      
      // Agrupar sessões por dia
      const sessionsByDay = new Map<string, boolean>();
      
      completedSessions.forEach(session => {
        if (session.completed) {
          // Usar scheduled_date ou created_at como data da sessão
          const date = session.scheduled_date || session.created_at;
          if (date) {
            // Extrair apenas a data (sem o horário) como string YYYY-MM-DD
            const dateStr = new Date(date).toISOString().split('T')[0];
            sessionsByDay.set(dateStr, true);
          }
        }
      });
      
      // Verificar dias consecutivos até hoje
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      // Verificar se estudou hoje ou ontem para iniciar a contagem
      if (sessionsByDay.has(todayStr)) {
        // Estudou hoje
        streakDays = 1;
        
        // Verificar dias anteriores
        let checkDate = new Date(today);
        let checkingDays = true;
        
        while (checkingDays) {
          // Avançar para o dia anterior
          checkDate.setDate(checkDate.getDate() - 1);
          const dateStr = checkDate.toISOString().split('T')[0];
          
          if (sessionsByDay.has(dateStr)) {
            // Se estudou neste dia, incrementar a sequência
            streakDays++;
          } else {
            // Se não estudou, encerrar a verificação
            checkingDays = false;
          }
          
          // Limitar a verificação a 60 dias no passado para evitar loops infinitos
          if (streakDays > 60) {
            checkingDays = false;
          }
        }
      } else if (sessionsByDay.has(yesterdayStr)) {
        // Não estudou hoje, mas estudou ontem
        streakDays = 1;
        
        // Verificar dias anteriores a ontem
        let checkDate = new Date(yesterday);
        let checkingDays = true;
        
        while (checkingDays) {
          // Avançar para o dia anterior
          checkDate.setDate(checkDate.getDate() - 1);
          const dateStr = checkDate.toISOString().split('T')[0];
          
          if (sessionsByDay.has(dateStr)) {
            // Se estudou neste dia, incrementar a sequência
            streakDays++;
          } else {
            // Se não estudou, encerrar a verificação
            checkingDays = false;
          }
          
          // Limitar a verificação a 60 dias no passado para evitar loops infinitos
          if (streakDays > 60) {
            checkingDays = false;
          }
        }
      }
      // Se não estudou nem hoje nem ontem, a sequência é zero
        
      // Calcular métricas
      if (todaySessions) {
        const allSessions = [...todaySessions, ...completedSessions];
        setMetrics({
          totalSessions: allSessions.length,
          completedSessions: completedSessions.length,
          totalMinutes: completedSessions.reduce((total, s) => 
            total + (s.actual_duration_minutes || s.duration_minutes), 0),
          streakDays: streakDays
        });
      }
    } catch (error) {
      console.error("Erro ao carregar sessões do Supabase:", error);
      toast.error("Erro ao carregar sessões de estudo");
    }
  }

  const handleNewSessionClick = () => {
    setIsSessionModalOpen(true);
  };
  
  const handleQuickSessionClick = () => {
    // Em vez de abrir o modal, iniciar diretamente o cronômetro crescente
    setActiveQuickSession({});
  };

  const handleCloseSessionModal = () => {
    setIsSessionModalOpen(false);
  };

  const handleCloseQuickSessionModal = () => {
    setIsQuickSessionModalOpen(false);
  };

  const handleSessionCreated = () => {
    toast.success("Sessão de estudo criada com sucesso!");
    loadStudyData();
    handleCloseSessionModal();
    handleCloseQuickSessionModal();
  };
  
  // Função para iniciar uma sessão de estudo (mostrar cronômetro)
  const handleStartSession = (session: StudySession) => {
    if (!session || !session.id) {
      toast.error("Não foi possível iniciar a sessão. Dados incompletos.");
      return;
    }
    
    setActiveSession(session);
    toast.success("Sessão de estudo iniciada!");
  };
  
  // Função para completar uma sessão de estudo
  const handleCompleteSession = async (actualDuration: number) => {
    if (!activeSession || !activeSession.id) {
      toast.error("Não foi possível completar a sessão. Dados incompletos.");
      return;
    }
    
    try {
      setLoading(true);
      
      // Atualizar a sessão no banco de dados
      const result = await StudySessionService.completeSession(
        activeSession.id, 
        actualDuration
      );
      
      if (result) {
        toast.success("Sessão de estudo concluída com sucesso!");
        
        // Recarregar os dados
        await loadStudyData();
    } else {
        toast.error("Erro ao concluir a sessão de estudo");
      }
    } catch (error) {
      console.error("Erro ao concluir sessão:", error);
      toast.error("Erro ao concluir a sessão de estudo");
    } finally {
      setActiveSession(null);
      setLoading(false);
    }
  };
  
  // Função para cancelar uma sessão em andamento
  const handleCancelSession = () => {
    setActiveSession(null);
    toast.success("Sessão de estudo cancelada");
  };

  // Função para cancelar uma sessão rápida em andamento
  const handleCancelQuickSession = () => {
    setActiveQuickSession(null);
    toast.success("Sessão rápida cancelada");
  };
  
  // Função para completar uma sessão rápida
  const handleCompleteQuickSession = async (elapsedMinutes: number, disciplineId?: number, notes?: string) => {
    try {
      setLoading(true);
      
      // Se não temos uma disciplina selecionada, usamos uma disciplina padrão
      // Clínica Médica (ID: 8) ou a primeira disciplina disponível
      if (!disciplineId) {
        // Tentar encontrar uma disciplina disponível
        let defaultDisciplineId: number | undefined;
        
        // Verificar se temos disciplinas carregadas
        if (disciplines && disciplines.length > 0) {
          // Preferir "Clínica Médica" (ID: 8) se disponível
          const clinicaMedica = disciplines.find(d => d.id === 8);
          
          if (clinicaMedica) {
            defaultDisciplineId = clinicaMedica.id;
          } else {
            // Caso contrário, usar a primeira disciplina da lista
            defaultDisciplineId = disciplines[0].id;
          }
        } else {
          // Se não temos disciplinas carregadas, usar ID 8 (Clínica Médica)
          defaultDisciplineId = 8;
        }
        
        // Se temos uma disciplina padrão, registrar a sessão
        if (defaultDisciplineId) {
          const result = await StudySessionService.recordQuickSession(
            defaultDisciplineId,
            elapsedMinutes,
            notes
          );
          
          if (result) {
            toast.success("Sessão rápida concluída com sucesso!");
            
            // Recarregar os dados
            await loadStudyData();
          } else {
            toast.error("Erro ao concluir a sessão rápida");
          }
        } else {
          // Se mesmo assim não temos uma disciplina, mostrar o modal
          setActiveQuickSession({
            elapsedMinutes: elapsedMinutes,
            notes: notes
          });
          setIsQuickSessionModalOpen(true);
          return;
        }
      } else {
        // Registrar a sessão rápida usando o serviço e a disciplina selecionada
        const result = await StudySessionService.recordQuickSession(
          disciplineId,
          elapsedMinutes,
          notes
        );
        
        if (result) {
          toast.success("Sessão rápida concluída com sucesso!");
          
          // Recarregar os dados
          await loadStudyData();
        } else {
          toast.error("Erro ao concluir a sessão rápida");
        }
      }
    } catch (error) {
      console.error("Erro ao concluir sessão rápida:", error);
      toast.error("Erro ao concluir a sessão rápida");
    } finally {
      setActiveQuickSession(null);
      setLoading(false);
    }
  };

  // Função para formatar minutos em horas e minutos
  const formatMinutesToHours = (minutes: number): string => {
    if (!minutes) return "0h";
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  };

  // Função corrigida para formatar datas com tratamento adequado de fuso horário
  const formatDate = (dateString: string | Date): string => {
    try {
      if (!dateString) return 'Data não definida';
      
      // Criar data no fuso horário local, garantindo que não haverá conversão para UTC
      const date = new Date(dateString);
      
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error(`Erro ao formatar data ${dateString}:`, error);
      return dateString?.toString() || 'Data inválida';
    }
  };

  // Função corrigida para formatar horários com tratamento adequado de fuso horário
  const formatTime = (dateString: string | Date): string => {
    try {
      if (!dateString) return '';
      
      // Criar horário no fuso horário local
      const date = new Date(dateString);
      
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Formato 24h
      });
    } catch (error) {
      console.error(`Erro ao formatar hora ${dateString}:`, error);
      return '';
    }
  };

  const OfflineAlert = () => isOffline ? (
    <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-md flex items-center">
      <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
      <p className="text-amber-700">Você está offline. Algumas funcionalidades podem estar limitadas.</p>
          </div>
  ) : null;

  // Função para ordenar o histórico de sessões
  const sortHistorySessions = (sessions: StudySession[]) => {
    return [...sessions].sort((a, b) => {
      const dateA = new Date(a.scheduled_date || a.created_at || '').getTime();
      const dateB = new Date(b.scheduled_date || b.created_at || '').getTime();
      
      return historySort === 'newest' ? dateB - dateA : dateA - dateB;
    });
  };

  // Função para filtrar sessões do histórico
  const filterHistorySessions = (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim() === "") {
      // Se não houver termo de pesquisa, mostrar todas as sessões completadas, ordenadas
      setFilteredHistory(sortHistorySessions(completedSessions));
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = completedSessions.filter(session => 
      session.title.toLowerCase().includes(term) || 
      session.disciplineName?.toLowerCase().includes(term) ||
      (session.notes && session.notes.toLowerCase().includes(term))
    );
    
    // Retornar resultados ordenados
    setFilteredHistory(sortHistorySessions(filtered));
  };

  // Função para alternar a ordenação
  const toggleHistorySort = () => {
    const newSort = historySort === 'newest' ? 'oldest' : 'newest';
    setHistorySort(newSort);
    
    // Reordenar os resultados existentes
    setFilteredHistory(sortHistorySessions(filteredHistory));
  };

  // Função para abrir o modal do histórico de sessões completas
  const handleOpenHistoryModal = () => {
    // Inicializar o filteredHistory com todas as sessões completadas
    setFilteredHistory(sortHistorySessions(completedSessions));
    setHistorySearchTerm("");
    setIsHistoryModalOpen(true);
  };

  // Função para fechar o modal do histórico
  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
  };

  // Handler para atualizar a pesquisa
  const handleHistorySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTerm = e.target.value;
    setHistorySearchTerm(newTerm);
    filterHistorySessions(newTerm);
  };

  // Calcular o total de horas das sessões filtradas
  const calculateTotalHoursFiltered = () => {
    const totalMinutes = filteredHistory.reduce((total, session) => {
      return total + (session.actual_duration_minutes || session.duration_minutes || 0);
    }, 0);
    
    return formatMinutesToHours(totalMinutes);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center p-8 rounded-xl bg-white shadow-lg border border-blue-100 animate-fade-in">
          <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">Carregando suas sessões de estudo...</p>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-1.5 max-w-xs mx-auto overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full animate-pulse-width"></div>
              </div>
              </div>
            </div>
    );
  }

  // Ordenar as sessões agendadas por data para exibição
  const sortedUpcomingSessions = [...upcomingSessions].sort((a, b) => {
    const dateA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
    const dateB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
    return dateA - dateB;
  });

  // Agrupar sessões por data para melhor organização
  const groupSessionsByDate = () => {
    const groups: { [key: string]: StudySession[] } = {};
    
    console.log("Agrupando sessões por data. Total de sessões:", sortedUpcomingSessions.length);
    
    sortedUpcomingSessions.forEach(session => {
      if (session.scheduled_date) {
        // Extrair apenas a data (sem o horário) usando o fuso horário de Brasília
        const date = new Date(session.scheduled_date);
        console.log(`Processando sessão: ${session.title}, Data: ${date.toISOString()}`);
        
        // Usar o formato YYYY-MM-DD para a chave, mas garantir que seja baseado no fuso horário local
        const dateFormatter = new Intl.DateTimeFormat('fr-CA', { // fr-CA usa formato YYYY-MM-DD
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'America/Sao_Paulo' // Forçar fuso horário de Brasília
        });
        
        // Não precisamos mais adicionar 1 dia, pois já estamos usando o fuso horário correto
        const dateKey = dateFormatter.format(date);
        console.log(`  Chave de data gerada: ${dateKey}`);
        
        // Inicializar o grupo se não existir
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        
        // Adicionar a sessão ao grupo
        groups[dateKey].push(session);
      }
    });
    
    // Verificar os grupos criados
    console.log("Grupos de sessões criados:");
    Object.keys(groups).forEach(key => {
      console.log(`  Grupo ${key}: ${groups[key].length} sessões`);
    });
    
    return groups;
  };
  
  const sessionGroups = groupSessionsByDate();
  const groupDates = Object.keys(sessionGroups).sort();

  // Carregar as disciplinas disponíveis
  async function loadDisciplines() {
    try {
      const disciplinesData = await DisciplinesRestService.getDisciplines(true);
      setDisciplines(disciplinesData);
    } catch (error) {
      console.error("Erro ao carregar disciplinas:", error);
    }
  }

  return (
    <div className="p-0 max-w-7xl mx-auto bg-gradient-to-b from-blue-50 to-white min-h-screen animate-fade-in">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12 px-8 rounded-b-3xl shadow-lg mb-8 relative overflow-hidden">
        {/* Elementos decorativos de fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mt-32 -mr-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full -mb-64 -ml-64 blur-3xl"></div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
          <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center">
                <BrainCircuit className="mr-3 h-8 w-8" />
                Sessões de Estudo
              </h1>
              <p className="text-blue-100 md:text-lg">
                Planeje, acompanhe e gerencie seus estudos de forma eficiente
              </p>
          </div>
            <div className="flex space-x-3">
            <button
                onClick={handleQuickSessionClick}
                className="px-3 py-2 md:px-4 md:py-2 bg-white/20 hover:bg-white/30 text-white rounded-md transition-all flex items-center text-sm md:text-base backdrop-blur-sm hover:scale-105"
            >
                <Clock className="h-4 w-4 mr-1 md:mr-2" />
                Sessão Rápida
            </button>
          <button 
            onClick={handleNewSessionClick}
                className="px-3 py-2 md:px-4 md:py-2 bg-white text-indigo-700 rounded-md hover:bg-blue-50 transition-all flex items-center font-medium text-sm md:text-base hover:shadow-md hover:scale-105"
            >
                <Plus className="h-4 w-4 mr-1 md:mr-2" />
                Agendar
            </button>
            </div>
          </div>

          {/* Métricas em cards elegantes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-6 mb-0">
            {/* Card 1: Total de Sessões - Azul */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4 md:p-5 rounded-xl shadow-md transition-all hover:shadow-lg hover:scale-105">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-2 md:p-3 mr-3">
                  <BookOpen className="h-5 w-5 text-white" />
                  </div>
                <div>
                  <p className="text-xs md:text-sm text-white/80">Total de Sessões</p>
                  <h3 className="text-xl md:text-2xl font-bold text-white">{metrics.totalSessions}</h3>
                </div>
              </div>
            </div>
            
            {/* Card 2: Sessões Completas - Verde */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-700 p-4 md:p-5 rounded-xl shadow-md transition-all hover:shadow-lg hover:scale-105">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-2 md:p-3 mr-3">
                  <CheckCircle className="h-5 w-5 text-white" />
          </div>
                <div>
                  <p className="text-xs md:text-sm text-white/80">Completas</p>
                  <h3 className="text-xl md:text-2xl font-bold text-white">{metrics.completedSessions}</h3>
        </div>
          </div>
        </div>
        
            {/* Card 3: Tempo Total - Roxo */}
            <div className="bg-gradient-to-br from-purple-500 to-violet-700 p-4 md:p-5 rounded-xl shadow-md transition-all hover:shadow-lg hover:scale-105">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-2 md:p-3 mr-3">
                <Clock className="h-5 w-5 text-white" />
              </div>
                <div>
                  <p className="text-xs md:text-sm text-white/80">Tempo Total</p>
                  <h3 className="text-xl md:text-2xl font-bold text-white">{formatMinutesToHours(metrics.totalMinutes)}</h3>
            </div>
              </div>
          </div>
          
            {/* Card 4: Sequência - Laranja */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-700 p-4 md:p-5 rounded-xl shadow-md transition-all hover:shadow-lg hover:scale-105">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-2 md:p-3 mr-3">
                  <Flame className="h-5 w-5 text-white" />
              </div>
                <div>
                  <p className="text-xs md:text-sm text-white/80">Sequência</p>
                  <h3 className="text-xl md:text-2xl font-bold text-white">{metrics.streakDays} dias</h3>
            </div>
          </div>
              </div>
            </div>
        </div>
          </div>
          
      <div className="px-6">
        <OfflineAlert />

        {/* Container principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sessões Agendadas - 2/3 da tela */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 transition-all hover:shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                <div className="flex items-center mb-3 sm:mb-0">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <CalendarClock className="h-5 w-5 text-blue-600" />
              </div>
                  <h2 className="text-xl font-semibold text-gray-900">Sessões Agendadas</h2>
                </div>

                {/* Botão para histórico de sessões */}
                <button 
                  onClick={handleOpenHistoryModal}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100"
                >
                  <History className="h-4 w-4" />
                  Ver histórico completo
                </button>
              </div>
              
                {upcomingSessions.length > 0 ? (
                <div className="space-y-4">
                  {/* Sessões agendadas - mostrar todas as não completadas */}
                  <div className="bg-white rounded-lg p-6 space-y-1">
                  {groupDates.map(dateKey => {
                    // Corrigir exibição do título do grupo
                    const [year, month, day] = dateKey.split('-');
                    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
                    const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      timeZone: 'America/Sao_Paulo'
                    }).format(dateObj);

                    // Verificar se é hoje
                    const today = new Date();
                    const isToday = dateObj.toLocaleDateString() === today.toLocaleDateString();

                    return (
                        <div key={dateKey} className="mb-4 last:mb-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <div 
                              className={`w-0.5 h-6 rounded-full ${isToday ? 'bg-blue-500' : 'bg-gray-300'}`}
                            ></div>
                            <h3 className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                              {isToday ? 'Hoje - ' : ''}{dateFormatted}
                        </h3>
                          </div>
                        
                          <div className="space-y-2">
                          {sessionGroups[dateKey].map((session, index) => (
                            <div 
                              key={session.id} 
                                className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 border border-gray-200 transition-colors flex justify-between items-center"
                            >
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{session.title}</p>
                                  <div className="flex items-center mt-1">
                                    {session.disciplineName && (
                                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full mr-2">
                                        {session.disciplineName}
                                    </span>
                                    )}
                                    <span className="text-xs text-gray-500">
                                      {formatTime(session.scheduled_date || '')} • {session.duration_minutes} min
              </span>
            </div>
          </div>
                                
                          <div>
                                  <button 
                                    onClick={() => handleStartSession(session)}
                                    className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all flex items-center hover:scale-105"
                                  >
                                    <Clock className="h-4 w-4 mr-1" />
                                    Iniciar
                                  </button>
                  </div>
                </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                    </div>
                    </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300 animate-fade-in">
                  <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhuma sessão agendada</h3>
                  <p className="text-gray-500 mb-4 max-w-md mx-auto">Agende sua primeira sessão de estudos para começar a organizar seu tempo de forma eficiente</p>
                <button 
                    onClick={handleNewSessionClick}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all inline-flex items-center hover:scale-105"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Agendar Sessão
                </button>
                  </div>
                )}
              </div>
              
            {/* Sessões Completadas */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 transition-all hover:shadow-lg">
              <div className="flex items-center mb-6">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                <h2 className="text-xl font-semibold text-gray-900">Sessões Completadas</h2>
              </div>
              
                {completedSessions.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {completedSessions.slice(0, 5).map((session, index) => (
                    <div 
                      key={session.id} 
                      className="py-3 first:pt-0 last:pb-0 animate-fade-in-up" 
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex justify-between">
                          <div>
                            <h3 className="font-medium text-gray-800">{session.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(session.scheduled_date || '')} • 
                            {session.actual_duration_minutes 
                              ? ` ${formatMinutesToHours(session.actual_duration_minutes)}` 
                              : ` ${formatMinutesToHours(session.duration_minutes)}`
                            }
                          </p>
                        </div>
                        <div className="flex items-center">
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-md">
                            Concluída
                              </span>
                            </div>
                          </div>
                        </div>
                  ))}
                      </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg animate-fade-in">
                  <p className="text-gray-500">Nenhuma sessão de estudo completada</p>
                </div>
              )}
              
              {completedSessions.length > 5 && (
                <div className="mt-4 text-center pt-2 border-t border-gray-100">
                        <button 
                    onClick={handleOpenHistoryModal}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center transition-all hover:translate-x-1"
                        >
                    Ver histórico completo <ArrowRight className="h-4 w-4 ml-1" />
                        </button>
                      </div>
              )}
                    </div>
                    </div>
          
          {/* Sidebar - 1/3 da tela */}
          <div className="space-y-6">
            {/* Cronômetro Pomodoro */}
            <StudyPomodoroTimer 
              onComplete={() => {
                console.log('Pomodoro concluído!');
              }}
              onStateChange={(state) => {
                console.log('Estado do Pomodoro:', state);
              }}
            />
            
            {/* Sessão rápida */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-all">
              {/* Elementos decorativos de fundo */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mt-20 -mr-20 transition-transform group-hover:scale-150"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/10 rounded-full -mb-20 -ml-20 transition-transform group-hover:scale-150"></div>
              
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Sessão Rápida
                </h2>
                
                <p className="text-blue-100 mb-4">
                  Inicie uma sessão de estudo rápida sem agendamento para registrar seu progresso.
                </p>
                
                    <button 
                  onClick={handleQuickSessionClick}
                  className="w-full py-3 px-4 bg-white text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-all flex items-center justify-center shadow-sm hover:shadow hover:scale-105"
                    >
                  <Clock className="h-4 w-4 mr-2" />
                  Iniciar Sessão Rápida
                    </button>
                  </div>
              </div>
            
            {/* Dicas de Estudo */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 transition-all hover:shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="h-5 w-5 mr-2 text-amber-500" />
                Dicas de Estudo
              </h2>
              
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg hover:shadow-sm transition-all hover:scale-102 hover:bg-blue-100/50">
                  <p className="text-sm text-blue-800">
                    Use o cronômetro Pomodoro acima: 25 minutos de foco + 5 minutos de pausa para máxima produtividade.
                  </p>
            </div>
                
                <div className="p-3 bg-green-50 rounded-lg hover:shadow-sm transition-all hover:scale-102 hover:bg-green-100/50">
                  <p className="text-sm text-green-800">
                    Alternar entre diferentes matérias na mesma sessão pode melhorar a retenção de conteúdo.
                  </p>
          </div>
          
                <div className="p-3 bg-purple-50 rounded-lg hover:shadow-sm transition-all hover:scale-102 hover:bg-purple-100/50">
                  <p className="text-sm text-purple-800">
                    Revisitar o mesmo conteúdo em intervalos crescentes (1 dia, 3 dias, 1 semana) fortalece a memória de longo prazo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Histórico de Sessões */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <History className="h-5 w-5 mr-2 text-blue-600" />
                Histórico de Sessões Completadas
              </h2>
              <button
                onClick={handleCloseHistoryModal}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              
            {/* Barra de pesquisa e filtros */}
            <div className="p-4 border-b">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                        </div>
                  <input
                    type="text"
                    placeholder="Buscar por título, disciplina ou notas..."
                    value={historySearchTerm}
                    onChange={handleHistorySearchChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                          </div>
                
                {/* Botão de ordenação */}
                <button 
                  onClick={toggleHistorySort}
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-lg border border-gray-300 hover:border-blue-500"
                  title={historySort === 'newest' ? 'Ordenar por mais antigas primeiro' : 'Ordenar por mais recentes primeiro'}
                >
                  {historySort === 'newest' ? (
                    <>
                      <SortDesc className="h-4 w-4" />
                      <span className="hidden md:inline">Mais recentes</span>
                    </>
                  ) : (
                    <>
                      <SortAsc className="h-4 w-4" />
                      <span className="hidden md:inline">Mais antigas</span>
                    </>
                  )}
                </button>
                              </div>
                            </div>
            
            {/* Lista de sessões */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredHistory.length > 0 ? (
                <div className="space-y-4">
                  {filteredHistory.map((session) => (
                    <div key={session.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors">
                      <div className="flex flex-col md:flex-row justify-between mb-2">
                        <h3 className="font-medium text-blue-700">{session.title}</h3>
                        <span className="text-sm text-gray-500 flex items-center mt-1 md:mt-0">
                          <CalendarDays className="h-4 w-4 mr-1" />
                          {formatDate(session.scheduled_date || session.created_at || '')}
                        </span>
                          </div>
                      
                      <div className="flex flex-wrap gap-3 mb-2">
                        {session.disciplineName && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            {session.disciplineName}
                          </span>
                        )}
                        
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatMinutesToHours(session.actual_duration_minutes || session.duration_minutes)}
                        </span>
                        
                        {session.completed && (
                          <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Concluída
                          </span>
                        )}
                        </div>
                      
                      {session.notes && (
                        <div className="mt-2 text-sm text-gray-600 flex items-start">
                          <FileText className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                          <p className="line-clamp-2">{session.notes}</p>
                      </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <History className="h-8 w-8 text-gray-400" />
                    </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-1">Nenhuma sessão encontrada</h3>
                  <p className="text-gray-500">
                    {historySearchTerm 
                      ? "Tente modificar sua busca para encontrar mais resultados."
                      : "Você ainda não completou nenhuma sessão de estudo."}
                    </p>
                  </div>
                )}
              </div>
            
            <div className="p-4 border-t flex flex-col md:flex-row justify-between items-center gap-2">
              <div className="text-sm text-gray-500">
                Total: {filteredHistory.length} {filteredHistory.length === 1 ? 'sessão' : 'sessões'} completada{filteredHistory.length !== 1 ? 's' : ''}
            </div>
              
              <div className="text-sm font-medium text-blue-600 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Tempo total: {calculateTotalHoursFiltered()}
          </div>
        </div>
          </div>
        </div>
      )}

      {/* Modais */}
        <StudySessionModal 
        isOpen={isSessionModalOpen}
          onClose={handleCloseSessionModal}
          onSuccess={handleSessionCreated}
        isScheduling={true}
      />
      
      <QuickStudySessionModal
        isOpen={isQuickSessionModalOpen}
        onClose={handleCloseQuickSessionModal}
        onSuccess={handleSessionCreated}
        initialDuration={activeQuickSession?.elapsedMinutes}
        initialNotes={activeQuickSession?.notes}
      />
      
      {/* Cronômetro de sessão de estudo */}
      {activeSession && activeSession.id && (
        <StudySessionTimer
          sessionId={activeSession.id}
          title={activeSession.title}
          durationMinutes={activeSession.duration_minutes}
          onComplete={handleCompleteSession}
          onCancel={handleCancelSession}
        />
      )}
      
      {/* Cronômetro crescente para sessão rápida */}
      {activeQuickSession && (
        <GrowingTimer
          sessionTitle="Sessão Rápida"
          disciplineId={activeQuickSession.disciplineId}
          disciplineName={activeQuickSession.disciplineName}
          onComplete={handleCompleteQuickSession}
          onCancel={handleCancelQuickSession}
          />
        )}
      </div>
  );
}
