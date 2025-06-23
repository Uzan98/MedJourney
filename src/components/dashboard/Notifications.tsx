"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { BellRing, Clock, BookOpen, FileText, XCircle, Bell } from 'lucide-react';

interface Notification {
  id: string;
  type: 'task' | 'session' | 'revision';
  title: string;
  message: string;
  date: Date;
}

interface NotificationsProps {
  notifications: Notification[];
}

const Notifications = ({ notifications }: NotificationsProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'session':
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case 'revision':
        return <FileText className="h-5 w-5 text-green-500" />;
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
