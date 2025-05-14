"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Check, Clock, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudySession } from '@/lib/types/planning';
import { atualizarSessaoEstudo } from '@/services';
import toast from 'react-hot-toast';

interface PlanningSessionTimerProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (actualDuration: number, notes?: string) => void;
  session: StudySession;
}

const PlanningSessionTimer: React.FC<PlanningSessionTimerProps> = ({
  isOpen,
  onClose,
  onComplete,
  session
}) => {
  // Estados para controle do timer
  const [timeRemaining, setTimeRemaining] = useState((session.duration || 60) * 60); // em segundos
  const [isRunning, setIsRunning] = useState(false);
  const [notes, setNotes] = useState(session.notes || '');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // tempo decorrido em segundos
  const [completionConfirm, setCompletionConfirm] = useState(false);

  // Som de notificação
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    
    try {
      // Usar Web Audio API que é mais compatível
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 750;
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Reduzir o volume gradualmente
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
      
      // Parar após 1 segundo
      setTimeout(() => {
        oscillator.stop();
      }, 1000);
    } catch (error) {
      console.error('Erro ao reproduzir som:', error);
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
    setIsRunning(!isRunning);
    
    // Se está iniciando o timer pela primeira vez, tocar som
    if (!isRunning && elapsedTime === 0) {
      playNotificationSound();
    }
  };

  // Resetar o timer
  const resetTimer = () => {
    setIsRunning(false);
    setTimeRemaining((session.duration || 60) * 60);
    setElapsedTime(0);
  };

  // Completar a sessão
  const completeSession = async () => {
    try {
      setLoading(true);
      
      // Calcular o tempo total gasto na sessão em minutos
      const actualDuration = Math.ceil(elapsedTime / 60);
      
      // Garantir que a duração está dentro de um limite razoável
      const maxReasonableDuration = Math.max((session.duration || 60) * 2, 120); // Máximo de 2x a duração planejada ou 2 horas
      const finalDuration = Math.min(actualDuration, maxReasonableDuration);
      
      console.log('Duração final a ser salva (minutos):', finalDuration);
      
      // Atualizar a sessão com o tempo real
      const updatedSession = await atualizarSessaoEstudo({
        id: session.id,
        actualDuration: finalDuration > 0 ? finalDuration : 1, // mínimo 1 minuto
        notes: notes.trim() || undefined,
        completed: true
      });
      
      if (updatedSession) {
        toast.success(`Sessão de estudo concluída com sucesso! Duração: ${finalDuration} minutos`);
        onComplete(finalDuration, notes);
        onClose();
      } else {
        toast.error('Erro ao concluir a sessão');
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

  // Alternar som
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  // Efeito para controlar o timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        // Decrementar tempo restante e incrementar tempo decorrido
        setTimeRemaining(prev => prev > 0 ? prev - 1 : 0);
        setElapsedTime(prev => prev + 1);
          
        // Se o tempo acabou
        if (timeRemaining <= 1) {
          playNotificationSound();
          setIsRunning(false);
          setCompletionConfirm(true);
        }
      }, 1000); // Exatamente 1 segundo por ciclo
    }
    
    return () => clearInterval(interval);
  }, [isRunning, timeRemaining]);

  // Efeito para definir o título da página
  useEffect(() => {
    if (isOpen) {
      const originalTitle = document.title;
      
      if (isRunning) {
        document.title = `${formatTime(timeRemaining)} - ${session.title}`;
      } else {
        document.title = `Paused - ${session.title}`;
      }
      
      return () => {
        document.title = originalTitle;
      };
    }
  }, [isOpen, isRunning, timeRemaining, formatTime, session.title]);

  // Progresso em porcentagem para a barra de progresso
  const calculateProgress = () => {
    return (elapsedTime / ((session.duration || 60) * 60)) * 100;
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
          <p className="text-white/90 text-lg">{session.title}</p>
          {session.disciplineName && (
            <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm">
              {session.disciplineName}
            </span>
          )}
          {session.subjectName && (
            <span className="inline-block mt-2 ml-2 px-3 py-1 bg-white/20 rounded-full text-sm">
              {session.subjectName}
            </span>
          )}
        </div>

        {/* Corpo do timer */}
        <div className="p-6">
          {completionConfirm ? (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Concluir Sessão de Estudo</h3>
                <p className="text-gray-600">
                  Você estudou por <span className="font-semibold">{formatTime(elapsedTime)}</span>. 
                  Deseja concluir esta sessão?
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas / Resultados
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="O que você aprendeu? Dificuldades? Pontos para revisão..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCompletionConfirm(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={completeSession}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Concluindo...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Concluir Sessão
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
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
                  Tempo decorrido: {formatTime(elapsedTime)}
                </div>
              </div>

              {/* Botões de controle */}
              <div className="flex items-center justify-center gap-6 mb-8">
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
              <div className="flex justify-center">
                <button
                  onClick={toggleSound}
                  className="p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label={soundEnabled ? "Desativar som" : "Ativar som"}
                >
                  {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanningSessionTimer; 