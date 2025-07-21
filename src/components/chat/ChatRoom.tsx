import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from './ChatMessage';
import ChatInput from './ChatInput';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { StudyRoomService } from '@/services/study-room.service';
import { MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useChatScroll } from '@/hooks/useChatScroll';

interface ChatRoomProps {
  roomId: string;
  className?: string;
  showHeader?: boolean;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  username: string;
  created_at: string;
  room_id: string;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ 
  roomId, 
  className,
  showHeader = true
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedRoomId, setResolvedRoomId] = useState<string>(roomId);
  const [initialized, setInitialized] = useState(false);
  
  // Conjunto para rastrear IDs de mensagens já adicionadas
  const messageIdsRef = useRef(new Set<string>());
  
  // Use nosso hook melhorado de scroll para chat
  const { containerRef, endOfMessagesRef, scrollToBottom } = useChatScroll({
    messages,
    dependencies: [loading, initialized, error],
    smooth: true,
    bottomOffset: 150,
    shouldAutoScroll: true, // Habilitar scroll automático se usuário estiver próximo do fim
  });
  
  // Resolver o ID da sala na inicialização
  useEffect(() => {
    async function resolveRoom() {
      try {
        // Usar o método da classe StudyRoomService para resolver IDs legados
        const rooms = await StudyRoomService.getStudyRooms();
        const roomData = rooms.find(r => r.id === roomId);
        
        if (roomData) {
          // Se encontrarmos a sala diretamente, o ID já está correto
          setResolvedRoomId(roomId);
        } else {
          // Tentamos encontrar pelo nome nas salas disponíveis
          const nameToLegacyId: Record<string, string> = {
            'cardiologia': 'Cardiologia Avançada',
            'neurologia': 'Neurologia e Neurociência',
            'cirurgia': 'Técnicas Cirúrgicas',
            'pediatria': 'Pediatria Geral',
            'residencia': 'Preparação para Residência'
          };
          
          const possibleName = nameToLegacyId[roomId];
          if (possibleName) {
            const matchedRoom = rooms.find(r => r.name === possibleName);
            if (matchedRoom) {
              console.log(`Chat: ID legado '${roomId}' resolvido para UUID '${matchedRoom.id}'`);
              setResolvedRoomId(matchedRoom.id);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao resolver ID da sala:', err);
      } finally {
        setInitialized(true);
      }
    }
    
    resolveRoom();
  }, [roomId]);
  
  // Função para adicionar mensagem evitando duplicatas
  const addMessageSafely = (newMessage: Message) => {
    // Se a mensagem já foi adicionada, não adicionar novamente
    if (messageIdsRef.current.has(newMessage.id)) {
      return false;
    }
    
    // Adicionar ID ao conjunto de mensagens rastreadas
    messageIdsRef.current.add(newMessage.id);
    
    // Adicionar a mensagem ao estado
    setMessages(currentMessages => [...currentMessages, newMessage]);
    return true;
  };
  
  // Função para carregar mensagens anteriores
  const loadMessages = async () => {
    if (!initialized) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', resolvedRoomId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      
      // Limpar o conjunto de IDs rastreados ao carregar novas mensagens
      messageIdsRef.current.clear();
      
      // Registrar todos os IDs das mensagens carregadas
      if (data) {
        data.forEach(msg => messageIdsRef.current.add(msg.id));
      }
      
      setMessages(data || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
      setError('Não foi possível carregar as mensagens anteriores.');
    } finally {
      setLoading(false);
    }
  };

  // Configura a inscrição para novas mensagens em tempo real
  useEffect(() => {
    if (!initialized) return;
    
    loadMessages();

    // Inscrição para novas mensagens
    const subscription = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `room_id=eq.${resolvedRoomId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        addMessageSafely(newMessage);
      })
      .subscribe();

    return () => {
      // Cancelar inscrição ao desmontar
      supabase.removeChannel(subscription);
    };
  }, [resolvedRoomId, initialized]);

  // Enviar nova mensagem
  const handleSendMessage = async (content: string) => {
    if (!user || !initialized) return;

    try {
      const newMessage = {
        id: uuidv4(),
        content,
        user_id: user.id,
        username: user.user_metadata?.name || user.email || 'Usuário',
        room_id: resolvedRoomId,
        created_at: new Date().toISOString()
      };

      // Adicionar temporariamente a mensagem localmente para feedback imediato
      addMessageSafely(newMessage);
      
      // Rolar para baixo sempre que o usuário enviar uma mensagem
      scrollToBottom('smooth');
      
      // Enviar para o banco
      const { error } = await supabase
        .from('chat_messages')
        .insert([newMessage]);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      // Talvez mostrar um toast de erro aqui
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full",
      className
    )}>
      {showHeader && (
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <div className="flex items-center">
            <MessageCircle className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="font-medium text-gray-800">Chat da Sala</h3>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="flex-grow overflow-y-auto p-2 bg-white" 
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Carregando mensagens...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center px-6">
            <div className="bg-red-50 p-3 rounded-full mb-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-gray-700 mb-1">Erro ao carregar mensagens</p>
            <p className="text-sm text-gray-500">{error}</p>
            <button 
              onClick={loadMessages}
              className="mt-3 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
            >
              Tentar novamente
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center px-6">
            <div className="bg-blue-50 p-3 rounded-full mb-3">
              <MessageCircle className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-gray-700">Nenhuma mensagem ainda</p>
            <p className="text-sm text-gray-500 mt-1">Seja o primeiro a enviar uma mensagem!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                id={message.id}
                content={message.content}
                username={message.username}
                createdAt={message.created_at}
                isCurrentUser={user?.id === message.user_id}
              />
            ))}
            
            {/* Elemento para rolar até o final das mensagens */}
            <div ref={endOfMessagesRef} />
          </>
        )}
      </div>
      
      <ChatInput 
        onSendMessage={handleSendMessage} 
        disabled={!user || loading || !!error}
        placeholder={!user ? "Você precisa estar logado para enviar mensagens" : "Digite sua mensagem..."}
      />
    </div>
  );
};

export default ChatRoom; 
