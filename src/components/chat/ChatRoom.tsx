import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from './ChatMessage';
import ChatInput from './ChatInput';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { StudyRoomService } from '@/services/study-room.service';
import { MessageCircle } from 'lucide-react';
import Spinner from '@/components/Spinner';
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
    shouldAutoScroll: false,
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
      const wasAdded = addMessageSafely(newMessage);
      
      // Rolar para baixo apenas quando o usuário envia uma mensagem
      if (wasAdded) {
        // Usar um timeout mais curto e garantir que o evento não propague para a página
        setTimeout(() => {
          scrollToBottom('smooth');
          // Prevenir que o evento de scroll afete a página
          if (containerRef.current) {
            containerRef.current.addEventListener('scroll', (e) => {
              e.stopPropagation();
            }, { once: true });
          }
        }, 50);
      }
      
      // Enviar para o banco
      const { error } = await supabase
        .from('chat_messages')
        .insert([newMessage]);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError('Não foi possível enviar a mensagem. Tente novamente.');
    }
  };

  if (!initialized) {
    return (
      <div className={cn("chat-container", className)} style={{ height: '100%', minHeight: '400px' }}>
        <div className="chat-messages-area flex justify-center items-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("chat-container", className)} style={{ 
      height: '100%', 
      minHeight: showHeader ? '400px' : '100%', 
      display: 'flex', 
      flexDirection: 'column',
    }}>
      {showHeader && (
        <div className="p-3 border-b flex-shrink-0">
          <h2 className="font-semibold text-lg flex items-center">
            <MessageCircle className="mr-2 h-5 w-5" />
            Chat
          </h2>
        </div>
      )}

      {/* Messages Area - Scrollable */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-2 chat-messages-area"
        style={{ 
          minHeight: '0',
          padding: '1rem'
        }}
      >
        {loading || !initialized ? (
          <div className="flex justify-center items-center h-full">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-4">
            Erro ao carregar mensagens. Por favor, tente novamente.
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            Nenhuma mensagem ainda. Seja o primeiro a enviar!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                id={message.id}
                content={message.content}
                username={message.username}
                createdAt={message.created_at}
                isCurrentUser={message.user_id === user?.id}
              />
            ))}
            <div ref={endOfMessagesRef} />
          </div>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t p-3 flex-shrink-0 chat-input-area">
        <ChatInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
};

export default ChatRoom; 