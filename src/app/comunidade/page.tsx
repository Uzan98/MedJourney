'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';

export default function ComunidadePage() {
  const router = useRouter();
  
  // Redirecionar automaticamente para a página de grupos de estudo
  useEffect(() => {
    router.push('/comunidade/grupos-estudos');
  }, [router]);

  // Mostrar uma tela de carregamento enquanto redireciona
  return (
    <div className="container mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <Users className="h-8 w-8 text-blue-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Redirecionando para Grupos de Estudos</h1>
      <p className="text-gray-600 mb-6">Aguarde um momento...</p>
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );
} 
