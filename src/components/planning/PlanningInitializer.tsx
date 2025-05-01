'use client';

import { useEffect } from 'react';
import { inicializarPlanejamento } from '@/services';

/**
 * Componente de inicialização do serviço de planejamento
 * Este componente não renderiza nada visualmente, apenas inicializa o serviço
 * quando o aplicativo é carregado no navegador.
 */
export default function PlanningInitializer() {
  useEffect(() => {
    // Inicializar o serviço de planejamento
    inicializarPlanejamento();
    
    console.log('Serviço de planejamento inicializado');
  }, []);
  
  // Este componente não renderiza nada
  return null;
} 