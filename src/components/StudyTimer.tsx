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
  const startTimeRef = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const isMountedRef = useRef<boolean>(false);
  const lastUpdateRef = useRef<number>(Date.now());

  // Função para calcular o tempo decorrido com precisão
  const calculateElapsedTime = (): number => {
    if (!startTimeRef.current) {
      return 0;
    }
    
    const now = Date.now();
    return Math.floor((now - startTimeRef.current) / 1000) + initialSeconds;
  };
  
  // Efeito para inicializar o tempo de início
  useEffect(() => {
    // Definir o tempo de início
    if (resetOnMount) {
      console.log('Resetando timer no mount');
      startTimeRef.current = Date.now();
    } else {
      try {
        const parsedStartTime = new Date(startTime).getTime();
        if (isNaN(parsedStartTime)) {
          console.error('Data de início inválida:', startTime);
          startTimeRef.current = Date.now();
        } else {
          console.log('Usando startTime fornecido:', new Date(parsedStartTime).toISOString());
          startTimeRef.current = parsedStartTime;
        }
      } catch (error) {
        console.error('Erro ao converter startTime:', error);
        startTimeRef.current = Date.now();
      }
    }
    
    // Calcular tempo inicial
    const initialElapsed = calculateElapsedTime();
    console.log('Tempo inicial calculado:', initialElapsed, 'segundos');
    setElapsedTime(initialElapsed);
    
    // Marcar como montado
    isMountedRef.current = true;
  }, [startTime, resetOnMount]);
  
  // Efeito para gerenciar o timer
  useEffect(() => {
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
      
      const now = Date.now();
      
      // Atualizar apenas se o tempo desde a última atualização for significativo
      // ou se a página acabou de ficar visível
      if (now - lastUpdateRef.current >= 1000 || 
          (isVisibleRef.current && document.visibilityState === 'visible')) {
        const newElapsedTime = calculateElapsedTime();
        setElapsedTime(newElapsedTime);
        lastUpdateRef.current = now;
      }
      
      animationFrameId.current = requestAnimationFrame(updateTimer);
    };
    
    // Função para tratar mudanças de visibilidade da página
    const handleVisibilityChange = () => {
      const wasVisible = isVisibleRef.current;
      isVisibleRef.current = document.visibilityState === 'visible';
      
      // Recalcula o tempo quando a página fica visível novamente
      if (isVisibleRef.current && !wasVisible && active) {
        console.log('Página ficou visível, recalculando tempo');
        const newElapsedTime = calculateElapsedTime();
        setElapsedTime(newElapsedTime);
        lastUpdateRef.current = Date.now();
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
  }, [active]);
  
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