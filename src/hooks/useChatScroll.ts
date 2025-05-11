import { useEffect, useRef } from 'react';

interface UseChatScrollProps {
  messages: any[];
  dependencies?: any[];
  smooth?: boolean;
  bottomOffset?: number;
  shouldAutoScroll?: boolean;
}

/**
 * Hook para gerenciar o comportamento de rolagem automática em chats.
 * Quando novas mensagens são adicionadas, o chat rola para baixo somente se:
 * 1. shouldAutoScroll estiver ativado (agora desativado por padrão)
 * 2. O usuário já estava próximo do final do chat
 */
export const useChatScroll = ({
  messages,
  dependencies = [],
  smooth = true,
  bottomOffset = 100,
  shouldAutoScroll = false // Agora desativado por padrão
}: UseChatScrollProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  /**
   * Verifica se o usuário está próximo do fim do container
   */
  const isUserNearBottom = () => {
    const container = containerRef.current;
    if (!container) return true;

    const threshold = bottomOffset;
    const position = container.scrollHeight - container.scrollTop - container.clientHeight;
    return position < threshold;
  };

  /**
   * Força a rolagem para o final do container
   */
  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    if (!containerRef.current) return;

    // Método 1: Usando scrollIntoView no elemento de referência no final das mensagens
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({
        behavior,
        block: 'end',
      });
      return;
    }

    // Método 2: Definindo scrollTop diretamente (fallback)
    const { scrollHeight, clientHeight } = containerRef.current;
    containerRef.current.scrollTop = scrollHeight - clientHeight;
  };

  // Efeito para inicializar a verificação do estado do scroll
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Inicialmente, assumimos que o usuário quer ver as mensagens mais recentes
    wasAtBottomRef.current = true;
    
    const handleScroll = () => {
      if (!containerRef.current) return;
      // Atualiza o estado quando o usuário rola
      wasAtBottomRef.current = isUserNearBottom();
    };
    
    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Efeito para rolar ao fundo quando novas mensagens chegam
  useEffect(() => {
    if (!shouldAutoScroll) return;
    
    // Se não houver mensagens, não é necessário rolar
    if (messages.length === 0) return;
    
    const scrollIfNeeded = () => {
      // Rola para baixo somente se o usuário já estava próximo do fim
      if (wasAtBottomRef.current) {
        scrollToBottom(smooth ? 'smooth' : 'auto');
      }
    };

    // Agenda a rolagem para depois do próximo ciclo de renderização
    setTimeout(scrollIfNeeded, 100);
    
  }, [messages, smooth, shouldAutoScroll, ...dependencies]);

  return { containerRef, endOfMessagesRef, scrollToBottom };
};

export default useChatScroll; 