"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const [rendering, setRendering] = useState(false);

  // Função para redirecionar preservando o host
  const redirectToPage = (path: string) => {
    // Remover a barra inicial se o path começar com uma
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Obter o host e protocolo atuais
    const baseUrl = window.location.origin;
    
    // Construir a URL completa
    const fullUrl = `${baseUrl}/${cleanPath}`;
    
    console.log('ProtectedRoute: Redirecionando para URL completa:', fullUrl);
    window.location.href = fullUrl;
  };

  useEffect(() => {
    // Este efeito executa apenas uma vez para permitir a renderização do lado do cliente
    // Isso evita incompatibilidades de hidratação
    setRendering(true);
  }, []);

  useEffect(() => {
    if (!rendering) return; // Não fazer nada até o primeiro render

    console.log('ProtectedRoute: Estado atual:', { 
      isLoading, 
      isAuthenticated, 
      userId: user?.id,
      userEmail: user?.email, 
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'unknown',
    });

    // Se não estiver carregando e não estiver autenticado, redirecionar para login
    if (!isLoading && !isAuthenticated) {
      console.log('ProtectedRoute: Usuário não autenticado, redirecionando para login');
      
      if (!redirecting) {
        setRedirecting(true);
        toast.error('Você precisa fazer login para acessar esta página');
        
        // Pequeno timeout para melhorar a experiência de carregamento
        // e usar redirecionamento nativo do navegador ao invés do router do Next.js
        setTimeout(() => {
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
          const loginUrl = `auth/login?redirectTo=${encodeURIComponent(currentPath)}`;
          redirectToPage(loginUrl);
        }, 1000);
      }
    } else if (!isLoading && isAuthenticated) {
      console.log('ProtectedRoute: Usuário autenticado, mostrando conteúdo protegido');
    }
  }, [isLoading, isAuthenticated, user, redirecting, rendering]);

  // Se ainda estiver no primeiro render, não mostrar nada para evitar flash
  if (!rendering) {
    return null;
  }

  // Mostrar uma mensagem de carregamento enquanto verifica a autenticação
  if (isLoading) {
    console.log('ProtectedRoute: Carregando estado de autenticação...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se autenticado, renderizar o conteúdo da página
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Enquanto o redirecionamento acontece, mostrar uma tela de carregamento
  console.log('ProtectedRoute: Renderizando tela de redirecionamento');
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecionando para página de login...</p>
      </div>
    </div>
  );
} 