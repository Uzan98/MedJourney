'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function EstatisticasRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Mostrar mensagem informativa sobre a mudança
    toast.success('As estatísticas agora estão integradas ao Dashboard!', {
      duration: 5000
    });
    
    // Redirecionar para a página principal
    router.push('/');
  }, [router]);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecionando para o Dashboard...</p>
        <p className="text-sm text-gray-500 mt-2">As estatísticas agora estão integradas ao Dashboard principal.</p>
      </div>
    </div>
  );
} 
