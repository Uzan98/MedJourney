'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Clock, Send, LogOut, X, MessageSquare, User, Award, Info, Copy, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { StudyGroup, StudyGroupMember, StudyGroupService } from '@/services/study-group.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StudyTimeDisplay from '@/components/StudyTimeDisplay';
import GroupStudyTimer from '@/components/estudos/GroupStudyTimer';
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
  const [joinTime, setJoinTime] = useState<string>('');
  const [isLeaving, setIsLeaving] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
      
      // Verificar se o usuário está ativo no grupo e obter o tempo de entrada
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: memberData } = await supabase
          .from('study_group_members')
          .select('is_active, joined_at')
          .eq('user_id', userData.user.id)
          .eq('group_id', groupId)
          .single();
        
        if (memberData) {
          setIsActive(memberData.is_active);
          if (memberData.is_active && memberData.joined_at) {
            setJoinTime(memberData.joined_at);
          }
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
      setJoinTime('');
      
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
        toast.success('Você saiu da sala. Seu tempo de estudo foi registrado.');
        
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
  
  // Função para entrar na sala (começar a contar tempo)
  const handleEnterRoom = async () => {
    try {
      const success = await StudyGroupService.enterGroup(groupId);
      if (success) {
        // Buscar o horário de entrada atualizado
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data: memberData } = await supabase
            .from('study_group_members')
            .select('joined_at')
            .eq('user_id', userData.user.id)
            .eq('group_id', groupId)
            .single();
          
          if (memberData?.joined_at) {
            setJoinTime(memberData.joined_at);
            setIsActive(true);
            toast.success('Você entrou na sala. Seu tempo de estudo está sendo contabilizado.');
            
            // Atualizar a lista de membros
            await refreshMembersList();
          }
        }
      } else {
        toast.error('Não foi possível entrar na sala');
      }
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      toast.error('Ocorreu um erro ao entrar na sala');
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Carregando grupo de estudos...</p>
      </div>
    );
  }
  
  if (!group || !isMember) {
    return null; // Redirecionado pelo useEffect
  }
  
  const currentUserMember = members.find(m => m.user_id === user?.id);
  const isAdmin = currentUserMember?.is_admin;
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 -z-10 rounded-xl"></div>
      {/* Header */}
      <div className="relative mb-8">
        {/* Background decorativo */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <Link 
              href="/comunidade/grupos-estudos" 
              className="mr-4 p-2.5 rounded-full bg-blue-50 hover:bg-blue-100 transition-all"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5 text-blue-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">{group.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  group.is_private 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {group.is_private ? 'Grupo privado' : 'Grupo público'}
                </span>
                <span className="flex items-center bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {members.filter(m => m.is_active).length} online
                </span>
                <div className="flex items-center bg-gray-100 px-2 py-0.5 rounded-full">
                  <span className="text-xs mr-1">Código:</span>
                  <span className="font-mono font-medium text-xs">{group.access_code}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isActive && joinTime && (
              <GroupStudyTimer 
                startTime={joinTime} 
                isActive={isActive} 
                resetOnMount={true}
              />
            )}
            
            {isActive && (
              <Button 
                variant="outline" 
                className="border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                onClick={handleExitRoom}
                disabled={isLeaving}
              >
                <X className="h-4 w-4 mr-1" />
                {isLeaving ? 'Saindo...' : 'Parar de estudar'}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleLeaveGroup}
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sair do grupo
            </Button>
          </div>
        </div>
      </div>
      
      {/* Conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel principal (chat e informações) */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="w-full mb-4 p-1 bg-gray-100 rounded-xl">
              <TabsTrigger value="chat" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="info" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Info className="h-4 w-4 mr-2" />
                Informações
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="mt-0">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                {/* Área de mensagens */}
                <div 
                  ref={containerRef}
                  className="h-[60vh] overflow-y-auto p-5 bg-gradient-to-b from-gray-50 to-white"
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                        <MessageSquare className="h-7 w-7 text-blue-400" />
                      </div>
                      <p className="text-gray-600 font-medium mb-1">Nenhuma mensagem ainda</p>
                      <p className="text-gray-500 text-sm">Seja o primeiro a enviar uma mensagem!</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`mb-4 ${msg.is_system_message ? 'text-center' : ''}`}
                      >
                        {msg.is_system_message ? (
                          <div className="bg-gray-100 text-gray-600 text-xs py-1.5 px-3 rounded-full inline-block">
                            {msg.message}
                          </div>
                        ) : (
                          <div className={`flex ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`
                              max-w-[80%] rounded-lg p-3.5 shadow-sm
                              ${msg.user_id === user?.id 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-white border border-gray-200 text-gray-800'}
                            `}>
                              {msg.user_id !== user?.id && (
                                <p className="font-medium text-xs mb-1.5 flex items-center">
                                  {msg.username}
                                  {members.find(m => m.user_id === msg.user_id)?.is_admin && (
                                    <span className="ml-1.5 bg-blue-200 text-blue-700 text-[10px] px-1 py-0.5 rounded">
                                      Admin
                                    </span>
                                  )}
                                </p>
                              )}
                              <p className="text-sm leading-relaxed">{msg.message}</p>
                              <p className="text-xs opacity-70 text-right mt-1.5">
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
                <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50">
                  <div className="flex">
                    <Input
                      type="text"
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 bg-white border-gray-200 focus:ring-blue-500 rounded-lg"
                      disabled={sendingMessage}
                    />
                    <Button 
                      type="submit" 
                      disabled={sendingMessage || !newMessage.trim()} 
                      className="ml-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>
            
            <TabsContent value="info" className="mt-0">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Sobre este grupo</h3>
                  <p className="text-gray-600">
                    {group.description || 'Grupo de estudos personalizado para colaboração e aprendizado.'}
                  </p>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {group.discipline_id && (
                    <div className="mb-6">
                      <h4 className="font-medium text-sm text-gray-500 mb-1">Disciplina</h4>
                      <p className="text-gray-800">{`Disciplina ${group.discipline_id}`}</p>
                    </div>
                  )}
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <h4 className="font-medium text-sm text-gray-500 mb-1.5 flex items-center">
                      <Clock className="h-4 w-4 mr-1.5 text-blue-500" />
                      Criado em
                    </h4>
                    <p className="text-gray-800 font-medium">
                      {new Date(group.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 md:col-span-2">
                    <h4 className="font-medium text-sm text-gray-500 mb-1.5 flex items-center">
                      <Shield className="h-4 w-4 mr-1.5 text-blue-500" />
                      Código de acesso
                    </h4>
                    <div className="flex items-center">
                      <span className="bg-gray-100 px-4 py-2 rounded-lg font-mono text-gray-800 tracking-wider">
                        {group.access_code}
                      </span>
                      <Button 
                        variant="ghost" 
                        className="ml-2 h-9 w-9 p-0 rounded-full hover:bg-blue-50"
                        onClick={() => {
                          navigator.clipboard.writeText(group.access_code);
                          toast.success('Código copiado!');
                        }}
                      >
                        <Copy className="h-4 w-4 text-blue-600" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Compartilhe este código com colegas para que eles possam entrar no grupo.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Painel lateral (membros e ranking) */}
        <div className="space-y-6">
          {/* Membros online */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-5 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Users className="h-5 w-5 mr-2.5" />
                Membros Online ({members.filter(m => m.is_active === true).length}/{members.length})
              </h3>
            </div>
            <div className="p-5 max-h-[35vh] overflow-y-auto">
              {members.filter(m => m.is_active === true).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium mb-1">Nenhum membro online</p>
                  <p className="text-gray-400 text-sm">Convide colegas para estudarem juntos</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {members
                    .filter(m => {
                      // Verificar explicitamente se is_active é true
                      const isActive = m.is_active === true;
                      if (!isActive) {
                        console.log(`Membro ${m.username} (${m.user_id}) está offline, não exibindo`);
                      }
                      return isActive;
                    })
                    .map(member => (
                      <li key={member.user_id} className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mr-3 shadow-sm">
                          <User className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-800">
                              {member.username}
                            </p>
                            <div className="flex ml-2">
                              {member.is_admin && (
                                <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                  Admin
                                </span>
                              )}
                              {member.user_id === user?.id && (
                                <span className="ml-1.5 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                  Você
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
          
          {/* Ranking */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Award className="h-5 w-5 mr-2.5" />
                Top Estudantes
              </h3>
            </div>
            <div className="p-5">
              {topMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mb-3">
                    <Award className="h-6 w-6 text-amber-300" />
                  </div>
                  <p className="text-gray-500 font-medium mb-1">Sem dados de estudo</p>
                  <p className="text-gray-400 text-sm">Comece a estudar para aparecer no ranking</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {topMembers.map((member, index) => (
                    <li key={member.user_id} className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 shadow-sm ${
                        index === 0 
                          ? 'bg-gradient-to-br from-amber-300 to-amber-400 text-amber-800' 
                          : index === 1 
                            ? 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700'
                            : index === 2 
                              ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-amber-100'
                              : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
                      }`}>
                        <span className="text-sm font-bold">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-800">
                            {member.username}
                          </p>
                          {member.user_id === user?.id && (
                            <span className="ml-1.5 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                              Você
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
                          <div 
                            className="bg-amber-500 h-1.5 rounded-full" 
                            style={{ 
                              width: `${Math.min(100, (member.total_study_time / (topMembers[0]?.total_study_time || 1)) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-600 ml-2">
                        <StudyTimeDisplay seconds={member.total_study_time} />
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Atualizado em tempo real</span>
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Tempo de estudo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
