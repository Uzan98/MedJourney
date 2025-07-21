"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Discipline, Subject } from '@/lib/supabase';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { StudyStreakService, StudyStreak, WeekDay } from '@/lib/study-streak-service';
import { StudySessionService } from '@/services/study-sessions.service';
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
  Lightbulb
} from 'lucide-react';
import QuickStudySessionModal from '@/components/estudos/QuickStudySessionModal';
import MobileDashboard from '@/components/MobileDashboard';
import SimuladosPerformanceChart from '@/components/dashboard/SimuladosPerformanceChart';
import ImageCarousel from '@/components/dashboard/ImageCarousel';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import FlashcardStatsCard from '@/components/dashboard/FlashcardStatsCard';
import FlashcardReviewsCard from '@/components/dashboard/FlashcardReviewsCard';

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
    totalDisciplines: 0,
    totalSubjects: 0,
    subjectsByDifficulty: { baixa: 0, média: 0, alta: 0 },
    subjectsByImportance: { baixa: 0, média: 0, alta: 0 },
    studyHours: 0
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
        
        // Carregar disciplinas
        const disciplinesData = await DisciplinesRestService.getDisciplines(true);
        setDisciplines(disciplinesData || []);
        
        // Variáveis para estatísticas
        let allSubjects: Subject[] = [];
        let totalHours = 0;
        
        // Verificar se existem disciplinas
        if (disciplinesData && disciplinesData.length > 0) {
          // Carregar assuntos de cada disciplina
          for (const discipline of disciplinesData) {
            try {
              const disciplineSubjects = await DisciplinesRestService.getSubjects(discipline.id);
              if (disciplineSubjects) {
                allSubjects = [...allSubjects, ...disciplineSubjects];
                
                // Calcular horas estimadas
                disciplineSubjects.forEach((subject: Subject) => {
                  totalHours += subject.estimated_hours || 0;
                });
              }
            } catch (error) {
              console.error(`Erro ao carregar assuntos da disciplina ${discipline.id}:`, error);
            }
          }
        }
        
        // Atualizar estado com os assuntos
        setSubjects(allSubjects);
        
        // Calcular contagens por dificuldade e importância
        const subjectsByDifficulty = {
          baixa: allSubjects.filter(s => s.difficulty === 'baixa').length,
          média: allSubjects.filter(s => s.difficulty === 'média').length,
          alta: allSubjects.filter(s => s.difficulty === 'alta').length
        };
        
        const subjectsByImportance = {
          baixa: allSubjects.filter(s => s.importance === 'baixa').length,
          média: allSubjects.filter(s => s.importance === 'média').length,
          alta: allSubjects.filter(s => s.importance === 'alta').length
        };
        
        // Atualizar estatísticas
        setStats({
          totalDisciplines: disciplinesData?.length || 0,
          totalSubjects: allSubjects.length,
          subjectsByDifficulty,
          subjectsByImportance,
          studyHours: totalHours
        });

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
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Disciplinas</p>
                  <h3 className="text-2xl font-bold text-white">{stats.totalDisciplines}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg border border-purple-400/30 shadow-md">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-3 mr-4 shadow-inner">
                  <BookMarked className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-purple-100">Assuntos</p>
                  <h3 className="text-2xl font-bold text-white">{stats.totalSubjects}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-lg border border-emerald-400/30 shadow-md">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-3 mr-4 shadow-inner">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-emerald-100">Horas de Estudo</p>
                  <h3 className="text-2xl font-bold text-white">{stats.studyHours}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-lg border border-amber-400/30 shadow-md">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-3 mr-4 shadow-inner">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-amber-100">Alta Importância</p>
                  <h3 className="text-2xl font-bold text-white">{stats.subjectsByImportance.alta}</h3>
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
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <div className="p-2 rounded-md bg-orange-100 text-orange-600 mr-3">
                <Flame className="h-5 w-5" />
              </div>
              Sequência de Estudos
            </h2>
            <div className="text-sm bg-orange-100 text-orange-600 py-1.5 px-4 rounded-full font-medium shadow-sm border border-orange-200">
              <span className="font-bold">{studyStreak.currentStreak}</span> dias consecutivos
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <div className="flex justify-between space-x-2 md:space-x-5">
              {studyStreak.weekDays.map((day, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="text-xs font-medium text-gray-500">{day.dayName}</div>
                  <div 
                    className={`
                      w-12 h-12 flex items-center justify-center rounded-full my-2
                      ${day.isToday ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
                      ${day.hasStudied 
                        ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg transform hover:scale-105 transition-all' 
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors'}
                    `}
                  >
                    {day.hasStudied 
                      ? <Flame className="h-6 w-6" /> 
                      : <span className="text-sm font-medium">{day.dayNumber}</span>}
                  </div>
                  <div className="text-xs font-medium">
                    {day.hasStudied ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        <span>OK</span>
                      </span>
                    ) : day.isToday ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Hoje</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            
            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center p-4 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white shadow-inner">
                <Flame className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-100">Sequência Atual</p>
                <p className="text-xl font-bold text-white">{studyStreak.currentStreak} dias</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white shadow-inner">
                <Award className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-100">Maior Sequência</p>
                <p className="text-xl font-bold text-white">{studyStreak.longestStreak} dias</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white shadow-inner">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-100">Total na Semana</p>
                <p className="text-xl font-bold text-white">{studyStreak.totalDaysStudied} dias</p>
              </div>
            </div>
          </div>
        </div>
        
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
    </div>
  );
} 
