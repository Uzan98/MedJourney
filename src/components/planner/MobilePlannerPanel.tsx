'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

import { 
  Calendar, 
  Clock, 
  Target, 
  BookOpen, 
  Plus, 
  CheckCircle, 
  Circle, 
  Star, 
  TrendingUp, 
  Edit, 
  Trash2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Crown, 
  Zap, 
  CalendarDays, 
  AlertTriangle,
  PlayCircle,
  CircleDot,
  MoreVertical
} from 'lucide-react';
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Task } from '@/lib/types/dashboard';
import { toast } from 'react-hot-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import SimpleEventModal from '@/components/modals/simple-event-modal';
import SimpleGoalModal from '@/components/modals/simple-goal-modal';
import UpdateGoalProgressModal from '@/components/modals/update-goal-progress-modal';
import QuickGoalIncrementModal from '@/components/modals/quick-goal-increment-modal';

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

interface MobilePlannerPanelProps {
  tasks: Task[];
  goals: StudyGoal[];
  events: CalendarEvent[];
  loading: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onCreateEvent: () => Promise<void>;
  onCreateGoal: () => Promise<void>;
  onUpdateGoalProgress: (goalId: string, currentValue: number) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onQuickIncrementProgress: (goalId: string, increment: number) => Promise<void>;
  onOpenUpdateProgressModal?: (goal: StudyGoal) => void;
  onOpenQuickIncrementModal?: (goal: StudyGoal) => void;
  onLoadEvents?: () => Promise<void>;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => Promise<void>;
}

const MobilePlannerPanel: React.FC<MobilePlannerPanelProps> = ({
  tasks,
  goals,
  events,
  loading,
  selectedDate,
  onDateChange,
  onCreateEvent,
  onCreateGoal,
  onUpdateGoalProgress,
  onDeleteGoal,
  onQuickIncrementProgress,
  onOpenUpdateProgressModal,
  onOpenQuickIncrementModal,
  onLoadEvents,
  onEditEvent,
  onDeleteEvent
}) => {
  const [activeTab, setActiveTab] = useState('today');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Filtrar tarefas do dia selecionado
  const selectedDateTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate);
    return isSameDay(taskDate, selectedDate);
  });

  // Filtrar eventos do dia selecionado
  const selectedDateEvents = events.filter(event => {
    const eventDate = new Date(event.start);
    // Verificar se a data é válida
    if (isNaN(eventDate.getTime())) {
      return false;
    }
    return isSameDay(eventDate, selectedDate);
  });

  // Navegação de datas
  const goToPreviousDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Função para obter cor do progresso
  const getProgressColor = (progress: number, target: number) => {
    const percentage = (progress / target) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Renderizar prioridade da tarefa
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Alta</Badge>;
      case 'medium':
        return <Badge variant="default" className="text-xs">Média</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Baixa</Badge>;
      default:
        return null;
    }
  };

  // Renderizar data de vencimento
  const renderDueDate = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const date = new Date(dueDate);
    const today = new Date();
    const isOverdue = date < today && !isSameDay(date, today);
    const isToday = isSameDay(date, today);
    
    return (
      <Badge 
        variant={isOverdue ? "destructive" : isToday ? "default" : "outline"}
        className="text-xs flex items-center gap-1"
      >
        <Clock className="h-3 w-3" />
        {format(date, 'dd/MM')}
      </Badge>
    );
  };

  // Componente de estatísticas rápidas
  const QuickStats = () => {
    const completedGoals = goals.filter(goal => goal.progress >= goal.target).length;
    const avgProgress = goals.length > 0 
      ? Math.round(goals.reduce((acc, goal) => acc + (goal.progress / goal.target * 100), 0) / goals.length) 
      : 0;
    
    return (
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-blue-600">{selectedDateTasks.length}</div>
          <div className="text-xs text-gray-600">Tarefas Hoje</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-green-600">{goals.length}</div>
          <div className="text-xs text-gray-600">Metas Ativas</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-purple-600">{avgProgress}%</div>
          <div className="text-xs text-gray-600">Progresso</div>
        </Card>
      </div>
    );
  };

  // Componente TaskCard Mobile
  const MobileTaskCard = ({ task }: { task: Task }) => {
    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'pending':
          return <CircleDot className="h-4 w-4 text-blue-500" />;
        case 'in-progress':
          return <PlayCircle className="h-4 w-4 text-amber-500" />;
        case 'completed':
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        default:
          return <CircleDot className="h-4 w-4 text-gray-500" />;
      }
    };

    return (
      <Card className={`mb-3 border-l-4 ${
        task.priority === 'high' ? 'border-l-red-500' :
        task.priority === 'medium' ? 'border-l-yellow-500' :
        'border-l-green-500'
      } shadow-sm hover:shadow-md transition-shadow`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-800 leading-tight truncate">
                {task.title}
              </h3>
              {task.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(task.status)}
              {task.discipline && task.discipline !== 'none' && (
                <Badge variant="secondary" className="text-xs">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {task.discipline}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {renderDueDate(task.dueDate)}
              {renderPriorityBadge(task.priority)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Componente EventCard Mobile
  const MobileEventCard = ({ event }: { event: CalendarEvent }) => {
    // Validar se as datas são válidas
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null; // Não renderizar se as datas forem inválidas
    }
    
    const startTime = format(startDate, 'HH:mm');
    const endTime = format(endDate, 'HH:mm');

    const handleEdit = () => {
      if (onEditEvent) {
        onEditEvent(event);
      }
    };

    const handleDelete = async () => {
      if (onDeleteEvent) {
        const confirmed = window.confirm('Tem certeza que deseja excluir este evento?');
        if (confirmed) {
          await onDeleteEvent(event.id);
          toast.success('Evento excluído com sucesso!');
        }
      }
    };

    return (
      <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div 
              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: event.color || '#3b82f6' }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-800 leading-tight">
                {event.title}
              </h3>
              {event.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {event.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {startTime} - {endTime}
                </Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Componente GoalCard Mobile
  const MobileGoalCard = ({ goal }: { goal: StudyGoal }) => {
    const progressPercentage = Math.min((goal.progress / goal.target) * 100, 100);
    const isCompleted = goal.progress >= goal.target;

    return (
      <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-800 leading-tight">
                {goal.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-600">
                  {goal.progress} / {goal.target} {goal.unit}
                </span>
                {isCompleted && (
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Concluída
                  </Badge>
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => {
                  onOpenUpdateProgressModal?.(goal);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Atualizar Progresso
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  onOpenQuickIncrementModal?.(goal);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Incremento Rápido
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    if (confirm(`Tem certeza que deseja excluir a meta "${goal.title}"?`)) {
                      onDeleteGoal(goal.id);
                    }
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(goal.progress, goal.target)}`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-gray-900">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header fixo */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-bold text-gray-900">Planner</h1>
          
          <div className="flex items-center gap-2">
            <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="px-3">
                  <Calendar className="h-4 w-4 mr-1" />
                  Evento
                </Button>
              </DialogTrigger>
            </Dialog>
            
            <Dialog open={showGoalModal} onOpenChange={setShowGoalModal}>
              <DialogTrigger asChild>
                <Button size="sm" className="px-3">
                  <Target className="h-4 w-4 mr-1" />
                  Meta
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>
        
        <QuickStats />
      </div>

      {/* Conteúdo principal */}
      <div className="px-4 pt-4">
        <div className="w-full">
          {/* Botões de navegação customizados */}
          <div className="grid grid-cols-3 gap-1 mb-4 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab('today')}
              className={`flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === 'today'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Hoje
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === 'events'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Eventos
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                activeTab === 'goals'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              <Target className="h-4 w-4 mr-1" />
              Metas
            </button>
          </div>

          {/* Navegação de data para aba Today */}
          {activeTab === 'today' && (
            <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg shadow-sm">
              <Button variant="outline" size="sm" onClick={goToPreviousDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="text-center">
                <div className="font-semibold text-sm">
                  {isSameDay(selectedDate, new Date()) 
                    ? 'Hoje' 
                    : format(selectedDate, "EEEE", { locale: ptBR })
                  }
                </div>
                <div className="text-xs text-gray-600">
                  {format(selectedDate, 'dd/MM/yyyy')}
                </div>
              </div>
              
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Hoje
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextDay}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Conteúdo das abas */}
          <div className="mt-0">
            {activeTab === 'today' && (
              <div className="space-y-4">
                {/* Tarefas do dia */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Tarefas ({selectedDateTasks.length})
                  </h3>
                  {loading ? (
                    <div className="space-y-3">
                      {Array(3).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : selectedDateTasks.length === 0 ? (
                    <Card className="p-6 text-center">
                      <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">Nenhuma tarefa para hoje</p>
                      <p className="text-sm text-gray-500 mt-1">Aproveite seu dia livre!</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateTasks.map((task) => (
                        <MobileTaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Eventos do dia */}
                <div>
                  <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Eventos ({selectedDateEvents.length})
                  </h3>
                  {selectedDateEvents.length === 0 ? (
                    <Card className="p-6 text-center">
                      <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">Nenhum evento para hoje</p>
                      <p className="text-sm text-gray-500 mt-1">Crie um evento para organizar seu dia</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateEvents.map((event) => (
                        <MobileEventCard key={event.id} event={event} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div>
                <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Todos os Eventos ({events.length})
                </h3>
                {events.length === 0 ? (
                  <Card className="p-6 text-center">
                    <CalendarDays className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Nenhum evento criado</p>
                    <p className="text-sm text-gray-500 mt-1">Crie seu primeiro evento!</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <MobileEventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'goals' && (
              <div>
                <h3 className="font-semibold text-sm text-gray-800 mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Metas de Estudo ({goals.length})
                </h3>
                {goals.length === 0 ? (
                  <Card className="p-6 text-center">
                    <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Nenhuma meta criada</p>
                    <p className="text-sm text-gray-500 mt-1">Defina suas metas de estudo!</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {goals.map((goal) => (
                      <MobileGoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <SimpleEventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onEventCreated={async (event) => {
          toast.success('Evento criado com sucesso!');
          if (onLoadEvents) {
            await onLoadEvents();
          }
          setShowEventModal(false);
        }}
        selectedDate={selectedDate}
      />

      <SimpleGoalModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        onGoalCreated={async (goal) => {
          toast.success('Meta criada com sucesso!');
          await onCreateGoal();
        }}
      />


    </div>
  );
};

export default MobilePlannerPanel;