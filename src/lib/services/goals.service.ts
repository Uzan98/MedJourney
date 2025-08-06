import { supabase } from '@/lib/supabase';
import { SubscriptionClientService } from '@/services/subscription-client.service';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  unit: string;
  deadline?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalData {
  title: string;
  description?: string;
  target_value: number;
  unit: string;
  deadline?: string;
  color?: string;
}

export interface UpdateGoalData {
  title?: string;
  description?: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  deadline?: string;
  color?: string;
  is_active?: boolean;
}

export class GoalsService {
  private static supabaseClient = supabase;

  /**
   * Verifica se o usuário tem permissão para criar metas (Pro/Pro+)
   */
  static async checkGoalPermission(): Promise<{ hasPermission: boolean; message?: string }> {
    try {
      const permission = await SubscriptionClientService.checkUserPermission();
      return {
        hasPermission: permission.hasPermission,
        message: permission.message
      };
    } catch (error) {
      console.error('Erro ao verificar permissão para metas:', error);
      return {
        hasPermission: false,
        message: 'Erro ao verificar permissões'
      };
    }
  }

  /**
   * Cria uma nova meta
   */
  static async createGoal(goalData: CreateGoalData): Promise<Goal | null> {
    try {
      // Verificar permissões
      const permission = await this.checkGoalPermission();
      if (!permission.hasPermission) {
        throw new Error(permission.message);
      }

      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await this.supabaseClient
        .from('goals')
        .insert({
          user_id: user.id,
          title: goalData.title,
          description: goalData.description,
          target_value: goalData.target_value,
          current_value: 0,
          unit: goalData.unit,
          deadline: goalData.deadline,
          color: goalData.color || '#10b981',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar meta:', error);
        throw new Error('Erro ao criar meta');
      }

      return data;
    } catch (error) {
      console.error('Erro no GoalsService.createGoal:', error);
      throw error;
    }
  }

  /**
   * Busca todas as metas do usuário
   */
  static async getUserGoals(includeInactive: boolean = false): Promise<Goal[]> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      let query = this.supabaseClient
        .from('goals')
        .select('*')
        .eq('user_id', user.id);

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar metas:', error);
        throw new Error('Erro ao buscar metas');
      }

      return data || [];
    } catch (error) {
      console.error('Erro no GoalsService.getUserGoals:', error);
      return [];
    }
  }

  /**
   * Busca uma meta específica por ID
   */
  static async getGoalById(id: string): Promise<Goal | null> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await this.supabaseClient
        .from('goals')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar meta:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro no GoalsService.getGoalById:', error);
      return null;
    }
  }

  /**
   * Atualiza uma meta
   */
  static async updateGoal(id: string, updates: UpdateGoalData): Promise<Goal | null> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await this.supabaseClient
        .from('goals')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar meta:', error);
        throw new Error('Erro ao atualizar meta');
      }

      return data;
    } catch (error) {
      console.error('Erro no GoalsService.updateGoal:', error);
      throw error;
    }
  }

  /**
   * Atualiza o progresso de uma meta
   */
  static async updateGoalProgress(id: string, currentValue: number): Promise<{ goal: Goal | null; wasCompleted: boolean }> {
    try {
      const goal = await this.getGoalById(id);
      if (!goal) {
        throw new Error('Meta não encontrada');
      }

      const wasAlreadyCompleted = goal.current_value >= goal.target_value;
      const updatedGoal = await this.updateGoal(id, { current_value: currentValue });
      const isNowCompleted = updatedGoal && updatedGoal.current_value >= updatedGoal.target_value;
      const wasCompleted = !wasAlreadyCompleted && isNowCompleted;

      return { goal: updatedGoal, wasCompleted };
    } catch (error) {
      console.error('Erro no GoalsService.updateGoalProgress:', error);
      throw error;
    }
  }

  /**
   * Incrementa o progresso de uma meta
   */
  static async incrementGoalProgress(id: string, increment: number = 1): Promise<{ goal: Goal | null; wasCompleted: boolean }> {
    try {
      const goal = await this.getGoalById(id);
      if (!goal) {
        throw new Error('Meta não encontrada');
      }

      const newValue = Math.min(goal.current_value + increment, goal.target_value);
      return await this.updateGoalProgress(id, newValue);
    } catch (error) {
      console.error('Erro no GoalsService.incrementGoalProgress:', error);
      throw error;
    }
  }

  /**
   * Marca uma meta como concluída
   */
  static async completeGoal(id: string): Promise<Goal | null> {
    try {
      const goal = await this.getGoalById(id);
      if (!goal) {
        throw new Error('Meta não encontrada');
      }

      return await this.updateGoal(id, {
        current_value: goal.target_value,
        is_active: false
      });
    } catch (error) {
      console.error('Erro no GoalsService.completeGoal:', error);
      throw error;
    }
  }

  /**
   * Deleta uma meta
   */
  static async deleteGoal(id: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await this.supabaseClient
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao deletar meta:', error);
        throw new Error('Erro ao deletar meta');
      }

      return true;
    } catch (error) {
      console.error('Erro no GoalsService.deleteGoal:', error);
      return false;
    }
  }

  /**
   * Calcula a porcentagem de progresso de uma meta
   */
  static calculateProgress(goal: Goal): number {
    if (goal.target_value === 0) return 0;
    return Math.round((goal.current_value / goal.target_value) * 100);
  }

  /**
   * Busca metas próximas do prazo
   */
  static async getGoalsNearDeadline(days: number = 7): Promise<Goal[]> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const { data, error } = await this.supabaseClient
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('deadline', 'is', null)
        .lte('deadline', futureDateStr)
        .order('deadline', { ascending: true });

      if (error) {
        console.error('Erro ao buscar metas próximas do prazo:', error);
        throw new Error('Erro ao buscar metas');
      }

      return data || [];
    } catch (error) {
      console.error('Erro no GoalsService.getGoalsNearDeadline:', error);
      return [];
    }
  }

  /**
   * Calcula estatísticas das metas do usuário
   */
  static async getGoalsStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    averageProgress: number;
  }> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: activeGoals, error: activeError } = await this.supabaseClient
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (activeError) {
        console.error('Erro ao buscar metas ativas:', activeError);
        throw new Error('Erro ao buscar metas');
      }

      const { data: completedGoals, error: completedError } = await this.supabaseClient
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', false);

      if (completedError) {
        console.error('Erro ao buscar metas concluídas:', completedError);
        throw new Error('Erro ao buscar metas');
      }

      const allGoals = [...(activeGoals || []), ...(completedGoals || [])];
      
      const total = allGoals.length;
      const active = activeGoals?.length || 0;
      const completed = completedGoals?.length || 0;
      
      const totalProgress = allGoals.reduce((sum, goal) => {
        return sum + this.calculateProgress(goal);
      }, 0);
      
      const averageProgress = total > 0 ? Math.round(totalProgress / total) : 0;

      return {
        total,
        active,
        completed,
        averageProgress
      };
    } catch (error) {
      console.error('Erro no GoalsService.getGoalsStats:', error);
      return {
        total: 0,
        active: 0,
        completed: 0,
        averageProgress: 0
      };
    }
  }

  // Métodos de compatibilidade com a interface antiga
  /**
   * @deprecated Use getUserGoals() instead
   */
  static getGoals(): Promise<Goal[]> {
    return this.getUserGoals();
  }

  /**
   * @deprecated Use createGoal() instead
   */
  static async saveGoal(goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Goal | null> {
    return this.createGoal({
      title: goal.title,
      description: goal.description,
      target_value: goal.target_value,
      unit: goal.unit,
      deadline: goal.deadline,
      color: goal.color
    });
  }

  /**
   * @deprecated Use updateGoalProgress() instead
   */
  static async updateProgress(id: string, progress: number): Promise<Goal | null> {
    const goal = await this.getGoalById(id);
    if (!goal) return null;
    
    const currentValue = Math.round((progress / 100) * goal.target_value);
    return this.updateGoalProgress(id, currentValue);
  }
}