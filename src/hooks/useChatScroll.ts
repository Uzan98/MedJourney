import { useEffect, useRef } from 'react';

interface UseChatScrollProps {
  messages: any[];
  dependencies?: any[];
  smooth?: boolean;
  bottomOffset?: number;
}

/**
 * Hook para rolagem automática de mensagens em chats
 * Rola para a última mensagem quando novas mensagens são adicionadas
 */
export const useChatScroll = ({
  messages,
  dependencies = [],
  smooth = true,
  bottomOffset = 0,
}: UseChatScrollProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  // Verifica se o usuário está próximo do final da rolagem
  const isUserNearBottom = () => {
    const container = containerRef.current;
    if (!container) return false;

    const threshold = 100 + bottomOffset; // Distância do final que considera "próximo"
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  // Detecta scroll do usuário para decidir se aplica o auto-scroll
  useEffect(() => {
    const handleScroll = () => {
      shouldScrollRef.current = isUserNearBottom();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Rola para baixo quando mensagens são alteradas
  useEffect(() => {
    const scrollToBottom = () => {
      const container = containerRef.current;
      if (container && shouldScrollRef.current) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    };

    scrollToBottom();
  }, [messages, smooth, ...dependencies]);

  return containerRef;
};

export default useChatScroll; 