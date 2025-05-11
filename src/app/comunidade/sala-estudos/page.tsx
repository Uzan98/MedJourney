'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';
import { Clock, Users, ChevronRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { StudyRoom, StudyRoomService } from '@/services/study-room.service';
import Loading from '@/components/Loading';
import StudyTimeDisplay from '@/components/StudyTimeDisplay';
import { setupMockStudyRooms } from '@/mocks/study-rooms-mock';

export default function SalaEstudosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [stats, setStats] = useState<{ total_time: number; sessions: number }>({ total_time: 0, sessions: 0 });
  
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
  
  if (loading) {
    return <Loading message="Carregando salas de estudo..." />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link 
            href="/comunidade" 
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
            aria-label="Voltar"
          >
            <FaArrowLeft className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Sala de Estudos</h1>
            <p className="text-gray-600">Estude junto com outros usuários em tempo real</p>
          </div>
        </div>
        
        {/* Estatísticas de estudo */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Seu Tempo de Estudo
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Tempo Total de Estudo</h3>
                <p className="text-2xl font-bold text-blue-700">
                  <StudyTimeDisplay seconds={stats.total_time} />
                </p>
              </div>
              
              <div className="bg-indigo-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-indigo-900 mb-2">Sessões de Estudo</h3>
                <p className="text-2xl font-bold text-indigo-700">{stats.sessions}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Lista de Salas */}
        <h2 className="text-xl font-bold text-gray-800 mb-4">Salas Disponíveis</h2>
        
        {rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rooms.map(room => (
              <Link
                key={room.id}
                href={`/comunidade/sala-estudos/${room.id}`}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    {room.name}
                  </h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">
                    {room.description || 'Sala de estudos compartilhada para foco e concentração.'}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-sm text-blue-600">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{room.active_users || 0} online</span>
                    </div>
                    <span className="flex items-center">
                      <span className="mr-1 text-blue-600 font-medium">Entrar na sala</span>
                      <ChevronRight className="h-5 w-5 text-blue-600" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-dashed border-yellow-300">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 flex items-center justify-center bg-yellow-100 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma sala disponível</h3>
              <p className="text-gray-600 mb-4">
                Não há salas de estudo disponíveis no momento. Entre em contato com a administração.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 