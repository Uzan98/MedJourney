'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, BookOpen, Calendar, AlertCircle, Clock, Filter, CheckCircle, PlayCircle, CircleDot, Edit3, Kanban } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TaskForm from './components/task-form';
import { TaskService } from '@/lib/services/task.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { toast } from 'sonner';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import TaskChecklistDisplay from '@/components/ui/task-checklist-display';
import { useIsMobile } from '@/hooks/useIsMobile';
import MobileTaskPanel from '@/components/tarefas/MobileTaskPanel';

import { Task } from '@/lib/types/dashboard';
import { Discipline } from '@/lib/supabase';

const TaskPanel = () => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loadingDisciplines, setLoadingDisciplines] = useState(true);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all');
  const [tasks, setTasks] = useState<{
    pending: Task[];
    'in-progress': Task[];
    completed: Task[];
  }>({
    pending: [],
    'in-progress': [],
    completed: [],
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Carregar disciplinas
  const loadDisciplines = async () => {
    try {
      setLoadingDisciplines(true);
      const disciplinesList = await DisciplinesRestService.getDisciplines(true);
      setDisciplines(disciplinesList);
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast.error('Não foi possível carregar as disciplinas');
    } finally {
      setLoadingDisciplines(false);
    }
  };

  // Carregar tarefas
  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await TaskService.getTasks();
      
      // Filtrar por disciplina selecionada, se houver
      const filteredTasks = selectedDiscipline === 'all'
        ? allTasks
        : allTasks.filter(task => task.discipline === selectedDiscipline);
      
      // Agrupar tarefas por status
      const grouped = {
        pending: filteredTasks.filter(task => task.status === 'pending'),
        'in-progress': filteredTasks.filter(task => task.status === 'in-progress'),
        completed: filteredTasks.filter(task => task.status === 'completed'),
      };
      
      setTasks(grouped);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast.error('Não foi possível carregar as tarefas');
    } finally {
      setLoading(false);
    }
  };

  // Configurar auto-scroll
  useEffect(() => {
    return autoScrollForElements({
      element: document.documentElement,
    });
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    loadDisciplines();
    loadTasks();
  }, []);
  
  // Recarregar tarefas quando a disciplina selecionada mudar
  useEffect(() => {
    loadTasks();
  }, [selectedDiscipline]);

  // Função para lidar com o movimento de tarefas
  const moveTask = async (taskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    // Encontrar a tarefa em qualquer status
    let task: Task | undefined;
    let sourceStatus: 'pending' | 'in-progress' | 'completed' | undefined;
    
    for (const status of ['pending', 'in-progress', 'completed'] as const) {
      task = tasks[status].find(t => t.id === taskId);
      if (task) {
        sourceStatus = status;
        break;
      }
    }

    if (!task || !sourceStatus || sourceStatus === newStatus) return;

    // Atualizar o estado local primeiro
    setTasks(prev => {
      const newTasks = { ...prev };
      
      // Remover da lista de origem
      newTasks[sourceStatus!] = prev[sourceStatus!].filter(t => t.id !== taskId);
      
      // Adicionar na lista de destino
      const updatedTask = { ...task!, status: newStatus };
      newTasks[newStatus] = [...prev[newStatus], updatedTask];
      
      return newTasks;
    });

    try {
      // Atualizar no servidor
      await TaskService.updateTask(taskId, { status: newStatus });
      toast.success('Tarefa movida com sucesso!');
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      toast.error('Erro ao mover tarefa');
      // Reverter o estado em caso de erro
      loadTasks();
    }
  };

  // Manipular criação de tarefa
  const handleCreateTask = async (taskData: any) => {
    try {
      await TaskService.createTask(taskData);
      toast.success('Tarefa criada com sucesso!');
      setIsCreateDialogOpen(false);
      loadTasks();
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      toast.error('❌ Não foi possível criar a tarefa');
    }
  };

  // Manipular edição de tarefa
  const handleEditTask = async (taskId: string, taskData: any) => {
    try {
      await TaskService.updateTask(taskId, taskData);
      toast.success('✅ Tarefa atualizada com sucesso!');
      setEditingTask(null);
      loadTasks();
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('❌ Não foi possível atualizar a tarefa');
    }
  };

  // Manipular exclusão de tarefa
  const handleDeleteTask = async (taskId: string) => {
    try {
      await TaskService.deleteTask(taskId);
      toast.success('Tarefa excluída com sucesso!');
      setEditingTask(null);
      loadTasks();
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast.error('❌ Não foi possível excluir a tarefa');
    }
  };

  // Renderizar prioridade da tarefa
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      case 'medium':
        return <Badge variant="default">Média</Badge>;
      case 'low':
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return null;
    }
  };

  // Renderizar data de vencimento
  const renderDueDate = (dueDate: Date | null) => {
    if (!dueDate) return null;
    
    const formattedDate = format(new Date(dueDate), 'dd/MM/yyyy', { locale: ptBR });
    const isOverdue = new Date(dueDate) < new Date() && dueDate;
    
    return (
      <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
        <Calendar className="h-3 w-3" />
        <span>{formattedDate}</span>
        {isOverdue && <AlertCircle className="h-3 w-3" />}
      </div>
    );
  };

  // Componente TaskCard
  const TaskCard = ({ task, index, onEdit }: { task: Task; index: number; onEdit: (task: Task) => void }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
      const element = cardRef.current;
      if (!element) return;

      return draggable({
        element,
        getInitialData: () => ({ taskId: task.id, type: 'task' }),
        onDragStart: () => {
          setIsDragging(true);
          setDraggedTask(task);
        },
        onDrop: () => {
          setIsDragging(false);
          setDraggedTask(null);
        },
      });
    }, [task.id]);

    return (
      <div
        key={task.id}
        ref={cardRef}
        className={`mb-3 transition-all duration-300 group ${
          isDragging 
            ? 'rotate-2 scale-110 shadow-2xl z-50 animate-pulse' 
            : 'hover:shadow-xl hover:scale-105'
        }`}
      >
        <Card className={`border-l-4 ${
          task.priority === 'high' ? 'border-l-red-500 hover:border-l-red-600' :
          task.priority === 'medium' ? 'border-l-yellow-500 hover:border-l-yellow-600' :
          'border-l-green-500 hover:border-l-green-600'
        } ${isDragging ? 'bg-blue-50 border-blue-200' : 'bg-gradient-to-br from-white to-gray-50 hover:from-white hover:to-blue-50'} transition-all duration-300 cursor-grab active:cursor-grabbing shadow-md hover:shadow-xl`}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-sm text-gray-800 leading-tight group-hover:text-blue-700 transition-colors">{task.title}</h3>
              <div className="flex gap-1 flex-shrink-0 ml-2">
                {task.discipline && task.discipline !== 'none' && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-white/80 shadow-sm">
                    <BookOpen size={10} />
                    {task.discipline}
                  </Badge>
                )}
                {renderPriorityBadge(task.priority)}
              </div>
            </div>
            
            {task.description && (
              <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed group-hover:text-gray-700 transition-colors">{task.description}</p>
            )}
            
            {task.checklist && task.checklist.length > 0 && (
              <div className="mb-3">
                <TaskChecklistDisplay 
                  items={task.checklist} 
                  maxItems={2}
                  className="text-xs"
                />
              </div>
            )}
            
            <div className="flex justify-between items-center">
              {renderDueDate(task.dueDate)}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-blue-100 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
              >
                <Edit3 className="h-3 w-3 text-gray-600" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Componente TaskColumn
  const TaskColumn = ({ title, status }: { title: string; status: 'pending' | 'in-progress' | 'completed' }) => {
    const columnRef = useRef<HTMLDivElement>(null);
    const [isDraggedOver, setIsDraggedOver] = useState(false);

    const statusConfig = {
      pending: { 
        label: 'A Fazer', 
        color: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300',
        headerColor: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
        iconBg: 'bg-blue-500',
        count: tasks.pending?.length || 0
      },
      'in-progress': { 
        label: 'Em Progresso', 
        color: 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300',
        headerColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
        iconBg: 'bg-amber-500',
        count: tasks['in-progress']?.length || 0
      },
      completed: { 
        label: 'Concluído', 
        color: 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300',
        headerColor: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
        iconBg: 'bg-emerald-500',
        count: tasks.completed?.length || 0
      }
    };

    const config = statusConfig[status];

    useEffect(() => {
      const element = columnRef.current;
      if (!element) return;

      return dropTargetForElements({
        element,
        getData: () => ({ status }),
        canDrop: ({ source }) => {
          return source.data.type === 'task';
        },
        onDragEnter: () => setIsDraggedOver(true),
        onDragLeave: () => setIsDraggedOver(false),
        onDrop: ({ source }) => {
          setIsDraggedOver(false);
          const taskId = source.data.taskId as string;
          if (taskId) {
            moveTask(taskId, status);
          }
        },
      });
    }, [status]);

    return (
      <div className="flex-1 min-w-[320px] max-w-sm">
        <Card className={`${config.color} border-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]`}>
          <CardHeader className={`pb-3 ${config.headerColor} rounded-t-lg shadow-sm`}>
            <CardTitle className="text-base font-bold flex justify-between items-center">
              <span className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${config.iconBg} bg-opacity-20 backdrop-blur-sm`}>
                  {status === 'pending' && <CircleDot className="h-4 w-4 text-white" />}
                  {status === 'in-progress' && <PlayCircle className="h-4 w-4 text-white" />}
                  {status === 'completed' && <CheckCircle className="h-4 w-4 text-white" />}
                </div>
                <span className="font-semibold">{config.label}</span>
              </span>
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white font-bold text-sm">{tasks[status].length}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div
              ref={columnRef}
              className={`min-h-[400px] rounded-lg p-2 transition-all duration-300 ${
                isDraggedOver 
                  ? 'bg-blue-100 border-2 border-dashed border-blue-400 scale-105 bg-gradient-to-b from-blue-50 to-blue-100' 
                  : 'bg-white/50'
              }`}
            >
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="mb-3">
                    <Skeleton className="h-28 w-full rounded-lg" />
                  </div>
                ))
              ) : tasks[status].length > 0 ? (
                <div className="group">
                  {tasks[status].map((task, index) => (
                    <TaskCard key={task.id} task={task} index={index} onEdit={setEditingTask} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg bg-white/30 backdrop-blur-sm">
                  <div className={`p-3 rounded-full ${config.iconBg} bg-opacity-10 mb-3`}>
                    {status === 'pending' && <CircleDot className="h-6 w-6 text-gray-400" />}
                    {status === 'in-progress' && <PlayCircle className="h-6 w-6 text-gray-400" />}
                    {status === 'completed' && <CheckCircle className="h-6 w-6 text-gray-400" />}
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Nenhuma tarefa</p>
                  <p className="text-xs text-gray-400">Arraste tarefas para cá</p>
                </div>
              )}
              {isDraggedOver && (
                <div className="text-center py-4 text-blue-600 font-medium animate-pulse">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <span>Solte aqui para mover</span>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Renderizar versão mobile se for dispositivo móvel
   if (isMobile) {
     return (
       <MobileTaskPanel 
         tasks={tasks}
         disciplines={disciplines}
         loading={loading}
         loadingDisciplines={loadingDisciplines}
         selectedDiscipline={selectedDiscipline}
         setSelectedDiscipline={setSelectedDiscipline}
         onCreateTask={handleCreateTask}
         onEditTask={handleEditTask}
         onDeleteTask={handleDeleteTask}
         onMoveTask={moveTask}
       />
     );
   }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Painel de Tarefas</h1>
        
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter size={16} />
                Filtrar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Disciplina</h4>
                  <Select
                    value={selectedDiscipline}
                    onValueChange={setSelectedDiscipline}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todas as disciplinas" />
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
              </div>
            </PopoverContent>
          </Popover>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Tarefa</DialogTitle>
              </DialogHeader>
              <TaskForm onSubmit={handleCreateTask} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de tarefas (To-Do List) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lista de Tarefas Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tasks.pending.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhuma tarefa pendente encontrada
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.pending.map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-accent cursor-pointer"
                  onClick={() => setEditingTask(task)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>{task.title}</span>
                    {task.discipline && task.discipline !== 'none' && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <BookOpen size={12} />
                        {task.discipline}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {task.dueDate && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    )}
                    {renderPriorityBadge(task.priority)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-md">
               <Kanban className="h-5 w-5 text-white" />
             </div>
             <h2 className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
               Quadro Kanban
             </h2>
           </div>
          <p className="text-sm text-slate-600 font-medium pl-11">Arraste e solte as tarefas entre as colunas para alterar o status</p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-4">
          <TaskColumn title="Pendentes" status="pending" />
          <TaskColumn title="Em Progresso" status="in-progress" />
          <TaskColumn title="Concluídas" status="completed" />
        </div>
      </div>

      {/* Dialog para edição de tarefa */}
      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

export default TaskPanel;