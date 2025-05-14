"use client";

import { ReactNode } from "react";

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

// Estas exportações são necessárias para manter a compatibilidade
export const ToastInterface = {
  success: (options: ToastOptions) => ({ id: '1', ...options }),
  error: (options: ToastOptions) => ({ id: '2', ...options }),
  info: (options: ToastOptions) => ({ id: '3', ...options }),
  warning: (options: ToastOptions) => ({ id: '4', ...options }),
  hide: (id: string) => {},
};