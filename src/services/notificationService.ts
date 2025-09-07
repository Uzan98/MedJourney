import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
type NotificationRecipient = Database['public']['Tables']['notification_recipients']['Row'];
type UserNotificationSettings = Database['public']['Tables']['user_notification_settings']['Row'];

export interface NotificationWithStatus extends Notification {
  is_read: boolean;
  read_at: string | null;
}

export interface CreateNotificationParams {
  title: string;
  message: string;
  type: 'simulado' | 'forum_post' | 'new_simulado' | 'event' | 'announcement' | 'material';
  target_type: 'faculty' | 'course' | 'all_users' | 'specific_users';
  target_id?: number;
  data?: Record<string, any>;
  expires_at?: string;
}

export interface NotificationFilters {
  type?: string;
  is_read?: boolean;
  limit?: number;
  offset?: number;
}

class NotificationService {
  private supabase: SupabaseClient<Database> = supabase as SupabaseClient<Database>;

  /**
   * Criar uma nova notificação
   */
  async createNotification(params: CreateNotificationParams): Promise<Notification | null> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          title: params.title,
          message: params.message,
          type: params.type,
          target_type: params.target_type,
          target_id: params.target_id,
          sender_id: user.user.id,
          data: params.data || {},
          expires_at: params.expires_at
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return null;
    }
  }

  /**
   * Obter notificações do usuário atual
   */
  async getUserNotifications(userId: string, filters: NotificationFilters = {}): Promise<NotificationWithStatus[]> {
    try {
      console.log('🔍 NotificationService: Buscando notificações para usuário:', userId);
      const { limit = 20, offset = 0, type, is_read } = filters;
      console.log('📊 Parâmetros: limit =', limit, ', offset =', offset, ', type =', type, ', is_read =', is_read);
      
      let query = this.supabase
        .from('notification_recipients')
        .select(`
          *,
          notifications (
            id,
            title,
            message,
            type,
            target_type,
            target_id,
            sender_id,
            data,
            created_at,
            expires_at,
            is_active
          )
        `)
        .eq('user_id', userId)
        .eq('notifications.is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Filtros opcionais
      if (type) {
        query = query.eq('notifications.type', type);
      }
      if (is_read !== undefined) {
        query = query.eq('is_read', is_read);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro na consulta Supabase:', error);
        throw error;
      }
      
      // Transformar os dados para o formato esperado
      const notifications: NotificationWithStatus[] = (data || []).map(item => {
        const notification = item.notifications;
        return {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          data: notification.data,
          created_at: notification.created_at,
          expires_at: notification.expires_at,
          is_read: item.is_read,
          read_at: item.read_at,
          // Campos obrigatórios da tabela notifications
          target_type: notification.target_type || 'all_users',
          sender_id: notification.sender_id,
          target_id: notification.target_id,
          is_active: notification.is_active,
          updated_at: notification.created_at
        };
      });

      return notifications;
    } catch (error) {
      console.error('❌ Erro geral ao buscar notificações:', error);
      return [];
    }
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(notificationId: number, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notification_recipients')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('notification_id', notificationId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return false;
    }
  }

  /**
   * Marcar todas as notificações como lidas
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notification_recipients')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      return false;
    }
  }

  /**
   * Obter contagem de notificações não lidas
   */
  async getUnreadCount(userId?: string): Promise<number> {
    try {
      let userIdToUse = userId;
      
      if (!userIdToUse) {
        const { data: user } = await this.supabase.auth.getUser();
        if (!user.user) return 0;
        userIdToUse = user.user.id;
      }

      const { count, error } = await this.supabase
        .from('notification_recipients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userIdToUse)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Erro ao buscar contagem de não lidas:', error);
      return 0;
    }
  }

  /**
   * Deletar notificação (apenas para admins ou remetente)
   */
  async deleteNotification(notificationId: number): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_active: false })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      return false;
    }
  }

  /**
   * Obter configurações de notificação do usuário
   */
  async getUserSettings(userId?: string): Promise<UserNotificationSettings | null> {
    try {
      let userIdToUse = userId;
      
      if (!userIdToUse) {
        const { data: user } = await this.supabase.auth.getUser();
        if (!user.user) throw new Error('Usuário não autenticado');
        userIdToUse = user.user.id;
      }

      const { data, error } = await this.supabase
        .from('user_notification_settings')
        .select('*')
        .eq('user_id', userIdToUse)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      return null;
    }
  }

  /**
   * Atualizar configurações de notificação do usuário
   */
  async updateUserSettings(settings: Partial<UserNotificationSettings>): Promise<boolean> {
    try {
      const { data: user } = await this.supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { error } = await this.supabase
        .from('user_notification_settings')
        .upsert({
          user_id: user.user.id,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      return false;
    }
  }

  /**
   * Criar notificação para simulado
   */
  async createSimuladoNotification(facultyId: number, simuladoTitle: string, simuladoId: number): Promise<boolean> {
    const notification = await this.createNotification({
      title: 'Novo Simulado Disponível',
      message: `O simulado "${simuladoTitle}" foi disponibilizado para sua turma`,
      type: 'new_simulado',
      target_type: 'faculty',
      target_id: facultyId,
      data: {
        simulado_id: simuladoId,
        simulado_title: simuladoTitle
      }
    });

    return !!notification;
  }

  /**
   * Criar notificação para post no fórum
   */
  async createForumPostNotification(facultyId: number, postTitle: string, postId: number): Promise<boolean> {
    const notification = await this.createNotification({
      title: 'Nova Dúvida no Fórum',
      message: `Uma nova dúvida "${postTitle}" foi postada no fórum da sua turma`,
      type: 'forum_post',
      target_type: 'faculty',
      target_id: facultyId,
      data: {
        post_id: postId,
        post_title: postTitle
      }
    });

    return !!notification;
  }

  /**
   * Criar notificação para evento
   */
  async createEventNotification(facultyId: number, eventTitle: string, eventDate: string, eventId: number): Promise<boolean> {
    const notification = await this.createNotification({
      title: 'Novo Evento',
      message: `O evento "${eventTitle}" foi agendado para ${new Date(eventDate).toLocaleDateString('pt-BR')}`,
      type: 'event',
      target_type: 'faculty',
      target_id: facultyId,
      data: {
        event_id: eventId,
        event_title: eventTitle,
        event_date: eventDate
      }
    });

    return !!notification;
  }

  /**
   * Subscrever a mudanças em tempo real
   */
  subscribeToNotifications(userId: string, callback: (notification: NotificationWithStatus) => void) {
    const channel = this.supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_recipients',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          // Buscar a notificação completa
          const { data } = await this.supabase
            .from('notifications')
            .select('*')
            .eq('id', payload.new.notification_id)
            .single();

          if (data) {
            const notificationWithStatus: NotificationWithStatus = {
              ...data,
              is_read: payload.new.is_read,
              read_at: payload.new.read_at
            };
            callback(notificationWithStatus);
          }
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  /**
   * Subscrever a atualizações de notificações (marcar como lida)
   */
  subscribeToNotificationUpdates(userId: string, callback: (notificationId: number, isRead: boolean) => void) {
    const channel = this.supabase
      .channel('notification_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_recipients',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new.notification_id, payload.new.is_read);
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }
}

export const notificationService = new NotificationService();
export { NotificationService };
export default notificationService;