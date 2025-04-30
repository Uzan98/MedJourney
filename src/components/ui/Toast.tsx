"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X, Info } from 'lucide-react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // Tempo para a animação de saída terminar
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-500';
      case 'error':
        return 'bg-red-50 border-red-500';
      case 'warning':
        return 'bg-amber-50 border-amber-500';
      default:
        return 'bg-blue-50 border-blue-500';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-amber-700';
      default:
        return 'text-blue-700';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div 
      className={`fixed top-4 right-4 z-50 transform transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className={`${getBgColor()} border-l-4 px-4 py-3 rounded-lg shadow-md max-w-md flex items-start`}>
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        <div className="mr-2 flex-1">
          <p className={`text-sm ${getTextColor()}`}>{message}</p>
        </div>
        <button
          onClick={handleClose}
          className={`${getTextColor()} hover:text-opacity-75 focus:outline-none ml-auto`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Componente container para toasts
export interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

// Gerenciador de Toasts
type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

class ToastManager {
  private static instance: ToastManager;
  private toasts: ToastItem[] = [];
  private listeners: Set<(toasts: ToastItem[]) => void> = new Set();

  private constructor() {}

  public static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  public show(message: string, type: ToastType = 'info', duration = 3000): string {
    const id = Math.random().toString(36).substring(2, 9);
    const toast = { id, message, type, duration };
    this.toasts = [...this.toasts, toast];
    this.notifyListeners();
    return id;
  }

  public hide(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notifyListeners();
  }

  public subscribe(listener: (toasts: ToastItem[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.toasts);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.toasts));
  }
}

// Hook para usar o toast
export const useToast = () => {
  const manager = ToastManager.getInstance();

  return {
    success: (message: string, duration?: number) => 
      manager.show(message, 'success', duration),
    error: (message: string, duration?: number) => 
      manager.show(message, 'error', duration),
    info: (message: string, duration?: number) => 
      manager.show(message, 'info', duration),
    warning: (message: string, duration?: number) => 
      manager.show(message, 'warning', duration),
    hide: (id: string) => manager.hide(id)
  };
};

// Componente de contêiner de toast
export const ToastContainer: React.FC<ToastContainerProps> = ({ position = 'top-right' }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const manager = ToastManager.getInstance();
    
    return manager.subscribe(newToasts => {
      setToasts([...newToasts]);
    });
  }, []);

  // Não renderizar no lado do servidor
  if (!isMounted) return null;

  // Determinar classe de posicionamento
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  // Usar createPortal para renderizar fora da hierarquia normal do DOM
  return typeof document !== 'undefined' 
    ? createPortal(
        <div className={`fixed ${getPositionClasses()} z-50 flex flex-col gap-2`}>
          {toasts.map(toast => (
            <Toast 
              key={toast.id} 
              message={toast.message} 
              type={toast.type} 
              duration={toast.duration} 
              onClose={() => ToastManager.getInstance().hide(toast.id)} 
            />
          ))}
        </div>,
        document.body
      )
    : null;
};

// Função global para mostrar toasts (útil quando não estamos em um componente React)
export const toast = {
  success: (message: string, duration?: number) => 
    ToastManager.getInstance().show(message, 'success', duration),
  error: (message: string, duration?: number) => 
    ToastManager.getInstance().show(message, 'error', duration),
  info: (message: string, duration?: number) => 
    ToastManager.getInstance().show(message, 'info', duration),
  warning: (message: string, duration?: number) => 
    ToastManager.getInstance().show(message, 'warning', duration),
  hide: (id: string) => ToastManager.getInstance().hide(id)
}; 