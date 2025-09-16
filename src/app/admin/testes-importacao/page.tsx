'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ImportTestPanel from '@/components/admin/import-test-panel';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TestesImportacaoPage() {
  const router = useRouter();
  const { user, isAdmin, checkAdminStatus } = useAuth();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function verifyAccess() {
      setLoading(true);
      
      if (!user) {
        console.log("Testes Importação: Nenhum usuário autenticado, redirecionando para dashboard");
        router.push('/dashboard');
        return;
      }
      
      // Verificar status de administrador
      const adminStatus = await checkAdminStatus();
      console.log("Testes Importação: Status de administrador:", adminStatus);
        
      if (!adminStatus) {
        console.log("Testes Importação: Usuário não é administrador, redirecionando para dashboard");
        router.push('/dashboard');
        return;
      }
        
      setLoading(false);
    }
    
    verifyAccess();
  }, [user, router, checkAdminStatus]);
  
  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin')}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Painel Admin
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Testes de Importação</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Teste o sistema de importação de questões com prevenção de duplicações usando hash único.
        </p>
      </div>
      
      <ImportTestPanel />
    </div>
  );
}