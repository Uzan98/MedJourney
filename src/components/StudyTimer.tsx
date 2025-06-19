'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface StudyTimerProps {
  startTime: string;
  initialSeconds?: number;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
  active?: boolean;
  resetOnMount?: boolean;
}

export default function StudyTimer({ 
  startTime, 
  initialSeconds = 0, 
  className = '', 
  showIcon = false,
  compact = false,
  active = true,
  resetOnMount = false
}: StudyTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(initialSeconds);
  const startTimeRef = useRef<number>(resetOnMount ? Date.now() : new Date(startTime).getTime());
  const animationFrameId = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const isMountedRef = useRef<boolean>(false);

  // Função para calcular o tempo decorrido com precisão
  const calculateElapsedTime = (): number => {
    if (resetOnMount && !isMountedRef.current) {
      // Se estamos resetando no mount e ainda não foi montado, retorna 0
      return 0;
    }
    return Math.floor((Date.now() - startTimeRef.current) / 1000) + initialSeconds;
  };
  
  useEffect(() => {
    // Marcar como montado
    isMountedRef.current = true;
    
    // Se resetOnMount for true, definir o startTime como agora
    if (resetOnMount) {
      startTimeRef.current = Date.now();
      setElapsedTime(0);
    } else {
      // Inicializa o tempo decorrido
      setElapsedTime(calculateElapsedTime());
    }
    
    if (!active) {
      console.log('Timer inativo, não iniciando contagem');
      return;
    }

    // Função para atualizar o timer
    const updateTimer = () => {
      if (!active) {
        console.log('Timer desativado, parando atualização');
        return;
      }
      
      if (isVisibleRef.current) {
        setElapsedTime(calculateElapsedTime());
      }
      
      animationFrameId.current = requestAnimationFrame(updateTimer);
    };
    
    // Função para tratar mudanças de visibilidade da página
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      
      // Recalcula o tempo quando a página fica visível novamente
      if (isVisibleRef.current && active) {
        setElapsedTime(calculateElapsedTime());
      }
    };
    
    // Adiciona os event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Inicia a animação
    animationFrameId.current = requestAnimationFrame(updateTimer);
    
    // Limpa recursos ao desmontar ou quando active mudar
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [startTime, initialSeconds, active, resetOnMount]);
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (compact) {
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      } else {
        return `${secs}s`;
      }
    } else {
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    } else {
      return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
      }
    }
  };
  
  return (
    <div className={`flex items-center ${className}`}>
      {showIcon && (
        <Clock className="w-3.5 h-3.5 mr-1 text-blue-500 flex-shrink-0" />
      )}
      <span className={compact ? "" : "font-mono"}>{formatTime(elapsedTime)}</span>
    </div>
  );
} 