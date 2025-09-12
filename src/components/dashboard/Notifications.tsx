"use client";

import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { BellRing, Clock, BookOpen, FileText, XCircle, Bell } from 'lucide-react';
import { playNotificationSound } from '@/utils/sound';

interface Notification {
  id: string;
  type: 'task' | 'session' | 'revision' | 'faculty_join_request' | 'faculty_join_request_status' | 'simulado' | 'forum_post' | 'new_simulado' | 'event' | 'announcement' | 'material';
  title: string;
  message: string;
  date: Date;
}

interface NotificationsProps {
  notifications: Notification[];
}

const Notifications = ({ notifications }: NotificationsProps) => {
  // Ref para controlar se o som já foi tocado
  const prevNotificationsCountRef = useRef<number>(0);
  
  // Tocar som quando novas notificações aparecerem
  useEffect(() => {
    // Se o número de notificações aumentou, tocar o som
    if (notifications.length > prevNotificationsCountRef.current) {
      playNotificationSound();
    }
    
    // Atualizar a referência
    prevNotificationsCountRef.current = notifications.length;
  }, [notifications.length]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'session':
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case 'revision':
        return <FileText className="h-5 w-5 text-green-500" />;
      case 'faculty_join_request':
        return <BellRing className="h-5 w-5 text-purple-500" />;
      case 'faculty_join_request_status':
        return <Bell className="h-5 w-5 text-indigo-500" />;
      case 'simulado':
      case 'new_simulado':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'forum_post':
        return <BookOpen className="h-5 w-5 text-green-500" />;
      case 'event':
        return <Clock className="h-5 w-5 text-red-500" />;
      case 'announcement':
        return <BellRing className="h-5 w-5 text-yellow-500" />;
      case 'material':
        return <FileText className="h-5 w-5 text-gray-500" />;
      default:
        return <BellRing className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBackground = (type: string) => {
    switch (type) {
      case 'task':
        return 'bg-orange-50';
      case 'session':
        return 'bg-blue-50';
      case 'revision':
        return 'bg-green-50';
      case 'faculty_join_request':
        return 'bg-purple-50';
      case 'faculty_join_request_status':
        return 'bg-indigo-50';
      case 'simulado':
      case 'new_simulado':
        return 'bg-blue-50';
      case 'forum_post':
        return 'bg-green-50';
      case 'event':
        return 'bg-red-50';
      case 'announcement':
        return 'bg-yellow-50';
      case 'material':
        return 'bg-gray-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <Card 
      title="Alertas e Lembretes" 
      icon={<Bell className="h-5 w-5" />}
      showOptions
    >
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <BellRing className="h-12 w-12 text-blue-200 mb-2" />
          <p className="text-gray-500">Não há notificações</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {notifications.map((notification) => (
            <li key={notification.id} className="py-3 flex items-center">
              <div className={`mr-3 p-2 rounded-lg ${getBackground(notification.type)}`}>
                {getIcon(notification.type)}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">{notification.title}</h4>
                <p className="text-sm text-gray-600">{notification.message}</p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Remover notificação"
                tabIndex={0}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      
      {notifications.length > 0 && (
        <div className="mt-4 text-center">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Ver todas as notificações
          </button>
        </div>
      )}
    </Card>
  );
};

export default Notifications;
