"use client";

import React from "react";

// Stub para componente toast com exportação de funções
export interface ToastProps {
  children?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'success' | 'error' | 'warning' | 'info';
  [key: string]: any;
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ children, ...props }, ref) => {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  }
);

Toast.displayName = "Toast";

// Componentes relacionados
export const ToastViewport = (props: any) => <div {...props} />;
export const ToastProvider = (props: any) => <div {...props} />;
export const ToastTitle = (props: any) => <div {...props} />;
export const ToastDescription = (props: any) => <div {...props} />;
export const ToastClose = (props: any) => <div {...props} />;
export const ToastAction = (props: any) => <div {...props} />;

// Função toast que é importada diretamente em vários arquivos
export const toast = {
  success: (message: string, duration?: number) => {
    console.log('Toast success:', message, duration);
    return 'toast-id';
  },
  error: (message: string, duration?: number) => {
    console.log('Toast error:', message, duration);
    return 'toast-id';
  },
  info: (message: string, duration?: number) => {
    console.log('Toast info:', message, duration);
    return 'toast-id';
  },
  warning: (message: string, duration?: number) => {
    console.log('Toast warning:', message, duration);
    return 'toast-id';
  },
  hide: (id: string) => {
    console.log('Toast hide:', id);
  }
};

// Tipos e hooks auxiliares
export type ToastActionElement = React.ReactElement<typeof ToastAction>;
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export const useToast = () => {
  return toast;
};

export const ToastContainer = ({ position = 'top-right' }: { position?: string }) => {
  return <div className={`fixed z-50 ${position}`}></div>;
};

export default Toast;