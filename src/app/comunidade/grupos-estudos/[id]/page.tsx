'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Clock, Send, LogOut, X, MessageSquare, User, Award, Info, Copy, Shield, Sparkles, UserPlus, ExternalLink, BookOpen, Timer, Activity, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { StudyGroup, StudyGroupMember, StudyGroupService } from '@/services/study-group.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PomodoroTimer from '@/components/estudos/PomodoroTimer';
import AchievementsFeed from '@/components/comunidade/AchievementsFeed';
import GroupExamsSection from '@/components/comunidade/GroupExamsSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChatScroll } from '@/hooks/useChatScroll';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
  is_system_message: boolean;
}

export default function GrupoEstudosPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const groupId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<StudyGroupMember[]>([]);
  const [topMembers, setTopMembers] = useState<StudyGroupMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'chat' | 'info' | 'pomodoro' | 'simulados'>('chat');
  const [menuPosition, setMenuPosition] = useState({ left: 0 });
  
  // Chave única para forçar remontagem do timer quando necessário
  const timerKey = useRef<string>(`timer-${Date.now()}`);
  
  // Estado para controle do timer persistente entre navegações
  const pomodoroRef = useRef<React.ReactElement | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { containerRef, scrollToBottom } = useChatScroll({
    messages,
    dependencies: [],
    shouldAutoScroll: true
  });
  
  // Carregar dados iniciais
  useEffect(() => {
    loadGroupData();
    
    // Configurar subscription para mensagens em tempo real
    const messagesSubscription = StudyGroupService.subscribeToMessages(groupId, (newMessage) => {
      console.log('Nova mensagem recebida na página:', newMessage);
      
      // Verificar se a mensagem já existe (para evitar duplicatas)
      setMessages(prev => {
        const messageExists = prev.some(msg => msg.id === newMessage.id);
        if (messageExists) {
          console.log('Mensagem já existe, ignorando duplicata');
          return prev;
        }
        console.log('Adicionando nova mensagem à lista');
        return [...prev, newMessage];
      });
      
      // Forçar rolagem para o final quando uma nova mensagem chegar
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 100);
    });
    
    // Configurar subscription para presença em tempo real
    const presenceSubscription = StudyGroupService.subscribeToPresence(groupId, (updatedMembers) => {
      console.log('Lista de membros atualizada via subscription:', updatedMembers);
      
      // Verificar se há diferença na lista de membros online
      const currentOnlineCount = members.filter(m => m.is_active).length;
      const newOnlineCount = updatedMembers.filter(m => m.is_active).length;
      
      if (currentOnlineCount !== newOnlineCount) {
        console.log(`Mudança no número de membros online: ${currentOnlineCount} -> ${newOnlineCount}`);
      }
      
      // Atualizar a lista de membros
      setMembers(updatedMembers);
      
      // Também atualizamos o grupo para refletir a contagem online correta
      if (group) {
        setGroup(prev => prev ? {
          ...prev,
          online_count: updatedMembers.filter(m => m.is_active).length
        } : null);
      }
    });
    
    // Configurar subscription para mudanças no grupo (para detectar saídas)
    const groupSubscription = supabase
      .channel(`group_changes_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_groups',
          filter: `id=eq.${groupId}`
        },
        async (payload) => {
          console.log('Grupo atualizado, atualizando membros:', payload);
          await refreshMembersList();
        }
      )
      .subscribe();
    
    // Atualizar dados periodicamente para garantir sincronização
    const intervalId = setInterval(() => {
      refreshMembersList();
      refreshMessages();
      refreshTopMembers(); // Atualizar o ranking periodicamente
    }, 30000); // Atualizar a cada 30 segundos
    
    // Configurar evento para quando o usuário retorna à página
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Usuário retornou à página, atualizando dados');
        refreshMembersList();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Configurar evento para quando a janela recebe foco
    const handleFocus = () => {
      console.log('Janela recebeu foco, atualizando dados');
      refreshMembersList();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      // Limpar subscriptions ao desmontar
      if (messagesSubscription) messagesSubscription.unsubscribe();
      if (presenceSubscription) presenceSubscription.unsubscribe();
      if (groupSubscription) groupSubscription.unsubscribe();
      clearInterval(intervalId);
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      
      // Sair do grupo ao desmontar (marcar como inativo)
      if (isActive) {
        console.log('Componente desmontando, saindo do grupo');
        StudyGroupService.exitGroup(groupId);
      }
    };
  }, [groupId]); // Removida a dependência 'group' para evitar recarregamento infinito
  
  const loadGroupData = async () => {
    setLoading(true);
    try {
      // Verificar se é membro
      const memberCheck = await StudyGroupService.isGroupMember(groupId);
      setIsMember(memberCheck);
      
      if (!memberCheck) {
        toast.error('Você não é membro deste grupo');
        router.push('/comunidade/grupos-estudos');
        return;
      }
      
      // Carregar dados do grupo
      const [groupData, membersData, messagesData, topMembersData] = await Promise.all([
        StudyGroupService.getGroupDetails(groupId),
        StudyGroupService.getGroupMembers(groupId),
        StudyGroupService.getGroupMessages(groupId),
        StudyGroupService.getTopMembers(groupId, 5)
      ]);
      
      if (!groupData) {
        toast.error('Grupo não encontrado');
        router.push('/comunidade/grupos-estudos');
        return;
      }
      
      console.log('Mensagens carregadas inicialmente:', messagesData.length);
      
      setGroup(groupData);
      setMembers(membersData);
      setMessages(messagesData);
      setTopMembers(topMembersData);
      
      // Verificar se o usuário está ativo no grupo
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: memberData } = await supabase
          .from('study_group_members')
          .select('is_active')
          .eq('user_id', userData.user.id)
          .eq('group_id', groupId)
          .single();
        
        if (memberData) {
          setIsActive(memberData.is_active);
        }
      }
      
      // Marcar usuário como ativo no grupo
      const activeStatus = await StudyGroupService.enterGroup(groupId);
      setIsActive(activeStatus);
      
      // Rolar para o final da lista de mensagens após o carregamento
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 500);
      
    } catch (error) {
      console.error('Erro ao carregar dados do grupo:', error);
      toast.error('Erro ao carregar dados do grupo');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para atualizar a lista de membros
  const refreshMembersList = async () => {
    try {
      console.log('Atualizando lista de membros manualmente...');
      const membersData = await StudyGroupService.getGroupMembers(groupId);
      console.log(`Recebidos ${membersData.length} membros, ${membersData.filter(m => m.is_active).length} online`);
      
      // Verificar se há diferença na lista de membros online
      const currentOnlineCount = members.filter(m => m.is_active).length;
      const newOnlineCount = membersData.filter(m => m.is_active).length;
      
      if (currentOnlineCount !== newOnlineCount) {
        console.log(`Mudança no número de membros online: ${currentOnlineCount} -> ${newOnlineCount}`);
      }
      
      setMembers(membersData);
      
      // Atualizar contagem de online no grupo
      if (group) {
        setGroup(prev => prev ? {
          ...prev,
          online_count: membersData.filter(m => m.is_active).length
        } : null);
      }
    } catch (error) {
      console.error('Erro ao atualizar lista de membros:', error);
    }
  };
  
  // Função para atualizar as mensagens
  const refreshMessages = async () => {
    try {
      console.log('Atualizando mensagens...');
      const messagesData = await StudyGroupService.getGroupMessages(groupId);
      console.log(`Recebidas ${messagesData.length} mensagens na atualização`);
      
      // Manter apenas mensagens únicas
      setMessages(messagesData);
      
      // Rolar para o final
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      console.error('Erro ao atualizar mensagens:', error);
    }
  };
  
  // Função para atualizar o ranking dos top estudantes
  const refreshTopMembers = async () => {
    try {
      console.log('Atualizando ranking de estudantes...');
      const topMembersData = await StudyGroupService.getTopMembers(groupId, 5);
      setTopMembers(topMembersData);
    } catch (error) {
      console.error('Erro ao atualizar ranking de estudantes:', error);
    }
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sendingMessage) return;
    
    setSendingMessage(true);
    try {
      console.log('Enviando mensagem:', newMessage);
      const success = await StudyGroupService.sendMessage(groupId, newMessage.trim());
      
      if (success) {
        console.log('Mensagem enviada com sucesso');
        setNewMessage('');
        
        // Atualizar mensagens após envio bem-sucedido
        // Comentado porque a subscription deve capturar a nova mensagem
        // await refreshMessages();
      } else {
        toast.error('Não foi possível enviar a mensagem');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };
  
  const handleLeaveGroup = async () => {
    if (confirm('Tem certeza que deseja sair permanentemente deste grupo?')) {
      try {
        await StudyGroupService.leaveGroup(groupId);
        toast.success('Você saiu do grupo com sucesso');
        router.push('/comunidade/grupos-estudos');
      } catch (error) {
        console.error('Erro ao sair do grupo:', error);
        toast.error('Erro ao sair do grupo');
      }
    }
  };
  
  // Função para sair temporariamente da sala (parar de contar tempo)
  const handleExitRoom = async () => {
    setIsLeaving(true);
    try {
      // Primeiro, desativar localmente para evitar que o useEffect tente reconectar
      setIsActive(false);
      
      // Tentar sair do grupo várias vezes para garantir consistência
      let success = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!success && attempts < maxAttempts) {
        attempts++;
        console.log(`Tentativa ${attempts} de sair do grupo...`);
        
        success = await StudyGroupService.exitGroup(groupId);
        
        if (!success && attempts < maxAttempts) {
          // Pequena pausa antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (success) {
        toast.success('Você saiu da sala.');
        
        // Cancelar qualquer atualização pendente
        if (window.requestAnimationFrame) {
          cancelAnimationFrame(window.requestAnimationFrame(() => {}));
        }
        
        // Redirecionar imediatamente para a página principal de grupos de estudos
        window.location.href = '/comunidade/grupos-estudos';
      } else {
        toast.error('Erro ao sair da sala');
        // Restaurar estado se falhar
        setIsActive(true);
      }
    } catch (error) {
      console.error('Erro ao sair da sala:', error);
      toast.error('Ocorreu um erro ao sair da sala');
      // Restaurar estado se falhar
      setIsActive(true);
    } finally {
      setIsLeaving(false);
    }
  };
  
  // Função para entrar na sala
  const handleEnterRoom = async () => {
    try {
      const success = await StudyGroupService.enterGroup(groupId);
      if (success) {
        setIsActive(true);
        toast.success('Você entrou na sala.');
        
        // Atualizar a lista de membros
        await refreshMembersList();
      } else {
        toast.error('Não foi possível entrar na sala');
      }
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      toast.error('Ocorreu um erro ao entrar na sala');
    }
  };
  
  // Calcular posição do menu lateral
  useEffect(() => {
    const updateMenuPosition = () => {
      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
        setMenuPosition({
          left: rect.left - 35
        });
      }
    };
    
    // Atualizar no carregamento e redimensionamento
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [loading]);
  
  // Inicializar o componente Pomodoro para garantir persistência
  useEffect(() => {
    if (!pomodoroRef.current && groupId) {
      pomodoroRef.current = (
        <PomodoroTimer 
          onComplete={() => {
            toast.success('Ciclo Pomodoro concluído!');
          }}
          onStateChange={(state) => {
            console.log('Estado do Pomodoro:', state);
          }}
          groupId={groupId}
          key={`pomodoro-${groupId}`} // Chave com ID do grupo para evitar recriação
        />
      );
    }
  }, [groupId]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="relative w-20 h-20">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-600 font-medium mt-4">Carregando grupo de estudos...</p>
      </div>
    );
  }
  
  if (!group || !isMember) {
    return null; // Redirecionado pelo useEffect
  }
  
  const currentUserMember = members.find(m => m.user_id === user?.id);
  const isAdmin = currentUserMember?.is_admin;
  
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-6xl">
      {/* Background gradients */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-70"></div>
      
      {/* Header - Card moderno com glassmorphism */}
      <div className="mb-6">
        <div className="bg-white/30 backdrop-blur-lg rounded-2xl shadow-[0_8px_32px_rgba(31,38,135,0.15)] border border-white/20 overflow-hidden relative hover:shadow-[0_12px_36px_rgba(31,38,135,0.18)] transition-shadow duration-300">
          {/* Efeitos de luz de fundo */}
          <div className="absolute -top-20 right-40 w-64 h-64 bg-blue-400/20 rounded-full blur-[80px] animate-pulse-slow"></div>
          <div className="absolute -bottom-8 -left-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-[60px] animate-pulse-slower"></div>
          <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-purple-300/20 rounded-full blur-[40px]"></div>
          
          <div className="relative z-10 p-3 sm:p-5">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex items-center">
                <Link 
                  href="/comunidade/grupos-estudos" 
                  className="mr-3 sm:mr-4 p-2 sm:p-2.5 rounded-full bg-blue-500/80 text-white hover:bg-blue-600/90 transition-all shadow-sm hover:shadow-md hover:scale-105 duration-300"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
                <div className="flex-1">
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-800 mb-1 leading-tight">{group.name}</h1>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center shadow-sm ${
                      group.is_private 
                        ? 'bg-gray-200/70 text-gray-700' 
                        : 'bg-green-100/80 text-green-700'
                    }`}>
                      {group.is_private ? 'Privado' : 'Público'}
                    </span>
                    <span className="flex items-center bg-blue-100/70 text-blue-700 px-2 sm:px-3 py-1 rounded-full text-xs shadow-sm">
                      <Users className="h-3 w-3 mr-1 sm:mr-1.5" />
                      {members.filter(m => m.is_active).length} online
                    </span>
                    <div 
                      className="flex items-center bg-purple-100/60 px-2 sm:px-3 py-1 rounded-full cursor-pointer hover:bg-purple-200/70 transition-colors group shadow-sm hover:shadow"
                      onClick={() => {
                        navigator.clipboard.writeText(group.access_code);
                        toast.success('Código copiado!');
                      }}
                    >
                      <span className="text-xs mr-1 text-purple-700">Código:</span>
                      <span className="font-mono font-medium text-xs text-purple-800">{group.access_code}</span>
                      <Copy className="h-3 w-3 ml-1 sm:ml-1.5 text-purple-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 mt-3">
                {!isActive && (
                  <Button 
                    onClick={handleEnterRoom}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow hover:shadow-md hover:scale-[1.02] transition-all rounded-xl text-sm px-3 py-2 sm:px-4 sm:py-2"
                  >
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                    <span className="hidden sm:inline">Entrar no grupo</span>
                    <span className="sm:hidden">Entrar</span>
                  </Button>
                )}
                
                {isActive && (
                  <Button 
                    variant="outline" 
                    className="border-red-100 bg-red-50/70 backdrop-blur-sm text-red-500 hover:bg-red-100/80 hover:text-red-600 rounded-xl shadow hover:shadow-md hover:scale-[1.02] transition-all text-sm px-3 py-2 sm:px-4 sm:py-2"
                    onClick={handleLeaveGroup}
                  >
                    <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                    <span className="hidden sm:inline">Sair do grupo</span>
                    <span className="sm:hidden">Sair</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navegação horizontal */}
      <div className="mb-4 sm:mb-6">
        <div className="bg-white/30 backdrop-blur-lg rounded-xl shadow-[0_8px_32px_rgba(31,38,135,0.1)] border border-white/20 py-1.5 sm:py-2 px-1.5 sm:px-2 overflow-hidden relative">
          {/* Efeito de luz de fundo */}
          <div className="absolute -top-10 left-1/4 w-32 h-32 bg-blue-400/20 rounded-full blur-xl"></div>
          <div className="absolute -bottom-10 right-1/4 w-32 h-32 bg-purple-400/20 rounded-full blur-xl"></div>
          
          <div className="relative flex items-center justify-center space-x-1 sm:space-x-3 lg:space-x-6 overflow-x-auto">
            <button
              onClick={() => setActiveSection('chat')}
              className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-300 flex items-center whitespace-nowrap ${
                activeSection === 'chat' 
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30' 
                  : 'bg-white/40 text-gray-700 hover:bg-white/60'
              }`}
              title="Chat"
            >
              <MessageSquare className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${activeSection === 'chat' ? 'drop-shadow-md' : ''}`} />
              <span className="font-medium text-xs sm:text-sm">Chat</span>
            </button>
            
            <button
              onClick={() => setActiveSection('info')}
              className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-300 flex items-center whitespace-nowrap ${
                activeSection === 'info' 
                  ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/30' 
                  : 'bg-white/40 text-gray-700 hover:bg-white/60'
              }`}
              title="Informações"
            >
              <Info className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${activeSection === 'info' ? 'drop-shadow-md' : ''}`} />
              <span className="font-medium text-xs sm:text-sm">Info</span>
            </button>
            
            <button
              onClick={() => setActiveSection('simulados')}
              className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-300 flex items-center whitespace-nowrap ${
                activeSection === 'simulados' 
                  ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-md shadow-green-500/30' 
                  : 'bg-white/40 text-gray-700 hover:bg-white/60'
              }`}
              title="Simulados"
            >
              <FileText className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${activeSection === 'simulados' ? 'drop-shadow-md' : ''}`} />
              <span className="font-medium text-xs sm:text-sm">Simulados</span>
            </button>
            
            <button
              onClick={() => setActiveSection('pomodoro')}
              className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all duration-300 flex items-center whitespace-nowrap ${
                activeSection === 'pomodoro' 
                  ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-md shadow-purple-500/30' 
                  : 'bg-white/40 text-gray-700 hover:bg-white/60'
              }`}
              title="Pomodoro"
            >
              <Timer className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${activeSection === 'pomodoro' ? 'drop-shadow-md' : ''}`} />
              <span className="font-medium text-xs sm:text-sm">Pomodoro</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Painel principal (chat e informações) */}
        <div className="lg:col-span-2 relative order-1 lg:order-1">
            {/* Conteúdo das seções - removida a navegação lateral */}
            <div ref={contentRef} className="bg-white/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-white/40 overflow-hidden">
              {/* Chat */}
              {activeSection === 'chat' && (
                <>
                  {/* Cabeçalho da seção */}
                  <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 p-3 sm:p-4 text-white shadow-sm relative overflow-hidden">
                    {/* Efeito de luz de fundo */}
                    <div className="absolute -bottom-6 right-12 w-24 h-24 bg-blue-300/30 rounded-full blur-xl"></div>
                    <div className="absolute -top-6 left-12 w-20 h-20 bg-indigo-300/20 rounded-full blur-xl"></div>
                    
                    <h3 className="text-base sm:text-lg font-bold flex items-center relative z-10">
                      <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2"/> 
                      Chat do Grupo
                    </h3>
                  </div>
                  
                {/* Área de mensagens */}
                <div 
                  ref={containerRef}
                    className="h-[50vh] sm:h-[60vh] overflow-y-auto p-3 sm:p-5 bg-gradient-to-b from-gray-50/60 to-white/70"
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <MessageSquare className="h-8 w-8 text-blue-400" />
                      </div>
                      <p className="text-gray-700 font-medium mb-2">Nenhuma mensagem ainda</p>
                      <p className="text-gray-500 text-sm">Seja o primeiro a enviar uma mensagem!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`mb-4 ${msg.is_system_message ? 'text-center' : ''}`}
                      >
                        {msg.is_system_message ? (
                          <div className="bg-gray-100/80 backdrop-blur-sm text-gray-600 text-xs py-1.5 px-3 rounded-full inline-block">
                            {msg.message}
                          </div>
                        ) : (
                          <div className={`flex ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`
                              max-w-[85%] sm:max-w-[80%] rounded-2xl p-2.5 sm:p-3.5 shadow-sm
                              ${msg.user_id === user?.id 
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' 
                                : 'bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-800'}
                            `}>
                              {msg.user_id !== user?.id && (
                                <p className="font-medium text-xs mb-1.5 flex items-center">
                                  {msg.username}
                                  {members.find(m => m.user_id === msg.user_id)?.is_admin && (
                                    <span className="ml-1.5 bg-blue-200/80 backdrop-blur-sm text-blue-700 text-[10px] px-1 py-0.5 rounded">
                                      Admin
                                    </span>
                                  )}
                                </p>
                              )}
                              <p className="text-xs sm:text-sm leading-relaxed">{msg.message}</p>
                              <p className="text-xs opacity-70 text-right mt-1 sm:mt-1.5">
                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Formulário de envio */}
                <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t bg-gray-50/80 backdrop-blur-sm">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 bg-white/90 backdrop-blur-sm border-gray-200 focus:ring-blue-500 focus:border-blue-500 rounded-xl shadow-sm text-sm"
                      disabled={sendingMessage}
                    />
                    <Button 
                      type="submit" 
                      disabled={sendingMessage || !newMessage.trim()} 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all px-3 sm:px-4"
                    >
                      <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </form>
                </>
              )}
              
              {/* Informações */}
              {activeSection === 'info' && (
                <>
                  <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 p-6 text-white shadow-sm relative overflow-hidden">
                    {/* Efeito de luz de fundo */}
                    <div className="absolute -bottom-6 right-12 w-24 h-24 bg-indigo-300/30 rounded-full blur-xl"></div>
                    <div className="absolute -top-6 left-12 w-20 h-20 bg-purple-300/20 rounded-full blur-xl"></div>
                    
                    <h3 className="text-lg font-bold mb-2 flex items-center relative z-10"><Info className="h-5 w-5 mr-2"/> Sobre o Grupo</h3>
                    <p className="text-white/90 text-sm relative z-10">
                    {group.description || 'Grupo de estudos personalizado para colaboração e aprendizado.'}
                  </p>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {group.discipline_id && (
                    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 flex items-start hover:shadow-lg transition-shadow">
                      <div className="p-3 bg-blue-100 rounded-lg mr-4">
                        <BookOpen className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                      <h4 className="font-medium text-sm text-gray-500 mb-1">Disciplina</h4>
                        <p className="text-gray-800 font-semibold text-lg">{`Disciplina ${group.discipline_id}`}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 flex items-start hover:shadow-lg transition-shadow">
                    <div className="p-3 bg-indigo-100 rounded-lg mr-4">
                      <Clock className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500 mb-1">Criado em</h4>
                      <p className="text-gray-800 font-semibold text-lg">
                      {new Date(group.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                      })}
                    </p>
                    </div>
                  </div>
                  
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 md:col-span-2 flex items-start hover:shadow-lg transition-shadow">
                    <div className="p-3 bg-purple-100 rounded-lg mr-4">
                      <Shield className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-500 mb-2">Código de acesso</h4>
                    <div className="flex items-center">
                        <span className="bg-gray-100 px-4 py-2 rounded-lg font-mono text-gray-800 tracking-wider text-lg">
                        {group.access_code}
                      </span>
                      <Button 
                        variant="ghost" 
                          className="ml-2 h-10 w-10 p-0 rounded-full hover:bg-blue-100"
                        onClick={() => {
                          navigator.clipboard.writeText(group.access_code);
                          toast.success('Código copiado!');
                        }}
                      >
                          <Copy className="h-5 w-5 text-blue-600" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Compartilhe este código com colegas para que eles possam entrar no grupo.
                    </p>
                    </div>
                  </div>
                </div>
                </>
              )}
              
              {/* Simulados */}
              {activeSection === 'simulados' && (
                <GroupExamsSection 
                  groupId={groupId}
                  userId={user?.id || ''}
                  isAdmin={isAdmin}
                />
              )}
              
              {/* Pomodoro */}
              {activeSection === 'pomodoro' && (
                <>
                  <div className="bg-gradient-to-r from-purple-500 via-pink-600 to-red-600 p-6 text-white shadow-sm relative overflow-hidden">
                    {/* Efeito de luz de fundo */}
                    <div className="absolute -bottom-6 right-12 w-24 h-24 bg-pink-300/30 rounded-full blur-xl"></div>
                    <div className="absolute -top-6 left-12 w-20 h-20 bg-purple-300/20 rounded-full blur-xl"></div>
                    
                    <h3 className="text-lg font-bold mb-2 flex items-center relative z-10"><Timer className="h-5 w-5 mr-2"/> Técnica Pomodoro</h3>
                    <p className="text-white/90 text-sm relative z-10">
                    Use o método Pomodoro para aumentar sua produtividade: alterne entre períodos de foco intenso e pequenas pausas.
                  </p>
                </div>
                
                                 <div className="p-6">
                    {pomodoroRef.current}
                  
                  <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-2">Como funciona o método Pomodoro?</h4>
                    <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1.5">
                      <li>Escolha uma tarefa para trabalhar</li>
                      <li>Configure o temporizador para 25 minutos</li>
                      <li>Trabalhe na tarefa até o alarme tocar</li>
                      <li>Faça uma pausa curta (5 minutos)</li>
                      <li>A cada 4 ciclos, faça uma pausa longa (15 minutos)</li>
                    </ol>
                    
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <h5 className="font-medium text-blue-800 mb-1.5">Controles do Pomodoro:</h5>
                      <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                        <li><strong>Iniciar/Pausar</strong> - Inicia ou pausa o temporizador</li>
                        <li><strong>Reiniciar</strong> - Reinicia o temporizador e zera a contagem de ciclos</li>
                        <li><strong>Pular</strong> - Avança para o próximo ciclo (foco ou pausa) sem esperar o tempo acabar</li>
                      </ul>
                    </div>
                  </div>
                </div>
                </>
              )}
              </div>
        </div>
        
        {/* Painel lateral (membros e ranking) */}
        <div className="space-y-4 sm:space-y-6 order-2 lg:order-2">
          {/* Membros online */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-teal-500">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2.5" />
                <span className="hidden sm:inline">Membros Online ({members.filter(m => m.is_active === true).length}/{members.length})</span>
                <span className="sm:hidden">Online ({members.filter(m => m.is_active === true).length}/{members.length})</span>
              </h3>
            </div>
            <div className="p-2 sm:p-3 max-h-[30vh] sm:max-h-[35vh] overflow-y-auto">
              {members.filter(m => m.is_active === true).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Users className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">Nenhum membro online</p>
                  <p className="text-gray-500 text-sm">Convide colegas para estudarem juntos</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {members
                    .filter(m => m.is_active === true)
                    .sort((a, b) => (b.is_admin ? 1 : 0) - (a.is_admin ? 1 : 0)) // Admins first
                    .map(member => (
                      <li key={member.user_id} className="flex items-center p-2 sm:p-3 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="relative mr-2 sm:mr-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-sm">
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                          </div>
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                              {member.username}
                            </p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                              {member.is_admin && (
                            <span title="Administrador" className="bg-blue-100 text-blue-700 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                                  Admin
                                </span>
                              )}
                              {member.user_id === user?.id && (
                            <span className="bg-green-100 text-green-700 text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                                  Você
                                </span>
                              )}
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
          
          {/* Feed de Conquistas (substituindo o ranking) */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-pink-500 to-red-500">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2.5" />
                <span className="hidden sm:inline">Feed de Atividades</span>
                <span className="sm:hidden">Atividades</span>
              </h3>
            </div>
            <div className="p-2 sm:p-3">
              <AchievementsFeed groupId={groupId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
