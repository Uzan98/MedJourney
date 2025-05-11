import React from 'react';
import { cn } from '@/lib/utils';

export interface ChatMessageProps {
  id: string;
  content: string;
  username: string;
  createdAt: string;
  isCurrentUser: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  content,
  username,
  createdAt,
  isCurrentUser
}) => {
  // Formatar data/hora para exibição
  const formattedTime = new Date(createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Gerar uma cor baseada no nome do usuário (para avatar)
  const getColorFromName = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-red-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-indigo-500', 'bg-teal-500'
    ];
    
    // Gerar um índice consistente baseado no nome
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Converter para um índice positivo no range do array
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Obter as iniciais do nome de usuário
  const getInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div 
      className={cn(
        "flex w-full mb-4", 
        isCurrentUser ? "justify-end" : "justify-start"
      )}
    >
      {!isCurrentUser && (
        <div className="flex-shrink-0 mr-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getColorFromName(username)}`}>
            {getInitials(username)}
          </div>
        </div>
      )}
      
      <div 
        className={cn(
          "max-w-[75%] flex flex-col",
          isCurrentUser ? "items-end" : "items-start"
        )}
      >
        <div className="flex items-center mb-1">
          {!isCurrentUser && (
            <span className="text-sm font-semibold mr-2">{username}</span>
          )}
          <span className="text-xs text-gray-500">{formattedTime}</span>
        </div>
        
        <div 
          className={cn(
            "px-4 py-2 rounded-xl text-sm break-words",
            isCurrentUser 
              ? "bg-blue-600 text-white rounded-tr-none" 
              : "bg-gray-200 text-gray-800 rounded-tl-none"
          )}
        >
          {content}
        </div>
      </div>
      
      {isCurrentUser && (
        <div className="flex-shrink-0 ml-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white bg-blue-600`}>
            {getInitials(username)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage; 