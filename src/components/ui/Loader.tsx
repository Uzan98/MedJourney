"use client";

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type LoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type LoaderVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
type LoaderType = 'spinner' | 'dots' | 'pulse';

interface MessageConfig {
  message: string;
  delay?: number;
}

interface IntelligentLoaderProps {
  type?: LoaderType;
  size?: LoaderSize;
  variant?: LoaderVariant;
  message?: string;
  className?: string;
  fullScreen?: boolean;
  sequential?: boolean;
  messages?: MessageConfig[] | string[];
  showIcon?: boolean;
  iconPosition?: 'left' | 'top';
  minDuration?: number;
}

export const IntelligentLoader: React.FC<IntelligentLoaderProps> = ({
  type = 'spinner',
  size = 'md',
  variant = 'primary',
  message,
  className,
  fullScreen = false,
  sequential = false,
  messages = [],
  showIcon = true,
  iconPosition = 'left',
  minDuration = 0
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedMessage, setDisplayedMessage] = useState<string | undefined>(message);
  const [isVisible, setIsVisible] = useState(true);

  // Função para obter mensagem e delay
  const getMessageConfig = (item: string | MessageConfig): MessageConfig => {
    if (typeof item === 'string') {
      return { message: item, delay: 2000 }; // Delay padrão
    }
    return { ...item, delay: item.delay || 2000 };
  };

  // Processar array de mensagens
  const processedMessages: MessageConfig[] = messages.map(m => getMessageConfig(m as any));

  // Alternar entre mensagens sequenciais
  useEffect(() => {
    if (!sequential || processedMessages.length === 0) return;

    // Ajustar mensagem inicial
    if (!displayedMessage && processedMessages.length > 0) {
      setDisplayedMessage(processedMessages[0].message);
    }

    // Configurar timer para alternar mensagens
    let timer: NodeJS.Timeout;
    if (processedMessages.length > 1) {
      timer = setInterval(() => {
        setCurrentMessageIndex(prev => {
          const nextIndex = (prev + 1) % processedMessages.length;
          setDisplayedMessage(processedMessages[nextIndex].message);
          return nextIndex;
        });
      }, processedMessages[currentMessageIndex].delay);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sequential, processedMessages, currentMessageIndex]);

  // Duração mínima do loader
  useEffect(() => {
    if (minDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, minDuration);
      return () => clearTimeout(timer);
    }
  }, [minDuration]);

  // Calcular tamanho do loader
  const sizeClass = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }[size];

  // Calcular cor do loader
  const variantClass = {
    default: 'text-gray-500',
    primary: 'text-blue-600',
    secondary: 'text-purple-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600'
  }[variant];

  // Renderizar loader correto
  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return (
          <div className={cn('flex space-x-1', sizeClass)}>
            <div className={cn(`rounded-full animate-bounce delay-0`, variantClass)} style={{width: '25%', height: '25%'}}></div>
            <div className={cn(`rounded-full animate-bounce delay-150`, variantClass)} style={{width: '25%', height: '25%'}}></div>
            <div className={cn(`rounded-full animate-bounce delay-300`, variantClass)} style={{width: '25%', height: '25%'}}></div>
          </div>
        );
      case 'pulse':
        return (
          <div className={cn(`rounded-full animate-pulse`, sizeClass, variantClass)}></div>
        );
      case 'spinner':
      default:
        return <Loader2 className={cn(sizeClass, variantClass, "animate-spin")} />;
    }
  };

  if (!isVisible) return null;

  const content = (
    <div className={cn(
      'flex items-center gap-3',
      iconPosition === 'top' && 'flex-col',
      className
    )}>
      {showIcon && renderLoader()}
      {(displayedMessage || message) && (
        <div className={cn('text-sm font-medium', variantClass)}>
          {displayedMessage || message}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/75 dark:bg-gray-900/75 z-50">
        {content}
      </div>
    );
  }

  return content;
};

// Versão específica para o dashboard
export const PageLoader: React.FC<{message?: string}> = ({ message = "Carregando..." }) => (
  <div className="flex items-center justify-center h-96">
    <div className="text-center">
      <IntelligentLoader 
        type="spinner" 
        size="lg" 
        variant="primary" 
        iconPosition="top"
        message={message} 
      />
    </div>
  </div>
);

// Versão pequena para componentes
export const ComponentLoader: React.FC<{message?: string}> = ({ message }) => (
  <div className="flex items-center justify-center p-4">
    <IntelligentLoader 
      type="spinner" 
      size="sm" 
      message={message} 
    />
  </div>
);

// Versão com mensagens para carregamentos mais longos
export const SmartLoader: React.FC<{context?: 'estudos' | 'simulados' | 'plano' | 'default'}> = ({ 
  context = 'default' 
}) => {
  // Mensagens personalizadas para cada contexto
  const contextMessages = {
    estudos: [
      { message: "Carregando sessões de estudo...", delay: 1500 },
      { message: "Buscando suas disciplinas...", delay: 1500 },
      { message: "Preparando seu ambiente de estudos...", delay: 2000 },
      { message: "Quase lá! Organizando sua agenda...", delay: 1500 }
    ],
    simulados: [
      { message: "Carregando seus simulados...", delay: 1500 },
      { message: "Buscando questões recentes...", delay: 1500 },
      { message: "Calculando seu desempenho...", delay: 2000 },
      { message: "Quase pronto! Preparando estatísticas...", delay: 1500 }
    ],
    plano: [
      { message: "Carregando seu plano de estudos...", delay: 1500 },
      { message: "Verificando progresso por disciplina...", delay: 1800 },
      { message: "Calculando horas de estudo...", delay: 1500 },
      { message: "Quase lá! Organizando cronograma...", delay: 2000 }
    ],
    default: [
      { message: "Carregando...", delay: 1500 },
      { message: "Quase lá...", delay: 1500 },
      { message: "Preparando tudo para você...", delay: 1500 }
    ]
  };

  return (
    <div className="flex items-center justify-center h-80">
      <div className="text-center">
        <IntelligentLoader 
          type="spinner" 
          size="lg" 
          variant="primary" 
          iconPosition="top"
          sequential={true}
          messages={contextMessages[context]}
        />
      </div>
    </div>
  );
}; 
