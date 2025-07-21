"use client";

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Verificar se o navegador suporta notificações
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    // Verificar o status atual da permissão
    setPermission(Notification.permission);

    // Mostrar banner apenas se a permissão for 'default' (não decidida)
    if (Notification.permission === 'default') {
      // Verificar se já pedimos permissão antes (para não incomodar o usuário)
      const askedBefore = localStorage.getItem('@medjourney:notification_asked');
      if (!askedBefore) {
        setShowBanner(true);
      }
    }
  }, []);

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      // Marcar que já pedimos permissão
      localStorage.setItem('@medjourney:notification_asked', 'true');
      
      // Esconder o banner independente da resposta
      setShowBanner(false);
      
      // Se a permissão foi concedida, mostrar uma notificação de teste
      if (result === 'granted') {
        new Notification('MedJourney', {
          body: 'Notificações ativadas com sucesso!',
          icon: '/favicon.ico'
        });
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      setShowBanner(false);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('@medjourney:notification_asked', 'true');
  };

  // Não mostrar nada se as notificações não são suportadas ou se o banner não deve ser exibido
  if (permission === 'unsupported' || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 border border-blue-200 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-2 rounded-full">
          <Bell className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-800">Ativar notificações</h3>
          <p className="text-sm text-gray-600">
            Receba alertas quando suas sessões de estudo terminarem, mesmo quando estiver em outra guia.
          </p>
        </div>
      </div>
      
      <div className="mt-3 flex gap-2 justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={dismissBanner}
          className="text-gray-600"
        >
          Agora não
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={requestPermission}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Ativar
        </Button>
      </div>
    </div>
  );
};

export default NotificationPermission; 