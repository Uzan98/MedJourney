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
  is_revision?: boolean; // Indica se é uma sessão de revisão
  original_session_id?: number; // ID da sessão original se for uma revisão
  revision_interval?: number; // Intervalo de revisão em dias
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
                      <div key={date} className="rounded-xl overflow-hidden shadow-lg border border-emerald-100 mb-6">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm">
                          <div className="flex items-center justify-between px-5 py-4">
                            <h3 className="text-lg font-medium capitalize flex items-center">
                              <Calendar className="h-5 w-5 mr-2 text-white/80" />
                              {formatDate(date)}
                            </h3>
                            <span className="text-sm px-3 py-1 rounded-full font-medium bg-white/20 text-white">
                              {isFriday ? 'Sexta-feira' : isWeekend ? (dayOfWeek === 0 ? 'Domingo' : 'Sábado') : 
                                ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira'][dayOfWeek - 1]}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 bg-white">
                            {/* Separar as sessões do dia em estudo e revisão */}
                            {(() => {
                              // Separar sessões por tipo
                              const studySessions = daySessions.filter(s => !s.is_revision).sort((a, b) => a.start_time.localeCompare(b.start_time));
                              const revisionSessions = daySessions.filter(s => s.is_revision).sort((a, b) => a.start_time.localeCompare(b.start_time));
                              
                              return (
                                <div className="space-y-4">
                                  {/* Sessões de estudo */}
                                  {studySessions.length > 0 && (
                                    <div>
                                      <div className="flex items-center mb-2">
                                        <BookOpen className="h-4 w-4 text-emerald-600 mr-1.5" />
                                        <h4 className="text-sm font-medium text-gray-700">Sessões de Estudo</h4>
                                        <span className="ml-2 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full">
                                          {studySessions.length}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {studySessions.map((session) => (
                              <div 
                                key={session.id} 
                                            className="w-full bg-white rounded-[25px] shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff] transition-all duration-200 hover:shadow-lg overflow-hidden"
                                          >
                                            {/* Parte superior com gradiente - altura reduzida */}
                                            <div className={`w-full h-16 ${
                                              session.completed 
                                                ? 'bg-gradient-to-r from-green-400 to-teal-500'
                                                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                            } rounded-t-[25px] flex items-start justify-end`}>
                                              <div className="m-3 w-7 h-7 bg-white rounded-[8px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:rotate-[10deg]">
                                                {session.completed ? (
                                                  <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
                                                ) : (
                                                  <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                                                )}
                                    </div>
                                  </div>
                                  
                                            {/* Conteúdo do card - espaço aumentado */}
                                            <div className="p-4 pt-3">
                                              {/* Título da sessão */}
                                              <h3 className="font-sans text-[14px] font-semibold text-black mb-1">
                                                {session.title}
                                              </h3>
                                              
                                              {/* Subtítulo com horário */}
                                              <p className="font-sans text-[12px] text-gray-500 mb-3">
                                                {formatTime(session.start_time)} - {formatTime(session.end_time)} • {session.duration_minutes} min
                                              </p>
                                              
                                              {/* Ícone com disciplina */}
                                              <div 
                                                className={`mb-3 w-auto inline-flex px-2.5 py-1.5 rounded-[8px] items-center ${
                                                  session.is_revision 
                                                    ? 'bg-purple-100' 
                                                    : session.completed 
                                                      ? 'bg-green-100' 
                                                      : 'bg-emerald-100'
                                                }`}
                                              >
                                                {session.is_revision ? (
                                                  <RefreshCw className="w-[15px] h-[15px] text-gray-600" />
                                                ) : (
                                                  <BookOpen className="w-[15px] h-[15px] text-gray-600" />
                                                )}
                                                <span className={`ml-1.5 font-sans text-[12px] font-medium ${
                                                  session.is_revision 
                                                    ? 'text-purple-600' 
                                                    : session.completed 
                                                      ? 'text-green-600' 
                                                      : 'text-emerald-600'
                                                }`}>
                                                  {session.is_revision ? 'Revisão' : 'Estudo'}: {session.discipline_name}
                                                </span>
                                              </div>
                                              
                                              {/* Tags de dificuldade e importância */}
                                              <div className="flex flex-wrap gap-1.5 mb-3">
                                                {session.subject_difficulty && (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-700">
                                                    <Award className="h-2.5 w-2.5" />
                                                    <span>Dificuldade: {session.subject_difficulty}</span>
                                                  </span>
                                                )}
                                                {session.subject_importance && (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-700">
                                                    <Star className="h-2.5 w-2.5" />
                                                    <span>Importância: {session.subject_importance}</span>
                                      </span>
                                    )}
                                  </div>
                                    
                                              {/* Botão de iniciar sessão */}
                                              {!session.completed ? (
                                                <button
                                                  onClick={() => handleStartSession(session)}
                                                  className={`mt-1 w-full py-1.5 rounded-[8px] font-sans text-[12px] font-medium transition-colors ${
                                                    session.is_revision 
                                                      ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' 
                                                      : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                  }`}
                                                >
                                                  Iniciar sessão
                                                </button>
                                              ) : (
                                                <div className="mt-1 w-full py-1.5 rounded-[8px] font-sans text-[12px] font-medium bg-green-100 text-green-600 text-center">
                                                  Sessão concluída
                                    </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Sessões de revisão */}
                                  {revisionSessions.length > 0 && (
                                    <div>
                                      <div className="flex items-center mb-2">
                                        <RefreshCw className="h-4 w-4 text-purple-600 mr-1.5" />
                                        <h4 className="text-sm font-medium text-gray-700">Sessões de Revisão</h4>
                                        <span className="ml-2 bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full">
                                          {revisionSessions.length}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {revisionSessions.map((session) => (
                                          <div 
                                            key={session.id} 
                                            className="w-full bg-white rounded-[25px] shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff] transition-all duration-200 hover:shadow-lg overflow-hidden"
                                          >
                                            {/* Parte superior com gradiente - altura reduzida */}
                                            <div className={`w-full h-16 ${
                                              session.completed 
                                                ? 'bg-gradient-to-r from-green-400 to-teal-500'
                                                : 'bg-gradient-to-r from-purple-400 to-indigo-500'
                                            } rounded-t-[25px] flex items-start justify-end`}>
                                              <div className="m-3 w-7 h-7 bg-white rounded-[8px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:rotate-[10deg]">
                                                {session.completed ? (
                                                  <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
                                                ) : (
                                                  <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                                                )}
                                              </div>
                                            </div>
                                            
                                            {/* Conteúdo do card - espaço aumentado */}
                                            <div className="p-4 pt-3">
                                              {/* Título da sessão */}
                                              <h3 className="font-sans text-[14px] font-semibold text-black mb-1">
                                                {session.title}
                                              </h3>
                                              
                                              {/* Subtítulo com horário */}
                                              <p className="font-sans text-[12px] text-gray-500 mb-3">
                                                {formatTime(session.start_time)} - {formatTime(session.end_time)} • {session.duration_minutes} min
                                              </p>
                                              
                                              {/* Ícone com disciplina */}
                                              <div 
                                                className={`mb-3 w-auto inline-flex px-2.5 py-1.5 rounded-[8px] items-center ${
                                                  session.is_revision 
                                                    ? 'bg-purple-100' 
                                                    : session.completed 
                                                      ? 'bg-green-100' 
                                                      : 'bg-emerald-100'
                                                }`}
                                              >
                                                {session.is_revision ? (
                                                  <RefreshCw className="w-[15px] h-[15px] text-gray-600" />
                                                ) : (
                                                  <BookOpen className="w-[15px] h-[15px] text-gray-600" />
                                                )}
                                                <span className={`ml-1.5 font-sans text-[12px] font-medium ${
                                                  session.is_revision 
                                                    ? 'text-purple-600' 
                                                    : session.completed 
                                                      ? 'text-green-600' 
                                                      : 'text-emerald-600'
                                                }`}>
                                                  {session.is_revision ? 'Revisão' : 'Estudo'}: {session.discipline_name}
                                                </span>
                                              </div>
                                    
                                    {/* Tags de dificuldade e importância */}
                                              <div className="flex flex-wrap gap-1.5 mb-3">
                                    {session.subject_difficulty && (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-700">
                                                    <Award className="h-2.5 w-2.5" />
                                                    <span>Dificuldade: {session.subject_difficulty}</span>
                                      </span>
                                    )}
                                    {session.subject_importance && (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-700">
                                                    <Star className="h-2.5 w-2.5" />
                                                    <span>Importância: {session.subject_importance}</span>
                                      </span>
                                    )}
                                  </div>

                                              {/* Botão de iniciar sessão */}
                                    {!session.completed ? (
                                    <button
                                      onClick={() => handleStartSession(session)}
                                                  className={`mt-1 w-full py-1.5 rounded-[8px] font-sans text-[12px] font-medium transition-colors ${
                                                    session.is_revision 
                                                      ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' 
                                                      : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                  }`}
                                                >
                                      Iniciar sessão
                                    </button>
                                    ) : (
                                                <div className="mt-1 w-full py-1.5 rounded-[8px] font-sans text-[12px] font-medium bg-green-100 text-green-600 text-center">
                                        Sessão concluída
                                      </div>
                                    )}
                                  </div>
                                </div>
                                        ))}
                              </div>
                            </div>
                                  )}
                                  
                                  {/* Mensagem quando não há sessões */}
                                  {studySessions.length === 0 && revisionSessions.length === 0 && (
                                    <div className="text-center py-8">
                                      <p className="text-gray-500 text-sm">Nenhuma sessão agendada para este dia</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
      
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-green-100 mb-1">Sessões Concluídas</h3>
            <p className="text-3xl font-bold">{completedSessions}</p>
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
            <BarChart2 className="h-6 w-6" />
                    </div>
                    <div>
            <h3 className="text-sm font-medium text-blue-100 mb-1">Taxa de Conclusão</h3>
            <p className="text-3xl font-bold">{completionRate}%</p>
              </div>
                </div>
                </div>
              </div>
              
    {/* Progresso geral */}
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Progresso Geral</h3>
      <div className="w-full bg-gray-200 rounded-full h-6 mb-2">
        <div 
          className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
          style={{ width: `${completionRate}%` }}
        >
          {completionRate}%
        </div>
      </div>
      <div className="flex justify-between text-sm text-gray-600">
        <span>{completedSessions} de {totalSessions} sessões concluídas</span>
        <span>{Math.round((new Date().getTime() - new Date(plan.start_date).getTime()) / (new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) * 100)}% do período concluído</span>
      </div>
    </div>
    
    {/* Separar sessões de estudo e revisão */}
    {(() => {
      // Ordenar todas as sessões por data (mais próximas primeiro)
      const sortedSessions = [...sessions].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Separar sessões de estudo e revisão
      const mainStudySessions = sortedSessions.filter(s => !s.is_revision);
      
      // Criar um mapa para armazenar revisões por sessão original
      const revisionsByOriginalSession: Record<string, SmartPlanSession[]> = {};
      
      // Inicializar o mapa para todas as sessões principais
      mainStudySessions.forEach(session => {
        revisionsByOriginalSession[session.id.toString()] = [];
      });
      
      // Função para extrair o título limpo de uma sessão
      const extractCleanTitle = (title: string): string => {
        if (!title) return '';
        
        // Remover prefixos comuns de revisão
        let cleanTitle = title
          .replace(/^Revisão:?\s*/i, '')
          .replace(/^Revisão\s+de\s+/i, '')
          .trim();
          
        // Remover caracteres especiais e normalizar espaços
        return cleanTitle.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remover acentos
          .replace(/[^\w\s]/g, ' ') // substituir caracteres especiais por espaços
          .replace(/\s+/g, ' ') // normalizar espaços
          .trim();
      };
      
      // Função para extrair apenas a disciplina do título
      const extractDiscipline = (title: string): string => {
        if (!title) return '';
        
        // Remover prefixos comuns de revisão
        let cleanTitle = title
          .replace(/^Revisão:?\s*/i, '')
          .replace(/^Revisão\s+de\s+/i, '')
          .trim();
          
        // Se o título contém um hífen (formato "DISCIPLINA - ASSUNTO"), 
        // extrair apenas a parte da disciplina
        if (cleanTitle.includes('-')) {
          const parts = cleanTitle.split('-');
          if (parts.length > 0) {
            return parts[0].trim().toLowerCase();
          }
        }
        
        return '';
      };
      
      // Função para extrair apenas o assunto do título
      const extractSubject = (title: string): string => {
        if (!title) return '';
        
        // Remover prefixos comuns de revisão
        let cleanTitle = title
          .replace(/^Revisão:?\s*/i, '')
          .replace(/^Revisão\s+de\s+/i, '')
          .trim();
          
        // Se o título contém um hífen (formato "DISCIPLINA - ASSUNTO"), 
        // extrair apenas a parte do assunto
        if (cleanTitle.includes('-')) {
          const parts = cleanTitle.split('-');
          if (parts.length > 1) {
            const assunto = parts.slice(1).join('-').trim();
            return assunto.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remover acentos
              .replace(/[^\w\s]/g, ' ') // substituir caracteres especiais por espaços
              .replace(/\s+/g, ' ') // normalizar espaços
              .trim();
          }
        }
        
        return cleanTitle.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      // Agrupar sessões principais por assunto para facilitar a correspondência
      const sessionsBySubject: Record<string, SmartPlanSession[]> = {};
      const sessionsByDiscipline: Record<string, SmartPlanSession[]> = {};
      
      mainStudySessions.forEach(session => {
        // Agrupar por assunto
        const subject = extractSubject(session.title);
        if (subject) {
          if (!sessionsBySubject[subject]) {
            sessionsBySubject[subject] = [];
          }
          sessionsBySubject[subject].push(session);
        }
        
        // Agrupar por disciplina também como fallback
        const discipline = extractDiscipline(session.title);
        if (discipline) {
          if (!sessionsByDiscipline[discipline]) {
            sessionsByDiscipline[discipline] = [];
          }
          sessionsByDiscipline[discipline].push(session);
        }
      });
      
      // Obter todas as revisões
      const revisionSessions = sortedSessions.filter(s => s.is_revision);
      console.log(`Total de revisões encontradas: ${revisionSessions.length}`);
      
      // Primeiro, ordenar as revisões pela data para garantir consistência
      revisionSessions.sort((a, b) => {
        // Ordenar primeiro por disciplina_id para agrupar revisões da mesma disciplina
        if (a.discipline_id !== b.discipline_id) {
          return a.discipline_id - b.discipline_id;
        }
        // Depois por título para agrupar revisões do mesmo assunto
        const titleA = extractCleanTitle(a.title);
        const titleB = extractCleanTitle(b.title);
        if (titleA !== titleB) {
          return titleA.localeCompare(titleB);
        }
        // Por fim, por data
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      // NOVA IMPLEMENTAÇÃO: Associar revisões por assunto no título
      console.log("NOVA IMPLEMENTAÇÃO: Associando revisões por assunto no título");
      
      revisionSessions.forEach(revision => {
        const revisionSubject = extractSubject(revision.title);
        const revisionDiscipline = extractDiscipline(revision.title);
        console.log(`Processando revisão ID ${revision.id}: ${revision.title}, Assunto extraído: "${revisionSubject}", Disciplina: "${revisionDiscipline}"`);
        
        let matched = false;
        
        // Estratégia 1: Correspondência por assunto exato
        if (revisionSubject && sessionsBySubject[revisionSubject]) {
          const matchingSessions = sessionsBySubject[revisionSubject];
          if (matchingSessions.length > 0) {
            const bestMatch = matchingSessions[0];
            console.log(`✓ Correspondência exata por assunto: ${bestMatch.id} (${bestMatch.title})`);
            revisionsByOriginalSession[bestMatch.id.toString()].push(revision);
            matched = true;
          }
        }
        
        // Estratégia 2: Correspondência por similaridade de assunto
        if (!matched && revisionSubject) {
          let bestMatch: SmartPlanSession | null = null;
          let bestScore = 0;
          
          // Procurar entre todas as sessões principais
          mainStudySessions.forEach(session => {
            const sessionSubject = extractSubject(session.title);
            if (sessionSubject && revisionSubject) {
              // Calcular similaridade
              let score = 0;
              
              // Correspondência exata
              if (sessionSubject === revisionSubject) {
                score = 1.0;
              }
              // Correspondência parcial - um contém o outro
              else if (sessionSubject.includes(revisionSubject) || revisionSubject.includes(sessionSubject)) {
                score = Math.min(sessionSubject.length, revisionSubject.length) / 
                       Math.max(sessionSubject.length, revisionSubject.length);
              }
              
              if (score > bestScore) {
                bestScore = score;
                bestMatch = session;
              }
            }
          });
          
          if (bestMatch && bestScore > 0.3) {
            console.log(`✓ Correspondência parcial por assunto: ${bestMatch.id} (${bestMatch.title}), score: ${bestScore.toFixed(2)}`);
            revisionsByOriginalSession[bestMatch.id.toString()].push(revision);
            matched = true;
          }
        }
        
        // Estratégia 3: Correspondência por disciplina no título
        if (!matched && revisionDiscipline && sessionsByDiscipline[revisionDiscipline]) {
          const matchingSessions = sessionsByDiscipline[revisionDiscipline];
          if (matchingSessions.length > 0) {
            const bestMatch = matchingSessions[0];
            console.log(`✓ Correspondência por disciplina: ${bestMatch.id} (${bestMatch.title})`);
            revisionsByOriginalSession[bestMatch.id.toString()].push(revision);
            matched = true;
          }
        }
        
        // Estratégia 4: Correspondência por disciplina_id
        if (!matched && revision.discipline_id) {
          const matchingSessions = mainStudySessions.filter(s => s.discipline_id === revision.discipline_id);
          if (matchingSessions.length > 0) {
            const bestMatch = matchingSessions[0];
            console.log(`✓ Correspondência por discipline_id: ${bestMatch.id} (${bestMatch.title})`);
            revisionsByOriginalSession[bestMatch.id.toString()].push(revision);
            matched = true;
          }
        }
        
        // Estratégia 5: Último recurso - usar a primeira sessão disponível
        if (!matched && mainStudySessions.length > 0) {
          const firstSession = mainStudySessions[0];
          console.log(`! Último recurso: Usando primeira sessão disponível: ${firstSession.id} (${firstSession.title})`);
          revisionsByOriginalSession[firstSession.id.toString()].push(revision);
        }
      });
      
      // Verificar se há revisões não associadas
      const allAssociatedRevisions = Object.values(revisionsByOriginalSession).flat();
      const unassociatedRevisions = revisionSessions.filter(r => 
        !allAssociatedRevisions.some(ar => ar.id === r.id)
      );
      
      if (unassociatedRevisions.length > 0) {
        console.error(`ALERTA: ${unassociatedRevisions.length} revisões não foram associadas a nenhuma sessão original!`);
        unassociatedRevisions.forEach(r => {
          console.error(`  - Revisão não associada: ID ${r.id}, Título: ${r.title}, Disciplina ID: ${r.discipline_id}`);
        });
      }
      
      // Log para debug
      console.log('Mapeamento final de revisões por sessão original:');
      Object.keys(revisionsByOriginalSession).forEach(originalId => {
        const originalSession = mainStudySessions.find(s => s.id === Number(originalId));
        if (originalSession) {
          console.log(`Sessão original ${originalId} (${originalSession.title}, Disciplina: ${originalSession.discipline_name}): ${revisionsByOriginalSession[originalId].length} revisões`);
          revisionsByOriginalSession[originalId].forEach(revision => {
            console.log(`  - Revisão ID ${revision.id}: ${revision.title}, Disciplina ID: ${revision.discipline_id}`);
          });
        }
      });
      
      // Separar por status de conclusão
      const completedMainSessions = mainStudySessions.filter(s => s.completed);
      const pendingMainSessions = mainStudySessions.filter(s => !s.completed);
      
      // Calcular estatísticas gerais
      const totalCompletedSessions = sortedSessions.filter(s => s.completed).length;
      const completionRate = sortedSessions.length > 0 
        ? Math.round((totalCompletedSessions / sortedSessions.length) * 100) 
        : 0;
      
      return (
        <div className="space-y-8">
          {/* Todas as sessões */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-blue-600" />
                Sessões de Estudo e Revisão
              </h3>
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {totalCompletedSessions} / {sortedSessions.length} concluídas
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full flex items-center justify-center text-xs font-medium text-white"
                style={{ width: `${completionRate}%` }}
              >
                {completionRate}%
              </div>
            </div>
            
            {/* Pendentes */}
            {pendingMainSessions.length > 0 && (
            <div className="mb-8">
              <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <Clock className="h-5 w-5 text-amber-500 mr-2" />
                Sessões Pendentes ({pendingMainSessions.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingMainSessions.map(mainSession => {
                  // Obter revisões associadas a esta sessão principal
                  const relatedRevisions = revisionsByOriginalSession[mainSession.id.toString()] || [];
                    
                      return (
                    <div 
                      key={mainSession.id}
                      className="border border-gray-200 hover:border-blue-300 rounded-lg p-4 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">
                          {mainSession.title}
                        </h4>
                        <button
                          onClick={() => handleStartSession(mainSession)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <PlayCircle className="h-5 w-5" />
                        </button>
                            </div>
                      
                      <div className="flex items-center text-sm text-gray-500 mb-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{new Date(mainSession.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
                          </div>
                      
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{mainSession.start_time.substring(0, 5)} - {mainSession.end_time.substring(0, 5)}</span>
                          </div>
                      
                      <div className="flex flex-wrap gap-2 mt-1">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          <BookOpen className="h-3 w-3" />
                          Estudo
                        </div>
                        
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          <GraduationCap className="h-3 w-3" />
                          {mainSession.discipline_name}
                          </div>
                      </div>
                      
                      {/* Revisões relacionadas */}
                      {relatedRevisions.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <RefreshCw className="h-4 w-4 text-amber-600 mr-1" />
                            Revisões ({relatedRevisions.length})
                          </h5>
                          
                          <div className="space-y-2">
                            {relatedRevisions.map(revision => (
                              <div 
                                key={revision.id} 
                                className={`p-2 rounded-md text-sm ${
                                  revision.completed 
                                    ? 'bg-green-50 border border-green-200' 
                                    : 'bg-amber-50 border border-amber-200'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-1 mb-1">
                                      <Calendar className="h-3 w-3 text-gray-500" />
                                      <span className="text-gray-600">{new Date(revision.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
                                      <Clock className="h-3 w-3 text-gray-500 ml-2" />
                                      <span className="text-gray-600">{revision.start_time.substring(0, 5)}</span>
                          </div>
                                    <div className="text-xs text-amber-700">
                                      {revision.revision_interval && `Revisão de ${revision.revision_interval} dias`}
                      </div>
                                  </div>
                                  
                                  {revision.completed ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <button
                                      onClick={() => handleStartSession(revision)}
                                      className="text-amber-600 hover:text-amber-800"
                                    >
                                      <PlayCircle className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Mensagem quando não há revisões associadas */}
                      {mainSession.id && revisionsByOriginalSession[mainSession.id.toString()] === undefined && (
                        <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                          <div className="text-center py-2">
                            <RefreshCw className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-500">Sem revisões programadas</p>
                          </div>
                        </div>
                      )}
                        </div>
                      );
                    })}
                  </div>
              </div>
            )}
            
            {/* Concluídas */}
            {completedMainSessions.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                Sessões Concluídas ({completedMainSessions.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedMainSessions.map(mainSession => {
                  // Obter revisões associadas a esta sessão principal
                  const relatedRevisions = revisionsByOriginalSession[mainSession.id.toString()] || [];
                  
                  return (
                    <div 
                      key={mainSession.id}
                      className="border border-green-300 bg-green-50 rounded-lg p-4 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-green-700">
                          {mainSession.title}
                        </h4>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500 mb-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{new Date(mainSession.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{mainSession.start_time.substring(0, 5)} - {mainSession.end_time.substring(0, 5)}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-1">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          <BookOpen className="h-3 w-3" />
                          Estudo
                        </div>
                        
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          <GraduationCap className="h-3 w-3" />
                          {mainSession.discipline_name}
                        </div>
                        
                        {mainSession.actual_duration_minutes && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <Clock className="h-3 w-3" />
                            {mainSession.actual_duration_minutes} min
                          </div>
                        )}
                      </div>
                      
                      {/* Revisões relacionadas */}
                      {relatedRevisions.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <RefreshCw className="h-4 w-4 text-amber-600 mr-1" />
                            Revisões ({relatedRevisions.length})
                          </h5>
                          
                          <div className="space-y-2">
                            {relatedRevisions.map(revision => (
                              <div 
                                key={revision.id} 
                                className={`p-2 rounded-md text-sm ${
                                  revision.completed 
                                    ? 'bg-green-100 border border-green-200' 
                                    : 'bg-amber-50 border border-amber-200'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-1 mb-1">
                                      <Calendar className="h-3 w-3 text-gray-500" />
                                      <span className="text-gray-600">{new Date(revision.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
                                      <Clock className="h-3 w-3 text-gray-500 ml-2" />
                                      <span className="text-gray-600">{revision.start_time.substring(0, 5)}</span>
                                    </div>
                                    <div className="text-xs text-amber-700">
                                      {revision.revision_interval && `Revisão de ${revision.revision_interval} dias`}
                                    </div>
                                  </div>
                                  
                                  {revision.completed ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <button
                                      onClick={() => handleStartSession(revision)}
                                      className="text-amber-600 hover:text-amber-800"
                                    >
                                      <PlayCircle className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                </div>
            )}
                      
                      {/* Mensagem quando não há revisões associadas */}
                      {mainSession.id && revisionsByOriginalSession[mainSession.id.toString()] === undefined && (
                        <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                          <div className="text-center py-2">
                            <RefreshCw className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-500">Sem revisões programadas</p>
                          </div>
            </div>
          )}
        </div>
                  );
                  })}
                </div>
              </div>
            )}
            
            {/* Mensagem quando não há sessões */}
            {mainStudySessions.length === 0 && (
              <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <ListChecks className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-gray-700 mb-1">Nenhuma sessão encontrada</h4>
                <p className="text-gray-500">Este plano não possui sessões de estudo ou revisão.</p>
              </div>
            )}
          </div>
        </div>
      );
    })()}
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