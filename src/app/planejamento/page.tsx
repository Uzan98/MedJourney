'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlanningService, StudyPlanSession } from '@/services/planning.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays, startOfWeek, endOfWeek, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Loader2, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  BookOpen, 
  ListTodo, 
  BarChart3, 
  BookText, 
  GraduationCap, 
  Sparkles, 
  Brain,
  Bell,
  Target,
  Check,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Flame,
  ClipboardList, 
  LayoutDashboard, 
  Trash2, 
  Edit, 
  PlayCircle,
  ArrowRightCircle,
  Settings,
  PlusCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import PlannedSessionsList from '@/components/planning/PlannedSessionsList';
import { Calendar as ReactCalendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Configurando o localizador de datas para o calendário
const locales = {
  'pt-BR': ptBR,
}

// Configurando o localizador para react-big-calendar
const localizer = dateFnsLocalizer({
  format,
  parse: parseISO,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay: (date: Date) => date.getDay(),
  locales,
});

// Mensagens em português para o calendário
const messages = {
  allDay: 'Dia inteiro',
  previous: 'Anterior',
  next: 'Próximo',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Não há sessões planejadas neste período',
  showMore: total => `+ ${total} mais`,
};

export default function PlanejamentoPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekSessions, setWeekSessions] = useState<StudyPlanSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState('semana');
  const [disciplineNames, setDisciplineNames] = useState<Record<number, string>>({});
  const [metrics, setMetrics] = useState({
    totalPlanned: 0,
    upcomingSessions: 0,
    totalHours: 0,
    completedSessions: 0
  });
  const router = useRouter();

  // Função para buscar sessões da semana atual
  async function fetchWeekSessions() {
    setIsLoading(true);
    try {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const sessions = await PlanningService.getWeeklyPlannedSessions(weekStart);
      setWeekSessions(sessions);
      
      // Calcular métricas
      const now = new Date();
      const totalPlanned = sessions.length;
      const upcomingSessions = sessions.filter(s => {
        if (!s.scheduled_date) return false;
        return new Date(s.scheduled_date) > now;
      }).length;
      
      const totalMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
      const totalHours = Math.round(totalMinutes / 60 * 10) / 10; // Arredondar para 1 casa decimal
      
      const completedSessions = sessions.filter(s => s.completed).length;
      
      setMetrics({
        totalPlanned,
        upcomingSessions,
        totalHours,
        completedSessions
      });
    } catch (error) {
      console.error('Erro ao buscar sessões da semana:', error);
      toast.error('Não foi possível carregar as sessões de estudo planejadas.');
    } finally {
      setIsLoading(false);
    }
  }

  // Buscar sessões da semana atual e disciplinas
  useEffect(() => {
    fetchWeekSessions();
    fetchDisciplines();
  }, [selectedDate]);

  // Função para buscar disciplinas
  async function fetchDisciplines() {
    try {
      const { DisciplinesRestService } = await import('@/lib/supabase-rest');
      const disciplines = await DisciplinesRestService.getDisciplines();
      
      // Criar um objeto mapeando IDs para nomes
      const namesMap: Record<number, string> = {};
      disciplines.forEach(discipline => {
        namesMap[discipline.id] = discipline.name;
      });
      
      setDisciplineNames(namesMap);
    } catch (error) {
      console.error('Erro ao buscar disciplinas:', error);
    }
  }

  // Função para formatar a data da sessão
  function formatSessionDate(dateString: string | undefined) {
    if (!dateString) return "Data não definida";
    return format(parseISO(dateString), "dd 'de' MMMM", { locale: ptBR });
  }

  // Função para formatar a hora da sessão
  function formatSessionTime(dateString: string | undefined) {
    if (!dateString) return "Horário não definido";
    return format(parseISO(dateString), "HH:mm");
  }

  // Função para agrupar sessões por dia da semana
  function getSessionsByDay() {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
    
    // Criar um array com os 7 dias da semana
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dayName: format(date, 'EEEE', { locale: ptBR }),
        dayNumber: format(date, 'd'),
        sessions: weekSessions.filter(session => {
          if (!session.scheduled_date) return false;
          const sessionDate = parseISO(session.scheduled_date);
          return isSameDay(sessionDate, date);
        })
      };
    });
    
    return days;
  }

  // Função para navegar para a página de criação de sessão
  function handleCreateSession() {
    router.push('/planejamento/nova-sessao');
  }

  // Função para verificar se uma data tem sessões agendadas
  function hasSessionOnDate(date: Date) {
    return weekSessions.some(session => {
      if (!session.scheduled_date) return false;
      const sessionDate = parseISO(session.scheduled_date);
      return isSameDay(sessionDate, date);
    });
  }

  // Função para obter uma cor baseada no ID da disciplina
  const getDisciplineColor = (id: number | undefined) => {
    const colorMap: Record<number, string> = {
      1: 'blue',
      2: 'purple',
      3: 'emerald',
      4: 'amber',
      5: 'pink',
      6: 'indigo',
      7: 'green',
      8: 'red'
    };
    
    return colorMap[id || 0] || 'blue';
  };

  // Função para iniciar uma sessão
  const handleStartSession = (session: StudyPlanSession) => {
    // Redirecionar para a página de estudos com o id da sessão
    router.push(`/estudos?session=${session.id}&start=true`);
  };

  // Função para converter sessões no formato esperado pelo BigCalendar
  const createCalendarEvents = (sessions: StudyPlanSession[]) => {
    return sessions.map(session => {
      const startDate = session.scheduled_date ? parseISO(session.scheduled_date) : new Date();
      const endDate = new Date(startDate.getTime());
      
      // Adicionar a duração para calcular o fim do evento
      if (session.duration_minutes) {
        endDate.setMinutes(endDate.getMinutes() + session.duration_minutes);
      } else {
        // Padrão de 1 hora se não houver duração
        endDate.setHours(endDate.getHours() + 1);
      }
      
      // Determinar cor com base na disciplina
      const disciplineColor = getDisciplineColor(session.discipline_id);
      
      return {
        id: session.id,
        title: session.title || 'Sessão de estudo',
        start: startDate,
        end: endDate,
        allDay: false,
        resource: {
          ...session,
          disciplineName: disciplineNames[session.discipline_id || 0] || 'Disciplina',
          color: disciplineColor
        }
      };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Elementos decorativos */}
        <div className="relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
          <div className="absolute top-40 -left-20 w-72 h-72 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
        </div>
        
        {/* Header ao estilo da imagem enviada - fundo azul */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 mb-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-20 rounded-full -mt-32 -mr-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 opacity-10 rounded-full -mb-32 -ml-32"></div>
          
        <div className="relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Planejamento de Estudos</h1>
                <p className="text-gray-600 mt-1 md:mt-2">
                  Organize suas semanas de estudo e acompanhe seu progresso
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Configurações</span>
                </button>
                <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  <span>Nova Sessão</span>
                </button>
              </div>
            </div>
            
            {/* Cards de métricas coloridos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-500/80 backdrop-blur-sm p-4 rounded-xl shadow-md border border-blue-500/50 hover:bg-blue-500/85 transition-colors">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mr-4 shadow-md">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/90">Total de Sessões</p>
                    <p className="text-3xl font-bold text-white">{metrics.totalPlanned}</p>
                  </div>
                </div>
                </div>
              
              <div className="bg-green-500/80 backdrop-blur-sm p-4 rounded-xl shadow-md border border-green-500/50 hover:bg-green-500/85 transition-colors">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center mr-4 shadow-md">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/90">Completas</p>
                    <p className="text-3xl font-bold text-white">{metrics.completedSessions}</p>
                  </div>
                </div>
                </div>
              
              <div className="bg-purple-500/80 backdrop-blur-sm p-4 rounded-xl shadow-md border border-purple-500/50 hover:bg-purple-500/85 transition-colors">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center mr-4 shadow-md">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/90">Tempo Total</p>
                    <p className="text-3xl font-bold text-white">{metrics.totalHours}h</p>
                  </div>
                </div>
                </div>
              
              <div className="bg-orange-500/80 backdrop-blur-sm p-4 rounded-xl shadow-md border border-orange-500/50 hover:bg-orange-500/85 transition-colors">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center mr-4 shadow-md">
                    <Flame className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/90">Sequência</p>
                    <p className="text-3xl font-bold text-white">0 dias</p>
                  </div>
                  </div>
                </div>
                </div>
          </div>
            </div>

          {/* Banner do Planejamento Inteligente */}
          <div className="mt-6 mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 opacity-20">
              <div className="w-full h-full bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                </div>
            
            <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center">
              <div className="flex-1 text-white mb-4 md:mb-0">
                <div className="flex items-center">
                  <h2 className="text-xl md:text-2xl font-bold">Novo! Planejamento Inteligente</h2>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-purple-700">
                    Beta
                  </span>
              </div>
                <p className="mt-2 text-indigo-100 max-w-lg">
                  Deixe nossa IA gerar seu plano de estudos personalizado baseado nas suas prioridades,
                  dificuldades e disponibilidade de tempo.
                </p>
                
              <Link 
                href="/planejamento/inteligente" 
                  className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-white text-purple-700 font-medium hover:bg-indigo-50 transition-colors"
              >
                  Experimentar
                  <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              </div>
              
              <div className="flex-shrink-0 bg-white bg-opacity-10 p-4 rounded-full">
                <Brain className="h-16 w-16 text-white" />
            </div>
            </div>
            
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600"></div>
          </div>

          {/* Abas melhoradas */}
            <Tabs defaultValue="semana" className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl mb-6">
                <TabsTrigger 
                  value="semana" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <ListTodo className="h-4 w-4 mr-2" />
                  Visão Semanal
                </TabsTrigger>
                <TabsTrigger 
                  value="calendario"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Calendário
                </TabsTrigger>
              </TabsList>
              
            <TabsContent value="semana" className="mt-2">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                      <p className="text-blue-600 animate-pulse">Carregando suas sessões...</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Header com dias da semana - visual moderno e colorido */}
                    <div className="grid grid-cols-7 gap-1 mb-6">
                    {getSessionsByDay().map((day) => {
                    const isToday = isSameDay(day.date, new Date());
                        const hasSession = day.sessions.length > 0;
                      
                      return (
                          <div 
                          key={day.dayNumber} 
                            className={`relative cursor-pointer group transition-all duration-200 ${
                              isToday ? 'z-10' : 'z-0'
                            }`}
                            onClick={() => setSelectedDate(day.date)}
                          >
                            <div className={`
                              flex flex-col items-center py-3 px-1 rounded-xl 
                              ${isToday 
                                ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg transform scale-105' 
                                : hasSession 
                                  ? 'bg-gradient-to-b from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 border border-gray-200' 
                                  : 'bg-white border border-gray-200 hover:border-gray-300'
                              }
                              ${isSameDay(day.date, selectedDate) && !isToday 
                                ? 'ring-2 ring-blue-400 ring-opacity-50' 
                                : ''
                              }
                              group-hover:shadow-md
                            `}>
                              <span className="text-xs font-medium capitalize mb-1 text-center">
                                {format(day.date, 'EEE', { locale: ptBR })}
                              </span>
                              
                              <span className={`
                                flex items-center justify-center w-9 h-9 rounded-full font-bold
                                ${isToday 
                                  ? 'bg-white text-blue-600' 
                                  : hasSession 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-gray-100 text-gray-600'
                                }
                              `}>
                                {day.dayNumber}
                              </span>
                              
                              {hasSession && (
                                <div className="mt-2 flex space-x-1 justify-center">
                                  {day.sessions.length > 3 ? (
                                    <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                      {day.sessions.length} sessões
                                    </span>
                                  ) : (
                                    Array(Math.min(day.sessions.length, 3))
                                      .fill(0)
                                      .map((_, idx) => (
                                        <div 
                                          key={idx}
                                          className={`w-2 h-2 rounded-full bg-${getDisciplineColor(day.sessions[idx].discipline_id)}-500`}
                                        ></div>
                                      ))
                                  )}
                                </div>
                              )}
                              
                                    {isToday && (
                                <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-[10px] font-bold text-white bg-blue-500 rounded-full px-2">
                                  HOJE
                                      </span>
                                    )}
                                </div>
                          </div>
                        );
                      })}
                              </div>
                              
                    {/* Timeline das sessões do dia selecionado */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 flex justify-between items-center">
                        <h3 className="text-white font-medium flex items-center">
                          <CalendarIcon className="h-5 w-5 mr-2 text-blue-100" />
                          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </h3>
                        
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => router.push('/planejamento/nova-sessao')}
                          className="bg-white/20 hover:bg-white/30 text-white border-none"
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          Nova Sessão
                        </Button>
                                </div>
                      
                      {/* Sessões do dia selecionado */}
                      <div className="p-5">
                        {weekSessions.filter(session => {
                          if (!session.scheduled_date) return false;
                          const sessionDate = parseISO(session.scheduled_date);
                          return isSameDay(sessionDate, selectedDate);
                        }).length > 0 ? (
                              <div className="space-y-4">
                            {weekSessions
                              .filter(session => {
                                if (!session.scheduled_date) return false;
                                const sessionDate = parseISO(session.scheduled_date);
                                return isSameDay(sessionDate, selectedDate);
                              })
                              .sort((a, b) => {
                                if (!a.scheduled_date || !b.scheduled_date) return 0;
                                return parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime();
                              })
                              .map((session, index) => {
                                  const color = getDisciplineColor(session.discipline_id);
                                const isCompleted = session.completed;
                                const timeOfDay = session.scheduled_date 
                                  ? parseISO(session.scheduled_date).getHours() 
                                  : 12;
                                
                                // Determinar período do dia para ícone
                                let periodIcon;
                                if (timeOfDay < 12) {
                                  periodIcon = <div className="text-amber-500"><Sparkles className="h-4 w-4" /></div>;
                                } else if (timeOfDay < 18) {
                                  periodIcon = <div className="text-orange-500"><Clock className="h-4 w-4" /></div>;
                                } else {
                                  periodIcon = <div className="text-indigo-500"><Bell className="h-4 w-4" /></div>;
                                }
                                  
                                  return (
                                    <div 
                                      key={session.id} 
                                    className={`
                                      relative group rounded-xl p-4 transition-all duration-200
                                      ${isCompleted 
                                        ? 'bg-green-50 hover:bg-green-100' 
                                        : `bg-${color}-50 hover:bg-${color}-100/80`
                                      }
                                      border border-transparent hover:border-${color}-200
                                      hover:shadow-md
                                    `}
                                  >
                                    {/* Linha do tempo conectando sessões */}
                                    {index !== 0 && (
                                      <div className="absolute -top-4 left-8 w-0.5 h-4 bg-gray-200 z-0"></div>
                                    )}
                                    
                                    <div className="flex">
                                      {/* Marcador de horário */}
                                      <div className="mr-4 flex flex-col items-center">
                                        <div className={`
                                          w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-sm
                                          ${isCompleted 
                                            ? 'bg-green-100 text-green-800' 
                                            : `bg-${color}-100 text-${color}-800`
                                          }
                                        `}>
                                          <div className="text-xs font-semibold">
                                            {formatSessionTime(session.scheduled_date)}
                                      </div>
                                          <div className="mt-1">
                                            {periodIcon}
                                          </div>
                                        </div>
                                        
                                        <div className="mt-2 text-xs text-gray-500 font-medium">
                                          {session.duration_minutes || 0} min
                                        </div>
                                      </div>
                                      
                                      {/* Conteúdo da sessão */}
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <h3 className="font-semibold text-gray-900 mb-0.5">
                                              {session.title || 'Sessão de estudo'}
                                            </h3>
                                            <div className="flex items-center">
                                              <span className={`text-sm font-medium text-${color}-700`}>
                                            {disciplineNames[session.discipline_id || 0] || 'Disciplina'}
                                              </span>
                                              
                                          {isCompleted && (
                                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                                              <Check className="h-3 w-3 mr-1" />
                                              Concluída
                                            </span>
                                          )}
                                          </div>
                                        </div>
                                          
                                          {!isCompleted && isSameDay(selectedDate, new Date()) && (
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => handleStartSession(session)}
                                              className={`text-${color}-700 border-${color}-200 hover:bg-${color}-100 
                                                transition-all duration-200 hover:scale-105
                                                opacity-90 group-hover:opacity-100`}
                                          >
                                              <PlayCircle className="h-4 w-4 mr-1.5" />
                                            Iniciar
                                          </Button>
                                        )}
                                        </div>
                                        
                                        {session.notes && (
                                          <div className="mt-3 text-sm text-gray-600 bg-white/70 p-3 rounded-lg">
                                            <p className="line-clamp-2">{session.notes}</p>
                                          </div>
                                        )}
                                        
                                        {/* Ações da sessão que aparecem ao passar o mouse */}
                                        <div className="mt-3 pt-2 border-t border-gray-200/70 flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 text-gray-500 hover:text-gray-800"
                                            onClick={() => router.push(`/planejamento/editar-sessao/${session.id}`)}
                                          >
                                            <Edit className="h-3.5 w-3.5 mr-1" />
                                            Editar
                                          </Button>
                                          
                                          <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                          >
                                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                                            Excluir
                                          </Button>
                                        </div>
                                      </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                          <div className="flex flex-col items-center justify-center p-10 bg-gray-50 rounded-xl text-center">
                            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                              <CalendarIcon className="h-10 w-10 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-medium text-gray-800 mb-2">Nenhuma sessão planejada</h3>
                            <p className="text-gray-500 mb-6 max-w-md">
                              Você não tem nenhuma sessão de estudo planejada para este dia.
                              Aproveite para adicionar algo ao seu cronograma!
                            </p>
                                <Button 
                                  onClick={() => router.push('/planejamento/nova-sessao')}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                                >
                              <Plus className="h-4 w-4 mr-2" />
                              Planejar Nova Sessão
                                </Button>
                              </div>
                            )}
                      </div>
                      
                      {/* Resumo do dia selecionado */}
                      {weekSessions.filter(session => {
                        if (!session.scheduled_date) return false;
                        const sessionDate = parseISO(session.scheduled_date);
                        return isSameDay(sessionDate, selectedDate);
                      }).length > 0 && (
                        <div className="border-t border-gray-200 bg-gray-50 p-4">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-6 text-sm">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-blue-500 mr-1.5" />
                                <span className="text-gray-700">
                                  {weekSessions
                                    .filter(session => {
                                      if (!session.scheduled_date) return false;
                                      const sessionDate = parseISO(session.scheduled_date);
                                      return isSameDay(sessionDate, selectedDate);
                                    })
                                    .reduce((total, session) => total + (session.duration_minutes || 0), 0)
                                  } minutos totais
                                </span>
                              </div>
                              
                              <div className="flex items-center">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-1.5" />
                                <span className="text-gray-700">
                                  {weekSessions
                                    .filter(session => {
                                      if (!session.scheduled_date) return false;
                                      const sessionDate = parseISO(session.scheduled_date);
                                      return isSameDay(sessionDate, selectedDate) && session.completed;
                                    }).length
                                  } sessões concluídas
                                </span>
                              </div>
                            </div>
                            
                              <Button 
                              variant="link" 
                              className="text-blue-600 font-medium flex items-center p-0"
                                onClick={() => router.push('/planejamento/nova-sessao')}
                              >
                              Nova Sessão
                              <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Próxima semana - preview */}
                    <div className="mt-8">
                      <h3 className="font-medium text-gray-700 mb-4 flex items-center">
                        <ArrowRightCircle className="h-5 w-5 mr-2 text-blue-500" />
                        Planejamento das próximas semanas
                      </h3>
                      
                      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
                        <div className="text-center p-6">
                          <p className="text-gray-500 mb-4">
                            Visualize seu planejamento futuro no calendário para ter uma visão completa dos seus estudos.
                          </p>
                          <Button 
                            variant="outline"
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => document.querySelector('[data-value="calendario"]')?.dispatchEvent(new Event('click'))}
                          >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            Ver Calendário Completo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
            <TabsContent value="calendario" className="mt-2">
              <div className="space-y-6">
                {/* Header simplificado do calendário */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-white flex items-center">
                          <CalendarIcon className="h-6 w-6 mr-2 text-blue-100" />
                        Calendário de Estudos
                        </h2>
                        <p className="text-blue-100 mt-1 text-sm">
                          Visualize todas as suas sessões e planeje seu mês de estudos
                        </p>
                    </div>
                      <div className="flex space-x-3 mt-4 md:mt-0">
                    <Button 
                          variant="secondary"
                      size="sm"
                          onClick={() => router.push('/planejamento/nova-sessao')}
                          className="bg-white/20 hover:bg-white/30 text-white border-none"
                    >
                          <Plus className="h-4 w-4 mr-1.5" />
                      Nova Sessão
                    </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedDate(new Date())}
                          className="bg-white/20 hover:bg-white/30 text-white border-none"
                        >
                          <Clock className="h-4 w-4 mr-1.5" />
                          Hoje
                        </Button>
                  </div>
                    </div>
                  </div>
                </div>
                
                {/* Calendário aprimorado */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100/80 overflow-hidden">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-96">
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                        <p className="text-blue-600 animate-pulse">Carregando seu calendário...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[650px] w-full">
                      <style jsx global>{`
                        .rbc-calendar {
                          font-family: var(--font-inter);
                          border-radius: 0;
                          background-color: #fff;
                          border: none;
                        }
                        
                        .rbc-toolbar {
                          padding: 20px;
                          background-color: #f8fafc;
                          border-bottom: 1px solid #e2e8f0;
                          margin-bottom: 0;
                        }
                        
                        .rbc-toolbar-label {
                          font-size: 1.4rem;
                          font-weight: 700;
                          text-transform: capitalize;
                          color: #1e293b;
                          letter-spacing: -0.3px;
                        }
                        
                        .rbc-header {
                          padding: 14px 6px;
                          font-weight: 600;
                          text-transform: uppercase;
                          font-size: 0.75rem;
                          color: #64748b;
                          background-color: #f1f5f9;
                          border-bottom: 1px solid #e2e8f0;
                        }
                        
                        .rbc-month-view {
                          border: none;
                          background-color: #fff;
                          border-radius: 0;
                          overflow: hidden;
                        }
                        
                        .rbc-month-row {
                          overflow: visible !important;
                          border-top: 1px solid #e2e8f0;
                          min-height: 110px;
                        }
                        
                        .rbc-day-bg {
                          transition: all 0.2s ease-in-out;
                        }
                        
                        .rbc-day-bg:hover {
                          background-color: #f1f5f9;
                          cursor: pointer;
                        }
                        
                        .rbc-date-cell {
                          padding: 8px;
                          text-align: center;
                          font-size: 0.9rem;
                          color: #475569;
                        }
                        
                        .rbc-date-cell.rbc-now {
                          font-weight: 700;
                          color: #2563eb;
                        }
                        
                        .rbc-today {
                          background-color: rgba(219, 234, 254, 0.5);
                        }
                        
                        .rbc-off-range-bg {
                          background-color: #f8fafc;
                        }
                        
                        .rbc-off-range {
                          color: #94a3b8;
                        }
                        
                        .rbc-show-more {
                          font-size: 0.75rem;
                          font-weight: 500;
                          color: #2563eb !important;
                          background-color: transparent !important;
                          padding: 2px 5px;
                        }
                        
                        .rbc-show-more:hover {
                          text-decoration: none;
                          color: #1d4ed8 !important;
                          background-color: #eff6ff !important;
                        }
                        
                        .rbc-event {
                          border-radius: 6px;
                          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
                          padding: 4px 8px;
                          margin: 2px;
                          font-size: 0.75rem;
                          font-weight: 500;
                          cursor: pointer;
                          transition: all 0.2s;
                          border: none;
                          position: relative;
                        }
                        
                        .rbc-event:hover {
                          transform: translateY(-1px);
                          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
                        }
                        
                        .rbc-event:before {
                          content: '';
                          position: absolute;
                          left: 0;
                          top: 0;
                          bottom: 0;
                          width: 3px;
                          background-color: rgba(255, 255, 255, 0.5);
                          border-radius: 3px 0 0 3px;
                        }
                        
                        .rbc-event-label {
                          display: none;
                        }
                        
                        .rbc-event-content {
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          line-height: 1.4;
                        }
                        
                        .rbc-toolbar button {
                          border-radius: 6px;
                          padding: 6px 12px;
                          color: #475569;
                          transition: all 0.15s;
                          border: 1px solid #e2e8f0;
                          font-weight: 500;
                          margin: 0 3px;
                        }
                        
                        .rbc-toolbar button:hover {
                          background-color: #f1f5f9;
                          border-color: #cbd5e1;
                          color: #1e293b;
                        }
                        
                        .rbc-active {
                          background-color: #eff6ff !important;
                          color: #2563eb !important;
                          border-color: #bfdbfe !important;
                          font-weight: 600 !important;
                        }
                        
                        .rbc-row-segment {
                          padding: 0 1px;
                        }
                        
                        /* Estilos para visualização semanal */
                        .rbc-time-view {
                          border: none;
                        }
                        
                        .rbc-time-header {
                          border-bottom: 1px solid #e2e8f0;
                        }
                        
                        .rbc-time-content {
                          border-top: 1px solid #e2e8f0;
                        }
                        
                        .rbc-time-slot {
                          color: #64748b;
                          font-size: 0.75rem;
                        }
                        
                        .rbc-allday-cell {
                          height: auto;
                          max-height: 70px;
                        }
                        
                        .rbc-timeslot-group {
                          border-bottom: 1px solid #f1f5f9;
                        }
                        
                        .rbc-agenda-view table {
                          border: none;
                        }
                        
                        .rbc-agenda-view table thead {
                          background-color: #f8fafc;
                        }
                        
                        .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
                          padding: 10px;
                        }
                        
                        .rbc-agenda-view table.rbc-agenda-table tbody > tr:hover {
                          background-color: #f1f5f9;
                        }
                        
                        .has-sessions {
                          position: relative;
                        }
                        
                        .has-sessions:after {
                          content: '';
                          position: absolute;
                          right: 6px;
                          top: 6px;
                          width: 8px;
                          height: 8px;
                          border-radius: 50%;
                          background-color: #3b82f6;
                          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                        }
                      `}</style>

                      <ReactCalendar
                        localizer={localizer}
                        events={createCalendarEvents(weekSessions)}
                        startAccessor="start"
                        endAccessor="end"
                        views={['month', 'week', 'day', 'agenda']}
                        defaultView="month"
                        defaultDate={selectedDate}
                        onNavigate={(date: Date) => setSelectedDate(date)}
                        onSelectEvent={(event: any) => {
                          setSelectedDate(event.start);
                        }}
                        onSelectSlot={({ start }: { start: Date }) => {
                          setSelectedDate(start);
                        }}
                        selectable={true}
                        style={{ height: '100%' }}
                        messages={messages}
                        popup={true}
                        formats={{
                          monthHeaderFormat: (date: Date) => format(date, "MMMM 'de' yyyy", { locale: ptBR }),
                          weekdayFormat: (date: Date) => format(date, 'EEE', { locale: ptBR }).toUpperCase(),
                          dayFormat: (date: Date) => format(date, 'dd EEE', { locale: ptBR }),
                          dayHeaderFormat: (date: Date) => format(date, "dd 'de' MMMM", { locale: ptBR }),
                          dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => 
                            `${format(start, 'd', { locale: ptBR })} - ${format(end, 'd MMM', { locale: ptBR })}`
                        }}
                        eventPropGetter={(event: any) => {
                          // Usar a cor associada à disciplina
                          const colorKey = event.resource?.color || 'blue';
                          const colorMap: Record<string, string> = {
                            'blue': '#3b82f6',
                            'purple': '#8b5cf6',
                            'emerald': '#10b981',
                            'amber': '#f59e0b',
                            'pink': '#ec4899',
                            'indigo': '#6366f1',
                            'green': '#22c55e',
                            'red': '#ef4444'
                          };
                          
                          const backgroundColor = colorMap[colorKey] || '#3b82f6';
                          
                          const style: React.CSSProperties = {
                            backgroundColor,
                            color: 'white',
                            borderColor: backgroundColor
                          };
                          
                          // Se a sessão estiver concluída, mudar cor para verde
                          if (event.resource && event.resource.completed) {
                            style.backgroundColor = '#10b981';
                            style.borderColor = '#10b981';
                          }
                          
                          return { style };
                        }}
                        dayPropGetter={(date: Date) => {
                          // Destacar dias com sessões
                          const hasSession = hasSessionOnDate(date);
                          const isToday = isSameDay(date, new Date());
                          
                          return {
                            className: hasSession ? 'has-sessions' : '',
                            style: {
                              // Se não for hoje, destacar dias com sessões com uma cor de fundo sutil
                              backgroundColor: hasSession && !isToday ? '#f0f7ff' : undefined
                            }
                          };
                        }}
                      />
                    </div>
                  )}
                </div>
                
                {/* Detalhes do dia selecionado com visual aprimorado */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100/80 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-800 flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
                      {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {isSameDay(selectedDate, new Date()) && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Hoje
                        </span>
                      )}
                    </h3>
                  </div>
                    
                  <div className="p-5">
                    {weekSessions.filter(session => {
                      if (!session.scheduled_date) return false;
                      const sessionDate = parseISO(session.scheduled_date);
                      return isSameDay(sessionDate, selectedDate);
                    }).length > 0 ? (
                      <div className="space-y-3">
                        {weekSessions
                          .filter(session => {
                            if (!session.scheduled_date) return false;
                            const sessionDate = parseISO(session.scheduled_date);
                            return isSameDay(sessionDate, selectedDate);
                          })
                          .sort((a, b) => {
                            if (!a.scheduled_date || !b.scheduled_date) return 0;
                            return parseISO(a.scheduled_date).getTime() - parseISO(b.scheduled_date).getTime();
                          })
                          .map((session) => {
                            const color = getDisciplineColor(session.discipline_id);
                            const isCompleted = session.completed;
                            
                            return (
                              <div 
                                key={session.id} 
                                className={`
                                  relative group bg-white rounded-lg p-4 transition-all duration-200
                                  border border-gray-200 hover:border-${color}-200
                                  hover:shadow-md
                                `}
                              >
                                <div className="flex items-start space-x-4">
                                  <div className="relative">
                                    <div className="text-xs font-bold rounded-lg bg-gray-100 text-gray-700 px-2 py-1 flex flex-col items-center min-w-[48px]">
                                      <span>{formatSessionTime(session.scheduled_date)}</span>
                                      <span className="text-[10px] text-gray-500 mt-0.5">
                                        {session.duration_minutes || 0}min
                                    </span>
                                  </div>
                                    
                                    {/* Indicador de status */}
                                    <div className={`
                                      absolute -left-1 top-0 bottom-0 w-1.5 rounded-l-lg
                                      ${isCompleted ? 'bg-green-500' : `bg-${color}-500`}
                                    `}></div>
                                </div>
                                  
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium text-gray-900">
                                        {session.title || 'Sessão de estudo'}
                                      </h4>
                                      
                                      {/* Badges de status */}
                                      <div className="flex items-center space-x-2">
                                        {isCompleted ? (
                                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center">
                                            <Check className="h-3 w-3 mr-1" />
                                            Concluída
                                          </span>
                                        ) : isSameDay(selectedDate, new Date()) ? (
                                    <Button 
                                      size="sm" 
                                            variant="outline"
                                      onClick={() => handleStartSession(session)}
                                            className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                            <PlayCircle className="h-3.5 w-3.5 mr-1" />
                                      Iniciar
                                    </Button>
                                        ) : (
                                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                            Agendada
                                    </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="mt-1.5 flex items-center text-xs text-gray-500">
                                      <div 
                                        className={`w-2 h-2 rounded-full bg-${color}-500 mr-1.5`}
                                      ></div>
                                      <span>{disciplineNames[session.discipline_id || 0] || 'Disciplina'}</span>
                                    </div>
                                    
                                    {session.notes && (
                                      <div className="mt-2 text-sm text-gray-600">
                                        <p className="line-clamp-2">{session.notes}</p>
                                      </div>
                                    )}
                                    
                                    {/* Ações que só aparecem ao passar o mouse */}
                                    <div className="mt-2.5 flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-7 text-gray-500 hover:text-gray-800"
                                        onClick={() => router.push(`/planejamento/editar-sessao/${session.id}`)}
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Editar
                                      </Button>
                                      
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Excluir
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Adicionar sessão para este dia específico */}
                          <div className="mt-4 text-center">
                            <Button 
                              variant="outline" 
                              className="border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              onClick={() => {
                                // Armazenar a data selecionada para pré-preencher o formulário
                                const formattedDate = format(selectedDate, 'yyyy-MM-dd');
                                router.push(`/planejamento/nova-sessao?date=${formattedDate}`);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1.5" />
                              Adicionar sessão para este dia
                            </Button>
                          </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 bg-gray-50/70 rounded-lg text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-100/70 flex items-center justify-center mb-3">
                          <CalendarIcon className="h-8 w-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-800 mb-1">Dia livre</h3>
                        <p className="text-gray-500 mb-4 max-w-sm">
                          Você não tem nenhuma sessão de estudo planejada para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}.
                        </p>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            // Armazenar a data selecionada para pré-preencher o formulário
                            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
                            router.push(`/planejamento/nova-sessao?date=${formattedDate}`);
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Planejar sessão
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            </Tabs>
    </div>
    </div>
  );
}