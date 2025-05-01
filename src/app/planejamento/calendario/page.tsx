'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  BookOpen,
  CalendarDays,
  CalendarIcon,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { obterPlanosLocais } from '@/services';
import { StudyPlan, StudySession } from '@/lib/types/planning';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getDay, addDays, parseISO, isWithinInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos
type CalendarView = 'day' | 'week' | 'month';
type SessionsByDate = Record<string, StudySession[]>;

// Componente Badge para status
const StatusBadge = ({ completed }: { completed: boolean }) => {
  if (completed) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Concluída
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      <Clock className="w-3 h-3 mr-1" />
      Pendente
    </span>
  );
};

// Componente de cartão de sessão
const SessionCard = ({ session }: { session: StudySession }) => {
  const router = useRouter();
  
  // Formatação de hora
  const formatTime = (date: Date | string | undefined) => {
    if (!date) return "";
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, "HH:mm", { locale: ptBR });
  };
  
  // Formatar duração
  const formatDuration = (minutes?: number) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes}min`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };
  
  // Navegar para detalhes da sessão
  const goToSessionDetails = () => {
    router.push(`/planejamento/${session.studyPlanId}/sessoes/${session.id}`);
  };
  
  return (
    <Card className="mb-2 cursor-pointer hover:shadow-md transition-shadow" onClick={goToSessionDetails}>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-sm">{session.title}</h4>
              {session.disciplineName && (
                <p className="text-xs text-gray-600">
                  <BookOpen className="w-3 h-3 inline mr-1" /> 
                  {session.disciplineName}
                  {session.subjectName && <span> - {session.subjectName}</span>}
                </p>
              )}
            </div>
            <StatusBadge completed={session.completed} />
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div>
              {session.scheduledDate && formatTime(session.scheduledDate)}
              {session.duration && <span> · {formatDuration(session.duration)}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de visualização diária
const DayView = ({ 
  date, 
  sessions,
  onPrevious,
  onNext
}: { 
  date: Date, 
  sessions: StudySession[],
  onPrevious: () => void,
  onNext: () => void
}) => {
  
  const formattedDate = format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const sessionsForDay = sessions.filter(session => {
    if (!session.scheduledDate) return false;
    const sessionDate = typeof session.scheduledDate === 'string' 
      ? parseISO(session.scheduledDate) 
      : session.scheduledDate;
    return isSameDay(sessionDate, date);
  });
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={onPrevious} size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        <h3 className="text-lg font-medium capitalize">{formattedDate}</h3>
        <Button variant="ghost" onClick={onNext} size="sm">
          Próximo
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      {sessionsForDay.length > 0 ? (
        <div className="space-y-2">
          {sessionsForDay.map(session => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center border rounded-lg border-dashed border-gray-300">
          <CalendarIcon className="w-10 h-10 mx-auto text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Nenhuma sessão agendada para este dia</p>
        </div>
      )}
    </div>
  );
};

// Componente de visualização semanal
const WeekView = ({ 
  date, 
  sessions,
  onPrevious, 
  onNext 
}: { 
  date: Date, 
  sessions: StudySession[],
  onPrevious: () => void,
  onNext: () => void
}) => {
  const firstDayOfWeek = startOfWeek(date, { weekStartsOn: 0 });
  const lastDayOfWeek = endOfWeek(date, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: firstDayOfWeek, end: lastDayOfWeek });
  
  const weekRange = `${format(firstDayOfWeek, "d 'de' MMM", { locale: ptBR })} - ${format(lastDayOfWeek, "d 'de' MMM", { locale: ptBR })}`;
  
  // Agrupar sessões por dia
  const sessionsByDay: Record<number, StudySession[]> = {};
  
  days.forEach((day, index) => {
    sessionsByDay[index] = sessions.filter(session => {
      if (!session.scheduledDate) return false;
      const sessionDate = typeof session.scheduledDate === 'string' 
        ? parseISO(session.scheduledDate) 
        : session.scheduledDate;
      return isSameDay(sessionDate, day);
    });
  });
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={onPrevious} size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Semana anterior
        </Button>
        <h3 className="text-lg font-medium">{weekRange}</h3>
        <Button variant="ghost" onClick={onNext} size="sm">
          Próxima semana
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => (
          <div key={format(day, 'yyyy-MM-dd')} className="border rounded-lg p-2">
            <div className="text-center mb-2">
              <p className="text-xs text-gray-500 uppercase">{format(day, 'EEEEEE', { locale: ptBR })}</p>
              <p className={`text-sm font-semibold ${isSameDay(day, new Date()) ? 'bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center mx-auto' : ''}`}>
                {format(day, 'd')}
              </p>
            </div>
            
            <div className="space-y-1">
              {sessionsByDay[index].length > 0 ? (
                sessionsByDay[index].map(session => (
                  <Link 
                    key={session.id} 
                    href={`/planejamento/${session.studyPlanId}/sessoes/${session.id}`}
                    className={`block p-1 text-xs rounded ${session.completed ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}
                  >
                    {session.title.length > 15 
                      ? `${session.title.substring(0, 15)}...` 
                      : session.title}
                  </Link>
                ))
              ) : (
                <div className="text-xs text-gray-400 text-center py-2">-</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente de visualização mensal
const MonthView = ({ 
  date, 
  sessions,
  sessionsByDate,
  onSelectDay
}: { 
  date: Date, 
  sessions: StudySession[],
  sessionsByDate: SessionsByDate,
  onSelectDay: (date: Date) => void
}) => {
  
  const [currentMonth, setCurrentMonth] = useState(date);
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startDate = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 });
  const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const endDate = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Ir para mês anterior
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  // Ir para próximo mês
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={previousMonth} size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Mês anterior
        </Button>
        <h3 className="text-lg font-medium capitalize">
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
        <Button variant="ghost" onClick={nextMonth} size="sm">
          Próximo mês
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-medium text-gray-500">
            {day}
          </div>
        ))}
        
        {days.map(day => {
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isToday = isSameDay(day, new Date());
          const dateStr = format(day, 'yyyy-MM-dd');
          const hasSessions = sessionsByDate[dateStr] && sessionsByDate[dateStr].length > 0;
          
          return (
            <div 
              key={day.toISOString()} 
              onClick={() => onSelectDay(day)}
              className={`
                border rounded-lg min-h-[70px] p-1 cursor-pointer
                ${isCurrentMonth ? '' : 'bg-gray-50 text-gray-400'}
                ${isToday ? 'border-blue-500' : 'border-gray-200'}
                hover:border-blue-400 hover:bg-blue-50
              `}
            >
              <div className="flex justify-between items-center">
                <div className={`
                  text-sm w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-blue-500 text-white' : ''}
                `}>
                  {format(day, 'd')}
                </div>
                
                {hasSessions && (
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex justify-center items-center text-[10px] text-white">
                    {sessionsByDate[dateStr].length}
                  </div>
                )}
              </div>
              
              {hasSessions && (
                <div className="mt-1">
                  {sessionsByDate[dateStr].slice(0, 2).map((session, index) => (
                    <div 
                      key={index}
                      className={`
                        text-[10px] truncate rounded py-0.5 px-1 mb-0.5
                        ${session.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                      `}
                    >
                      {session.title}
                    </div>
                  ))}
                  
                  {sessionsByDate[dateStr].length > 2 && (
                    <div className="text-[10px] text-gray-500 text-center">
                      +{sessionsByDate[dateStr].length - 2} mais
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function CalendarioPage() {
  const router = useRouter();
  
  const [planos, setPlanos] = useState<StudyPlan[]>([]);
  const [sessoes, setSessoes] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarView>('week');
  
  // Carregar planos e sessões
  useEffect(() => {
    try {
      const planosLocais = obterPlanosLocais();
      setPlanos(planosLocais);
      
      // Coletar todas as sessões de todos os planos
      const todasSessoes: StudySession[] = [];
      
      planosLocais.forEach(plano => {
        if (plano.sessions && plano.sessions.length > 0) {
          todasSessoes.push(...plano.sessions);
        }
      });
      
      // Ordenar por data
      todasSessoes.sort((a, b) => {
        const dateA = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
        const dateB = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
        return dateA - dateB;
      });
      
      setSessoes(todasSessoes);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar calendário');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Agrupar sessões por data
  const sessionsByDate = sessoes.reduce((acc: SessionsByDate, session) => {
    if (!session.scheduledDate) return acc;
    
    const date = typeof session.scheduledDate === 'string' 
      ? parseISO(session.scheduledDate) 
      : session.scheduledDate;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    
    acc[dateStr].push(session);
    return acc;
  }, {});
  
  // Navegar para o dia anterior
  const goToPreviousDay = () => {
    setSelectedDate(prev => addDays(prev, -1));
  };
  
  // Navegar para o próximo dia
  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };
  
  // Navegar para a semana anterior
  const goToPreviousWeek = () => {
    setSelectedDate(prev => addDays(prev, -7));
  };
  
  // Navegar para a próxima semana
  const goToNextWeek = () => {
    setSelectedDate(prev => addDays(prev, 7));
  };
  
  // Selecionar uma data específica
  const selectDay = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
  };
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2">Carregando calendário...</span>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl font-bold">Calendário de Estudos</h1>
            <p className="text-gray-600">Sessões agendadas para todos os planos</p>
          </div>
          
          <div className="flex flex-wrap space-x-2">
            <div className="inline-flex shadow-sm rounded-md">
              <Button 
                variant={viewMode === 'day' ? 'primary' : 'outline'} 
                className="rounded-l-md rounded-r-none" 
                onClick={() => setViewMode('day')}
              >
                Dia
              </Button>
              <Button 
                variant={viewMode === 'week' ? 'primary' : 'outline'} 
                className="rounded-none" 
                onClick={() => setViewMode('week')}
              >
                Semana
              </Button>
              <Button 
                variant={viewMode === 'month' ? 'primary' : 'outline'} 
                className="rounded-r-md rounded-l-none" 
                onClick={() => setViewMode('month')}
              >
                Mês
              </Button>
            </div>
            
            <Button 
              onClick={() => router.push('/planejamento')}
              variant="outline"
            >
              Ver Planos
            </Button>
          </div>
        </div>
        
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-full mr-4">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total de Sessões</p>
                  <p className="text-xl font-semibold">{sessoes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-full mr-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sessões Concluídas</p>
                  <p className="text-xl font-semibold">{sessoes.filter(s => s.completed).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-full mr-4">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Horas Estudadas</p>
                  <p className="text-xl font-semibold">
                    {Math.round(sessoes.filter(s => s.completed && s.actualDuration)
                      .reduce((total, s) => total + (s.actualDuration || 0), 0) / 60)}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Visualização do calendário */}
        <Card>
          <CardHeader>
            <CardTitle>
              {viewMode === 'day' && 'Visualização Diária'}
              {viewMode === 'week' && 'Visualização Semanal'}
              {viewMode === 'month' && 'Visualização Mensal'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewMode === 'day' && (
              <DayView 
                date={selectedDate} 
                sessions={sessoes}
                onPrevious={goToPreviousDay}
                onNext={goToNextDay}
              />
            )}
            
            {viewMode === 'week' && (
              <WeekView 
                date={selectedDate} 
                sessions={sessoes}
                onPrevious={goToPreviousWeek}
                onNext={goToNextWeek}
              />
            )}
            
            {viewMode === 'month' && (
              <MonthView 
                date={selectedDate} 
                sessions={sessoes}
                sessionsByDate={sessionsByDate}
                onSelectDay={selectDay}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 