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
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-5xl mx-auto">
        {/* Header com estatísticas */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Comunidade</h1>
            <p className="text-gray-600 text-sm">
              Conecte-se com outros estudantes e aprimore seus estudos em grupo
            </p>
          </div>
          
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Atualizar dados"
          >
            <RefreshCw className={`h-5 w-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* Estatísticas do usuário */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3.5">
              <h2 className="text-lg font-bold text-white flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Estatísticas da Comunidade
              </h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-blue-700 mb-1">Tempo Total</h3>
                  <p className="text-xl font-bold text-blue-800">
                    <StudyTimeDisplay seconds={stats.total_time} />
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-indigo-700 mb-1">Sessões de Estudo</h3>
                  <p className="text-xl font-bold text-indigo-800">{stats.sessions}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <Users className="h-5 w-5 text-blue-500 mr-2" />
          Recursos da Comunidade
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Card da Sala de Estudos */}
          <Link 
            href="/comunidade/sala-estudos"
            className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all"
          >
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
              <h2 className="text-lg font-bold text-white flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Sala de Estudos
              </h2>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm mb-4">
                Estude em grupo com outros estudantes em tempo real. Registre seu tempo de estudo e veja quem está estudando no momento.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium">
                  Disponível agora
                </span>
                <span className="flex items-center text-blue-600 hover:text-blue-700">
                  <span className="mr-1 font-medium">Entrar</span>
                  <ChevronRight className="h-5 w-5" />
                </span>
              </div>
            </div>
          </Link>

          {/* Card de Grupos de Estudo (em breve) */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-dashed border-gray-300">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3">
              <h2 className="text-lg font-bold text-gray-600 flex items-center">
                <UserPlus className="mr-2 h-5 w-5" />
                Grupos de Estudo
              </h2>
            </div>
            <div className="p-4">
              <div className="flex items-start mb-4">
                <div className="bg-yellow-50 p-2 rounded-full mr-3">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                </div>
                <p className="text-gray-600 text-sm">
                  Crie seu próprio grupo de estudo ou participe de grupos existentes para disciplinas específicas.
                </p>
              </div>
              <div className="bg-gray-50 text-gray-500 text-sm px-3 py-2 rounded-lg text-center">
                Em breve disponível
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card de Fórum de discussão (em breve) */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-dashed border-gray-300">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3">
              <h2 className="text-lg font-bold text-gray-600 flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Fórum de Discussão
              </h2>
            </div>
            <div className="p-4">
              <div className="flex items-start mb-4">
                <div className="bg-yellow-50 p-2 rounded-full mr-3">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                </div>
                <p className="text-gray-600 text-sm">
                  Tire dúvidas, compartilhe conhecimentos e discuta tópicos médicos com seus colegas.
                </p>
              </div>
              <div className="bg-gray-50 text-gray-500 text-sm px-3 py-2 rounded-lg text-center">
                Em breve disponível
              </div>
            </div>
          </div>

          {/* Card de Biblioteca compartilhada (em breve) */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-dashed border-gray-300">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3">
              <h2 className="text-lg font-bold text-gray-600 flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Biblioteca Compartilhada
              </h2>
            </div>
            <div className="p-4">
              <div className="flex items-start mb-4">
                <div className="bg-yellow-50 p-2 rounded-full mr-3">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                </div>
                <p className="text-gray-600 text-sm">
                  Compartilhe resumos, materiais de estudo e recursos úteis com outros estudantes.
                </p>
              </div>
              <div className="bg-gray-50 text-gray-500 text-sm px-3 py-2 rounded-lg text-center">
                Em breve disponível
              </div>
            </div>
          </div>
        </div>
        
        {/* Dica de uso */}
        <div className="bg-blue-50 rounded-xl p-4 mt-6 border-l-4 border-blue-500 shadow-sm">
          <h3 className="text-sm font-semibold text-blue-800 mb-1.5 flex items-center">
            <Lightbulb className="h-4 w-4 mr-1.5 text-blue-600" />
            Dica para Comunidade
          </h3>
          <p className="text-xs text-blue-700 leading-relaxed">
            Estudar em grupo é mais eficiente quando todos participam ativamente. Defina metas claras para suas sessões 
            de estudo e incentive discussões construtivas para maximizar o aprendizado coletivo.
          </p>
        </div>
      </div>
    </div>
  );
} 