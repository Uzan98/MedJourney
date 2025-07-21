'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  Loader2, 
  LogOut, 
  MessageCircle, 
  X, 
  Trophy, 
  Info, 
  RefreshCw, 
  Crown, 
  ChevronRight,
  BookOpen,
  CheckCircle,
  PanelRight,
  Bell,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { StudyRoom, StudyRoomUser, StudyRoomService } from '@/services/study-room.service';
import OnlineUsersList from '@/components/OnlineUsersList';
import StudyTimer from '@/components/StudyTimer';
import { supabase } from '@/lib/supabase';
import ChatRoom from '@/components/chat/ChatRoom';
import StudyRoomRanking from '@/components/StudyRoomRanking';

export default function SalaEstudosDetalhe({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<StudyRoom | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<StudyRoomUser[]>([]);
  const [topUsers, setTopUsers] = useState<StudyRoomUser[]>([]);
  const [isInRoom, setIsInRoom] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [joinTime, setJoinTime] = useState<string>('');
  const [chatVisible, setChatVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Referência para controlar saída manual vs automática
  const manuallyClosed = useRef(false);
  
  // Intervalo para atualizar a lista de usuários online
  useEffect(() => {
    loadRoomData();
    
    // Configurar um intervalo para atualizar a lista de usuários online a cada 15 segundos
    const interval = setInterval(() => {
      loadOnlineUsers();
    }, 15000);
    
    // Limpar o intervalo e o canal de presença ao sair da página
    return () => {
      clearInterval(interval);
      
      // Se o usuário estiver na sala e não saiu manualmente, sair automaticamente ao fechar a página
      if (isInRoom && !manuallyClosed.current) {
        console.log("Usuário fechou a página/aba sem sair manualmente. Executando limpeza...");
        StudyRoomService.leaveRoom(params.id)
          .then(success => {
            if (success) {
              console.log("Limpeza automática realizada com sucesso ao fechar a página");
            } else {
              console.error("Falha na limpeza automática ao fechar a página");
            }
          })
          .catch(err => {
            console.error("Erro na limpeza automática:", err);
          });
      } else {
        console.log("Sem necessidade de limpeza automática: usuário já saiu ou não estava na sala");
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
      
      // Carregar ranking de usuários
      await loadTopUsers();
      
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
  
  // Carregar ranking de usuários com mais tempo de estudo
  const loadTopUsers = async () => {
    try {
      const users = await StudyRoomService.getTopUsersByTime(params.id);
      setTopUsers(users);
    } catch (error) {
      console.error('Erro ao carregar ranking de usuários:', error);
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
        await loadTopUsers();
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
    // Marcar que o usuário está saindo manualmente
    manuallyClosed.current = true;
    
    try {
      const success = await StudyRoomService.leaveRoom(params.id);
      
      if (success) {
        // Limpar o estado de tempo de entrada e alterar o estado para fora da sala
        setJoinTime('');
        setIsInRoom(false);
        
        // Atualizar UI apenas após confirmar a saída com sucesso
        toast.success('Você saiu da sala de estudos');
        
        // Atualizar lista de usuários
        await loadOnlineUsers();
        await loadTopUsers();
      } else {
        toast.error('Não foi possível sair da sala');
        // Se falhar, resetar a flag
        manuallyClosed.current = false;
      }
    } catch (error) {
      console.error('Erro ao sair da sala:', error);
      toast.error('Ocorreu um erro ao sair da sala');
      // Se houver erro, resetar a flag
      manuallyClosed.current = false;
    } finally {
      setIsLeaving(false);
    }
  };
  
  // Alternar a visibilidade do chat
  const toggleChat = () => setChatVisible(prev => !prev);
  
  // Atualizar dados da sala manualmente
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOnlineUsers();
      await loadTopUsers();
      toast.success('Dados atualizados');
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      toast.error('Erro ao atualizar dados');
    } finally {
      setRefreshing(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-14 w-14 border-t-3 border-b-3 border-blue-500 mb-5"></div>
        <p className="text-gray-600 font-medium">Carregando sala de estudos...</p>
        <p className="text-gray-500 text-sm mt-2">Preparando ambiente de estudo colaborativo</p>
      </div>
    );
  }
  
  if (!room) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 rounded-xl p-8 max-w-md mx-auto shadow-sm border border-red-100">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Sala não encontrada</h2>
          <p className="text-gray-600 mb-6">Esta sala de estudos não existe ou foi removida.</p>
        <Link 
          href="/comunidade/sala-estudos"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para salas
        </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-6xl mx-auto">
          {/* Header com design melhorado */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-md mb-6 overflow-hidden">
            <div className="p-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center">
            <Link 
              href="/comunidade/sala-estudos" 
                    className="mr-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="Voltar"
            >
                    <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <div>
                    <div className="flex items-center">
                      <BookOpen className="h-6 w-6 mr-3 text-blue-200" />
                      <h1 className="text-2xl font-bold">{room.name}</h1>
                    </div>
                    <p className="text-blue-100 mt-1">{room.description || 'Sala de estudos compartilhada para foco e concentração'}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="Atualizar dados"
            >
                    <RefreshCw className={`h-5 w-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          
          {isInRoom ? (
            <div className="flex items-center">
              {joinTime && (
                        <div className="mr-3 bg-blue-500/20 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center border border-blue-400/30">
                          <Clock className="h-4 w-4 text-blue-100 mr-2" />
                          <StudyTimer startTime={joinTime} className="text-white font-medium" compact={true} active={isInRoom} />
                </div>
              )}
              <button
                onClick={handleLeaveRoom}
                disabled={isLeaving}
                        className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm"
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
                      className="inline-flex items-center px-5 py-2.5 bg-white text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors shadow-sm font-medium"
            >
              {isJoining ? (
                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
              ) : (
                        <UserPlus className="h-5 w-5 mr-2" />
              )}
              Entrar na Sala
            </button>
          )}
                </div>
              </div>
              
              {/* Status da sala - mostrar mais informações */}
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm flex items-center border border-white/20">
                  <Users className="h-5 w-5 text-blue-200 mr-2" />
                  <span className="text-white font-medium">{onlineUsers.length} usuários online</span>
                </div>
                
                <div className="bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm flex items-center border border-white/20">
                  <Trophy className="h-5 w-5 text-yellow-300 mr-2" />
                  <span className="text-white font-medium">{topUsers.length} estudantes no ranking</span>
                </div>
                
                {isInRoom && (
                  <div className="bg-green-500/20 rounded-lg px-4 py-2 backdrop-blur-sm flex items-center border border-green-400/30">
                    <CheckCircle className="h-5 w-5 text-green-300 mr-2" />
                    <span className="text-white font-medium">Você está na sala agora</span>
                  </div>
                )}
              </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - Chat e Usuários Online */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card de boas-vindas e instruções */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 shadow-sm">
              <div className="flex items-start">
                  <div className="bg-white p-2.5 rounded-full mr-4 shadow-sm">
                  <Info className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                    <h3 className="font-semibold text-blue-800 mb-2 text-lg">Como funciona a Sala de Estudos</h3>
                    <p className="text-blue-700 leading-relaxed">
                    {isInRoom 
                        ? "Você está na sala de estudos. Seu tempo está sendo contabilizado automaticamente. Converse com outros estudantes, tire dúvidas e mantenha o foco!" 
                        : "Entre na sala para registrar seu tempo de estudo e interagir com outros estudantes em tempo real. Estudar em grupo pode aumentar sua produtividade!"
                    }
                  </p>
                    
                    {!isInRoom && (
                      <button
                        onClick={handleJoinRoom}
                        disabled={isJoining}
                        className="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm text-sm font-medium"
                      >
                        {isJoining ? (
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        Entrar Agora
                      </button>
                    )}
                </div>
              </div>
            </div>
            
            {/* Usuários Online antes do chat - NOVO */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3.5 flex justify-between items-center">
                <h2 className="text-base font-bold text-white flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Estudantes Online ({onlineUsers.length})
                    </h2>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1.5 hover:bg-blue-400/20 rounded-full transition-colors"
                  aria-label="Atualizar usuários"
                >
                  <RefreshCw className={`h-4 w-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="p-4">
                <OnlineUsersList users={onlineUsers} />
              </div>
            </div>
            
            {/* Chat da sala - visível apenas se estiver na sala */}
            {isInRoom && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3.5 flex justify-between items-center">
                  <h2 className="text-base font-bold text-white flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                      Chat da Sala de Estudos
                  </h2>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center bg-blue-400/30 px-2 py-1 rounded-full text-xs text-white">
                        <Users className="h-3.5 w-3.5 mr-1" />
                        <span>{onlineUsers.length} online</span>
                      </div>
                    <button
                      onClick={toggleChat}
                    className="p-1.5 hover:bg-blue-400/20 rounded-full transition-colors"
                    aria-label={chatVisible ? "Esconder chat" : "Mostrar chat"}
                  >
                    {chatVisible ? (
                          <PanelRight className="h-5 w-5 text-white" />
                    ) : (
                      <MessageCircle className="h-5 w-5 text-white" />
                    )}
                    </button>
                    </div>
                </div>
                
                {chatVisible && (
                    <div className="p-0 h-[450px]">
                    <ChatRoom roomId={params.id} />
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Sidebar - Ranking e Estatísticas */}
          <div className="space-y-6">
              {/* Ranking Horizontal com design melhorado */}
            <StudyRoomRanking users={topUsers} isHorizontal={true} />
            
              {/* Chamada para ação - integrada na coluna lateral */}
              {!isInRoom && (
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-md">
                  <div className="bg-white/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4 mx-auto">
                    <Clock className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-center">Junte-se a nós!</h3>
                  <p className="text-blue-100 text-sm mb-4 text-center">
                    Aumente sua produtividade estudando em grupo. Mantenha o foco e compartilhe conhecimentos!
                  </p>
                  <button
                    onClick={handleJoinRoom}
                    disabled={isJoining}
                    className="w-full py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center justify-center shadow-sm"
                  >
                    {isJoining ? (
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    ) : (
                      <UserPlus className="h-5 w-5 mr-2" />
                    )}
                    Começar a Estudar Agora
                  </button>
                </div>
              )}
              
              {/* Regras e Dicas com design melhorado */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3.5">
                <h2 className="text-base font-bold text-white flex items-center">
                  <Crown className="h-5 w-5 mr-2" />
                  Dicas para Produtividade
                </h2>
              </div>
                <div className="p-5">
                  <ul className="space-y-4">
                  <li className="flex items-start">
                      <div className="bg-blue-100 p-2 rounded-full mr-3 mt-0.5 flex-shrink-0">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 mb-0.5">Técnica Pomodoro</p>
                        <p className="text-sm text-gray-600">Estude por 25 minutos, descanse por 5 minutos. Repita o ciclo para maximizar a concentração.</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                      <div className="bg-purple-100 p-2 rounded-full mr-3 mt-0.5 flex-shrink-0">
                        <Users className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 mb-0.5">Discussão em Grupo</p>
                        <p className="text-sm text-gray-600">Compartilhe dúvidas com outros estudantes. Ensinar é uma das melhores formas de aprender.</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                      <div className="bg-amber-100 p-2 rounded-full mr-3 mt-0.5 flex-shrink-0">
                        <Trophy className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 mb-0.5">Defina Metas</p>
                        <p className="text-sm text-gray-600">Estabeleça metas diárias claras. Estudantes com metas definidas têm 70% mais chances de sucesso.</p>
                    </div>
                  </li>
                </ul>
                </div>
              </div>
              
              {/* Status da sala - informações adicionais */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3.5">
                  <h2 className="text-base font-bold text-white flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Atividade da Sala
                    </h2>
                </div>
                <div className="p-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-gray-700">Usuários Online</span>
                      </div>
                      <span className="font-semibold text-blue-600">{onlineUsers.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-purple-100 p-2 rounded-full mr-3">
                          <Trophy className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="text-gray-700">Ranking de Estudantes</span>
                      </div>
                      <span className="font-semibold text-purple-600">{topUsers.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-green-100 p-2 rounded-full mr-3">
                          <Clock className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-gray-700">Status da Sala</span>
                      </div>
                      <span className="font-semibold text-green-600">Ativa</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-gray-500 text-sm">Esta sala atualiza estatísticas a cada 15 segundos.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 