import React, { useState, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Send as SendIcon, Smile } from 'lucide-react';

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
  const [isFocused, setIsFocused] = useState(false);

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
    <div className={cn(
      "flex items-center w-full p-3 bg-white border-t border-gray-100",
      className
    )}>
      <div className={cn(
        "flex items-center flex-1 px-3 py-2 rounded-full transition-all",
        isFocused ? "ring-2 ring-blue-200 border-blue-300" : "border border-gray-200 hover:border-gray-300",
        disabled ? "bg-gray-50" : "bg-white"
      )}>
        <Smile 
          className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" 
          onClick={() => document.getElementById('chatInput')?.focus()}
        />
        
        <input
          id="chatInput"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent border-none focus:outline-none text-sm py-1"
          aria-label="Mensagem de chat"
        />
        
        <button
          onClick={handleSendMessage}
          disabled={!message.trim() || disabled}
          className={cn(
            "p-1.5 rounded-full flex items-center justify-center ml-1 transition-colors",
            message.trim() && !disabled
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
          aria-label="Enviar mensagem"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatInput; 
