'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Clock, ChevronRight, BookOpen, MessageSquare, Lightbulb, Trophy, UserPlus, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { StudyRoomService } from '@/services/study-room.service';
import StudyTimeDisplay from '@/components/StudyTimeDisplay';
import { setupMockStudyRooms } from '@/mocks/study-rooms-mock';

export default function ComunidadePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total_time: 0,
    sessions: 0
  });
  
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Configurar salas mockadas se necessário
        await setupMockStudyRooms();
        
        // Carregar estatísticas do usuário
        await loadUserStats();
      } catch (error) {
        console.error('Erro ao carregar dados da comunidade:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);
  
  const loadUserStats = async () => {
    try {
      const userStats = await StudyRoomService.getUserStats();
      setStats(userStats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas de estudo:', error);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadUserStats();
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card para Sala de Estudos */}
        <Link href="/comunidade/sala-estudos" className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all">
          <div className="h-36 bg-gradient-to-r from-blue-500 to-blue-600 p-6 flex flex-col justify-between">
            <h2 className="text-2xl font-bold text-white">Sala de Estudos</h2>
            <p className="text-blue-100">Estude em tempo real com outros usuários em salas temáticas</p>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Entre em salas de estudo organizadas por especialidade médica. Estude com foco e veja quem mais está estudando em tempo real.
            </p>
            <div className="flex justify-between items-center">
              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">Salas Disponíveis</span>
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
              Colabore e monitore seu tempo de estudo em grupo.
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
        
        {/* Outros cards de recursos da comunidade podem ser adicionados aqui */}
      </div>
    </div>
  );
} 