'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Users, AlertTriangle, ChevronRight, RefreshCw, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { StudyRoom, StudyRoomService } from '@/services/study-room.service';
import StudyTimeDisplay from '@/components/StudyTimeDisplay';
import { setupMockStudyRooms } from '@/mocks/study-rooms-mock';

export default function SalaEstudosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [stats, setStats] = useState<{ total_time: number; sessions: number }>({ total_time: 0, sessions: 0 });
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    async function initializeData() {
      // Configurar salas mockadas se necessário
      await setupMockStudyRooms();
      
      // Carregar dados
      await loadRooms();
      await loadUserStats();
    }
    
    initializeData();
  }, []);
  
  const loadRooms = async () => {
    setLoading(true);
    try {
      const studyRooms = await StudyRoomService.getStudyRooms();
      setRooms(studyRooms);
    } catch (error) {
      console.error('Erro ao carregar salas de estudo:', error);
      toast.error('Ocorreu um erro ao carregar as salas de estudo');
    } finally {
      setLoading(false);
    }
  };
  
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
      await loadRooms();
      await loadUserStats();
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    } finally {
      setRefreshing(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header moderno e responsivo */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link 
            href="/comunidade" 
            className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Sala de Estudos</h1>
            <p className="text-gray-600 text-sm">Estude junto com outros usuários em tempo real</p>
          </div>
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
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Carregando salas de estudo...</p>
        </div>
      ) : (
        <>
          {/* Estatísticas de estudo com design moderno */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3.5">
              <h2 className="text-lg font-bold text-white flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
              Seu Tempo de Estudo
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
        
        {/* Lista de Salas */}
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Users className="h-5 w-5 text-blue-500 mr-2" />
            Salas Disponíveis
          </h2>
        
        {rooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map(room => (
              <Link
                key={room.id}
                href={`/comunidade/sala-estudos/${room.id}`}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all"
              >
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                    <h3 className="text-base font-bold text-white flex items-center">
                    {room.name}
                  </h3>
                </div>
                  <div className="p-4">
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {room.description || 'Sala de estudos compartilhada para foco e concentração.'}
                  </p>
                  
                  <div className="flex justify-between items-center">
                      <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{room.active_users || 0} online</span>
                    </div>
                      <span className="flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm">
                        <span className="mr-1">Entrar</span>
                        <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-dashed border-yellow-300 p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 flex items-center justify-center bg-yellow-50 rounded-full mb-4">
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma sala disponível</h3>
                <p className="text-gray-600 mb-4 max-w-md mx-auto">
                  Não há salas de estudo disponíveis no momento. Tente novamente mais tarde ou entre em contato com a administração.
                </p>
                <button 
                  onClick={handleRefresh}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2 px-4 rounded-lg flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {/* Dica de estudo */}
          <div className="bg-blue-50 rounded-xl p-4 mt-6 border-l-4 border-blue-500 shadow-sm">
            <h3 className="text-sm font-semibold text-blue-800 mb-1.5 flex items-center">
              <Clock className="h-4 w-4 mr-1.5 text-blue-600" />
              Dica para Estudos em Grupo
            </h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              Estudar em grupo pode aumentar sua produtividade em até 50%. Escolha uma sala, defina metas claras e 
              use a função de chat para discutir dúvidas com outros estudantes durante suas sessões.
            </p>
          </div>
        </>
        )}
    </div>
  );
} 
