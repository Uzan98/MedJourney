'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaArrowLeft } from 'react-icons/fa';
import { Clock, Users, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StudyRoom, StudyRoomUser, StudyRoomService } from '@/services/study-room.service';
import Loading from '@/components/Loading';
import OnlineUsersList from '@/components/OnlineUsersList';
import StudyTimer from '@/components/StudyTimer';
import { supabase } from '@/lib/supabase';

export default function SalaEstudosDetalhe({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<StudyRoomUser[]>([]);
  const [isInRoom, setIsInRoom] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [joinTime, setJoinTime] = useState<string>('');
  
  // Intervalo para atualizar a lista de usuários online
  useEffect(() => {
    loadRoomData();
    
    // Configurar um intervalo para atualizar a lista de usuários online a cada 15 segundos
    const interval = setInterval(() => {
      loadOnlineUsers();
    }, 15000);
    
    // Limpar o canal de presença ao sair da página
    return () => {
      clearInterval(interval);
      
      // Se o usuário estiver na sala, sair automaticamente ao fechar a página
      if (isInRoom) {
        StudyRoomService.leaveRoom(params.id);
      }
    };
  }, [params.id, isInRoom]);
  
  // Carregar dados da sala e verificar se o usuário está online
  const loadRoomData = async () => {
    setLoading(true);
    try {
      // Buscar detalhes da sala
      const rooms = await StudyRoomService.getStudyRooms();
      const roomData = rooms.find(r => r.id === params.id);
      
      if (!roomData) {
        toast.error('Sala não encontrada');
        router.push('/comunidade/sala-estudos');
        return;
      }
      
      setRoom(roomData);
      
      // Carregar usuários online
      await loadOnlineUsers();
      
      // Verificar se o usuário atual está na sala
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: userInRoom } = await supabase
          .from('study_room_users')
          .select('entrou_em, esta_online')
          .eq('user_id', userData.user.id)
          .eq('room_id', params.id)
          .single();
        
        if (userInRoom && userInRoom.esta_online) {
          setIsInRoom(true);
          setJoinTime(userInRoom.entrou_em);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados da sala:', error);
      toast.error('Ocorreu um erro ao carregar os dados da sala');
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar usuários online na sala
  const loadOnlineUsers = async () => {
    try {
      const users = await StudyRoomService.getOnlineUsers(params.id);
      setOnlineUsers(users);
    } catch (error) {
      console.error('Erro ao carregar usuários online:', error);
    }
  };
  
  // Entrar na sala de estudos
  const handleJoinRoom = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para entrar na sala');
      router.push('/auth/login');
      return;
    }
    
    setIsJoining(true);
    try {
      const success = await StudyRoomService.joinRoom(params.id);
      
      if (success) {
        setIsInRoom(true);
        setJoinTime(new Date().toISOString());
        toast.success('Você entrou na sala de estudos');
        
        // Atualizar lista de usuários
        await loadOnlineUsers();
      } else {
        toast.error('Não foi possível entrar na sala');
      }
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      toast.error('Ocorreu um erro ao entrar na sala');
    } finally {
      setIsJoining(false);
    }
  };
  
  // Sair da sala de estudos
  const handleLeaveRoom = async () => {
    setIsLeaving(true);
    try {
      const success = await StudyRoomService.leaveRoom(params.id);
      
      if (success) {
        setIsInRoom(false);
        toast.success('Você saiu da sala de estudos');
        
        // Atualizar lista de usuários
        await loadOnlineUsers();
      } else {
        toast.error('Não foi possível sair da sala');
      }
    } catch (error) {
      console.error('Erro ao sair da sala:', error);
      toast.error('Ocorreu um erro ao sair da sala');
    } finally {
      setIsLeaving(false);
    }
  };
  
  if (loading) {
    return <Loading message="Carregando sala de estudos..." />;
  }
  
  if (!room) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-gray-600 mb-4">Sala não encontrada</p>
        <Link 
          href="/comunidade/sala-estudos"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FaArrowLeft className="mr-2" /> Voltar para salas
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link 
              href="/comunidade/sala-estudos" 
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
              aria-label="Voltar"
            >
              <FaArrowLeft className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{room.name}</h1>
              <p className="text-gray-600">{room.description || 'Sala de estudos compartilhada'}</p>
            </div>
          </div>
          
          {isInRoom ? (
            <div className="flex items-center">
              {joinTime && (
                <div className="mr-4 bg-blue-50 px-3 py-2 rounded-lg">
                  <StudyTimer startTime={joinTime} className="text-blue-700 font-medium" />
                </div>
              )}
              <button
                onClick={handleLeaveRoom}
                disabled={isLeaving}
                className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
              >
                {isLeaving ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Sair da Sala
              </button>
            </div>
          ) : (
            <button
              onClick={handleJoinRoom}
              disabled={isJoining}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isJoining ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              Entrar na Sala
            </button>
          )}
        </div>
        
        {/* Usuários Online */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-500 to-teal-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Usuários Online ({onlineUsers.length}/{room.capacity || 'Ilimitado'})
            </h2>
          </div>
          <div className="p-6">
            <OnlineUsersList users={onlineUsers} />
          </div>
        </div>
        
        {/* Informações da Sala */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">
              Sobre esta Sala
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Ao entrar na sala de estudos, seu tempo online será contabilizado e você poderá ver outros 
              estudantes que estão estudando no momento. Isso ajuda a manter a motivação e criar uma 
              rotina de estudos consistente.
            </p>
            
            {!isInRoom && (
              <p className="bg-yellow-50 p-4 rounded-lg text-yellow-800 text-sm">
                <strong>Dica:</strong> Enquanto estiver estudando, mantenha esta página aberta para que seu tempo de estudo seja registrado corretamente.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 