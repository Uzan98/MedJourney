"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Calendar, 
  ListChecks,
  BarChart3,
  ArrowLeft,
  Clock, 
  BookOpen,
  Loader2,
  Tag,
  RefreshCw,
  ListIcon,
  GraduationCap,
  Award,
  BarChart2,
  Star,
  Trash,
  PenSquare,
  PlayCircle,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import SmartPlanningService, { SmartPlan, SmartPlanSession, difficultyColorMap, importanceColorMap } from '@/services/smart-planning.service';
import { supabase } from '@/lib/supabase';
import { Calendar as ReactCalendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parseISO, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import Loading from '@/components/Loading';
import StudySessionTimer from '@/components/estudos/StudySessionTimer';

// Configurando o localizador de datas para o calendário
const locales = {
  'pt-BR': ptBR,
}

// Configurando o localizador para react-big-calendar
const localizer = dateFnsLocalizer({
  format,
  parse: parseISO,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

type GroupedSessions = {
  [date: string]: SmartPlanSession[];
};

// Dentro da interface SmartPlanSession, adicionar propriedades para status de conclusão
export interface SmartPlanSession {
  // ... propriedades existentes ...
  metadata?: any; // Adicionando campo para acessar os metadados
  completed?: boolean; // Campo para indicar se a sessão foi concluída
  completed_at?: string; // Data de conclusão
  actual_duration_minutes?: number; // Duração real da sessão
}

// Componente personalizado para a barra de ferramentas do calendário
const CalendarToolbar = (toolbar: any) => {
  const goToBack = () => {
    toolbar.onNavigate('PREV');
  };
  
  const goToNext = () => {
    toolbar.onNavigate('NEXT');
  };
  
  const goToCurrent = () => {
    toolbar.onNavigate('TODAY');
  };

  // Traduz os nomes das visualizações
  const viewNames: Record<string, string> = {
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda'
  };
  
  return (
    <div className="rbc-toolbar">
      <span className="rbc-btn-group">
        <button type="button" onClick={goToBack}>Anterior</button>
        <button type="button" onClick={goToCurrent}>Hoje</button>
        <button type="button" onClick={goToNext}>Próximo</button>
      </span>
      <span className="rbc-toolbar-label">{toolbar.label}</span>
      <span className="rbc-btn-group">
        {toolbar.views.map((view: string) => (
          <button
            key={view}
            type="button"
            onClick={() => toolbar.onView(view)}
            className={toolbar.view === view ? 'rbc-active' : ''}
          >
            {viewNames[view] || view}
          </button>
        ))}
      </span>
    </div>
  );
};

const SessionCard = ({ session }: { session: SmartPlanSession }) => {
  const dateObj = new Date(`${session.date}T${session.start_time}`);
  const formattedDate = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  
  // Verificar se a sessão está concluída
  const isCompleted = session.completed || false;
  
  // Estilo condicional para sessões concluídas
  const cardStyle = isCompleted 
    ? "border-green-300 bg-green-50" 
    : "border-gray-200 hover:border-blue-300";
  
  const titleStyle = isCompleted 
    ? "text-green-700" 
    : "text-gray-800";
  
  return (
    <div className={`border rounded-lg p-4 mb-4 transition-all ${cardStyle}`}>
      {isCompleted && (
        <div className="flex items-center mb-2 text-green-600">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span className="text-sm font-medium">Concluída</span>
        </div>
      )}
      <h3 className={`font-semibold text-lg mb-1 ${titleStyle}`}>
        {isCompleted && <span className="line-through mr-1">{session.title}</span>}
        {!isCompleted && session.title}
      </h3>
      <div className="flex items-center text-sm text-gray-500 mb-2">
        <Calendar className="h-4 w-4 mr-1" />
        <span>{formattedDate}</span>
      </div>
      <div className="flex items-center text-sm text-gray-500 mb-3">
        <Clock className="h-4 w-4 mr-1" />
        <span>{session.start_time} - {session.end_time}</span>
      </div>
      <div className="flex items-center text-sm mb-3">
        <BookOpen className="h-4 w-4 mr-1 text-blue-500" />
        <span className="text-blue-600">{session.discipline_name}</span>
      </div>
      {session.subject_title && (
        <div className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Matéria:</span> {session.subject_title}
        </div>
      )}
      <div className="flex items-center mt-2">
        <div className="flex-1 flex items-center">
          <Clock className="h-4 w-4 mr-1 text-gray-400" />
          <span className="text-sm text-gray-500">
            {isCompleted && session.actual_duration_minutes 
              ? `${session.actual_duration_minutes} min (real)` 
              : `${session.duration_minutes} min`}
          </span>
        </div>
        {session.is_revision && (
          <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">
            Revisão
          </div>
        )}
      </div>
    </div>
  );
};

// Traduções para o react-big-calendar em português
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
  noEventsInRange: 'Não há eventos neste período.',
  showMore: total => `+ Ver mais (${total})`,
};

export default function ViewPlanPage() {
  const params = useParams();
  const router = useRouter();
  const planId = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SmartPlan | null>(null);
  const [sessions, setSessions] = useState<SmartPlanSession[]>([]);
  const [tab, setTab] = useState<'calendar' | 'sessions' | 'stats'>('sessions');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  useEffect(() => {
    if (isNaN(planId)) {
      toast.error('ID do plano inválido');
      router.push('/planejamento/inteligente');
      return;
    }
    
    loadPlan();
  }, [planId]);
  
  const loadPlan = async () => {
      try {
        setLoading(true);
      
      // Buscar o plano
      const { data: planData, error: planError } = await supabase
        .from('smart_plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (planError) {
        throw new Error(`Erro ao buscar plano: ${planError.message}`);
      }
      
        if (!planData) {
          toast.error('Plano não encontrado');
          router.push('/planejamento/inteligente');
          return;
        }
        
      setPlan(planData as SmartPlan);
      
      // Buscar as sessões do plano
      await loadSessions(planId);
        
      } catch (error) {
      console.error('Erro ao carregar plano:', error);
      toast.error('Não foi possível carregar o plano');
      } finally {
        setLoading(false);
      }
    };
    
  const loadSessions = async (planId: number) => {
    try {
      console.log('Carregando sessões para o plano ID:', planId);
      const smartPlanningService = new SmartPlanningService();
      const sessionsData = await smartPlanningService.getPlanSessions(planId);
      
      if (sessionsData) {
        console.log(`Sessões carregadas com sucesso, total: ${sessionsData.length}`);
        
        // Processar metadados para cada sessão
        const processedSessions = sessionsData.map(session => {
          let completed = false;
          let completed_at = undefined;
          let actual_duration_minutes = undefined;
          
          // Verificar se há metadados e se a sessão está marcada como concluída
          if (session.metadata) {
            try {
              const metadata = typeof session.metadata === 'string' 
                ? JSON.parse(session.metadata) 
                : session.metadata;
                
              if (metadata.completed) {
                completed = true;
                completed_at = metadata.completed_at;
                actual_duration_minutes = metadata.actual_duration_minutes;
              }
            } catch (e) {
              console.warn('Erro ao analisar metadados da sessão:', e);
            }
          }
          
          return {
            ...session,
            completed,
            completed_at,
            actual_duration_minutes
          };
        });
        
        // Verificar datas e sessões de sexta-feira
        const datesMap = new Map<string, number[]>();
        processedSessions.forEach(session => {
          const dateStr = session.date;
          const date = new Date(dateStr);
          const dayOfWeek = date.getDay();
          
          if (!datesMap.has(dateStr)) {
            datesMap.set(dateStr, []);
          }
          datesMap.get(dateStr)?.push(dayOfWeek);
        });
        
        console.log('Mapeamento de datas e dias da semana:');
        datesMap.forEach((days, date) => {
          const uniqueDays = [...new Set(days)];
          console.log(`- Data ${date}: Dias da semana ${uniqueDays.join(', ')}`);
        });
        
        // Verificar especificamente sessões de sexta-feira
        const fridaySessions = processedSessions.filter(session => {
          const date = new Date(session.date);
          return date.getDay() === 5;
        });
        
        console.log(`Sessões de sexta-feira: ${fridaySessions.length}`);
        if (fridaySessions.length === 0) {
          console.log('⚠️ ALERTA: Nenhuma sessão encontrada para sexta-feira!');
        }
        
        setSessions(processedSessions);
      } else {
        toast.error('Não foi possível carregar as sessões do plano');
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
      toast.error('Erro ao carregar sessões do plano');
    }
  };
  
  // Agrupar sessões por data
  const groupSessionsByDate = (): GroupedSessions => {
    console.log('Agrupando sessões por data, total de sessões:', sessions.length);
    
    // Verificar se há sessões para sexta-feira
    const fridaySessions = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      const dayOfWeek = sessionDate.getDay();
      const isFriday = dayOfWeek === 5;
      return isFriday;
    });
    
    console.log('Sessões para sexta-feira:', fridaySessions.length);
    fridaySessions.forEach(session => {
      console.log(`- Sessão ID ${session.id}: Data ${session.date}, Título: ${session.title}`);
    });
    
    // Log de todas as datas únicas nas sessões
    const uniqueDates = [...new Set(sessions.map(s => s.date))];
    console.log('Datas únicas nas sessões:', uniqueDates);
    
    return sessions.reduce((groups, session) => {
      const date = session.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(session);
      return groups;
    }, {} as GroupedSessions);
  };
  
  // Formatar data para exibição
  const formatDate = (dateString: string): string => {
    // Garantir que a data seja interpretada corretamente em horário local
    // Primeiro convertemos para formato ISO sem timezone
    const [year, month, day] = dateString.split('-');
    
    // Criar data com os componentes individuais
    // Isso evita problemas de timezone ao criar a data
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Log para diagnóstico do processamento da data
    const dayOfWeek = date.getDay();
    console.log(`Formatando data: ${dateString} => ${date.toLocaleDateString('pt-BR')}`, 
                `Dia da semana: ${dayOfWeek}, É sexta? ${dayOfWeek === 5 ? 'Sim' : 'Não'}`);
    
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  
  // Formatar hora para exibição
  const formatTime = (timeString: string): string => {
    return timeString.substring(0, 5); // Pegar apenas HH:MM
  };
  
  // Calcular estatísticas do plano
  const calculateStats = () => {
    const totalSessions = sessions.length;
    const totalTime = sessions.reduce((sum, session) => sum + session.duration_minutes, 0);
    
    // Contar sessões concluídas
    const completedSessions = sessions.filter(session => session.completed).length;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    
    // Contagem de sessões por disciplina
    const disciplineCounts: {[key: string]: {count: number, minutes: number, completed: number}} = {};
    
    sessions.forEach(session => {
      const disciplineName = session.discipline_name;
      if (!disciplineCounts[disciplineName]) {
        disciplineCounts[disciplineName] = { count: 0, minutes: 0, completed: 0 };
      }
      disciplineCounts[disciplineName].count += 1;
      disciplineCounts[disciplineName].minutes += session.duration_minutes;
      if (session.completed) {
        disciplineCounts[disciplineName].completed += 1;
      }
    });
    
    // Ordenar por tempo total (decrescente)
    const sortedDisciplines = Object.entries(disciplineCounts)
      .sort((a, b) => b[1].minutes - a[1].minutes);
    
    return {
      totalSessions,
      totalTime,
      completedSessions,
      completionRate,
      disciplineStats: sortedDisciplines
    };
  };
  
  // Obter cor de destaque para a disciplina
  const getDisciplineColor = (index: number): string => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-green-500 to-green-600',
      'from-amber-500 to-amber-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
      'from-red-500 to-red-600',
      'from-cyan-500 to-cyan-600'
    ];
    
    // Se o index for maior que o tamanho do array, faz um loop
    return colors[index % colors.length];
  };
  
  // Obter ícone para o tipo de sessão
  const getSessionTypeIcon = (session: SmartPlanSession) => {
    if (session.is_revision) {
      return <RefreshCw className="h-4 w-4 text-amber-500" />;
    }
    return <BookOpen className="h-4 w-4 text-blue-500" />;
  };
  
  // Função para excluir o plano
  const handleDeletePlan = async () => {
    try {
      setIsDeleting(true);
      const smartPlanningService = new SmartPlanningService();
      const success = await smartPlanningService.deletePlan(planId);
      
      if (success) {
        toast.success('Plano excluído com sucesso');
        router.push('/planejamento/inteligente');
      } else {
        toast.error('Erro ao excluir o plano');
        setShowDeleteModal(false);
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error('Não foi possível excluir o plano');
      setShowDeleteModal(false);
      setIsDeleting(false);
    }
  };
  
  // Função para iniciar uma sessão de estudo
  const handleStartSession = (session: SmartPlanSession) => {
    // Converter a sessão para o formato compatível com a página de estudos
    const convertedSession = SmartPlanningService.convertToStudySession(session);
    
    // Redirecionar para a página de estudos com o id da sessão
    router.push(`/estudos?session=${convertedSession.id}&start=true`);
  };
  
  // Função para converter sessões no formato esperado pelo BigCalendar
  const createCalendarEvents = (sessions: SmartPlanSession[]) => {
    return sessions.map(session => {
      // Extrair componentes da data
      const dateStr = session.date; // Formato 'YYYY-MM-DD'
      const timeStr = session.start_time; // Formato 'HH:MM'
      
      // Extrair os componentes da data e hora para criar objeto Date no fuso horário local
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      // Criar data usando constructor que respeita o fuso horário local
      const startDate = new Date(year, month - 1, day, hours, minutes, 0);
      
      console.log(`Evento: ${session.title}, Data: ${dateStr}, Hora: ${timeStr}`);
      console.log(`Data criada: ${startDate.toLocaleString('pt-BR')}, Dia da semana: ${startDate.getDay()}`);
      
      // Criar data de fim baseada na duração
      const endDate = new Date(startDate.getTime());
      endDate.setMinutes(endDate.getMinutes() + session.duration_minutes);
      
      // Determinar cor com base na disciplina
      const disciplineColor = getDisciplineColor(Number(session.discipline_id));
      
      return {
        id: session.id,
        title: `${session.completed ? '✓ ' : ''}${session.title}`,
        start: startDate,
        end: endDate,
        allDay: false,
        resource: {
          ...session,
          color: disciplineColor
        }
      };
    });
  };
  
  // Função para obter a classe de cor para o evento no calendário
  const getEventStyle = (event: any) => {
    const session = event.resource;
    const isCompleted = session.completed || false;
    
    // Cores diferentes para sessões concluídas
    let backgroundColor = '#3b82f6'; // Azul padrão
    let textColor = '#ffffff';
    let border = 'none';
    let opacity = 1;
    
    if (session.is_revision) {
      backgroundColor = '#8b5cf6'; // Roxo para revisões
    }
    
    if (isCompleted) {
      backgroundColor = '#10b981'; // Verde para sessões concluídas
      opacity = 0.7; // Mais transparente para indicar conclusão
      border = '1px dashed #059669';
    }
    
    return {
      style: {
        backgroundColor,
        color: textColor,
        borderRadius: '4px',
        border,
        opacity,
        padding: '2px 5px',
      }
    };
  };
  
  // Função para renderizar o conteúdo do evento no calendário
  const renderEventContent = (eventInfo: any) => {
    const session = eventInfo.event.extendedProps.session;
    const isCompleted = session.completed || false;
    
    return (
      <div className={`p-1 ${isCompleted ? 'opacity-70' : ''}`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium truncate ${isCompleted ? 'line-through' : ''}`}>
            {eventInfo.timeText} {eventInfo.event.title}
          </span>
          {isCompleted && <CheckCircle className="h-3 w-3 text-white" />}
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <h3 className="text-xl font-medium text-gray-700">Carregando plano...</h3>
      </div>
    );
  }
  
  if (!plan) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Plano não encontrado</h2>
        <p className="text-gray-600 mb-6">O plano que você está procurando não existe ou foi removido.</p>
        <Link href="/planejamento" className="text-indigo-600 hover:text-indigo-800 font-medium">
          Voltar para Planejamento
        </Link>
      </div>
    );
  }
  
  const { totalSessions, totalTime, completedSessions, completionRate, disciplineStats } = calculateStats();
  const groupedSessions = groupSessionsByDate();
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Cabeçalho com breadcrumb e informações do plano */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <Link href="/planejamento/inteligente" className="hover:text-indigo-600 flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para Planejamento Inteligente
          </Link>
        </div>
      
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl p-6 text-white shadow-md mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-2xl font-bold mb-2">{plan.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-indigo-100">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(plan.start_date).toLocaleDateString('pt-BR')} - {new Date(plan.end_date).toLocaleDateString('pt-BR')}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{Math.floor(totalTime / 60)}h {totalTime % 60}min de estudo</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  <span>{totalSessions} sessões</span>
                </span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex flex-col md:flex-row gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                plan?.status === 'active' ? 'bg-green-400/20 text-green-100' :
                plan?.status === 'completed' ? 'bg-blue-400/20 text-blue-100' :
                plan?.status === 'archived' ? 'bg-gray-400/20 text-gray-100' :
                'bg-amber-400/20 text-amber-100'
              }`}>
                {plan?.status === 'active' ? 'Ativo' :
                 plan?.status === 'completed' ? 'Concluído' :
                 plan?.status === 'archived' ? 'Arquivado' :
                 'Rascunho'}
              </span>
              
              <Link
                href={`/planejamento/editar-plano/${planId}`}
                className="px-3 py-1 bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 transition-colors rounded-full text-sm font-medium flex items-center"
              >
                <PenSquare className="h-3.5 w-3.5 mr-1" />
                Editar Plano
              </Link>
              
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1 bg-red-500/20 text-red-100 hover:bg-red-500/30 transition-colors rounded-full text-sm font-medium flex items-center"
              >
                <Trash className="h-3.5 w-3.5 mr-1" />
                Excluir Plano
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs de navegação */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
            onClick={() => setTab('sessions')}
              className={`flex-1 px-4 py-3 font-medium text-sm flex items-center justify-center gap-2 ${
              tab === 'sessions' 
                  ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
              <ListIcon className="h-4 w-4" />
              <span>Sessões</span>
            </button>
            
            <button
            onClick={() => setTab('calendar')}
              className={`flex-1 px-4 py-3 font-medium text-sm flex items-center justify-center gap-2 ${
              tab === 'calendar' 
                  ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
              <Calendar className="h-4 w-4" />
              <span>Calendário</span>
            </button>
            
            <button
            onClick={() => setTab('stats')}
              className={`flex-1 px-4 py-3 font-medium text-sm flex items-center justify-center gap-2 ${
              tab === 'stats' 
                  ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
              <BarChart3 className="h-4 w-4" />
              <span>Estatísticas</span>
            </button>
          </div>
        </div>
        
      {/* Conteúdo da tab selecionada */}
        <div className="p-4 lg:p-6">
        {tab === 'sessions' && (
                <div className="space-y-8">
            {Object.keys(groupedSessions).length > 0 ? (
              Object.entries(groupedSessions)
                .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                .map(([date, daySessions]) => {
                    // Determinar o dia da semana
                    const [year, month, day] = date.split('-');
                    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    const dayOfWeek = dateObj.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isFriday = dayOfWeek === 5;
                    
                    return (
                      <div key={date} className="rounded-xl overflow-hidden shadow-sm border border-gray-200">
                        <div className={`px-4 py-3 text-white ${
                          isFriday 
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' // Destacar sexta-feira 
                            : isWeekend 
                              ? 'bg-gradient-to-r from-purple-500 to-purple-600' // Destacar fim de semana
                              : 'bg-gradient-to-r from-indigo-500 to-indigo-600' // Dias de semana normais
                        }`}>
                          <h3 className="text-lg font-semibold capitalize">
                            {formatDate(date)}
                            <span className="text-xs ml-2 bg-white/20 px-2 py-0.5 rounded-full">
                              Dia {dayOfWeek} {isFriday ? '(Sexta-feira)' : ''}
                            </span>
                          </h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {daySessions.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((session, index) => (
                              <div 
                                key={session.id} 
                                className={`p-4 hover:bg-gray-50 transition-colors ${session.completed ? 'bg-green-50' : ''}`}
                              >
                                <div className="flex items-start gap-4">
                                  {/* Horário e duração */}
                                  <div className="flex flex-col items-center min-w-[80px]">
                                    <div className={`${session.completed ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800'} rounded-lg px-3 py-2 text-center w-full`}>
                                      <div className="text-sm font-bold">{formatTime(session.start_time)}</div>
                                      <div className="text-xs text-indigo-600">{session.duration_minutes} min</div>
                                    </div>
                                    <div className="h-full w-0.5 bg-gray-200 my-1 mx-auto"></div>
                                    <div className="text-xs text-gray-500">{formatTime(session.end_time)}</div>
                                  </div>
                                  
                                  {/* Conteúdo da sessão */}
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      {/* Título com badge de revisão */}
                                      <h4 className="font-semibold text-gray-800">{session.title}</h4>
                                      
                                    {session.is_revision && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                          <RefreshCw className="h-3 w-3" />
                                        Revisão {session.revision_interval ? `(${session.revision_interval} dias)` : ''}
                                      </span>
                                    )}
                                    
                                    {/* Adicionar badge de conclusão */}
                                    {session.completed && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        <CheckCircle className="h-3 w-3" />
                                        Concluída
                                      </span>
                                    )}
                                  </div>
                                    
                                    {/* Disciplina */}
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
                                      <GraduationCap className="h-4 w-4 text-indigo-500" />
                                      <span className="font-medium">{session.discipline_name}</span>
                                    </div>
                                    
                                    {/* Mostrar duração real se a sessão foi concluída */}
                                    {session.completed && session.actual_duration_minutes && (
                                      <div className="mt-2 text-sm text-gray-600">
                                        <span className="font-medium">Duração real:</span> {session.actual_duration_minutes} minutos
                                      </div>
                                    )}
                                    
                                    {/* Tags de dificuldade e importância */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                    {session.subject_difficulty && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                        difficultyColorMap[session.subject_difficulty as keyof typeof difficultyColorMap] || difficultyColorMap.default
                                      }`}>
                                          <Award className="h-3 w-3" />
                                        Dificuldade: {session.subject_difficulty}
                                      </span>
                                    )}
                                    
                                    {session.subject_importance && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                        importanceColorMap[session.subject_importance as keyof typeof importanceColorMap] || importanceColorMap.default
                                      }`}>
                                          <Star className="h-3 w-3" />
                                        Importância: {session.subject_importance}
                                      </span>
                                    )}
                                  </div>

                                  {/* Adicionar botão para iniciar sessão ou mostrar concluída */}
                                  <div className="mt-3">
                                    {!session.completed ? (
                                    <button
                                      onClick={() => handleStartSession(session)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-medium transition-colors"
                                    >
                                      <PlayCircle className="h-3.5 w-3.5" />
                                      Iniciar sessão
                                    </button>
                                    ) : (
                                      <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                        Sessão concluída
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
            ) : (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma sessão encontrada</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                  Este plano ainda não possui sessões de estudo agendadas.
                </p>
                </div>
              )}
            </div>
          )}
          
        {tab === 'calendar' && (
          <div className="bg-white p-6 rounded-lg border border-gray-200">
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
              `}</style>

              <ReactCalendar
                localizer={localizer}
                events={createCalendarEvents(sessions)}
                startAccessor="start"
                endAccessor="end"
                views={['month', 'week', 'day', 'agenda']}
                view={calendarView}
                onView={(view) => setCalendarView(view as 'month' | 'week' | 'day' | 'agenda')}
                defaultView="month"
                date={calendarDate}
                onNavigate={(date) => setCalendarDate(date)}
                onSelectEvent={(event: any) => {
                  handleStartSession(event.resource);
                }}
                onSelectSlot={({ start }: { start: Date }) => {
                  // Potencialmente adicionar funcionalidade para criar novas sessões aqui
                }}
                selectable={true}
                style={{ height: '100%' }}
                messages={messages}
                popup={true}
                eventPropGetter={getEventStyle}
                formats={{
                  monthHeaderFormat: (date: Date) => format(date, "MMMM 'de' yyyy", { locale: ptBR }),
                  weekdayFormat: (date: Date) => format(date, 'EEE', { locale: ptBR }).toUpperCase(),
                  dayFormat: (date: Date) => format(date, 'dd EEE', { locale: ptBR }),
                  dayHeaderFormat: (date: Date) => format(date, "dd 'de' MMMM", { locale: ptBR }),
                  dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => 
                    `${format(start, 'd', { locale: ptBR })} - ${format(end, 'd MMM', { locale: ptBR })}`
                }}
                culture='pt-BR'
                components={{
                  toolbar: CalendarToolbar,
                  agenda: {
                    event: ({ event }) => (
                      <div className="rbc-agenda-event">
                        <span className="text-sm font-medium">{event.title}</span>
                      </div>
                    ),
                    date: ({ day }) => (
                      <span className="text-sm font-medium">
                        {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </span>
                    ),
                    time: ({ event }) => (
                      <span className="text-sm">
                        {format(event.start, 'HH:mm', { locale: ptBR })} - {format(event.end, 'HH:mm', { locale: ptBR })}
                      </span>
                    )
                  }
                }}
              />
              </div>
                </div>
        )}
        
        {tab === 'stats' && (
            <div>
              {/* Cards de estatísticas gerais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-full">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-indigo-100 mb-1">Total de Sessões</h3>
                      <p className="text-3xl font-bold">{totalSessions}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-full">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-purple-100 mb-1">Tempo Total</h3>
                      <p className="text-3xl font-bold">{Math.floor(totalTime / 60)}h {totalTime % 60}min</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-full">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-blue-100 mb-1">Período</h3>
                      <p className="text-lg font-bold">{new Date(plan.start_date).toLocaleDateString('pt-BR')} a {new Date(plan.end_date).toLocaleDateString('pt-BR')}</p>
              </div>
                </div>
                </div>
              </div>
              
              {/* Distribuição por disciplina */}
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-indigo-600" />
                Distribuição por Disciplina
              </h3>
            
            {disciplineStats.length > 0 ? (
                <div className="space-y-5">
                  {disciplineStats.map(([discipline, stats], index) => {
                  const percentage = Math.round((stats.minutes / totalTime) * 100);
                    const bgGradient = getDisciplineColor(index);
                    
                      return (
                      <div key={discipline} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white shadow-sm`}>
                              <GraduationCap className="h-5 w-5" />
                            </div>
                            <span className="font-semibold text-gray-800">{discipline}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
                              {stats.count} sessões
                            </span>
                            <span className="text-sm bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full">
                              {Math.floor(stats.minutes / 60)}h {stats.minutes % 60}min
                            </span>
                          </div>
                        </div>
                        
                        <div className="relative pt-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-semibold text-indigo-600 uppercase">Proporção do tempo total</div>
                            <div className="text-xs font-bold text-indigo-800">{percentage}%</div>
                          </div>
                          <div className="overflow-hidden h-3 text-xs flex rounded-full bg-gray-200">
                            <div 
                              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r ${bgGradient}`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                      </div>
                        </div>
                      );
                    })}
                  </div>
            ) : (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum dado disponível</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Não há dados suficientes para gerar estatísticas.
                  </p>
                </div>
            )}
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de confirmação para excluir o plano */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Excluir Plano</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o plano <span className="font-semibold">"{plan?.name}"</span>? Esta ação não pode ser desfeita e todas as sessões associadas também serão excluídas.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePlan}
                disabled={isDeleting}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center"
              >
                {isDeleting && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 