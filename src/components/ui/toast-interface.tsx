"use client";

import { ReactNode } from "react";
import hotToast, { Toaster as HotToaster, ToastPosition } from 'react-hot-toast';

// Interfaces e tipos para o sistema de Toast
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: 'default' | 'destructive' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export interface ToastActionProps {
  altText?: string;
  onClick?: () => void;
  children?: ReactNode;
}

export interface ToastOptions {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: 'default' | 'destructive' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// Exportar types para compatibilidade com outros arquivos
export type ToastActionElement = ReactNode;
export type { ToastProps as Root, ToastActionProps as Action };

// Exportação do objeto toast que é importado diretamente
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

// O useToast é um hook usado em várias partes
export const useToast = () => {
  return toast;
};

// Estas exportações são necessárias para manter a compatibilidade
export const ToastInterface = {
  success: (options: ToastOptions) => {
    const message = typeof options.title === 'string' ? options.title : 'Sucesso';
    return toast.success(message, options.duration);
  },
  error: (options: ToastOptions) => {
    const message = typeof options.title === 'string' ? options.title : 'Erro';
    return toast.error(message, options.duration);
  },
  info: (options: ToastOptions) => {
    const message = typeof options.title === 'string' ? options.title : 'Informação';
    return toast.info(message, options.duration);
  },
  warning: (options: ToastOptions) => {
    const message = typeof options.title === 'string' ? options.title : 'Atenção';
    return toast.warning(message, options.duration);
  },
  hide: (id: string) => {
    toast.hide(id);
  },
};

// Component para compatibilidade
export const Toaster = ({ position = "top-right" }: { position?: ToastPosition }) => {
  return <HotToaster position={position} />;
};

// Componentes de stub para manter compatibilidade
export const Toast = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const ToastProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const ToastViewport = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const ToastTitle = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const ToastDescription = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const ToastClose = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const ToastAction = ({ children }: { children?: ReactNode }) => <>{children}</>;

export default ToastInterface;
