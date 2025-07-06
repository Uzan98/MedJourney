'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, ChevronRight, Trophy, RefreshCw, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import ChallengesWidget from '@/components/gamification/ChallengesWidget';

export default function ComunidadePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Carregar dados necessários
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados da comunidade:', error);
        setLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Comunidade de Estudos</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card para Feed da Comunidade */}
        <Link href="/comunidade/feed" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all">
          <div className="h-36 bg-gradient-to-r from-blue-500 to-blue-600 p-6 flex flex-col justify-between">
            <h2 className="text-2xl font-bold text-white">Feed da Comunidade</h2>
            <p className="text-blue-100">Compartilhe conquistas e acompanhe outros estudantes</p>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Compartilhe seus resultados, conquistas e materiais de estudo. Interaja com outros estudantes e amplie sua rede.
            </p>
            <div className="flex justify-between items-center">
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">Social</span>
              <span className="text-blue-600 flex items-center">
                <span className="mr-1 font-medium">Acessar</span>
                <ChevronRight size={18} />
              </span>
            </div>
          </div>
        </Link>
        
        {/* Card para Grupos de Estudos */}
        <Link href="/comunidade/grupos-estudos" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all">
          <div className="h-36 bg-gradient-to-r from-purple-500 to-purple-600 p-6 flex flex-col justify-between">
            <h2 className="text-2xl font-bold text-white">Grupos de Estudos</h2>
            <p className="text-purple-100">Crie ou participe de grupos personalizados com códigos de acesso</p>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Organize seus próprios grupos de estudo e convide colegas através de um código único. 
              Colabore com outros estudantes em grupo.
            </p>
            <div className="flex justify-between items-center">
              <span className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-sm font-medium">Personalizado</span>
              <span className="text-purple-600 flex items-center">
                <span className="mr-1 font-medium">Acessar</span>
                <ChevronRight size={18} />
              </span>
            </div>
          </div>
        </Link>
        
        {/* Card para Desafios da Comunidade */}
        <Link href="/comunidade/desafios" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all">
          <div className="h-36 bg-gradient-to-r from-amber-500 to-amber-600 p-6 flex flex-col justify-between">
            <h2 className="text-2xl font-bold text-white">Desafios da Comunidade</h2>
            <p className="text-amber-100">Participe de desafios semanais e ganhe reconhecimento</p>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Supere desafios de estudo, simulados e sequências de estudo. Compita com outros estudantes e acompanhe seu progresso no ranking.
            </p>
            <div className="flex justify-between items-center">
              <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-sm font-medium">Competitivo</span>
              <span className="text-amber-600 flex items-center">
                <span className="mr-1 font-medium">Participar</span>
                <ChevronRight size={18} />
              </span>
            </div>
          </div>
        </Link>
      </div>
      
      {/* Widget de Desafios Ativos */}
      <div className="mt-8">
        <ChallengesWidget />
      </div>
    </div>
  );
} 
