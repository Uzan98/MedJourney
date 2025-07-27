import { supabase } from '@/lib/supabase';
import { Task } from '@/types/dashboard';

import { ChecklistItem } from '@/lib/types/dashboard';

export interface TaskFormData {
  title: string;
  description?: string;
  status?: 'pending' | 'in-progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date | null;
  discipline?: string;
  checklist?: ChecklistItem[];
}

export class TaskService {
  /**
   * Busca todas as tarefas do usuário
   * @param status Filtro opcional por status
   * @param limit Limite opcional de resultados
   * @returns Lista de tarefas
   */
  static async getTasks(status?: string, limit?: number): Promise<Task[]> {
    try {
      // Obter a sessão atual para pegar o ID do usuário
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Construir a consulta
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });
      
      // Aplicar filtros opcionais
      if (status) {
        query = query.eq('status', status);
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      // Executar a consulta
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Formatar as datas para o cliente
      return data.map(task => ({
        ...task,
        dueDate: task.due_date ? new Date(task.due_date) : null
      }));
    } catch (error) {
      console.error('Erro no serviço de tarefas:', error);
      throw error;
    }
  }

  /**
   * Busca uma tarefa específica pelo ID
   * @param taskId ID da tarefa
   * @returns Tarefa encontrada
   */
  static async getTaskById(taskId: string): Promise<Task> {
    try {
      // Obter a sessão atual para pegar o ID do usuário
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Buscar a tarefa específica
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('Tarefa não encontrada');
      }
      
      // Formatar a data para o cliente
      return {
        ...data,
        dueDate: data.due_date ? new Date(data.due_date) : null
      };
    } catch (error) {
      console.error('Erro no serviço de tarefas:', error);
      throw error;
    }
  }

  /**
   * Cria uma nova tarefa
   * @param taskData Dados da tarefa
   * @returns Tarefa criada
   */
  static async createTask(taskData: TaskFormData): Promise<Task> {
    try {
      // Obter a sessão atual para pegar o ID do usuário
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Preparar dados para inserção
      const taskDataForDb = {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
        due_date: taskData.dueDate,
        user_id: userId,
        discipline: taskData.discipline,
        checklist: taskData.checklist || []
      };
      
      // Inserir a tarefa
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskDataForDb])
        .select()
        .single();
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('Erro ao criar tarefa');
      }
      
      // Formatar a data para o cliente
      return {
        ...data,
        dueDate: data.due_date ? new Date(data.due_date) : null
      };
    } catch (error) {
      console.error('Erro no serviço de tarefas:', error);
      throw error;
    }
  }

  /**
   * Atualiza uma tarefa existente
   * @param taskId ID da tarefa
   * @param taskData Dados atualizados da tarefa
   * @returns Tarefa atualizada
   */
  static async updateTask(taskId: string, taskData: Partial<TaskFormData>): Promise<Task> {
    try {
      // Obter a sessão atual para pegar o ID do usuário
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Verificar se a tarefa existe e pertence ao usuário
      const { data: existingTask, error: checkError } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();
      
      if (checkError || !existingTask) {
        throw new Error('Tarefa não encontrada ou não pertence ao usuário');
      }
      
      // Preparar dados para atualização
      const taskDataForDb: any = {};
      
      if (taskData.title !== undefined) taskDataForDb.title = taskData.title;
      if (taskData.description !== undefined) taskDataForDb.description = taskData.description;
      if (taskData.status !== undefined) taskDataForDb.status = taskData.status;
      if (taskData.priority !== undefined) taskDataForDb.priority = taskData.priority;
      if (taskData.dueDate !== undefined) taskDataForDb.due_date = taskData.dueDate;
      if (taskData.discipline !== undefined) taskDataForDb.discipline = taskData.discipline;
      if (taskData.checklist !== undefined) taskDataForDb.checklist = taskData.checklist;
      
      // Atualizar a tarefa
      const { data, error } = await supabase
        .from('tasks')
        .update(taskDataForDb)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('Erro ao atualizar tarefa');
      }
      
      // Formatar a data para o cliente
      return {
        ...data,
        dueDate: data.due_date ? new Date(data.due_date) : null
      };
    } catch (error) {
      console.error('Erro no serviço de tarefas:', error);
      throw error;
    }
  }

  /**
   * Atualiza o status de uma tarefa
   * @param taskId ID da tarefa
   * @param status Novo status
   * @returns Tarefa atualizada
   */
  static async updateTaskStatus(taskId: string, status: 'pending' | 'in-progress' | 'completed'): Promise<Task> {
    return this.updateTask(taskId, { status });
  }

  /**
   * Exclui uma tarefa
   * @param taskId ID da tarefa
   * @returns Confirmação de sucesso
   */
  static async deleteTask(taskId: string): Promise<{ success: boolean }> {
    try {
      // Obter a sessão atual para pegar o ID do usuário
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Verificar se a tarefa existe e pertence ao usuário
      const { data: existingTask, error: checkError } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();
      
      if (checkError || !existingTask) {
        throw new Error('Tarefa não encontrada ou não pertence ao usuário');
      }
      
      // Excluir a tarefa
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Erro no serviço de tarefas:', error);
      throw error;
    }
  }

  /**
   * Busca tarefas diretamente do Supabase (para uso offline)
   * @param userId ID do usuário
   * @param status Filtro opcional por status
   * @returns Lista de tarefas
   */
  static async getTasksOffline(userId: string, status?: string): Promise<Task[]> {
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Formatar as datas para o cliente
      return data.map(task => ({
        ...task,
        dueDate: task.due_date ? new Date(task.due_date) : null
      }));
    } catch (error) {
      console.error('Erro no serviço offline de tarefas:', error);
      throw error;
    }
  }
}