'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { NotificationService } from '@/services/notificationService';
import { Database } from '@/types/supabase';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type Notification = Database['public']['Tables']['notifications']['Row'] & {
  is_read?: boolean;
  read_at?: string | null;
};

type NotificationSettings = Database['public']['Tables']['notification_settings']['Row'];

type RealtimeFunctions = {
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
};

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  settings: NotificationSettings | null;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  updateNotification: (id: number, updates: Partial<Notification>) => void;
  removeNotification: (id: number) => void;
  setRealtimeFunctions: (functions: RealtimeFunctions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [realtimeFunctions, setRealtimeFunctions] = useState<RealtimeFunctions | null>(null);
  const supabase = createClientComponentClient<Database>();
  
  const { user, isAuthenticated } = useAuth();

  // Log do usuário do AuthContext
  useEffect(() => {
    console.log('🔍 AuthContext - Usuário:', user ? user.email : 'Nenhum usuário');
    console.log('🔐 AuthContext - Autenticado:', isAuthenticated);
    console.log('🆔 AuthContext - User ID:', user?.id);
  }, [user, isAuthenticated]);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      console.log('❌ Não há usuário logado, não carregando notificações');
      return;
    }
    
    try {
      console.log('🔄 Iniciando carregamento de notificações para usuário:', user.id);
      setIsLoading(true);
      const notificationService = new NotificationService();
      const userNotifications = await notificationService.getUserNotifications(user.id);
      console.log('📬 Notificações carregadas:', userNotifications.length, 'notificações');
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('❌ Erro ao carregar notificações:', error);
      toast.error('Erro ao carregar notificações');
    } finally {
      console.log('✅ Finalizando carregamento de notificações');
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadSettings = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const notificationService = new NotificationService();
      const userSettings = await notificationService.getUserSettings(user.id);
      setSettings(userSettings);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (notificationId: number) => {
    if (!user?.id) return;
    
    try {
      if (realtimeFunctions) {
        await realtimeFunctions.markAsRead(notificationId);
      } else {
        const notificationService = new NotificationService();
        await notificationService.markAsRead(notificationId, user.id);
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast.error('Erro ao marcar notificação como lida');
    }
  }, [user?.id, realtimeFunctions]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      if (realtimeFunctions) {
        await realtimeFunctions.markAllAsRead();
      } else {
        const notificationService = new NotificationService();
        await notificationService.markAllAsRead(user.id);
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      toast.error('Erro ao marcar todas as notificações como lidas');
    }
  }, [user?.id, realtimeFunctions]);

  const deleteNotification = useCallback(async (notificationId: number) => {
    if (!user?.id) return;
    
    try {
      if (realtimeFunctions) {
        await realtimeFunctions.deleteNotification(notificationId);
      } else {
        const notificationService = new NotificationService();
        await notificationService.deleteNotification(notificationId, user.id);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success('Notificação removida');
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      toast.error('Erro ao deletar notificação');
    }
  }, [user?.id, realtimeFunctions]);

  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    if (!user?.id) return;
    
    try {
      const notificationService = new NotificationService();
      const updatedSettings = await notificationService.updateUserSettings(user.id, newSettings);
      setSettings(updatedSettings);
      toast.success('Configurações atualizadas');
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast.error('Erro ao atualizar configurações');
    }
  }, [user?.id]);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  // Funções para gerenciar notificações em tempo real
  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  const updateNotification = useCallback((id: number, updates: Partial<Notification>) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, ...updates } : n)
    );
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const setRealtimeFunctionsCallback = useCallback((functions: RealtimeFunctions) => {
    setRealtimeFunctions(functions);
  }, []);

  useEffect(() => {
    console.log('🔄 useEffect disparado - user?.id:', user?.id);
    console.log('🔄 useEffect disparado - isAuthenticated:', isAuthenticated);
    if (user?.id && isAuthenticated) {
      console.log('✅ Usuário válido e autenticado, carregando notificações e configurações');
      loadNotifications();
      loadSettings();
    } else {
      console.log('❌ Usuário inválido ou não autenticado, não carregando dados');
    }
  }, [user?.id, isAuthenticated, loadNotifications, loadSettings]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    settings,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateSettings,
    refreshNotifications,
    addNotification,
    updateNotification,
    removeNotification,
    setRealtimeFunctions: setRealtimeFunctionsCallback,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;