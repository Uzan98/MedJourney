"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Discipline, Subject } from '@/lib/supabase';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { StudyStreakService, StudyStreak, WeekDay } from '@/lib/study-streak-service';
import { StudySessionService } from '@/services/study-sessions.service';
import { PomodoroService } from '@/services/pomodoro.service';
import { GoalsService } from '@/lib/services/goals.service';
import { FlashcardsService } from '@/services/flashcards.service';
import { ExamsService } from '@/services/exams.service';
import { StudyRoomService } from '@/services/study-room.service';
import { StudyGroupService } from '@/services/study-group.service';
import {
  BookOpen,
  Clock,
  Calendar,
  BookMarked,
  BarChart3,
  TrendingUp,
  Layers,
  Brain,
  ArrowUpRight,
  Award,
  Flame,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  BarChart2,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  BookOpenCheck,
  Lightbulb,
  Target
} from 'lucide-react';
import QuickStudySessionModal from '@/components/estudos/QuickStudySessionModal';
import MobileDashboard from '@/components/MobileDashboard';
import SimuladosPerformanceChart from '@/components/dashboard/SimuladosPerformanceChart';
import ImageCarousel from '@/components/dashboard/ImageCarousel';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import FlashcardStatsCard from '@/components/dashboard/FlashcardStatsCard';
import FlashcardReviewsCard from '@/components/dashboard/FlashcardReviewsCard';
import GenobotTourModal from '@/components/tour/genobot-tour-modal';
import StudyStreakComponent from '@/components/dashboard/StudyStreak';

// Função auxiliar para gerar dias da semana
const getDaysOfWeek = () => {
  const today = new Date();
  const days = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    days.push({
      date,
      dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3),
      dayNumber: date.getDate(),
      isToday: i === 0,
      // Vamos simular dias com estudo - em um app real, isso viria do banco de dados
      hasStudied: Math.random() > 0.3 // Aleatório para demonstração
    });
  }
  
  return days;
};

// Interface para dados de estudo por disciplina
interface StudyByDiscipline {
  name: string;
  minutes: number;
  sessionsCount: number;
  color: string;
}

export default function DashboardPage() {
  const [isMobile, setIsMobile] = useState(false);
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studyByDiscipline, setStudyByDiscipline] = useState<StudyByDiscipline[]>([]);
  const [stats, setStats] = useState({
    totalStudyTime: 0, // em minutos
    goalPercentage: 0, // porcentagem média das metas
    flashcardMastery: 0, // domínio geral dos flashcards
    completedExams: 0 // simulados concluídos
  });
  
  // Função para formatar tempo em minutos para horas e minutos
  const formatStudyTime = (minutes: number) => {
    if (minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };
  const [statsLoading, setStatsLoading] = useState({
    studyTime: true,
    goals: true,
    flashcards: true,
    exams: true
  });
  const [studyStreak, setStudyStreak] = useState<StudyStreak>({
    currentStreak: 0,
    longestStreak: 0,
    totalDaysStudied: 0,
    weekDays: []
  });
  const [isStudySessionModalOpen, setIsStudySessionModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState<any[]>([]);
  const [showTourModal, setShowTourModal] = useState(false);
  
  // Checar se o dispositivo é mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Verificar no carregamento inicial
    checkIsMobile();
    
    // Adicionar listener para mudanças de tamanho da janela
    window.addEventListener('resize', checkIsMobile);
    
    // Limpar listener ao desmontar
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);
  
  // Carregar dados do dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Registrar login diário do usuário
        await StudyStreakService.recordDailyLogin();
        
        // Carregar disciplinas para outros componentes
        const disciplinesData = await DisciplinesRestService.getDisciplines(true);
        setDisciplines(disciplinesData || []);
        
        // Carregar estatísticas em paralelo
        loadNewStats();

        // Carregar sessões de estudo completadas
        const completedSessions = await StudySessionService.getUserSessions(true);
        const completedSessionsOnly = completedSessions.filter(session => session.completed);
        
        // Agrupar sessões por disciplina
        const sessionsGroupedByDiscipline = new Map<number, { name: string, minutes: number, count: number }>();
        
        // Inicializar o Map para todas as disciplinas
        disciplinesData.forEach(discipline => {
          sessionsGroupedByDiscipline.set(discipline.id, { 
            name: discipline.name,
            minutes: 0,
            count: 0
          });
        });
        
        // Somar minutos e contagem de sessões por disciplina
        completedSessionsOnly.forEach(session => {
          if (session.discipline_id) {
            const current = sessionsGroupedByDiscipline.get(session.discipline_id);
            if (current) {
              sessionsGroupedByDiscipline.set(session.discipline_id, {
                ...current,
                minutes: current.minutes + (session.actual_duration_minutes || session.duration_minutes),
                count: current.count + 1
              });
            }
          }
        });
        
        // Converter Map para array e ordenar por minutos (decrescente)
        const studyByDisciplineArray = Array.from(sessionsGroupedByDiscipline.values())
          .filter(item => item.minutes > 0)
          .map((item, index) => ({
            name: item.name,
            minutes: item.minutes,
            sessionsCount: item.count,
            color: `hsl(${index * 25}, 70%, 50%)`
          }))
          .sort((a, b) => b.minutes - a.minutes)
          .slice(0, 5); // Limitar a 5 disciplinas
        
        setStudyByDiscipline(studyByDisciplineArray);
        
        // Carregar dados de sequência de estudos do usuário
        const streakData = await StudyStreakService.getStudyStreak();
        if (streakData) {
          setStudyStreak(streakData);
        }
        
        // Exibir mensagem de boas-vindas
        toast.success('Bem-vindo ao Dashboard!');
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        toast.error('Erro ao carregar alguns dados');
      } finally {
        // Garantir que o carregamento termine
        setLoading(false);
      }
    };
    
    // Adicionar um timeout de segurança para garantir que o loading termine
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);
    
    loadDashboardData();
    
    return () => clearTimeout(safetyTimeout);
  }, []);

  // Função para carregar as novas estatísticas
  const loadNewStats = async () => {
    // Carregar tempo total de estudo
    loadStudyTimeStats();
    
    // Carregar porcentagem de metas
    loadGoalsStats();
    
    // Carregar domínio de flashcards
    loadFlashcardsStats();
    
    // Carregar simulados concluídos
    loadExamsStats();
  };

  // Carregar tempo total de estudo
  const loadStudyTimeStats = async () => {
    try {
      setStatsLoading(prev => ({ ...prev, studyTime: true }));
      
      // Carregar sessões de estudo regulares (excluindo Pomodoro para evitar duplicação)
      const completedSessions = await StudySessionService.getUserSessions(true);
      const completedSessionsOnly = completedSessions?.filter(s => 
        s.completed && s.type !== 'pomodoro'
      ) || [];
      
      // Calcular tempo das sessões regulares (sem Pomodoro)
      const regularStudyMinutes = completedSessionsOnly.reduce((total, s) => 
        total + (s.actual_duration_minutes || s.duration_minutes), 0);
      
      // Carregar estatísticas do Pomodoro
      const pomodoroStats = await PomodoroService.getPomodoroStats();
      const pomodoroFocusMinutes = pomodoroStats?.focusMinutes || 0;
      
      // Calcular tempo total em minutos
      const totalMinutes = regularStudyMinutes + pomodoroFocusMinutes;
      
      setStats(prev => ({ ...prev, totalStudyTime: totalMinutes }));
    } catch (error) {
      console.error('Erro ao carregar estatísticas de tempo de estudo:', error);
    } finally {
      setStatsLoading(prev => ({ ...prev, studyTime: false }));
    }
  };

  // Carregar porcentagem de metas
  const loadGoalsStats = async () => {
    try {
      setStatsLoading(prev => ({ ...prev, goals: true }));
      
      const goalsStats = await GoalsService.getGoalsStats();
      const averageProgress = goalsStats?.averageProgress || 0;
      
      setStats(prev => ({ ...prev, goalPercentage: Math.round(averageProgress) }));
    } catch (error) {
      console.error('Erro ao carregar estatísticas de metas:', error);
    } finally {
      setStatsLoading(prev => ({ ...prev, goals: false }));
    }
  };

  // Carregar domínio de flashcards
  const loadFlashcardsStats = async () => {
    try {
      setStatsLoading(prev => ({ ...prev, flashcards: true }));
      
      if (user?.id) {
        const flashcardStats = await FlashcardsService.getUserStats(user.id);
        const masteryPercentage = flashcardStats?.mastery_percentage || 0;
        
        setStats(prev => ({ ...prev, flashcardMastery: Math.round(masteryPercentage) }));
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas de flashcards:', error);
    } finally {
      setStatsLoading(prev => ({ ...prev, flashcards: false }));
    }
  };

  // Carregar simulados concluídos
  const loadExamsStats = async () => {
    try {
      setStatsLoading(prev => ({ ...prev, exams: true }));
      
      const userAttempts = await ExamsService.getUserAttempts();
      const completedAttempts = userAttempts?.filter(attempt => attempt.completed_at) || [];
      
      setStats(prev => ({ ...prev, completedExams: completedAttempts.length }));
    } catch (error) {
      console.error('Erro ao carregar estatísticas de simulados:', error);
    } finally {
      setStatsLoading(prev => ({ ...prev, exams: false }));
    }
  };

  // Verificar se é a primeira visita do usuário
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('genoma-tour-seen');
    if (!hasSeenTour && !loading) {
      // Mostrar o tour após um pequeno delay para melhor UX
      const timer = setTimeout(() => {
        setShowTourModal(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleCloseTour = () => {
    setShowTourModal(false);
    localStorage.setItem('genoma-tour-seen', 'true');
  };

  const handleOpenTour = () => {
    setShowTourModal(true);
  };
  
  useEffect(() => {
    async function fetchCarouselImages() {
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from("dashboard_carousel")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setCarouselImages(
          data.map((img: any) => ({
            src: img.image_url,
            alt: img.title || "",
            title: img.title,
            description: img.description,
            link: img.link
          }))
        );
      }
    }
    fetchCarouselImages();
  }, []);
  
  const handleSignOut = async () => {
    try {
      await signOut();
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao fazer logout');
    }
  };
  
  const handleProfileToggle = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  // Função para fechar o dropdown quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#profile-dropdown') && !target.closest('#profile-button')) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Renderizar gráfico de barras horizontais para estudo por disciplina
  const renderStudyByDisciplineChart = () => {
    if (studyByDiscipline.length === 0) {
      return (
        <div className="text-center py-6">
          <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-gray-600">Nenhuma sessão de estudo registrada</p>
          <button
            onClick={() => setIsStudySessionModalOpen(true)}
            className="mt-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Registrar estudo
          </button>
        </div>
      );
    }

    const maxMinutes = Math.max(...studyByDiscipline.map(d => d.minutes));
    
    // Definindo um esquema de cores consistente para as disciplinas
    const colorScheme = [
      "hsl(210, 80%, 55%)",  // Azul
      "hsl(280, 70%, 55%)",  // Roxo
      "hsl(10, 80%, 55%)",   // Vermelho-laranja
      "hsl(160, 70%, 45%)",  // Verde-esmeralda
      "hsl(40, 90%, 55%)",   // Amarelo-âmbar
      "hsl(330, 80%, 55%)",  // Magenta
      "hsl(190, 80%, 45%)",  // Ciano
    ];
    
    return (
      <div className="space-y-4">
        {studyByDiscipline.map((discipline, index) => {
          const percent = Math.min(100, (discipline.minutes / maxMinutes) * 100);
          const hours = Math.floor(discipline.minutes / 60);
          const mins = discipline.minutes % 60;
          const timeDisplay = hours > 0 
            ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
            : `${mins}m`;
          
          // Usar a cor do esquema definido ou gerar uma cor baseada no índice
          const color = colorScheme[index % colorScheme.length];
          const gradientStart = color;
          const gradientEnd = color.replace('55%', '45%').replace('45%', '35%');
          
          return (
            <div key={discipline.name} className="space-y-2 group">
              <div className="flex justify-between text-sm items-center">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="font-medium group-hover:text-blue-600 transition-colors truncate max-w-[150px]">
                    {discipline.name}
                  </span>
                </div>
                <span className="bg-gray-100 px-2 py-0.5 rounded-full text-gray-700 text-xs font-medium group-hover:bg-blue-100 transition-colors">
                  {timeDisplay}
                </span>
              </div>
              <div className="h-7 bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                <div 
                  className="h-full rounded-lg transition-all duration-500 ease-out flex items-center px-2"
                  style={{ 
                    width: `${percent}%`,
                    background: `linear-gradient(90deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
                    minWidth: '40px',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <span className="text-white text-xs font-medium drop-shadow-sm">
                    {discipline.sessionsCount}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div className="text-xs text-gray-500 mt-2">
          * Os números nas barras representam a quantidade de sessões
        </div>
      </div>
    );
  };
  
  // Renderizar loading state
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 border-solid mb-4"></div>
        <p className="text-gray-700">Carregando seu dashboard...</p>
      </div>
    );
  }
  
  // Gráfico de barras para dificuldade
  const renderDifficultyChart = () => {
    const { baixa, média, alta } = stats.subjectsByDifficulty;
    const maxValue = Math.max(baixa, média, alta, 1); // Evitar divisão por zero
    
    return (
      <div className="flex flex-col space-y-2">
        <div className="flex items-center">
          <span className="w-16 text-sm text-gray-600">Baixa</span>
          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full" 
              style={{ width: `${(baixa / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm font-medium">{baixa}</span>
        </div>
        
        <div className="flex items-center">
          <span className="w-16 text-sm text-gray-600">Média</span>
          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 rounded-full" 
              style={{ width: `${(média / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm font-medium">{média}</span>
        </div>
        
        <div className="flex items-center">
          <span className="w-16 text-sm text-gray-600">Alta</span>
          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 rounded-full" 
              style={{ width: `${(alta / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm font-medium">{alta}</span>
        </div>
      </div>
    );
  };
  
  // Gráfico de barras para importância
  const renderImportanceChart = () => {
    const { baixa, média, alta } = stats.subjectsByImportance;
    const maxValue = Math.max(baixa, média, alta, 1); // Evitar divisão por zero
    
    return (
      <div className="flex flex-col space-y-2">
        <div className="flex items-center">
          <span className="w-16 text-sm text-gray-600">Baixa</span>
          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full" 
              style={{ width: `${(baixa / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm font-medium">{baixa}</span>
        </div>
        
        <div className="flex items-center">
          <span className="w-16 text-sm text-gray-600">Média</span>
          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full" 
              style={{ width: `${(média / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm font-medium">{média}</span>
        </div>
        
        <div className="flex items-center">
          <span className="w-16 text-sm text-gray-600">Alta</span>
          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full" 
              style={{ width: `${(alta / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm font-medium">{alta}</span>
        </div>
      </div>
    );
  };
  

  
  // Se for dispositivo móvel, renderizar o componente MobileDashboard
  if (isMobile) {
    return (
      <MobileDashboard />
    );
  }
  
  // Renderização para desktop
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="mt-1 text-blue-100">
                Olá, {user?.user_metadata?.name || user?.email || 'Usuário'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Icone de Notificações */}
              <button className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <Bell className="h-5 w-5 text-white" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-indigo-700"></span>
              </button>
              
              {/* Dropdown de Perfil */}
              <div className="relative">
                <button 
                  id="profile-button"
                  onClick={handleProfileToggle}
                  className="flex items-center space-x-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-400 flex items-center justify-center overflow-hidden">
                    {user?.user_metadata?.avatar_url ? (
                      <img 
                        src={user.user_metadata.avatar_url} 
                        alt="Avatar" 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-white transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isProfileOpen && (
                  <div 
                    id="profile-dropdown"
                    className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-lg py-2 z-50 animate-fade-in"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.user_metadata?.name || 'Usuário'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {user?.email || ''}
                      </p>
                    </div>
                    
                    <div className="py-1">
                      <Link 
                        href="/perfil" 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <User className="h-4 w-4 mr-3 text-gray-500" />
                        Meu Perfil
                      </Link>
                      <Link 
                        href="/configuracoes" 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-500" />
                        Configurações
                      </Link>
                    </div>
                    
                    <div className="py-1 border-t border-gray-100">
            <button 
              onClick={handleSignOut}
                        className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
                        <LogOut className="h-4 w-4 mr-3 text-red-500" />
              Sair
            </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg border border-blue-400/30 shadow-md">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-3 mr-4 shadow-inner">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Tempo Total de Estudo</p>
                  <h3 className="text-2xl font-bold text-white">
                    {statsLoading.studyTime ? (
                      <span className="animate-pulse">--</span>
                    ) : (
                      `${stats.totalStudyTime}h`
                    )}
                  </h3>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg border border-purple-400/30 shadow-md">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-3 mr-4 shadow-inner">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-purple-100">Porcentagem de Meta</p>
                  <h3 className="text-2xl font-bold text-white">
                    {statsLoading.goals ? (
                      <span className="animate-pulse">--</span>
                    ) : (
                      `${stats.goalPercentage}%`
                    )}
                  </h3>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-lg border border-emerald-400/30 shadow-md">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-3 mr-4 shadow-inner">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-emerald-100">Domínio Geral dos Flashcards</p>
                  <h3 className="text-2xl font-bold text-white">
                    {statsLoading.flashcards ? (
                      <span className="animate-pulse">--</span>
                    ) : (
                      `${stats.flashcardMastery}%`
                    )}
                  </h3>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-lg border border-amber-400/30 shadow-md">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-3 mr-4 shadow-inner">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-amber-100">Simulados Concluídos</p>
                  <h3 className="text-2xl font-bold text-white">
                    {statsLoading.exams ? (
                      <span className="animate-pulse">--</span>
                    ) : (
                      stats.completedExams
                    )}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-6 py-8">
        {/* Carrossel de imagens */}
        <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <div className="p-2 rounded-md bg-blue-100 text-blue-600 mr-3">
                <Lightbulb className="h-5 w-5" />
              </div>
              Dicas e Recursos
            </h2>
          </div>
          <ImageCarousel images={carouselImages} />
        </div>

        {/* Sequência de Estudos */}
        <StudyStreakComponent 
          streak={{
            currentStreak: studyStreak.currentStreak,
            longestStreak: studyStreak.longestStreak,
            totalDaysStudied: studyStreak.totalDaysStudied,
            lastWeekActivities: studyStreak.weekDays.map(day => ({
              date: day.date.toISOString(),
              hasActivity: day.hasStudied
            })),
            lastActivity: studyStreak.weekDays.find(day => day.hasStudied)?.date.toISOString()
          }}
          isLoading={loading}
        />
        
        {/* Gráfico de desempenho em simulados */}
        <div className="mt-8 mb-8">
          <SimuladosPerformanceChart />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Área principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Estatísticas de Flashcards */}
            <FlashcardStatsCard />
            
            {/* Estudo por disciplina - Novo componente */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  Tempo de Estudo por Disciplina
                </h2>
                <BarChart2 className="text-green-600 h-5 w-5" />
              </div>
              
              {renderStudyByDisciplineChart()}
              
              {studyByDiscipline.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link 
                    href="/estudos" 
                    className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center"
                  >
                    Ver histórico completo <ArrowUpRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar com estatísticas */}
          <div className="space-y-6">
            {/* Decks para revisar hoje */}
            <FlashcardReviewsCard />
            
            {/* Acesso rápido */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Acesso Rápido
              </h2>
              
              <div className="space-y-3">
                <Link href="/flashcards" className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    <Brain className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">Flashcards</span>
                  </div>
                </Link>
                
                <Link href="/planejamento" className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">Planejamento</span>
                  </div>
                </Link>
                
                <Link href="/estudos" className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="bg-orange-100 p-2 rounded-lg mr-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">Histórico de Estudos</span>
                  </div>
                </Link>
                
                <Link href="/desempenho" className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">Desempenho</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Dica para estudos */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center mb-4">
            <Brain className="h-8 w-8 mr-4" />
            <h2 className="text-xl font-bold">Dica de Estudo</h2>
          </div>
          
          <p className="text-blue-100">
            Estudos mostram que revisar o conteúdo em intervalos regulares aumenta significativamente a retenção. 
            Tente revisar seus assuntos de alta importância pelo menos uma vez por semana.
          </p>
        </div>
      </div>
      
      {/* Modal de sessão de estudo rápida */}
      <QuickStudySessionModal
        isOpen={isStudySessionModalOpen}
        onClose={() => setIsStudySessionModalOpen(false)}
        onSuccess={() => {
          setIsStudySessionModalOpen(false);
          toast.success('Sessão de estudo registrada com sucesso!');
          // Recarregar dados após registrar uma sessão
          window.location.reload();
        }}
      />

      {/* Botão flutuante do Genobot */}
      <button
        onClick={handleOpenTour}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-full shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 flex items-center justify-center group"
        title="Conheça o Genobot e todas as funcionalidades!"
      >
        <div className="relative">
          <img 
            src="/Genobot.png" 
            alt="Genobot" 
            className="w-10 h-10 rounded-full group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
        </div>
      </button>

      {/* Tour Modal */}
      <GenobotTourModal isOpen={showTourModal} onClose={handleCloseTour} />
    </div>
  );
}
