'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  PlusCircle, 
  BookOpen, 
  Calendar, 
  AlertCircle, 
  Clock, 
  Filter, 
  CheckCircle, 
  PlayCircle, 
  CircleDot, 
  Edit3,
  MoreVertical,
  ArrowRight,
  CheckSquare,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TaskForm from '@/app/tarefas/components/task-form';
import { TaskService } from '@/lib/services/task.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { toast } from 'sonner';
import TaskChecklistDisplay from '@/components/ui/task-checklist-display';
import { Task } from '@/lib/types/dashboard';
import { Discipline } from '@/lib/supabase';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface MobileTaskPanelProps {
  tasks: {
    pending: Task[];
    'in-progress': Task[];
    completed: Task[];
  };
  loading: boolean;
  disciplines: Discipline[];
  loadingDisciplines: boolean;
  selectedDiscipline: string;
  setSelectedDiscipline: (value: string) => void;
  onCreateTask: (taskData: any) => Promise<void>;
  onEditTask: (taskId: string, taskData: any) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onMoveTask: (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => Promise<void>;
}

const MobileTaskPanel: React.FC<MobileTaskPanelProps> = ({
  tasks,
  loading,
  disciplines,
  loadingDisciplines,
  selectedDiscipline,
  setSelectedDiscipline,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onMoveTask
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [showFilters, setShowFilters] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Garantir hidratação adequada para evitar problemas de SSR
  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
  const renderDueDate = (dueDate: Date | null) => {
    if (!dueDate) return null;
    
    const formattedDate = format(new Date(dueDate), 'dd/MM', { locale: ptBR });
    const isOverdue = new Date(dueDate) < new Date() && dueDate;
    
    return (
      <div className={`flex items-center gap-1 text-xs ${
        isOverdue ? 'text-red-500' : 'text-gray-500'
      }`}>
        <Calendar className="h-3 w-3" />
        <span>{formattedDate}</span>
        {isOverdue && <AlertCircle className="h-3 w-3" />}
      </div>
    );
  };

  // Manipular criação de tarefa
  const handleCreateTask = async (taskData: any) => {
    try {
      await onCreateTask(taskData);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  };

  // Manipular edição de tarefa
  const handleEditTask = async (taskId: string, taskData: any) => {
    try {
      await onEditTask(taskId, taskData);
      setEditingTask(null);
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
    }
  };

  // Manipular exclusão de tarefa
  const handleDeleteTask = async (taskId: string) => {
    try {
      await onDeleteTask(taskId);
      setEditingTask(null);
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
    }
  };

  // Componente TaskCard Mobile
  const MobileTaskCard = ({ task }: { task: Task }) => {
    const [showMoveOptions, setShowMoveOptions] = useState(false);

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

    const getStatusOptions = () => {
      const allStatuses = [
        { value: 'pending', label: 'A Fazer', icon: CircleDot },
        { value: 'in-progress', label: 'Em Progresso', icon: PlayCircle },
        { value: 'completed', label: 'Concluído', icon: CheckCircle }
      ];
      return allStatuses.filter(status => status.value !== task.status);
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setEditingTask(task)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {getStatusOptions().map((status) => {
                  const Icon = status.icon;
                  return (
                    <DropdownMenuItem 
                      key={status.value}
                      onClick={() => onMoveTask(task.id, status.value as any)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      Mover para {status.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {task.checklist && task.checklist.length > 0 && (
            <div className="mb-3">
              <TaskChecklistDisplay 
                items={task.checklist} 
                maxItems={2}
                className="text-xs"
              />
            </div>
          )}
          
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

  // Componente de estatísticas rápidas
  const QuickStats = () => {
    const totalTasks = tasks.pending.length + tasks['in-progress'].length + tasks.completed.length;
    const completionRate = totalTasks > 0 ? Math.round((tasks.completed.length / totalTasks) * 100) : 0;
    
    return (
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-blue-600">{tasks.pending.length}</div>
          <div className="text-xs text-gray-600">A Fazer</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-amber-600">{tasks['in-progress'].length}</div>
          <div className="text-xs text-gray-600">Em Progresso</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-green-600">{completionRate}%</div>
          <div className="text-xs text-gray-600">Concluído</div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header fixo */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-bold text-gray-900">Tarefas</h1>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="p-2"
            >
              <Filter className="h-4 w-4" />
            </Button>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="px-3">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Nova
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-[400px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nova Tarefa</DialogTitle>
                </DialogHeader>
                <TaskForm onSubmit={handleCreateTask} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Filtros */}
        {showFilters && (
          <div className="mb-3">
            <Select
              value={selectedDiscipline}
              onValueChange={setSelectedDiscipline}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtrar por disciplina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as disciplinas</SelectItem>
                {loadingDisciplines ? (
                  <SelectItem value="loading" disabled>
                    Carregando...
                  </SelectItem>
                ) : disciplines.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhuma disciplina encontrada
                  </SelectItem>
                ) : (
                  disciplines.map((discipline) => (
                    <SelectItem key={discipline.id} value={discipline.name}>
                      {discipline.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <QuickStats />
      </div>

      {/* Conteúdo principal */}
      <div className="px-4 pt-4">
        {!isHydrated ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : (
        <Tabs key="mobile-tabs" value={activeTab} onValueChange={setActiveTab} className="w-full" defaultValue="pending">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="pending" className="text-xs">
              <CircleDot className="h-4 w-4 mr-1" />
              A Fazer ({tasks.pending.length})
            </TabsTrigger>
            <TabsTrigger value="in-progress" className="text-xs">
              <PlayCircle className="h-4 w-4 mr-1" />
              Progresso ({tasks['in-progress'].length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">
              <CheckCircle className="h-4 w-4 mr-1" />
              Feito ({tasks.completed.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-0">
            {loading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : tasks.pending.length === 0 ? (
              <Card className="p-6 text-center">
                <CircleDot className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Nenhuma tarefa pendente</p>
                <p className="text-sm text-gray-500 mt-1">Crie sua primeira tarefa!</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks.pending.map((task) => (
                  <MobileTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="mt-0">
            {loading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : tasks['in-progress'].length === 0 ? (
              <Card className="p-6 text-center">
                <PlayCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Nenhuma tarefa em progresso</p>
                <p className="text-sm text-gray-500 mt-1">Mova tarefas para cá quando começar a trabalhar nelas</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks['in-progress'].map((task) => (
                  <MobileTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            {loading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : tasks.completed.length === 0 ? (
              <Card className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Nenhuma tarefa concluída</p>
                <p className="text-sm text-gray-500 mt-1">Complete suas tarefas para vê-las aqui</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks.completed.map((task) => (
                  <MobileTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        )}
      </div>

      {/* Dialog para edição de tarefa */}
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
          <DialogContent className="w-[95vw] max-w-[400px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Tarefa</DialogTitle>
            </DialogHeader>
            <TaskForm 
              task={editingTask} 
              onSubmit={(data) => handleEditTask(editingTask.id, data)} 
              onDelete={() => handleDeleteTask(editingTask.id)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MobileTaskPanel;