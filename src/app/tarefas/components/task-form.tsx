'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import { Task } from '@/types/dashboard';
import { TaskFormData } from '@/lib/services/task.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline } from '@/lib/supabase';
import { ChecklistItem } from '@/lib/types/dashboard';
import Checklist from '@/components/ui/checklist';

// Esquema de validação
const taskSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório'),
  description: z.string().optional(),
  status: z.enum(['pending', 'in-progress', 'completed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.date().nullable().optional(),
  discipline: z.string().optional(),
  checklist: z.array(z.object({
    id: z.string(),
    text: z.string(),
    completed: z.boolean()
  })).optional(),
});

type TaskFormProps = {
  task?: Task;
  onSubmit: (data: TaskFormData) => void;
  onDelete?: () => void;
};

const TaskForm = ({ task, onSubmit, onDelete }: TaskFormProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loadingDisciplines, setLoadingDisciplines] = useState(true);
  
  // Buscar disciplinas do usuário
  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        setLoadingDisciplines(true);
        const disciplinesList = await DisciplinesRestService.getDisciplines(true);
        setDisciplines(disciplinesList);
      } catch (error) {
        console.error('Erro ao buscar disciplinas:', error);
      } finally {
        setLoadingDisciplines(false);
      }
    };
    
    fetchDisciplines();
  }, []);
  
  // Inicializar formulário
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      dueDate: null,
      discipline: 'none',
      checklist: [],
    },
  });

  // Preencher formulário com dados da tarefa existente
  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || '',
        status: task.status as 'pending' | 'in-progress' | 'completed',
        priority: task.priority as 'low' | 'medium' | 'high',
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        discipline: task.discipline || 'none',
        checklist: task.checklist || [],
      });
    }
  }, [task, form]);

  // Manipular envio do formulário
  const handleSubmit = (data: z.infer<typeof taskSchema>) => {
    onSubmit(data);
  };

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o título da tarefa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descreva os detalhes da tarefa" 
                    className="resize-none" 
                    {...field} 
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in-progress">Em Progresso</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Vencimento</FormLabel>
                <FormControl>
                  <DatePicker
                    selected={field.value}
                    onChange={(date) => field.onChange(date)}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Selecione uma data"
                    minDate={new Date()}
                    className="w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
                    wrapperClassName="w-full"
                    shouldCloseOnSelect={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discipline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disciplina</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione uma disciplina" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {loadingDisciplines ? (
                      <SelectItem value="loading" disabled>Carregando disciplinas...</SelectItem>
                    ) : disciplines.length > 0 ? (
                      disciplines.map((discipline) => (
                        <SelectItem key={discipline.id} value={discipline.name}>
                          {discipline.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>Nenhuma disciplina encontrada</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {disciplines.length === 0 ? 
                    "Adicione disciplinas primeiro no menu 'Disciplinas'" : 
                    "Associe esta tarefa a uma disciplina"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checklist"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Checklist</FormLabel>
                <FormControl>
                  <Checklist
                    items={field.value || []}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  Adicione itens à checklist para organizar as subtarefas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between pt-2">
            {task && onDelete ? (
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente a tarefa.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div></div>
            )}
            <Button type="submit">{task ? 'Atualizar' : 'Criar'} Tarefa</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default TaskForm;