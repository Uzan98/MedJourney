import { supabase } from '@/lib/supabase';
import { SubscriptionClientService } from '@/services/subscription-client.service';

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
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

export class EventsService {
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
      // Verificar permissões
      const permission = await this.checkEventPermission();
      if (!permission.hasPermission) {
        throw new Error(permission.message);
      }

      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await this.supabaseClient
        .from('events')
        .insert({
          user_id: user.id,
          title: eventData.title,
          description: eventData.description,
          start_date: eventData.start_date,
          end_date: eventData.end_date,
          all_day: eventData.all_day || false,
          location: eventData.location,
          color: eventData.color || '#3b82f6'
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar evento:', error);
        throw new Error('Erro ao criar evento');
      }

      return data;
    } catch (error) {
      console.error('Erro no EventsService.createEvent:', error);
      throw error;
    }
  }

  /**
   * Busca todos os eventos do usuário
   */
  static async getUserEvents(): Promise<Event[]> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await this.supabaseClient
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar eventos:', error);
        throw new Error('Erro ao buscar eventos');
      }

      return data || [];
    } catch (error) {
      console.error('Erro no EventsService.getUserEvents:', error);
      return [];
    }
  }

  /**
   * Busca um evento específico por ID
   */
  static async getEventById(id: string): Promise<Event | null> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
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
      console.error('Erro no EventsService.getEventById:', error);
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
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar evento:', error);
        throw new Error('Erro ao atualizar evento');
      }

      return data;
    } catch (error) {
      console.error('Erro no EventsService.updateEvent:', error);
      throw error;
    }
  }

  /**
   * Deleta um evento
   */
  static async deleteEvent(id: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await this.supabaseClient
        .from('events')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao deletar evento:', error);
        throw new Error('Erro ao deletar evento');
      }

      return true;
    } catch (error) {
      console.error('Erro no EventsService.deleteEvent:', error);
      return false;
    }
  }

  /**
   * Busca eventos em um intervalo de datas
   */
  static async getEventsByDateRange(startDate: string, endDate: string): Promise<Event[]> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await this.supabaseClient
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_date', startDate)
        .lte('end_date', endDate)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar eventos por intervalo:', error);
        throw new Error('Erro ao buscar eventos');
      }

      return data || [];
    } catch (error) {
      console.error('Erro no EventsService.getEventsByDateRange:', error);
      return [];
    }
  }
}