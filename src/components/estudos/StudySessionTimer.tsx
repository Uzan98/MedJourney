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
  
  // Referência para armazenar o ID do intervalo
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Referência para armazenar o tempo em que o timer foi pausado
  const pausedTimeRef = useRef<number>(0);

  // Formatar o tempo para exibição
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcular a porcentagem de progresso - preenchendo gradualmente
  const progress = (elapsedTime / totalSeconds) * 100;
  
  // Iniciar o timer
  useEffect(() => {
    // Iniciar o timer apenas se não estiver pausado
    if (!isPaused) {
      // Limpar qualquer intervalo existente
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      
      // Criar novo intervalo
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            // Quando o tempo acabar
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            return 0;
          }
          return prevTime - 1;
        });
        
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    
    // Limpar intervalo ao desmontar
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isPaused]);

  // Alternar entre pausar e retomar
  const togglePause = () => {
    setIsPaused(prev => {
      const newPausedState = !prev;
      
      if (newPausedState) {
        // Se estamos pausando, armazenar a referência do tempo atual
        pausedTimeRef.current = timeLeft;
        // Limpar o intervalo
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      }
      
      return newPausedState;
    });
  };

  // Completar sessão
  const handleComplete = () => {
    // Limpar o intervalo
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    // Calcular quanto tempo realmente durou a sessão (em minutos)
    const actualDurationMinutes = Math.ceil(elapsedTime / 60);
    onComplete(actualDurationMinutes);
  };
  
  // Cancelar sessão
  const handleCancel = () => {
    // Limpar o intervalo
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
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
                    <Timer className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm text-gray-600">Duração total:</span>
                  </div>
                  <span className="font-medium">{formatTime(totalSeconds)}</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-gray-600">Tempo decorrido:</span>
                  </div>
                  <span className="font-medium">{formatTime(elapsedTime)}</span>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Dica:</strong> Estudos mostram que intervalos de 5 minutos a cada 25 minutos podem melhorar sua concentração.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudySessionTimer; 