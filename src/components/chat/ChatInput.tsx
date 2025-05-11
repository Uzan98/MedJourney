import React, { useState, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Send as SendIcon } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Digite sua mensagem...',
  className
}) => {
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn("flex items-center w-full border-t p-2", className)}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 mr-2"
        aria-label="Mensagem de chat"
      />
      <button
        onClick={handleSendMessage}
        disabled={!message.trim() || disabled}
        className={cn(
          "p-2 rounded-full flex items-center justify-center",
          message.trim() && !disabled
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        )}
        aria-label="Enviar mensagem"
      >
        <SendIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ChatInput; 