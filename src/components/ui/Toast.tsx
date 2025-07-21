"use client";

import React from "react";
import hotToast, { Toaster as HotToaster } from 'react-hot-toast';

// Wrapper para react-hot-toast que mantém a interface original
export interface ToastProps {
  children?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'success' | 'error' | 'warning' | 'info';
  [key: string]: any;
}

// Componente Toast e relacionados (stubs, não são realmente usados)
export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ children, ...props }, ref) => (
    <div ref={ref} {...props}>{children}</div>
  )
);
Toast.displayName = "Toast";

export const ToastViewport = (props: any) => <div {...props} />;
export const ToastProvider = (props: any) => <div {...props} />;
export const ToastTitle = (props: any) => <div {...props} />;
export const ToastDescription = (props: any) => <div {...props} />;
export const ToastClose = (props: any) => <div {...props} />;
export const ToastAction = (props: any) => <div {...props} />;

// Este é o objeto toast que é importado diretamente em vários lugares
// Substitui todas as implementações por chamadas para react-hot-toast
export const toast = {
  success: (message: string, duration?: number) => {
    return hotToast.success(message, { duration: duration || 3000 });
  },
  error: (message: string, duration?: number) => {
    return hotToast.error(message, { duration: duration || 3000 });
  },
  info: (message: string, duration?: number) => {
    return hotToast.success(message, { duration: duration || 3000 });
  },
  warning: (message: string, duration?: number) => {
    return hotToast.error(message, { duration: duration || 3000 });
  },
  hide: (id: string) => {
    hotToast.dismiss(id);
  }
};

// Tipos para manter compatibilidade
export type ToastActionElement = React.ReactElement<typeof ToastAction>;
export type ToastType = 'success' | 'error' | 'info' | 'warning';

// Hook useToast
export const useToast = () => {
  return toast;
};

// Componente ToastContainer que agora usa o Toaster do react-hot-toast
export const ToastContainer = ({ position = 'top-right' }: { position?: string }) => {
  // Mapear posição para o formato do react-hot-toast
  const getPosition = (): { position: any } => {
    switch (position) {
      case 'top-right': return { position: 'top-right' };
      case 'top-left': return { position: 'top-left' };
      case 'bottom-right': return { position: 'bottom-right' };
      case 'bottom-left': return { position: 'bottom-left' };
      case 'top-center': return { position: 'top-center' };
      case 'bottom-center': return { position: 'bottom-center' };
      default: return { position: 'top-right' };
    }
  };

  return <HotToaster {...getPosition()} />;
};

export default Toast;
