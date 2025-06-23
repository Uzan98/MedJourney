"use client";

import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import PlanningInitializer from '@/components/planning/PlanningInitializer';
import { inicializarSincronizacao } from '@/services/data-sync';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  
  useEffect(() => {
    // Inicializar serviços
    inicializarSincronizacao();
  }, []);
  
  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            border: '1px solid #eaeaea',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            borderRadius: '8px',
            padding: '12px 16px',
          },
        }}
      />
      <PlanningInitializer />
      {children}
    </>
  );
} 
