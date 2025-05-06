"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from './AppLayout';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout padrão para páginas protegidas
 * Inclui o AppLayout (menu lateral) e o ClientProtectedRoute (proteção de autenticação)
 */
export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Se não estiver carregando e não tiver usuário, redirecionar para login
    if (!isLoading && !user && isClient) {
      console.log('ProtectedLayout: Não autenticado, redirecionando para login');
      router.push('/auth/login?redirectTo=/dashboard');
    }
  }, [isLoading, user, router, isClient]);

  // Mostrar carregamento enquanto verifica
  if (isLoading || !isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-blue-600 font-medium ml-3">Carregando...</p>
      </div>
    );
  }

  // Se não tiver usuário, não renderiza nada (vai redirecionar no useEffect)
  if (!user) {
    return null;
  }

  // Se tiver usuário, mostra o layout com as crianças
  return <AppLayout>{children}</AppLayout>;
} 