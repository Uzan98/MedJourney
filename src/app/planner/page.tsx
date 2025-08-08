'use client';

import { useState, useEffect } from 'react';
import { createCalendar, createViewDay, createViewWeek, createViewMonthGrid } from '@schedule-x/calendar';
import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls';
import '@schedule-x/theme-default/dist/index.css';
import { Calendar, Clock, Target, BookOpen, Plus, CheckCircle, Circle, Star, TrendingUp, Edit, Trash2, X, ChevronLeft, ChevronRight, Crown, Zap, CalendarDays, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TaskService } from '@/lib/services/task.service';
import { Task } from '@/lib/types/dashboard';
import { GoalsService, CreateGoalData } from '@/lib/services/goals.service';
import { EventsClientService, CreateEventData } from '@/lib/services/events-client.service';
import { SubscriptionClientService } from '@/services/subscription-client.service';
import SimpleEventModal from '@/components/modals/simple-event-modal';
import SimpleGoalModal from '@/components/modals/simple-goal-modal';
import UpdateGoalProgressModal from '@/components/modals/update-goal-progress-modal';
import QuickGoalIncrementModal from '@/components/modals/quick-goal-increment-modal';
import MobilePlannerPanel from '@/components/planner/MobilePlannerPanel';
import { useIsMobile } from '@/hooks/useIsMobile';

import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface StudyGoal {
  id: string;
  title: string;
  progress: number;
  target: number;
  unit: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  color?: string;
}

export default function PlannerPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState<'today' | 'week' | 'goals'>('today');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendar, setCalendar] = useState<any>(null);
  const [calendarControls, setCalendarControls] = useState<any>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalType, setUpgradeModalType] = useState<'event' | 'goal'>('event');
  const [showUpdateProgressModal, setShowUpdateProgressModal] = useState(false);
  const [selectedGoalForUpdate, setSelectedGoalForUpdate] = useState<StudyGoal | null>(null);
  const [showQuickIncrementModal, setShowQuickIncrementModal] = useState(false);
  const [selectedGoalForQuickIncrement, setSelectedGoalForQuickIncrement] = useState<StudyGoal | null>(null);
  
  // Absence states

  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endTime: '',
    color: '#3b82f6'
  });
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Carregar tarefas do TaskService
  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await TaskService.getTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast.error('Não foi possível carregar as tarefas');
    } finally {
      setLoading(false);
    }
  };

  // Carregar eventos do Supabase
  const loadEvents = async () => {
    try {
      console.log('🔄 Iniciando carregamento de eventos...');
      const supabaseEvents = await EventsClientService.getUserEvents();
      console.log('📅 Eventos do Supabase:', supabaseEvents);
      
      const calendarEvents: CalendarEvent[] = supabaseEvents.map(event => {
        // Converter datas do formato ISO para o formato esperado pelo Schedule-X (YYYY-MM-DD HH:mm)
        // Mantém o horário original sem conversão de timezone
        const formatDateForScheduleX = (isoDate: string) => {
          // Remove o timezone e mantém apenas a data e hora
          const dateTimeString = isoDate.replace(/[TZ]/g, ' ').replace(/\+.*$/, '').trim();
          const [datePart, timePart] = dateTimeString.split(' ');
          
          if (timePart) {
            // Se tem hora, formata como YYYY-MM-DD HH:mm
            const [hours, minutes] = timePart.split(':');
            return `${datePart} ${hours}:${minutes}`;
          } else {
            // Se não tem hora, adiciona 00:00
            return `${datePart} 00:00`;
          }
        };

        return {
          id: event.id,
          title: event.title,
          description: event.description,
          start: formatDateForScheduleX(event.start_date),
          end: formatDateForScheduleX(event.end_date),
          color: event.color
        };
      });
      
      console.log('📊 Eventos formatados para o calendário:', calendarEvents);
      setEvents(calendarEvents);
      console.log('✅ Eventos carregados com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao carregar eventos:', error);
      toast.error('Erro ao carregar eventos');
    }
  };

  // Carregar tarefas, metas e eventos ao montar o componente
  useEffect(() => {
    loadTasks();
    loadGoals();
    loadEvents();
  }, []);

  useEffect(() => {
    if (activeView === 'goals') {
      loadGoals();
    }
  }, [activeView]);

  // Verificar permissão para criar eventos
  const checkEventPermission = async () => {
    try {
      const permission = await SubscriptionClientService.checkUserPermission();
      if (!permission.hasPermission) {
        setUpgradeModalType('event');
        setShowUpgradeModal(true);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erro ao verificar permissão para eventos:', error);
      toast.error('Erro ao verificar permissões');
      return false;
    }
  };

  // Verificar permissão para criar metas
  const checkGoalPermission = async () => {
    try {
      const permission = await SubscriptionClientService.checkUserPermission();
      if (!permission.hasPermission) {
        setUpgradeModalType('goal');
        setShowUpgradeModal(true);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erro ao verificar permissão para metas:', error);
      toast.error('Erro ao verificar permissões');
      return false;
    }
  };

  const loadGoals = async () => {
    try {
      const loadedGoals = await GoalsService.getGoals();
      // Mapear para o formato local esperado
      const mappedGoals = loadedGoals.map(goal => ({
        id: goal.id,
        title: goal.title,
        progress: goal.current_value,
        target: goal.target_value,
        unit: goal.unit
      }));
      setGoals(mappedGoals);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
      toast.error('Erro ao carregar metas');
      setGoals([]); // Garantir que goals seja sempre um array
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title.trim() || newGoal.target <= 0) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }

    try {
      const goalData: CreateGoalData = {
        title: newGoal.title,
        target_value: newGoal.target,
        unit: newGoal.unit,
        current_value: 0
      };

      const createdGoal = await GoalsService.createGoal(goalData);

      if (createdGoal) {
        // Converter para o formato local
        const localGoal = {
          id: createdGoal.id,
          title: createdGoal.title,
          progress: createdGoal.current_value,
          target: createdGoal.target_value,
          unit: createdGoal.unit
        };

        setGoals(prev => [...prev, localGoal]);
        setNewGoal({ title: '', target: 0, unit: 'horas' });
        setShowNewGoalModal(false);
        toast.success('Meta criada com sucesso!');
      } else {
        toast.error('Erro ao criar meta');
      }
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      toast.error('Erro ao criar meta');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await GoalsService.deleteGoal(goalId);
      setGoals(prev => prev.filter(g => g.id !== goalId));
      toast.success('Meta removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover meta:', error);
      toast.error('Erro ao remover meta');
    }
  };

  const handleUpdateGoalProgress = async (goalId: string, currentValue: number) => {
     try {
       console.log('Atualizando progresso da meta:', { goalId, currentValue });
       const result = await GoalsService.updateGoalProgress(goalId, currentValue);
       console.log('Resultado da atualização:', result);
       
       if (result.goal) {
         // Mapear para o formato local
         const mappedGoal = {
           id: result.goal.id,
           title: result.goal.title,
           progress: result.goal.current_value,
           target: result.goal.target_value,
           unit: result.goal.unit
         };
         setGoals(prev => prev.map(g => g.id === goalId ? mappedGoal : g));
         
         // Verificar se a meta foi completada
         console.log('Meta foi completada?', result.wasCompleted);
         if (result.wasCompleted) {
           console.log('Exibindo mensagem de parabéns!');
           toast.success(
             `🎉 Parabéns! Você completou a meta "${result.goal.title}"! 🎉`,
             {
               duration: 5000,
               style: {
                 background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                 color: 'white',
                 border: 'none',
                 fontSize: '16px',
                 fontWeight: '600'
               }
             }
           );
         } else {
           toast.success('Progresso atualizado!');
         }
       }
     } catch (error) {
       console.error('Erro ao atualizar progresso:', error);
       toast.error('Erro ao atualizar progresso');
     }
    };

  const handleOpenUpdateProgressModal = (goal: StudyGoal) => {
    setSelectedGoalForUpdate(goal);
    setShowUpdateProgressModal(true);
  };

  const handleCloseUpdateProgressModal = () => {
    setShowUpdateProgressModal(false);
    setSelectedGoalForUpdate(null);
  };

  const handleOpenQuickIncrementModal = (goal: StudyGoal) => {
    setSelectedGoalForQuickIncrement(goal);
    setShowQuickIncrementModal(true);
  };

  const handleCloseQuickIncrementModal = () => {
    setShowQuickIncrementModal(false);
    setSelectedGoalForQuickIncrement(null);
  };

  const handleQuickIncrementProgress = async (goalId: string, increment: number) => {
    try {
      const result = await GoalsService.incrementGoalProgress(goalId, increment);
      
      if (result) {
        // Atualizar a lista de metas
        await loadGoals();
        
        if (result.wasCompleted) {
          toast.success(
            `🎉 Parabéns! Você completou a meta "${result.goal.title}"! 🎉`,
            {
              duration: 5000,
              style: {
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600'
              }
            }
          );
        } else {
          toast.success(`Progresso incrementado! +${increment} ${result.goal.unit}`);
        }
      }
    } catch (error) {
      console.error('Erro ao incrementar progresso:', error);
      toast.error('Erro ao incrementar progresso');
    }
  };



   // Marcar tarefa como concluída
  const toggleTaskCompletion = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await TaskService.updateTaskStatus(taskId, newStatus);
      
      // Atualizar o estado local
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus }
            : task
        )
      );
      
      toast.success(
        newStatus === 'completed' 
          ? 'Tarefa marcada como concluída!' 
          : 'Tarefa marcada como pendente!'
      );
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Não foi possível atualizar a tarefa');
    }
  };

  // Navegar para o painel de tarefas
  const navigateToTaskPanel = () => {
    router.push('/tarefas');
  };

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    target: 0,
    unit: 'horas'
  });

  // Inicializar o calendário Schedule-X
  useEffect(() => {
    const calendarControlsPlugin = createCalendarControlsPlugin();
    
    const calendarInstance = createCalendar({
      views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
      defaultView: 'week',
      locale: 'pt-BR',
      firstDayOfWeek: 0,
      events: events,
      callbacks: {
        onEventClick: (calendarEvent: any) => {
          console.log('Event clicked:', calendarEvent);
        },
        onClickDate: (date: string) => {
          setSelectedDate(new Date(date));
        }
      }
    }, [calendarControlsPlugin]);
    
    setCalendar(calendarInstance);
    setCalendarControls(calendarControlsPlugin);
    
    return () => {
      if (calendarInstance) {
        calendarInstance.destroy?.();
      }
    };
  }, []);

  // Atualizar eventos no calendário quando mudarem
  useEffect(() => {
    if (calendar) {
      calendar.events.set(events);
    }
  }, [calendar, events]);

  // Renderizar o calendário no DOM apenas quando necessário (mudança de view, calendar, calendarControls)
  useEffect(() => {
    if (calendar && calendarControls && (activeView === 'week' || activeView === 'today')) {
      // Usar ID único baseado na visualização ativa
      const calendarId = activeView === 'today' ? 'schedule-x-calendar-today' : 'schedule-x-calendar-week';
      const calendarElement = document.getElementById(calendarId);
      if (calendarElement) {
        // Verificar se o calendário já foi renderizado neste elemento
        if (calendarElement.children.length === 0) {
          // Definir a visualização baseada no activeView
          if (activeView === 'today') {
            calendarControls.setView('day');
            calendarControls.setDate(selectedDate.toISOString().split('T')[0]);
          } else {
            calendarControls.setView('week');
          }
          
          calendar.render(calendarElement);
        }
      }
    }
  }, [calendar, calendarControls, activeView]);

  // Atualizar data do calendário quando selectedDate mudar (apenas para visão diária)
  useEffect(() => {
    if (calendar && calendarControls && activeView === 'today') {
      calendarControls.setDate(selectedDate.toISOString().split('T')[0]);
    }
  }, [calendar, calendarControls, activeView, selectedDate]);



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressColor = (progress: number, target: number) => {
    const percentage = (progress / target) * 100;
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Filtrar tarefas por data selecionada
  const selectedDateTasks = tasks.filter(task => {
    if (!task.due_date) return false;
    return isSameDay(new Date(task.due_date), selectedDate);
  });

  const completedToday = selectedDateTasks.filter(task => task.status === 'completed').length;

  // Funções de navegação de data
  const goToPreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleCreateEvent = async () => {
    // Verificar permissão antes de criar o evento
    const hasPermission = await checkEventPermission();
    if (!hasPermission) {
      return;
    }

    if (newEvent.title && newEvent.startDate && newEvent.startTime && newEvent.endTime) {
      try {
        // Criar dados do evento no formato correto
        const startDateTime = `${newEvent.startDate}T${newEvent.startTime}:00`;
        const endDateTime = `${newEvent.startDate}T${newEvent.endTime}:00`;
        
        const eventData: CreateEventData = {
          title: newEvent.title,
          description: newEvent.description || '',
          start_date: startDateTime,
          end_date: endDateTime,
          color: newEvent.color || '#3b82f6'
        };

        // Salvar no Supabase
        const savedEvent = await EventsClientService.createEvent(eventData);
        
        if (savedEvent) {
          // Recarregar eventos do Supabase para garantir sincronização
          await loadEvents();
          toast.success('Evento criado com sucesso!');
        } else {
          toast.error('Erro ao criar evento');
        }
      } catch (error) {
        console.error('Erro ao criar evento:', error);
        toast.error('Erro ao criar evento');
      }
      
      setNewEvent({
        title: '',
        description: '',
        startDate: '',
        startTime: '',
        endTime: '',
        color: '#3b82f6'
      });
      setIsEventDialogOpen(false);
    } else {
      toast.error('Preencha todos os campos obrigatórios');
    }
  };

  const deleteEvent = (eventId: string) => {
    setEvents(events.filter(event => event.id !== eventId));
  };

  // Funções removidas: generateTimeSlots, getEventsForTimeSlot, getEventHeight, getEventTopOffset
  // Agora usando Schedule-X para renderização da agenda diária

  // Renderizar versão mobile se for dispositivo móvel
  if (isMobile) {
    return (
      <>
        <MobilePlannerPanel
          tasks={tasks}
          events={events}
          goals={goals}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onCreateEvent={async () => setShowEventModal(true)}
          onCreateGoal={async () => setShowGoalModal(true)}
          onUpdateGoalProgress={handleUpdateGoalProgress}
          onDeleteGoal={handleDeleteGoal}
          onQuickIncrementProgress={handleQuickIncrementProgress}
          onOpenUpdateProgressModal={handleOpenUpdateProgressModal}
          onOpenQuickIncrementModal={handleOpenQuickIncrementModal}
          onLoadEvents={loadEvents}
          loading={loading}
        />

        {/* Modais para Mobile */}
        <SimpleEventModal
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          onEventCreated={async (event) => {
            await loadEvents();
          }}
        />

        <SimpleGoalModal
          isOpen={showGoalModal}
          onClose={() => setShowGoalModal(false)}
          onGoalCreated={async (goal) => {
            await loadGoals();
          }}
        />

        {selectedGoalForUpdate && (
          <UpdateGoalProgressModal
            isOpen={showUpdateProgressModal}
            onClose={() => {
              setShowUpdateProgressModal(false);
              setSelectedGoalForUpdate(null);
            }}
            goal={selectedGoalForUpdate}
            onUpdateProgress={handleUpdateGoalProgress}
          />
        )}

        {selectedGoalForQuickIncrement && (
          <QuickGoalIncrementModal
            isOpen={showQuickIncrementModal}
            onClose={() => {
              setShowQuickIncrementModal(false);
              setSelectedGoalForQuickIncrement(null);
            }}
            goal={selectedGoalForQuickIncrement}
            onIncrementProgress={handleQuickIncrementProgress}
          />
        )}
      </>
    );
  }

  // Renderizar versão desktop
  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Planner de Estudos
          </h1>
          <p className="text-gray-600 text-lg">Organize seus estudos e acompanhe seu progresso com estilo</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveView('today')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'today'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Agenda de Hoje
          </button>
          <button
            onClick={() => setActiveView('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'week'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Visão Semanal
          </button>
          <button
            onClick={() => setActiveView('goals')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'goals'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Metas
          </button>

        </div>

        {/* Today View */}
        {activeView === 'today' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-white to-blue-50/50 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Tarefas {isSameDay(selectedDate, new Date()) ? 'Hoje' : format(selectedDate, 'dd/MM', { locale: ptBR })}</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">{selectedDateTasks.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-white to-green-50/50 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Metas Ativas</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">{goals.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-white to-purple-50/50 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Conclusão das Metas</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                        {goals.length > 0 ? Math.round(goals.reduce((acc, goal) => acc + (goal.progress / goal.target * 100), 0) / goals.length) : 0}%
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily Schedule using Schedule-X */}
              <div className="lg:col-span-2">
                <Card className="bg-gradient-to-br from-white to-indigo-50/50 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousDay}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-center">
                        <CardTitle className="text-lg">
                          {isSameDay(selectedDate, new Date()) 
                            ? 'Hoje' 
                            : format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
                          }
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {format(selectedDate, 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextDay}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToToday}
                      >
                        Hoje
                      </Button>
                    </div>
                    <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Evento
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Novo Evento</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Título do evento"
                            value={newEvent.title}
                            onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                          />
                          <Textarea
                            placeholder="Descrição (opcional)"
                            value={newEvent.description}
                            onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                          />
                          <Input
                            type="date"
                            value={newEvent.startDate}
                            onChange={(e) => setNewEvent({...newEvent, startDate: e.target.value})}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              type="time"
                              placeholder="Hora início"
                              value={newEvent.startTime}
                              onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                            />
                            <Input
                              type="time"
                              placeholder="Hora fim"
                              value={newEvent.endTime}
                              onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                            />
                          </div>
                          <Input
                            type="color"
                            value={newEvent.color}
                            onChange={(e) => setNewEvent({...newEvent, color: e.target.value})}
                          />
                          <Button onClick={handleCreateEvent} className="w-full">
                            Criar Evento
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <div id="schedule-x-calendar-today" className="h-[700px] rounded-xl overflow-hidden border border-gray-100 shadow-inner"></div>
                  </CardContent>
                </Card>
              </div>

              {/* Tasks Sidebar */}
              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-white to-orange-50/50 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      Tarefas de {isSameDay(selectedDate, new Date()) ? 'Hoje' : format(selectedDate, 'dd/MM', { locale: ptBR })}
                    </CardTitle>
                    <Button 
                      onClick={navigateToTaskPanel}
                      variant="outline" 
                      size="sm"
                      className="text-xs"
                    >
                      Ver Todas
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-gray-500 mt-2">Carregando tarefas...</p>
                        </div>
                      ) : selectedDateTasks.length > 0 ? (
                        selectedDateTasks.map((task) => (
                          <div key={task.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                            <button
                              onClick={() => toggleTaskCompletion(task.id, task.status)}
                              className="mt-0.5"
                            >
                              {task.status === 'completed' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                            <div className="flex-1">
                              <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                  {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                                </Badge>
                                {task.description && (
                                  <span className="text-xs text-gray-500 truncate max-w-xs">
                                    {task.description}
                                  </span>
                                )}
                              </div>
                              {task.discipline && (
                                <p className="text-sm text-gray-600 mt-1">{task.discipline}</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Nenhuma tarefa para {isSameDay(selectedDate, new Date()) ? 'hoje' : 'esta data'}</p>
                          <Button 
                            onClick={navigateToTaskPanel}
                            variant="outline" 
                            className="mt-4"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Nova Tarefa
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>


              </div>
            </div>
          </div>
        )}

        {/* Week View */}
        {activeView === 'week' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-white to-blue-50/50 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Visão Semanal</CardTitle>
              </CardHeader>
              <CardContent>
                <div id="schedule-x-calendar-week" className="h-[700px] rounded-xl overflow-hidden border border-gray-100 shadow-inner"></div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Goals View */}
        {activeView === 'goals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Suas Metas</h2>
              <Dialog open={showNewGoalModal} onOpenChange={setShowNewGoalModal}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Meta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Meta</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Título da meta"
                      value={newGoal.title}
                      onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                    />
                    <Input
                      type="number"
                      placeholder="Meta (quantidade)"
                      value={newGoal.target || ''}
                      onChange={(e) => setNewGoal({...newGoal, target: parseInt(e.target.value) || 0})}
                    />
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={newGoal.unit}
                      onChange={(e) => setNewGoal({...newGoal, unit: e.target.value})}
                    >
                      <option value="horas">Horas</option>
                      <option value="questões">Questões</option>
                      <option value="cards">Cards</option>
                      <option value="páginas">Páginas</option>
                      <option value="exercícios">Exercícios</option>
                      <option value="simulados">Simulados</option>
                    </select>
                    <div className="flex space-x-2">
                      <Button onClick={handleCreateGoal} className="flex-1">
                        Criar Meta
                      </Button>
                      <Button variant="outline" onClick={() => setShowNewGoalModal(false)} className="flex-1">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {goals.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma meta criada</h3>
                <p className="text-gray-500 mb-4">Crie sua primeira meta para começar a acompanhar seu progresso</p>
                <Button 
                  onClick={async () => {
                    const hasPermission = await checkGoalPermission();
                    if (hasPermission) {
                      setShowNewGoalModal(true);
                    }
                  }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Meta
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map((goal) => (
                  <Card key={goal.id} className="bg-gradient-to-br from-white to-indigo-50/50 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{goal.title}</CardTitle>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenQuickIncrementModal(goal)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Incremento Rápido"
                        >
                          <Zap className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenUpdateProgressModal(goal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja excluir a meta "${goal.title}"?`)) {
                              handleDeleteGoal(goal.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span>{goal.progress} {goal.unit}</span>
                          <span>{goal.target} {goal.unit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(goal.progress, goal.target)}`}
                            style={{ width: `${Math.min((goal.progress / goal.target) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-center">
                          <span className="text-2xl font-bold text-gray-900">
                            {Math.round((goal.progress / goal.target) * 100)}%
                          </span>
                          <p className="text-sm text-gray-600">Concluído</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <SimpleEventModal
          isOpen={showEventModal}
          onClose={() => setShowEventModal(false)}
          onEventCreated={async (event) => {
            toast.success('Evento criado com sucesso!');
            // Recarregar a lista de eventos após criação
            await loadEvents();
          }}
          selectedDate={selectedDate}
        />

        <SimpleGoalModal
          isOpen={showGoalModal}
          onClose={() => setShowGoalModal(false)}
          onGoalCreated={async (goal) => {
            toast.success('Meta criada com sucesso!');
            // Refresh goals list if needed
            await loadGoals();
          }}
        />

        {/* Modal de Upgrade */}
        <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Recurso Premium
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {upgradeModalType === 'event' ? 'Criação de Eventos' : 'Criação de Metas'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {upgradeModalType === 'event' 
                    ? 'A criação de eventos personalizados é um recurso exclusivo para usuários Pro e Pro+.' 
                    : 'A criação de metas de estudo é um recurso exclusivo para usuários Pro e Pro+.'}
                </p>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Com o plano Pro você terá:</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• {upgradeModalType === 'event' ? 'Eventos ilimitados' : 'Metas ilimitadas'}</li>
                    <li>• Planejamento inteligente</li>
                    <li>• Relatórios avançados</li>
                    <li>• Suporte prioritário</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1"
                >
                  Continuar Grátis
                </Button>
                <Button 
                  onClick={() => {
                    setShowUpgradeModal(false);
                    router.push('/perfil/assinatura');
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  Fazer Upgrade
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Update Goal Progress Modal */}
        {selectedGoalForUpdate && (
          <UpdateGoalProgressModal
            isOpen={showUpdateProgressModal}
            onClose={handleCloseUpdateProgressModal}
            goal={selectedGoalForUpdate}
            onUpdateProgress={handleUpdateGoalProgress}
          />
        )}

        {/* Quick Goal Increment Modal */}
        {selectedGoalForQuickIncrement && (
          <QuickGoalIncrementModal
            isOpen={showQuickIncrementModal}
            onClose={handleCloseQuickIncrementModal}
            goal={selectedGoalForQuickIncrement}
            onIncrementProgress={handleQuickIncrementProgress}
          />
        )}


    </div>
  );
}