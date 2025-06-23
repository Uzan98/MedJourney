import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

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
  const formattedTime = format(new Date(createdAt), 'HH:mm', { locale: pt });
  
  // Verificar se a mensagem foi enviada hoje
  const isToday = () => {
    const today = new Date();
    const messageDate = new Date(createdAt);
    return (
      today.getDate() === messageDate.getDate() &&
      today.getMonth() === messageDate.getMonth() &&
      today.getFullYear() === messageDate.getFullYear()
    );
  };
  
  // Formatar data completa se não for hoje
  const fullDate = !isToday() ? format(new Date(createdAt), 'dd/MM/yyyy', { locale: pt }) : null;

  // Gerar uma cor baseada no nome do usuário (para avatar)
  const getColorFromName = (name: string) => {
    const colors = [
      'bg-blue-500 text-white',
      'bg-green-500 text-white',
      'bg-indigo-500 text-white', 
      'bg-purple-500 text-white', 
      'bg-pink-500 text-white',
      'bg-amber-500 text-white',
      'bg-cyan-500 text-white',
      'bg-red-500 text-white',
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
    if (!name) return '??';
    return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div 
      className={cn(
        "flex w-full my-1.5 px-2", 
        isCurrentUser ? "justify-end" : "justify-start"
      )}
    >
      {!isCurrentUser && (
        <div className="flex-shrink-0 mr-2 mt-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${getColorFromName(username)}`}>
            {getInitials(username)}
          </div>
        </div>
      )}
      
      <div 
        className={cn(
          "max-w-[80%] flex flex-col",
          isCurrentUser ? "items-end" : "items-start"
        )}
      >
        <div className="flex items-baseline mb-0.5 space-x-1.5">
          {!isCurrentUser && (
            <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
              {username}
            </span>
          )}
          <span className="text-[10px] text-gray-400 whitespace-nowrap">
            {fullDate ? `${fullDate} ${formattedTime}` : formattedTime}
          </span>
        </div>
        
        <div 
          className={cn(
            "px-3 py-2 rounded-2xl text-sm break-words",
            isCurrentUser 
              ? "bg-blue-500 text-white rounded-br-none shadow-sm" 
              : "bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200"
          )}
        >
          {content}
        </div>
      </div>
      
      {isCurrentUser && (
        <div className="flex-shrink-0 ml-2 mt-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-blue-500 text-white">
            {getInitials(username)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage; 
