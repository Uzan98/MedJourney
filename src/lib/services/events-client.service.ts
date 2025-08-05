import { supabase } from '@/lib/supabase';
import { SubscriptionClientService } from '@/services/subscription-client.service';

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day?: boolean;
  location?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day?: boolean;
  location?: string;
  color?: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  all_day?: boolean;
  location?: string;
  color?: string;
}

export class EventsClientService {
  private static supabaseClient = supabase;

  /**
   * Verifica se o usuário tem permissão para criar eventos (Pro/Pro+)
   */
  static async checkEventPermission(): Promise<{ hasPermission: boolean; message?: string }> {
    try {
      const permission = await SubscriptionClientService.checkUserPermission();
      return {
        hasPermission: permission.hasPermission,
        message: permission.message
      };
    } catch (error) {
      console.error('Erro ao verificar permissão para eventos:', error);
      return {
        hasPermission: false,
        message: 'Erro ao verificar permissões'
      };
    }
  }

  /**
   * Cria um novo evento
   */
  static async createEvent(eventData: CreateEventData): Promise<Event | null> {
    try {
      // Verificar permissão
      const permission = await this.checkEventPermission();
      if (!permission.hasPermission) {
        throw new Error(permission.message || 'Sem permissão para criar eventos');
      }

      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await this.supabaseClient
        .from('events')
        .insert({
          ...eventData,
          user_id: user.id,
          color: eventData.color || '#3B82F6'
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar evento:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      return null;
    }
  }

  /**
   * Obtém todos os eventos do usuário
   */
  static async getUserEvents(): Promise<Event[]> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await this.supabaseClient
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar eventos:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao obter eventos do usuário:', error);
      return [];
    }
  }

  /**
   * Obtém um evento por ID
   */
  static async getEventById(id: string): Promise<Event | null> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        return null;
      }

      const { data, error } = await this.supabaseClient
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar evento:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao obter evento por ID:', error);
      return null;
    }
  }

  /**
   * Atualiza um evento
   */
  static async updateEvent(id: string, updates: UpdateEventData): Promise<Event | null> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await this.supabaseClient
        .from('events')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar evento:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      return null;
    }
  }

  /**
   * Deleta um evento
   */
  static async deleteEvent(id: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        return false;
      }

      const { error } = await this.supabaseClient
        .from('events')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao deletar evento:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar evento:', error);
      return false;
    }
  }

  /**
   * Obtém eventos em um intervalo de datas
   */
  static async getEventsByDateRange(startDate: string, endDate: string): Promise<Event[]> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await this.supabaseClient
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_date', startDate)
        .lte('start_date', endDate)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar eventos por data:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao obter eventos por intervalo de datas:', error);
      return [];
    }
  }

  /**
   * Obtém eventos próximos (próximos 7 dias)
   */
  static async getUpcomingEvents(days: number = 7): Promise<Event[]> {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + days);

      return await this.getEventsByDateRange(
        now.toISOString(),
        futureDate.toISOString()
      );
    } catch (error) {
      console.error('Erro ao obter eventos próximos:', error);
      return [];
    }
  }
}