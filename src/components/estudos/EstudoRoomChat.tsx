import React, { useState } from 'react';
import { MessageCircle, X, Minimize, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';
import ChatRoom from '../chat/ChatRoom';
import { useAuth } from '@/contexts/AuthContext';

interface EstudoRoomChatProps {
  roomId: string;
  className?: string;
}

export const EstudoRoomChat: React.FC<EstudoRoomChatProps> = ({ 
  roomId,
  className
}) => {
  const { user } = useAuth();
  const [chatVisible, setChatVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!user) {
    return null; // Não mostra nada se o usuário não estiver logado
  }

  const toggleChat = () => setChatVisible(prev => !prev);
  const toggleExpanded = () => setExpanded(prev => !prev);

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col",
        expanded ? "w-[400px] h-[500px]" : "w-[350px] h-[400px]",
        !chatVisible && "h-auto w-auto",
        className
      )}
    >
      {!chatVisible ? (
        <button
          onClick={toggleChat}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
          aria-label="Abrir chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      ) : (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg border overflow-hidden">
          <div className="flex justify-between items-center p-2 bg-blue-600 text-white">
            <h3 className="text-sm font-medium">Chat da Sala #{roomId}</h3>
            <div className="flex gap-2">
              <button 
                onClick={toggleExpanded} 
                className="p-1 hover:bg-blue-700 rounded"
                aria-label={expanded ? "Minimizar" : "Expandir"}
              >
                {expanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
              <button 
                onClick={toggleChat}
                className="p-1 hover:bg-blue-700 rounded"
                aria-label="Fechar chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <ChatRoom roomId={roomId} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EstudoRoomChat; 