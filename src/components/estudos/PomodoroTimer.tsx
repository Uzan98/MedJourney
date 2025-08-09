'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, BookOpen, Bell, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudyGroupAchievementsService } from '@/services/study-group-achievements.service';
import { PomodoroService } from '@/services/pomodoro.service';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface PomodoroTimerProps {
  onComplete?: () => void;
  onStateChange?: (state: PomodoroState) => void;
  groupId?: string;
}

type PomodoroState = 'focus' | 'shortBreak' | 'longBreak' | 'idle';

const PomodoroTimer = ({ onComplete, onStateChange, groupId }: PomodoroTimerProps) => {
  // Configurações padrão do Pomodoro (em minutos)
  const focusTime = 25;
  const shortBreakTime = 5;
  const longBreakTime = 15;
  const longBreakInterval = 4;

  // Use localStorage para persistir o estado entre mudanças de abas
  const getInitialState = () => {
    if (typeof window === 'undefined') return 'focus';
    const storedState = localStorage.getItem(`pomodoro-state-${groupId}`);
    return storedState ? storedState as PomodoroState : 'focus';
  };



  const getInitialTimeLeft = () => {
    if (typeof window === 'undefined') return focusTime * 60;
    const storedTime = localStorage.getItem(`pomodoro-time-${groupId}`);
    return storedTime ? parseInt(storedTime, 10) : focusTime * 60;
  };

  const getInitialIsActive = () => {
    if (typeof window === 'undefined') return false;
    const storedActive = localStorage.getItem(`pomodoro-active-${groupId}`);
    return storedActive === 'true';
  };

  const getInitialCompletedSessions = () => {
    if (typeof window === 'undefined') return 0;
    const storedSessions = localStorage.getItem(`pomodoro-sessions-${groupId}`);
    return storedSessions ? parseInt(storedSessions, 10) : 0;
  };

  // Função para recuperar o timestamp de quando o timer foi iniciado
  const getStartTimestamp = () => {
    if (typeof window === 'undefined') return null;
    const timestamp = localStorage.getItem(`pomodoro-start-time-${groupId}`);
    return timestamp ? parseInt(timestamp, 10) : null;
  };

  // Função para recuperar o timestamp de quando o timer deve terminar
  const getEndTimestamp = () => {
    if (typeof window === 'undefined') return null;
    const timestamp = localStorage.getItem(`pomodoro-end-time-${groupId}`);
    return timestamp ? parseInt(timestamp, 10) : null;
  };

  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft());
  const [isActive, setIsActive] = useState(getInitialIsActive());
  const [state, setState] = useState<PomodoroState>(getInitialState());
  const [completedSessions, setCompletedSessions] = useState(getInitialCompletedSessions());
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  // Referências para controle do timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number | null>(getStartTimestamp());
  const endTimeRef = useRef<number | null>(getEndTimestamp());
  const totalTimeRef = useRef<number>(focusTime * 60);

  // Log para depuração
  useEffect(() => {
    console.log('PomodoroTimer montado com groupId:', groupId);
    console.log('Usuário autenticado:', user);
    console.log('Estado inicial:', { 
      timeLeft, 
      isActive, 
      state, 
      startTime: startTimeRef.current ? new Date(startTimeRef.current).toISOString() : null,
      endTime: endTimeRef.current ? new Date(endTimeRef.current).toISOString() : null
    });
  }, [groupId, user]);

  useEffect(() => {
    audioRef.current = typeof Audio !== 'undefined' ? new Audio('/notification.mp3') : null;
    
    // Adicionar eventos para detectar quando a página fica visível/invisível
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Sincronizar o tempo ao montar o componente
    if (isActive && startTimeRef.current && endTimeRef.current) {
      const now = Date.now();
      if (now >= endTimeRef.current) {
        // O timer já deveria ter terminado
        handleTimerComplete();
      } else {
        // Recalcular o tempo restante
        const remaining = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
        setTimeLeft(remaining);
        
        // Iniciar o timer novamente
        startTimer();
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Função para lidar com mudanças de visibilidade da página
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && isActive && startTimeRef.current && endTimeRef.current) {
      // Recalcular o tempo restante quando a página voltar a ficar visível
      const now = Date.now();
      
      if (now >= endTimeRef.current) {
        // O timer já deveria ter terminado
        handleTimerComplete();
      } else {
        // Recalcular o tempo restante
        const remaining = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
        
        console.log('Página voltou a ficar visível. Recalculando tempo:', {
          startTime: new Date(startTimeRef.current).toISOString(),
          endTime: new Date(endTimeRef.current).toISOString(),
          now: new Date(now).toISOString(),
          remaining
        });
        
        setTimeLeft(remaining);
      }
    }
  };

  useEffect(() => {
    if (isActive) {
      // Armazenar o tempo de início e o tempo total quando o timer é iniciado
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        totalTimeRef.current = timeLeft;
        endTimeRef.current = startTimeRef.current + (timeLeft * 1000);
        
        // Persistir os timestamps
        if (typeof window !== 'undefined') {
          localStorage.setItem(`pomodoro-start-time-${groupId}`, startTimeRef.current.toString());
          localStorage.setItem(`pomodoro-end-time-${groupId}`, endTimeRef.current.toString());
        }
      }
      
      timerRef.current = setInterval(() => {
        const now = Date.now();
        
        // Calcular o tempo restante com base no tempo absoluto
        if (endTimeRef.current) {
          const remaining = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
          
          if (remaining <= 0) {
            handleTimerComplete();
            return;
          }
          
          setTimeLeft(remaining);
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      
      // Se o timer foi pausado (não completado), armazenar o tempo restante
      if (timeLeft > 0) {
        totalTimeRef.current = timeLeft;
        
        // Limpar os timestamps ao pausar
        startTimeRef.current = null;
        endTimeRef.current = null;
        
        // Persistir a limpeza dos timestamps
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`pomodoro-start-time-${groupId}`);
          localStorage.removeItem(`pomodoro-end-time-${groupId}`);
        }
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (onStateChange) {
      onStateChange(state);
    }
    
    // Atualizar o tempo total quando o estado muda
    if (state === 'focus') {
      totalTimeRef.current = focusTime * 60;
    } else if (state === 'shortBreak') {
      totalTimeRef.current = shortBreakTime * 60;
    } else if (state === 'longBreak') {
      totalTimeRef.current = longBreakTime * 60;
    }
    
  }, [state, onStateChange]);

  // Adicionar persistência ao mudar estado
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`pomodoro-state-${groupId}`, state);
      localStorage.setItem(`pomodoro-sessions-${groupId}`, completedSessions.toString());
    }
  }, [state, completedSessions, groupId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`pomodoro-time-${groupId}`, timeLeft.toString());
      localStorage.setItem(`pomodoro-active-${groupId}`, isActive.toString());
    }
  }, [timeLeft, isActive, groupId]);

  const handleTimerComplete = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Resetar as referências de tempo
    startTimeRef.current = null;
    endTimeRef.current = null;
    
    // Persistir a limpeza dos timestamps
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`pomodoro-start-time-${groupId}`);
      localStorage.removeItem(`pomodoro-end-time-${groupId}`);
    }
    
    setIsActive(false);
    
    // Tocar som de notificação
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.error('Erro ao tocar notificação:', err));
    }
    
    // Determinar próximo estado
    if (state === 'focus') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      
      // Registrar sessão Pomodoro no banco de dados
      const sessionDuration = Math.ceil((totalTimeRef.current - timeLeft) / 60); // Duração em minutos
      console.log('🍅 Iniciando salvamento da sessão Pomodoro:', {
        duration: sessionDuration,
        type: 'focus',
        timestamp: new Date().toISOString()
      });
      
      setTimeout(() => {
        PomodoroService.recordPomodoroSession(sessionDuration, 'focus')
          .then(session => {
            if (session) {
              console.log('✅ Sessão Pomodoro registrada no banco:', session);
            }
          })
          .catch(error => {
            console.error('❌ Erro ao registrar sessão Pomodoro:', error);
          });
      }, 100);
      
      // Registrar conquista se estiver em um grupo
      if (groupId && user) {
        const username = user.user_metadata?.name || user.email || 'Usuário';
        
        console.log('Registrando conquista de ciclo Pomodoro:', {
          groupId,
          userId: user.id,
          username,
          cycleType: 'focus',
          totalCompletedCycles: newCompletedSessions
        });
        
        // Usar setTimeout para evitar bloqueio da UI e garantir que o registro aconteça
        // mesmo que o usuário navegue para outra página
        setTimeout(() => {
          StudyGroupAchievementsService.recordPomodoroCompletion(
            groupId,
            user.id,
            username,
            'focus',
            newCompletedSessions
          ).then(success => {
            console.log('Conquista registrada com sucesso:', success);
          }).catch(error => {
            console.error('Erro ao registrar conquista:', error);
          });
        }, 100);
      } else {
        console.warn('Não foi possível registrar conquista:', { groupId, user });
      }
      
      if (newCompletedSessions % longBreakInterval === 0) {
        setState('longBreak');
        setTimeLeft(longBreakTime * 60);
        showNotificationMessage('Hora de uma pausa longa!');
      } else {
        setState('shortBreak');
        setTimeLeft(shortBreakTime * 60);
        showNotificationMessage('Hora de uma pausa curta!');
      }
    } else {
      setState('focus');
      setTimeLeft(focusTime * 60);
      showNotificationMessage('Hora de focar!');
      
      // Registrar conquista de pausa se estiver em um grupo
      if (groupId && user) {
        const username = user.user_metadata?.name || user.email || 'Usuário';
        
        console.log('Registrando conquista de pausa:', {
          groupId,
          userId: user.id,
          username,
          cycleType: state,
          totalCompletedCycles: completedSessions
        });
        
        // Usar setTimeout para evitar bloqueio da UI e garantir que o registro aconteça
        // mesmo que o usuário navegue para outra página
        setTimeout(() => {
          StudyGroupAchievementsService.recordPomodoroCompletion(
            groupId,
            user.id,
            username,
            state as 'shortBreak' | 'longBreak',
            completedSessions
          ).then(success => {
            console.log('Conquista de pausa registrada com sucesso:', success);
          }).catch(error => {
            console.error('Erro ao registrar conquista de pausa:', error);
          });
        }, 100);
      }
    }
    
    if (onComplete) {
      onComplete();
    }
  };

  // Nova função para pular o ciclo atual
  const skipCycle = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Resetar as referências de tempo
    startTimeRef.current = null;
    endTimeRef.current = null;
    
    // Tocar som de notificação
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.error('Erro ao tocar notificação:', err));
    }
    
    // Determinar próximo estado
    if (state === 'focus') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      
      // Não registramos conquista ao pular um ciclo
      
      if (newCompletedSessions % longBreakInterval === 0) {
        setState('longBreak');
        setTimeLeft(longBreakTime * 60);
        showNotificationMessage('Pulou para pausa longa!');
      } else {
        setState('shortBreak');
        setTimeLeft(shortBreakTime * 60);
        showNotificationMessage('Pulou para pausa curta!');
      }
    } else {
      setState('focus');
      setTimeLeft(focusTime * 60);
      showNotificationMessage('Pulou para o próximo ciclo de foco!');
    }
    
    // Pausa o timer após pular
    setIsActive(false);
    
    if (onComplete) {
      onComplete();
    }
  };

  const showNotificationMessage = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  const startTimer = () => {
    if (isActive) return;
    
    // Calcular o tempo final com base no tempo atual
    const now = Date.now();
    startTimeRef.current = now;
    endTimeRef.current = now + (timeLeft * 1000);
    
    // Persistir os timestamps
    if (typeof window !== 'undefined') {
      localStorage.setItem(`pomodoro-start-time-${groupId}`, startTimeRef.current.toString());
      localStorage.setItem(`pomodoro-end-time-${groupId}`, endTimeRef.current.toString());
    }
    
    console.log('Iniciando timer:', {
      startTime: new Date(startTimeRef.current).toISOString(),
      endTime: new Date(endTimeRef.current).toISOString(),
      timeLeft
    });
    
    setIsActive(true);
    
    // Se estiver no estado 'idle', iniciar com foco
    if (state === 'idle') {
      setState('focus');
    }
  };

  const pauseTimer = () => {
    setIsActive(false);
    
    // Ao pausar, calcular o tempo restante e limpar os timestamps
    if (endTimeRef.current) {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
      setTimeLeft(remaining);
    }
    
    // Limpar os timestamps
    startTimeRef.current = null;
    endTimeRef.current = null;
    
    // Persistir a limpeza dos timestamps
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`pomodoro-start-time-${groupId}`);
      localStorage.removeItem(`pomodoro-end-time-${groupId}`);
    }
  };

  const resetTimer = () => {
    // Parar o timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Resetar todos os estados
    setIsActive(false);
    setState('focus'); // Sempre resetar para estado de foco
    setCompletedSessions(0);
    setTimeLeft(focusTime * 60);
    
    // Limpar as referências
    startTimeRef.current = null;
    endTimeRef.current = null;
    
    // Limpar todos os dados persistidos
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`pomodoro-state-${groupId}`);
      localStorage.removeItem(`pomodoro-time-${groupId}`);
      localStorage.removeItem(`pomodoro-active-${groupId}`);
      localStorage.removeItem(`pomodoro-sessions-${groupId}`);
      localStorage.removeItem(`pomodoro-start-time-${groupId}`);
      localStorage.removeItem(`pomodoro-end-time-${groupId}`);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    let totalTime;
    
    switch (state) {
      case 'focus':
        totalTime = focusTime * 60;
        break;
      case 'shortBreak':
        totalTime = shortBreakTime * 60;
        break;
      case 'longBreak':
        totalTime = longBreakTime * 60;
        break;
      default:
        return 0;
    }
    
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  const getStateColor = (): string => {
    switch (state) {
      case 'focus':
        return 'from-blue-600 to-indigo-600';
      case 'shortBreak':
        return 'from-green-500 to-teal-500';
      case 'longBreak':
        return 'from-purple-500 to-pink-500';
      case 'idle':
      default:
        return 'from-blue-600 to-indigo-600'; // Usar cores de foco por padrão
    }
  };

  const getStateIcon = () => {
    switch (state) {
      case 'focus':
        return <BookOpen className="h-5 w-5 text-blue-600" />;
      case 'shortBreak':
      case 'longBreak':
        return <Coffee className="h-5 w-5 text-green-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStateText = (): string => {
    switch (state) {
      case 'focus':
        return 'Foco';
      case 'shortBreak':
        return 'Pausa Curta';
      case 'longBreak':
        return 'Pausa Longa';
      default:
        return 'Pomodoro';
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center">
          {getStateIcon()}
          <span className="ml-2">{getStateText()}</span>
        </h3>
        <div className="text-sm bg-gray-100 px-2 py-1 rounded-full">
          <span className="font-medium">{completedSessions}</span> ciclos
        </div>
      </div>
      
      <div className="relative mb-4">
        <div className="h-2 bg-gray-200 rounded-full">
          <div 
            className={`h-2 rounded-full bg-gradient-to-r ${getStateColor()}`} 
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>
      
      <div className="flex justify-center mb-6">
        <div className="text-4xl font-bold text-gray-800">
          {formatTime(timeLeft)}
        </div>
      </div>
      
      <div className="flex justify-center space-x-3">
        {!isActive ? (
          <Button 
            onClick={startTimer}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl"
          >
            <Play className="h-4 w-4 mr-1.5" />
            {state === 'idle' ? 'Iniciar' : 'Continuar'}
          </Button>
        ) : (
          <Button 
            onClick={pauseTimer}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl"
          >
            <Pause className="h-4 w-4 mr-1.5" />
            Pausar
          </Button>
        )}
        
        <Button 
          onClick={resetTimer}
          variant="outline"
          className="border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl"
        >
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Reiniciar
        </Button>
        
        <Button 
          onClick={skipCycle}
          variant="outline"
          className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl"
        >
          <SkipForward className="h-4 w-4 mr-1.5" />
          Pular
        </Button>
      </div>
      

      
      {showNotification && (
        <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-center">
          {notificationMessage}
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;
