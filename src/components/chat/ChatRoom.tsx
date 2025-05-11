import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChatMessage } from './ChatMessage';
import ChatInput from './ChatInput';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import useChatScroll from '@/hooks/useChatScroll';

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
  
  // Usar o hook de rolagem automática
  const chatContainerRef = useChatScroll({
    messages,
    dependencies: [loading],
    smooth: true,
    bottomOffset: 100
  });

  // Função para carregar mensagens anteriores
  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
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
    loadMessages();

    // Inscrição para novas mensagens
    const subscription = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(currentMessages => [...currentMessages, newMessage]);
      })
      .subscribe();

    return () => {
      // Cancelar inscrição ao desmontar
      supabase.removeChannel(subscription);
    };
  }, [roomId]);

  // Enviar nova mensagem
  const handleSendMessage = async (content: string) => {
    if (!user) return;

    try {
      const newMessage = {
        id: uuidv4(),
        content,
        user_id: user.id,
        username: user.user_metadata?.name || user.email || 'Usuário',
        room_id: roomId,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('chat_messages')
        .insert([newMessage]);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError('Não foi possível enviar a mensagem. Tente novamente.');
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {showHeader && (
        <div className="p-3 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h3 className="text-lg font-semibold">Chat da Sala</h3>
        </div>
      )}

      {/* Mensagens */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-500">
            Nenhuma mensagem ainda. Seja o primeiro a enviar!
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              id={message.id}
              content={message.content}
              username={message.username}
              createdAt={message.created_at}
              isCurrentUser={message.user_id === user?.id}
            />
          ))
        )}
      </div>

      {/* Exibir erro se houver */}
      {error && (
        <div className="p-2 bg-red-100 text-red-800 text-sm text-center">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Input para enviar mensagem */}
      <ChatInput 
        onSendMessage={handleSendMessage} 
        disabled={!user}
        placeholder={user ? "Digite sua mensagem..." : "Faça login para enviar mensagens"}
      />
    </div>
  );
};

export default ChatRoom; 