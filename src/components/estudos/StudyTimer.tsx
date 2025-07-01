"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Check, Settings, Clock, X, Volume2, Volume1, VolumeX } from 'lucide-react';
import { completeStudySession } from '../../lib/api';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { playNotificationSound, initAudioContext } from '@/utils/sound';

interface StudyTimerProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  sessionData: {
    id: string;
    title: string;
    disciplineName: string;
    duration: number;
  };
}

const StudyTimer: React.FC<StudyTimerProps> = ({
  isOpen,
  onClose,
  onComplete,
  sessionData
}) => {
  // Estados para controle do timer
  const [timeRemaining, setTimeRemaining] = useState(sessionData.duration * 60); // em segundos
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notes, setNotes] = useState('');
  const [pomodoro, setPomodoro] = useState(false);
  const [pomodoroInterval, setPomodoroInterval] = useState(25); // minutos
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // tempo decorrido em segundos
  const [completionConfirm, setCompletionConfirm] = useState(false);

  // Ref para guardar o ID do intervalo
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Referência para o worker de segundo plano
  const timerWorkerRef = useRef<Worker | null>(null);

  // Referências para controle preciso do tempo
  const startTimestampRef = useRef<number>(Date.now());
  const initialTimeRef = useRef<number>(sessionData.duration * 60);

  // Inicializar o contexto de áudio quando o componente é montado
  useEffect(() => {
    if (!isOpen) return;
    
    // Inicializar o contexto de áudio
    initAudioContext();
    
    // Criar um worker para continuar contando mesmo quando a guia está em segundo plano
    if (typeof Worker !== 'undefined' && !timerWorkerRef.current) {
      try {
        // Criar um worker inline
        const workerBlob = new Blob([`
          let timerId = null;
          let isPaused = false;
          
          self.onmessage = function(e) {
            if (e.data.action === 'start') {
              // Iniciar o timer
              isPaused = false;
              if (timerId === null) {
                timerId = setInterval(() => {
                  if (!isPaused) {
                    self.postMessage({ type: 'tick' });
                  }
                }, 1000);
              }
            } else if (e.data.action === 'pause') {
              // Pausar o timer sem destruí-lo
              isPaused = true;
            } else if (e.data.action === 'stop') {
              // Parar o timer
              if (timerId !== null) {
                clearInterval(timerId);
                timerId = null;
              }
            }
          };
        `], { type: 'application/javascript' });
        
        const workerUrl = URL.createObjectURL(workerBlob);
        timerWorkerRef.current = new Worker(workerUrl);
        
        // Configurar o handler de mensagens do worker
        timerWorkerRef.current.onmessage = (e) => {
          if (e.data.type === 'tick' && isRunning) {
            // Atualizar o timer mesmo quando a guia está em segundo plano
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - startTimestampRef.current) / 1000);
            
            // Atualizar o tempo decorrido
            setElapsedTime(elapsedSeconds);
            
            // Atualizar o tempo restante
            const newTimeRemaining = Math.max(0, initialTimeRef.current - elapsedSeconds);
            setTimeRemaining(newTimeRemaining);
            
            // Verificar se o tempo acabou
            if (newTimeRemaining <= 0) {
              playSound();
              setIsRunning(false);
              setCompletionConfirm(true);
              
              // Pausar o worker
              if (timerWorkerRef.current) {
                timerWorkerRef.current.postMessage({ action: 'pause' });
              }
            }
          }
        };
    } catch (error) {
        console.error('Erro ao criar worker:', error);
      }
    }
    
    // Limpar o worker quando o componente for desmontado ou fechado
    return () => {
      if (timerWorkerRef.current) {
        timerWorkerRef.current.postMessage({ action: 'stop' });
        timerWorkerRef.current.terminate();
        timerWorkerRef.current = null;
      }
    };
  }, [isOpen, isRunning]);

  // Reproduzir som de notificação
  const playSound = () => {
    if (soundEnabled) {
      playNotificationSound();
    }
  };

  // Formatar tempo em formato MM:SS
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Iniciar/Pausar o timer
  const toggleTimer = () => {
    // Inicializar o contexto de áudio na interação do usuário
    initAudioContext();
    
    const newRunningState = !isRunning;
    setIsRunning(newRunningState);
    
    // Atualizar o worker com o novo estado
    if (timerWorkerRef.current) {
      timerWorkerRef.current.postMessage({ 
        action: newRunningState ? 'start' : 'pause'
      });
    }
    
    // Se está iniciando o timer pela primeira vez, tocar som
    if (newRunningState && elapsedTime === 0) {
      playSound();
      
      // Armazenar o timestamp inicial
      startTimestampRef.current = Date.now();
      initialTimeRef.current = pomodoro ? pomodoroInterval * 60 : sessionData.duration * 60;
      
      // Iniciar o worker se necessário
      if (timerWorkerRef.current) {
        timerWorkerRef.current.postMessage({ action: 'start' });
      }
    }
  };

  // Resetar o timer
  const resetTimer = () => {
    setIsRunning(false);
    if (pomodoro) {
      setTimeRemaining(pomodoroInterval * 60);
    } else {
      setTimeRemaining(sessionData.duration * 60);
    }
    setElapsedTime(0);
  };

  // Completar a sessão
  const completeSession = async () => {
    try {
      setLoading(true);
      
      // Calcular o tempo total gasto na sessão em minutos
      const actualDuration = Math.ceil(elapsedTime / 60);
      
      console.log('Tempo decorrido em segundos:', elapsedTime);
      console.log('Duração real em minutos:', actualDuration);
      
      // Garantir que a duração está dentro de um limite razoável
      const maxReasonableDuration = Math.max(sessionData.duration * 2, 120); // Máximo de 2x a duração planejada ou 2 horas
      const finalDuration = Math.min(actualDuration, maxReasonableDuration);
      
      console.log('Duração final a ser salva (minutos):', finalDuration);
      
      const response = await completeStudySession(
        // Se é uma sessão temporária, o ID começa com 'temp-' e não é um número
        sessionData.id.startsWith('temp-') ? 0 : parseInt(sessionData.id),
        { 
          actualDuration: finalDuration > 0 ? finalDuration : 1, // mínimo 1 minuto
          notes: notes.trim() || undefined
        }
      );
      
      if (response.success) {
        // Mostrar toast de sucesso com informação clara sobre a duração
        toast.success(`Sessão de estudo concluída com sucesso! Duração: ${finalDuration} minutos`, 5000);
        
        // Forçar recarga do dashboard quando o usuário voltar para ele
        try {
          // Armazenar flag para indicar que o dashboard deve ser recarregado
          localStorage.setItem('@medjourney:reload_dashboard', 'true');
          
          // Disparar evento de atualização do dashboard
          const event = new CustomEvent('dashboard:update');
          window.dispatchEvent(event);
          
          console.log('Solicitada atualização do dashboard após conclusão da sessão');
        } catch (e) {
          console.warn('Não foi possível solicitar atualização do dashboard:', e);
        }
        
        onComplete();
        onClose();
      } else {
        toast.error('Erro ao concluir a sessão: ' + response.error);
      }
    } catch (error) {
      console.error('Erro ao concluir sessão:', error);
      toast.error('Ocorreu um erro ao concluir a sessão');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar conclusão
  const handleCompleteClick = () => {
    // Se o tempo estiver rodando, pausar
    if (isRunning) {
      setIsRunning(false);
    }
    setCompletionConfirm(true);
  };

  // Alternar configurações do Pomodoro
  const togglePomodoro = () => {
    setPomodoro(!pomodoro);
    if (!pomodoro) {
      setTimeRemaining(pomodoroInterval * 60);
    } else {
      setTimeRemaining(sessionData.duration * 60);
    }
  };

  // Alternar som
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  // Efeito para definir o título da página
  useEffect(() => {
    if (isOpen) {
      const originalTitle = document.title;
      
      if (isRunning) {
        document.title = `${formatTime(timeRemaining)} - ${sessionData.title}`;
      } else {
        document.title = `Paused - ${sessionData.title}`;
      }
      
      return () => {
        document.title = originalTitle;
      };
    }
  }, [isOpen, isRunning, timeRemaining, formatTime, sessionData.title]);

  // Progresso em porcentagem para a barra de progresso
  const calculateProgress = () => {
    if (pomodoro) {
      return 100 - ((timeRemaining / (pomodoroInterval * 60)) * 100);
    }
    return (elapsedTime / (sessionData.duration * 60)) * 100;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 my-8 overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6" />
              <h2 className="text-xl font-bold">Sessão de Estudo</h2>
            </div>
            <button 
              onClick={() => {
                if (elapsedTime > 0) {
                  if (confirm('Tem certeza que deseja encerrar esta sessão? O progresso será perdido.')) {
                    onClose();
                  }
                } else {
                  onClose();
                }
              }}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-white/90 text-lg">{sessionData.title}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm">
            {sessionData.disciplineName}
          </span>
        </div>

        {/* Corpo do timer */}
        <div className="p-8">
          {/* Barra de progresso */}
          <div className="w-full h-3 bg-gray-200 rounded-full mb-8 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                isRunning 
                  ? "bg-gradient-to-r from-green-400 to-blue-500" 
                  : "bg-gradient-to-r from-gray-400 to-gray-500"
              }`}
              style={{ width: `${calculateProgress()}%` }}
            ></div>
          </div>

          {/* Display do tempo */}
          <div className="text-center mb-10">
            <div className="text-7xl font-bold text-gray-800 font-mono tracking-wider">
              {formatTime(timeRemaining)}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {pomodoro 
                ? `Intervalo de Pomodoro (${pomodoroInterval} min)` 
                : `Tempo decorrido: ${formatTime(elapsedTime)}`
              }
            </div>
          </div>

          {/* Botões de controle */}
          <div className="flex justify-center items-center gap-6 mb-8">
            <button
              onClick={resetTimer}
              className="p-3 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Resetar"
              disabled={isRunning}
            >
              <RotateCcw className="h-6 w-6" />
            </button>
            
            <button
              onClick={toggleTimer}
              className={`p-6 rounded-full text-white transition-all ${
                isRunning 
                  ? "bg-yellow-500 hover:bg-yellow-600" 
                  : "bg-green-500 hover:bg-green-600"
              }`}
              aria-label={isRunning ? "Pausar" : "Iniciar"}
            >
              {isRunning ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
            </button>
            
            <button
              onClick={handleCompleteClick}
              className="p-3 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Concluir"
            >
              <Check className="h-6 w-6" />
            </button>
          </div>

          {/* Botões de configuração */}
          <div className="flex justify-center items-center gap-4 mb-6">
            <button
              onClick={togglePomodoro}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                pomodoro 
                  ? "bg-blue-100 text-blue-700" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Clock className="h-4 w-4" />
              Pomodoro
            </button>
            
            <button
              onClick={toggleSound}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                soundEnabled 
                  ? "bg-blue-100 text-blue-700" 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Som
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Opções
            </button>
          </div>

          {/* Configurações extras (condicionalmente visível) */}
          {showSettings && (
            <div className="border-t border-gray-200 pt-4 pb-2 mt-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intervalo do Pomodoro (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={pomodoroInterval}
                  onChange={(e) => setPomodoroInterval(parseInt(e.target.value) || 25)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Confirmação de conclusão (condicionalmente visível) */}
          {completionConfirm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 mt-6 border border-gray-200 max-h-[50vh] overflow-auto">
              <h3 className="font-medium text-gray-800 mb-2">Concluir sessão de estudo</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anotações sobre a sessão (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="O que você aprendeu? Quais foram as dificuldades?"
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3 mb-2">
                <button
                  onClick={() => setCompletionConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={completeSession}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? "Salvando..." : "Concluir Sessão"}
                  {!loading && <Check className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyTimer; 
