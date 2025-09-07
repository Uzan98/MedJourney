'use client';

import { useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useNotifications } from '@/contexts/NotificationContext';
import { Database } from '@/types/supabase';

type NotificationPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Database['public']['Tables']['notifications']['Row'];
  old: Database['public']['Tables']['notifications']['Row'];
};

type NotificationRecipientPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Database['public']['Tables']['notification_recipients']['Row'];
  old: Database['public']['Tables']['notification_recipients']['Row'];
};

/**
 * Hook personalizado para gerenciar notificações em tempo real
 * Utiliza Supabase Realtime para escutar mudanças nas tabelas de notificações
 */
export function useRealtimeNotifications(userId?: string) {
  const supabase = createClientComponentClient<Database>();
  const { addNotification, updateNotification, removeNotification, refreshNotifications } = useNotifications();

  // Callback para lidar com novas notificações
  const handleNewNotification = useCallback(async (payload: NotificationPayload) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      const notification = payload.new;
      
      // Verificar se a notificação é para o usuário atual
      if (userId) {
        const { data: recipient } = await supabase
          .from('notification_recipients')
          .select('*')
          .eq('notification_id', notification.id)
          .eq('user_id', userId)
          .single();

        if (recipient) {
          // Adicionar a notificação ao estado local
          addNotification({
            ...notification,
            is_read: recipient.is_read,
            read_at: recipient.read_at
          });

          // Mostrar notificação do navegador se permitido
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
              tag: `notification-${notification.id}`,
              requireInteraction: false,
              silent: false
            });
          }
        }
      }
    }
  }, [userId, addNotification, supabase]);

  // Callback para lidar com atualizações de notificações
  const handleNotificationUpdate = useCallback((payload: NotificationPayload) => {
    if (payload.eventType === 'UPDATE' && payload.new) {
      updateNotification(payload.new.id, payload.new);
    } else if (payload.eventType === 'DELETE' && payload.old) {
      removeNotification(payload.old.id);
    }
  }, [updateNotification, removeNotification]);

  // Callback para lidar com mudanças nos recipients (marcação como lida)
  const handleRecipientUpdate = useCallback((payload: NotificationRecipientPayload) => {
    if (payload.eventType === 'UPDATE' && payload.new && payload.new.user_id === userId) {
      // Atualizar o status de leitura da notificação
      updateNotification(payload.new.notification_id, {
        is_read: payload.new.is_read,
        read_at: payload.new.read_at
      });
    }
  }, [userId, updateNotification]);

  // Solicitar permissão para notificações do navegador
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Configurar listeners do Realtime
  useEffect(() => {
    if (!userId) return;

    // Solicitar permissão para notificações
    requestNotificationPermission();

    // Canal para escutar novas notificações
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        handleNewNotification
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        handleNotificationUpdate
      )
      .subscribe();

    // Canal para escutar mudanças nos recipients (status de leitura)
    const recipientsChannel = supabase
      .channel('notification-recipients-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_recipients',
          filter: `user_id=eq.${userId}`
        },
        handleRecipientUpdate
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(recipientsChannel);
    };
  }, [userId, supabase, handleNewNotification, handleNotificationUpdate, handleRecipientUpdate, requestNotificationPermission]);

  // Função para marcar notificação como lida em tempo real
  const markAsReadRealtime = useCallback(async (notificationId: number) => {
    if (!userId) return;

    const { error } = await supabase
      .from('notification_recipients')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('notification_id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }, [userId, supabase]);

  // Função para marcar todas as notificações como lidas
  const markAllAsReadRealtime = useCallback(async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('notification_recipients')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
    } else {
      // Atualizar o estado local
      refreshNotifications();
    }
  }, [userId, supabase, refreshNotifications]);

  // Função para deletar notificação em tempo real
  const deleteNotificationRealtime = useCallback(async (notificationId: number) => {
    if (!userId) return;

    const { error } = await supabase
      .from('notification_recipients')
      .delete()
      .eq('notification_id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  }, [userId, supabase]);

  return {
    markAsReadRealtime,
    markAllAsReadRealtime,
    deleteNotificationRealtime,
    requestNotificationPermission
  };
}

/**
 * Hook para configurar notificações em tempo real para um usuário específico
 * Deve ser usado no componente raiz da aplicação
 */
export function useSetupRealtimeNotifications(userId?: string) {
  const { 
    markAsReadRealtime, 
    markAllAsReadRealtime, 
    deleteNotificationRealtime,
    requestNotificationPermission 
  } = useRealtimeNotifications(userId);

  // Configurar o contexto com as funções de tempo real
  const { setRealtimeFunctions } = useNotifications();

  useEffect(() => {
    if (userId) {
      setRealtimeFunctions({
        markAsRead: markAsReadRealtime,
        markAllAsRead: markAllAsReadRealtime,
        deleteNotification: deleteNotificationRealtime
      });
    }
  }, [userId, markAsReadRealtime, markAllAsReadRealtime, deleteNotificationRealtime, setRealtimeFunctions]);

  return {
    requestNotificationPermission
  };
}