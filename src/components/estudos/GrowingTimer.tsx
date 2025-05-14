"use client";

import { useState, useEffect, useRef } from 'react';
import { Clock, Pause, Play, Check, X, BookOpen, FileText } from 'lucide-react';

interface GrowingTimerProps {
  sessionTitle?: string;
  disciplineId?: number;
  disciplineName?: string;
  onComplete: (elapsedMinutes: number, disciplineId?: number, notes?: string) => void;
  onCancel: () => void;
}

const GrowingTimer: React.FC<GrowingTimerProps> = ({ 
  sessionTitle, 
  disciplineId,
  disciplineName,
  onComplete, 
  onCancel 
}) => {
  // Estados do timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Referência para armazenar o ID do intervalo
  const timerIntervalRef = useRef<number | null>(null);
  // Tempo de início absoluto
  const startTimeRef = useRef<number>(Date.now());
  // Tempo total acumulado durante pausas
  const pausedTimeRef = useRef<number>(0);
  // Tempo quando o timer foi pausado pela última vez
  const lastPauseTimeRef = useRef<number>(0);
  // Flag para verificar se a página está visível
  const isVisibleRef = useRef<boolean>(true);
  // Referência para o último tempo calculado
  const lastCalculatedTimeRef = useRef<number>(0);

  // Função para calcular o tempo decorrido com precisão
  const calculateElapsedTime = () => {
    if (isPaused) {
      return lastCalculatedTimeRef.current;
    }

    const now = Date.now();
    const rawElapsed = now - startTimeRef.current;
    const adjustedElapsed = Math.floor((rawElapsed - pausedTimeRef.current) / 1000);
    
    lastCalculatedTimeRef.current = adjustedElapsed;
    return adjustedElapsed;
  };

  // Atualizar o tempo decorrido
  const updateElapsedTime = () => {
    setElapsedSeconds(calculateElapsedTime());
  };

  // Formatar o tempo para exibição
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Iniciar o timer
  useEffect(() => {
    // Iniciar o timer apenas se não estiver pausado
    if (!isPaused) {
      // Se estamos iniciando do zero
      if (elapsedSeconds === 0) {
        startTimeRef.current = Date.now();
        pausedTimeRef.current = 0;
        lastCalculatedTimeRef.current = 0;
      } else if (lastPauseTimeRef.current > 0) {
        // Se estamos retomando de uma pausa, adicionar o tempo pausado ao acumulado
        pausedTimeRef.current += (Date.now() - lastPauseTimeRef.current);
        lastPauseTimeRef.current = 0;
      }
      
      // Usar requestAnimationFrame para animação mais suave e precisa
      const animate = () => {
        if (isVisibleRef.current) {
          updateElapsedTime();
        }
        timerIntervalRef.current = requestAnimationFrame(animate);
      };
      
      timerIntervalRef.current = requestAnimationFrame(animate);
    }
    
    // Limpar animação ao desmontar
    return () => {
      if (timerIntervalRef.current !== null) {
        cancelAnimationFrame(timerIntervalRef.current);
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
        updateElapsedTime();
      }
    };
    
    // Manipulador para quando a janela perde/ganha foco
    const handleFocus = () => {
      isVisibleRef.current = true;
      if (!isPaused) {
        // Recalcular e atualizar o tempo quando a janela ganha foco
        updateElapsedTime();
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

  // Alternar entre pausar e retomar
  const togglePause = () => {
    setIsPaused(prev => {
      const newPausedState = !prev;
      
      if (newPausedState) {
        // Se estamos pausando, armazenar o momento em que pausamos
        lastPauseTimeRef.current = Date.now();
        
        // Parar a animação
        if (timerIntervalRef.current !== null) {
          cancelAnimationFrame(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      }
      
      return newPausedState;
    });
  };

  // Completar sessão
  const handleComplete = () => {
    // Parar a animação
    if (timerIntervalRef.current !== null) {
      cancelAnimationFrame(timerIntervalRef.current);
    }
    
    // Calcular o tempo final com precisão
    const finalElapsedSeconds = calculateElapsedTime();
    
    // Calcular quanto tempo durou a sessão (em minutos)
    const elapsedMinutes = Math.max(1, Math.ceil(finalElapsedSeconds / 60));
    onComplete(elapsedMinutes, disciplineId, notes);
  };
  
  // Cancelar sessão
  const handleCancel = () => {
    // Parar a animação
    if (timerIntervalRef.current !== null) {
      cancelAnimationFrame(timerIntervalRef.current);
    }
    
    onCancel();
  };

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
          {/* Seção do cronômetro */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="mb-4">
              <div className="bg-blue-100 p-3 inline-block rounded-full">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
              {sessionTitle || "Sessão de Estudo"}
            </h2>
            
            {disciplineName && (
              <div className="flex items-center justify-center mb-4">
                <BookOpen className="h-4 w-4 text-gray-500 mr-1" />
                <p className="text-sm text-gray-500">{disciplineName}</p>
              </div>
            )}
            
            {/* Display do tempo com tamanho grande */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 w-full mb-4">
              <div className="text-5xl font-bold text-blue-700 text-center tracking-wider font-mono">
                {formatTime(elapsedSeconds)}
              </div>
              <p className="text-center text-blue-500 mt-2">
                {isPaused ? 'PAUSADO' : 'TEMPO DECORRIDO'}
              </p>
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
                {isPaused 
                  ? 'Sessão pausada. Clique em Continuar para retomar o cronômetro.' 
                  : 'O tempo está sendo contabilizado. Clique em Concluir quando terminar.'}
              </p>
            </div>
          </div>
          
          {/* Seção das notas */}
          <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-800">Notas da Sessão</h3>
            </div>
            
            <textarea
              id="study-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o que você estudou durante esta sessão..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm h-56"
            />
            
            <div className="mt-4 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              <p>💡 <strong>Dica:</strong> Registrar o que você estudou ajuda a revisar o conteúdo mais tarde e também melhora a retenção na memória.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrowingTimer; 