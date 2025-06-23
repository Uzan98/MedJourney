"use client";

import { useState, useEffect, useRef } from 'react';
import { Clock, Pause, Play, Check, X, BookOpen, BarChart, Timer } from 'lucide-react';

interface StudySessionTimerProps {
  sessionId: number;
  title: string;
  durationMinutes: number;
  onComplete: (actualDuration: number) => void;
  onCancel: () => void;
}

const StudySessionTimer: React.FC<StudySessionTimerProps> = ({ 
  sessionId, 
  title, 
  durationMinutes, 
  onComplete, 
  onCancel 
}) => {
  // Calcular segundos totais
  const totalSeconds = durationMinutes * 60;
  
  // Estados do timer
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Referência para armazenar o ID da animação
  const timerAnimationRef = useRef<number | null>(null);
  // Referência para o tempo de início
  const startTimeRef = useRef<number>(Date.now());
  // Referência para o tempo de pausa acumulado
  const pausedTimeRef = useRef<number>(0);
  // Referência para o último tempo de pausa
  const lastPauseTimeRef = useRef<number>(0);
  // Flag para verificar se a página está visível
  const isVisibleRef = useRef<boolean>(true);

  // Formatar o tempo para exibição
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Função para calcular o tempo restante com precisão
  const calculateTimeLeft = (): number => {
    if (isPaused) {
      return timeLeft; // Se estiver pausado, retorna o último valor
    }
    
    const now = Date.now();
    const elapsedSinceStart = now - startTimeRef.current - pausedTimeRef.current;
    const secondsElapsed = Math.floor(elapsedSinceStart / 1000);
    const remaining = Math.max(0, totalSeconds - secondsElapsed);
    
    return remaining;
  };

  // Função para calcular o tempo decorrido
  const calculateElapsedTime = (): number => {
    if (isPaused) {
      return elapsedTime; // Se estiver pausado, retorna o último valor
    }
    
    const now = Date.now();
    const elapsedSinceStart = now - startTimeRef.current - pausedTimeRef.current;
    return Math.floor(elapsedSinceStart / 1000);
  };

  // Atualizar tempos
  const updateTimers = () => {
    const currentTimeLeft = calculateTimeLeft();
    const currentElapsedTime = calculateElapsedTime();
    
    setTimeLeft(currentTimeLeft);
    setElapsedTime(currentElapsedTime);
    
    // Verificar se o tempo acabou
    if (currentTimeLeft <= 0 && !isPaused) {
      // Parar a animação
      if (timerAnimationRef.current !== null) {
        cancelAnimationFrame(timerAnimationRef.current);
        timerAnimationRef.current = null;
      }
      
      // Chamar a função de conclusão automaticamente
      const actualDurationMinutes = Math.ceil(currentElapsedTime / 60);
      onComplete(actualDurationMinutes);
    }
  };

  // Iniciar o timer
  useEffect(() => {
    // Iniciar o timer apenas se não estiver pausado
    if (!isPaused) {
      // Se estamos começando, definir o tempo de início
      if (elapsedTime === 0) {
        startTimeRef.current = Date.now();
        pausedTimeRef.current = 0;
      } else if (lastPauseTimeRef.current > 0) {
        // Se estamos retomando de uma pausa, adicionar o tempo pausado ao acumulado
        pausedTimeRef.current += (Date.now() - lastPauseTimeRef.current);
        lastPauseTimeRef.current = 0;
      }
      
      // Usar requestAnimationFrame para animação mais suave e precisa
      const animate = () => {
        if (isVisibleRef.current) {
          updateTimers();
        }
        timerAnimationRef.current = requestAnimationFrame(animate);
      };
      
      timerAnimationRef.current = requestAnimationFrame(animate);
    }
    
    // Limpar animação ao desmontar
    return () => {
      if (timerAnimationRef.current !== null) {
        cancelAnimationFrame(timerAnimationRef.current);
      }
    };
  }, [isPaused]);

  // Adicionar listeners para visibilidade da página
  useEffect(() => {
    // Manipulador para quando a página fica visível/invisível
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      isVisibleRef.current = isVisible;
      
      if (isVisible && !isPaused) {
        // Recalcular e atualizar o tempo quando a página volta a ficar visível
        updateTimers();
      }
    };
    
    // Manipulador para quando a janela perde/ganha foco
    const handleFocus = () => {
      isVisibleRef.current = true;
      if (!isPaused) {
        // Recalcular e atualizar o tempo quando a janela ganha foco
        updateTimers();
      }
    };
    
    const handleBlur = () => {
      isVisibleRef.current = false;
    };
    
    // Adicionar listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // Remover listeners ao desmontar
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isPaused]);

  // Calcular porcentagem de progresso - preenchendo gradualmente
  const progress = (elapsedTime / totalSeconds) * 100;

  // Alternar entre pausar e retomar
  const togglePause = () => {
    setIsPaused(prev => {
      const newPausedState = !prev;
      
      if (newPausedState) {
        // Se estamos pausando, armazenar a referência do tempo atual
        lastPauseTimeRef.current = Date.now();
        
        // Parar a animação
        if (timerAnimationRef.current !== null) {
          cancelAnimationFrame(timerAnimationRef.current);
          timerAnimationRef.current = null;
        }
      }
      
      return newPausedState;
    });
  };

  // Completar sessão
  const handleComplete = () => {
    // Parar a animação
    if (timerAnimationRef.current !== null) {
      cancelAnimationFrame(timerAnimationRef.current);
    }
    
    // Calcular quanto tempo realmente durou a sessão (em minutos)
    const actualDurationMinutes = Math.ceil(elapsedTime / 60);
    onComplete(actualDurationMinutes);
  };
  
  // Cancelar sessão
  const handleCancel = () => {
    // Parar a animação
    if (timerAnimationRef.current !== null) {
      cancelAnimationFrame(timerAnimationRef.current);
    }
    
    onCancel();
  };

  // Calcular porcentagem restante para display visual
  const percentRemaining = (timeLeft / totalSeconds) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay com blur */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      ></div>
      
      {/* Container do timer - agora com layout mais horizontal */}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 relative animate-slide-up">
        <button
          onClick={handleCancel}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Lado esquerdo - Informações da sessão e cronômetro */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="mb-4">
              <div className="bg-blue-100 p-3 inline-block rounded-full">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">{title}</h2>
            <p className="text-sm text-gray-500 text-center mb-6">Sessão de estudo em andamento</p>
            
            {/* Display do tempo com tamanho grande */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 w-full mb-4">
              <div className="text-5xl font-bold text-blue-700 text-center tracking-wider font-mono">
                {formatTime(timeLeft)}
              </div>
              <p className="text-center text-blue-500 mt-2">
                {isPaused ? 'PAUSADO' : 'TEMPO RESTANTE'}
              </p>
            </div>
            
            {/* Barra de progresso horizontal */}
            <div className="w-full h-4 bg-gray-200 rounded-full mb-6 overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            {/* Controles do timer */}
            <div className="flex justify-center space-x-4 mb-4">
              <button
                onClick={togglePause}
                className={`px-6 py-3 rounded-lg flex items-center ${
                  isPaused 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                } transition-colors`}
                aria-label={isPaused ? 'Continuar' : 'Pausar'}
              >
                {isPaused ? <Play className="h-5 w-5 mr-2" /> : <Pause className="h-5 w-5 mr-2" />}
                <span>{isPaused ? 'Continuar' : 'Pausar'}</span>
              </button>
              
              <button
                onClick={handleComplete}
                className="px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center transition-colors"
                aria-label="Concluir"
              >
                <Check className="h-5 w-5 mr-2" />
                <span>Concluir</span>
              </button>
            </div>
            
            <div className="text-center w-full">
              <p className="text-sm text-gray-500">
                {isPaused ? 'Sessão pausada. Clique em Continuar para retomar o cronômetro.' : 'Você pode pausar ou concluir a sessão a qualquer momento'}
              </p>
            </div>
          </div>
          
          {/* Lado direito - Progresso circular e estatísticas */}
          <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6 flex flex-col items-center justify-center">
            <div className="flex items-center mb-4">
              <BarChart className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-800">Progresso da Sessão</h3>
            </div>
            
            {/* Timer e círculo de progresso */}
            <div className="relative flex justify-center mb-6">
              <svg className="w-40 h-40" viewBox="0 0 100 100">
                {/* Círculo de fundo */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#edf2f7"
                  strokeWidth="8"
                />
                
                {/* Círculo de progresso - preenchendo gradualmente */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  strokeDashoffset={283 - (283 * progress) / 100}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              
              {/* Porcentagem centralizada */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-800">{Math.round(progress)}%</span>
                <span className="text-xs text-gray-500 mt-1">completo</span>
              </div>
            </div>
            
            {/* Estatísticas da sessão */}
            <div className="w-full space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Timer className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Duração Total</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{durationMinutes} min</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Timer className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Tempo Estudado</span>
                  </div>
                  <span className="text-sm font-bold text-gray-800">{Math.floor(elapsedTime / 60)} min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudySessionTimer; 
