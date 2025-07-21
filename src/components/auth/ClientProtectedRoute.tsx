"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ClientProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Componente para proteger rotas no lado do cliente
 * Use este componente envolvendo o conteúdo de páginas que devem ser protegidas
 */
export default function ClientProtectedRoute({ 
  children, 
  redirectTo = '/auth/login'
}: ClientProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Só verificar depois que o carregamento inicial terminar
    if (!isLoading) {
      if (!isAuthenticated) {
        console.log('ClientProtectedRoute: Usuário não autenticado, redirecionando');
        setRedirecting(true);
        
        // Obter o caminho atual para redirecionamento após login
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        
        // Construir URL de redirecionamento
        const loginUrl = `${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}`;
        window.location.href = loginUrl;
      }
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  // Mostrar indicador de carregamento enquanto verifica autenticação
  if (isLoading || redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            {redirecting ? 'Redirecionando para login...' : 'Verificando autenticação...'}
          </p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, não renderizar nada (já deve estar redirecionando)
  if (!isAuthenticated) {
    return null;
  }

  // Se estiver autenticado, renderizar o conteúdo normalmente
  return <>{children}</>;
} 
