'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Configuração do QueryClient com cache otimizado
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos para dados semi-estáticos como assuntos
      staleTime: 5 * 60 * 1000, // 5 minutos
      // Manter em cache por 10 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (anteriormente cacheTime)
      // Não refetch automaticamente ao focar na janela
      refetchOnWindowFocus: false,
      // Retry apenas 1 vez em caso de erro
      retry: 1,
      // Não refetch automaticamente ao reconectar
      refetchOnReconnect: false,
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export { queryClient };