"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [rendering, setRendering] = useState(false);
  const router = useRouter();

  // Verificar renderização do lado do cliente
  useEffect(() => {
    setRendering(true);
  }, []);

  // Efeito para quando o usuário estiver autenticado
  useEffect(() => {
    if (rendering && isAuthenticated && !isLoading) {
      console.log('HomePage: Usuário autenticado, redirecionando para o dashboard');
      // Redirecionamento para o dashboard
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, rendering, router]);

  // Mostrar uma mensagem de carregamento enquanto verifica a autenticação
  if (isLoading || !rendering) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se estiver autenticado, mostrar uma tela de redirecionamento enquanto redireciona
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecionando para o Dashboard...</p>
        </div>
      </div>
    );
  }

  // Conteúdo para usuários não autenticados (Página de boas-vindas)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100">
      <div className="max-w-2xl mx-auto text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-blue-800 mb-6">
          MedJourney
        </h1>
        <p className="text-xl md:text-2xl text-blue-700 mb-8">
          Sua plataforma completa para estudos de medicina
        </p>
        
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/auth/signup"
            className="px-8 py-3 bg-white text-blue-700 border border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Criar Conta
          </Link>
        </div>
      </div>
    </div>
  );
}
