'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Database, 
  Trophy, 
  Users, 
  Settings, 
  Home,
  BookOpen,
  BarChart3,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        router.push('/dashboard');
        return;
      }
      
      try {
        // Verificar se o usuário é um administrador
        const { data, error } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .single();
        
        if (error || !data) {
          router.push('/dashboard');
          return;
        }
        
        setIsAdmin(true);
      } catch (error) {
        console.error('Erro ao verificar status de administrador:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    }
    
    checkAdminStatus();
  }, [user, router, supabase]);
  
  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return null; // Redirecionado pelo useEffect
  }
  
  const adminModules = [
    {
      title: 'Banco de Dados',
      description: 'Gerencie tabelas, funções e relações do banco de dados',
      icon: Database,
      href: '/admin/database',
      color: 'bg-blue-500'
    },
    {
      title: 'Desafios',
      description: 'Crie e gerencie desafios para a comunidade',
      icon: Trophy,
      href: '/admin/desafios',
      color: 'bg-yellow-500'
    }
  ];
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Painel de Administração</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Bem-vindo ao painel de administração do MedJourney. Aqui você pode gerenciar todos os aspectos da plataforma.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminModules.map((module) => (
          <Link 
            key={module.href} 
            href={module.href}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start">
              <div className={`${module.color} p-3 rounded-lg text-white`}>
                <module.icon className="h-6 w-6" />
              </div>
              
              <div className="ml-4 flex-1">
                <h2 className="text-xl font-semibold mb-1">{module.title}</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {module.description}
                </p>
                
                <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                  <span>Acessar</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4 border-b pb-2">Ações Rápidas</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => router.push('/admin/desafios')}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Criar Novo Desafio
          </Button>
          
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => router.push('/admin/database')}
          >
            <Database className="h-4 w-4 mr-2" />
            Verificar Banco de Dados
          </Button>
        </div>
      </div>
    </div>
  );
} 