"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
        success: "border-green-500 bg-green-50 text-green-700",
        error: "border-red-500 bg-red-50 text-red-700",
        warning: "border-yellow-500 bg-yellow-50 text-yellow-700",
        info: "border-blue-500 bg-blue-50 text-blue-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants> & {
      title?: React.ReactNode;
      description?: React.ReactNode;
    }
>(({ className, variant, title, description, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastRootProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export {
  type ToastRootProps as ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};

export interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

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

export const ToastContainer: React.FC<ToastContainerProps> = ({ position = 'top-right' }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    const manager = ToastManager.getInstance();
    
    return manager.subscribe(newToasts => {
      setToasts([...newToasts]);
    });
  }, []);

  if (!isMounted) return null;

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

  return typeof document !== 'undefined' 
    ? createPortal(
        <div className={`fixed ${getPositionClasses()} z-50 flex flex-col gap-2`}>
          {toasts.map((toast) => (
            <Toast 
              key={toast.id} 
              variant={toast.type as any}
              title={toast.message}
              onOpenChange={(open: boolean) => {
                if (!open) ToastManager.getInstance().hide(toast.id);
              }}
            />
          ))}
        </div>,
        document.body
      )
    : null;
};

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