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
}

export default function StudyTimer({ 
  startTime, 
  initialSeconds = 0, 
  className = '', 
  showIcon = false,
  compact = false,
  active = true
}: StudyTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(initialSeconds);
  const startTimeRef = useRef<number>(new Date(startTime).getTime());
  const animationFrameId = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);

  // Função para calcular o tempo decorrido com precisão
  const calculateElapsedTime = (): number => {
    return Math.floor((Date.now() - startTimeRef.current) / 1000) + initialSeconds;
  };
  
  useEffect(() => {
    // Inicializa o tempo decorrido
    setElapsedTime(calculateElapsedTime());
    
    if (!active) return;

    // Função para atualizar o timer
    const updateTimer = () => {
      if (!active) return;
      
      if (isVisibleRef.current) {
        setElapsedTime(calculateElapsedTime());
      }
      
      animationFrameId.current = requestAnimationFrame(updateTimer);
    };
    
    // Função para tratar mudanças de visibilidade da página
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      
      // Recalcula o tempo quando a página fica visível novamente
      if (isVisibleRef.current) {
        setElapsedTime(calculateElapsedTime());
      }
    };
    
    // Adiciona os event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Inicia a animação
    animationFrameId.current = requestAnimationFrame(updateTimer);
    
    // Limpa recursos ao desmontar
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [startTime, initialSeconds, active]);
  
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