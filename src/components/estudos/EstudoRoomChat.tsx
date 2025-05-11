import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ChatRoom from '../chat/ChatRoom';
import { ArrowLeft, Maximize2, Minimize2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EstudoRoomChatProps {
  roomId: string;
  className?: string;
}

export const EstudoRoomChat: React.FC<EstudoRoomChatProps> = ({ 
  roomId,
  className = ''
}) => {
  const { user } = useAuth();
  const [chatVisible, setChatVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const toggleChat = () => setChatVisible(prev => !prev);
  const toggleExpanded = () => setExpanded(prev => !prev);
  
  return (
    <div 
      className={cn(
        "flex flex-col",
        expanded ? "w-[400px] h-[500px]" : "w-[350px] h-[400px]",
        !chatVisible && "h-auto w-auto",
        className
      )}
    >
      {!chatVisible ? (
        <button
          onClick={toggleChat}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg"
          aria-label="Abrir chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      ) : (
        <div className="bg-white rounded-xl shadow-md flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white rounded-t-xl flex items-center justify-between flex-shrink-0">
            <h3 className="font-semibold">Chat da Sala</h3>
            <div className="flex space-x-2">
              <button 
                onClick={toggleExpanded}
                className="p-1 hover:bg-blue-600 rounded text-white"
                aria-label={expanded ? "Minimizar" : "Expandir"}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button 
                onClick={toggleChat}
                className="p-1 hover:bg-blue-600 rounded text-white"
                aria-label="Fechar chat"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Chat Container */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatRoom 
              roomId={roomId} 
              showHeader={false} 
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EstudoRoomChat; 