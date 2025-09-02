'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, RotateCcw, Coffee, BookOpen, Bell, SkipForward, Timer, X, Maximize, CheckCircle, Calendar, ExternalLink, Plus, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { PomodoroService } from '@/services/pomodoro.service';
import { PomodoroSchedulingService, PomodoroScheduledSession } from '@/services/pomodoro-scheduling.service';
import { PomodoroPiP } from './pomodoro-pip';
import PomodoroScheduleModal from './pomodoro-schedule-modal';

interface StudyPomodoroTimerProps {
  onComplete?: () => void;
  onStateChange?: (state: PomodoroState) => void;
}

type PomodoroState = 'focus' | 'shortBreak' | 'longBreak' | 'idle';

interface SessionRecord {
  date: string;
  sessions: number;
  totalTime: number; // em minutos
}

const StudyPomodoroTimer = ({ onComplete, onStateChange }: StudyPomodoroTimerProps) => {
  // Configurações padrão do Pomodoro (em minutos)
  const focusTime = 25;
  const shortBreakTime = 5;
  const longBreakTime = 15;
  const longBreakInterval = 4;

  // Persistência no localStorage
  const getInitialState = () => {
    if (typeof window === 'undefined') return 'focus';
    const storedState = localStorage.getItem('study-pomodoro-state');
    return storedState ? storedState as PomodoroState : 'focus';
  };

  const getInitialTimeLeft = () => {
    if (typeof window === 'undefined') return focusTime * 60;
    const storedTime = localStorage.getItem('study-pomodoro-time');
    return storedTime ? parseInt(storedTime, 10) : focusTime * 60;
  };

  const getInitialIsActive = () => {
    if (typeof window === 'undefined') return false;
    const storedActive = localStorage.getItem('study-pomodoro-active');
    return storedActive === 'true';
  };

  const getInitialCompletedSessions = () => {
    if (typeof window === 'undefined') return 0;
    const storedSessions = localStorage.getItem('study-pomodoro-sessions');
    return storedSessions ? parseInt(storedSessions, 10) : 0;
  };

  const getSessionHistory = (): SessionRecord[] => {
    if (typeof window === 'undefined') return [];
    const storedHistory = localStorage.getItem('study-pomodoro-history');
    return storedHistory ? JSON.parse(storedHistory) : [];
  };

  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft());
  const [isActive, setIsActive] = useState(getInitialIsActive());
  const [state, setState] = useState<PomodoroState>(getInitialState());
  const [completedSessions, setCompletedSessions] = useState(getInitialCompletedSessions());
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>(getSessionHistory());
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scheduledSessions, setScheduledSessions] = useState<PomodoroScheduledSession[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [currentScheduledSession, setCurrentScheduledSession] = useState<PomodoroScheduledSession | null>(null);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [totalCycles, setTotalCycles] = useState(0);
  const [isScheduledSession, setIsScheduledSession] = useState(false);

  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const pipSyncRef = useRef<NodeJS.Timeout | null>(null);

  // Função para abrir timer em Picture-in-Picture
  const openPiP = () => {
    if (pipController.isPipActive) {
      pipController.stopPiP();
    } else {
      pipController.startPiP();
    }
  };

  // Carregar sessões agendadas
  const loadScheduledSessions = async () => {
    try {
      const sessions = await PomodoroSchedulingService.getTodaysSessions();
      setScheduledSessions(sessions);
    } catch (error) {
      console.error('Erro ao carregar sessões agendadas:', error);
    }
  };

  // Verificar se há sessão agendada para agora
  const checkForScheduledSession = () => {
    const now = new Date();
    const currentTime = now.getTime();
    
    const upcomingSession = scheduledSessions.find(session => {
      if (session.status !== 'agendada') return false;
      
      const sessionTime = new Date(session.scheduled_date).getTime();
      const timeDiff = sessionTime - currentTime;
      
      // Sessão está dentro de 5 minutos
      return timeDiff >= 0 && timeDiff <= 5 * 60 * 1000;
    });
    
    if (upcomingSession && !currentScheduledSession) {
      setCurrentScheduledSession(upcomingSession);
      toast.success(`Sessão agendada: ${upcomingSession.title} em breve!`);
    }
  };

  // Iniciar sessão agendada
  const startScheduledSession = async (session: PomodoroScheduledSession) => {
    try {
      // Parar timer atual se estiver rodando
      if (isActive) {
        pauseTimer();
      }
      
      // Marcar sessão como em andamento
      await PomodoroSchedulingService.startScheduledSession(session.id!);
      setCurrentScheduledSession(session);
      
      // Calcular número de ciclos baseado na duração
      // Cada ciclo = 25min foco + 5min pausa (exceto o último que é só 25min foco)
      const cycles = Math.ceil(session.duration_minutes / 30); // 30min por ciclo completo
      setTotalCycles(cycles);
      setCurrentCycle(1);
      setIsScheduledSession(true);
      
      // Iniciar primeiro ciclo de foco
      setTimeLeft(focusTime * 60); // 25 minutos
      setState('focus');
      setIsActive(true);
      setIsFullscreen(true);
      
      startTimeRef.current = Date.now();
      endTimeRef.current = startTimeRef.current + (focusTime * 60 * 1000);
      
      toast.success(`Sessão "${session.title}" iniciada! Ciclo 1 de ${cycles} - Foco por 25 minutos.`);
      
      // Recarregar sessões
      loadScheduledSessions();
    } catch (error) {
      console.error('Erro ao iniciar sessão agendada:', error);
      toast.error('Erro ao iniciar sessão agendada');
    }
  };

  // Sincronizar estado com PiP
  const syncWithPiP = () => {
    if (typeof window !== 'undefined') {
      const syncData = {
        timeLeft,
        isActive,
        state,
        completedSessions
      };
      localStorage.setItem('pip-pomodoro-sync', JSON.stringify(syncData));
    }
  };

  // Função para abrir timer em popup
  const openTimerPopup = () => {
    const popupFeatures = [
      'width=800',
      'height=600',
      'left=' + (screen.width / 2 - 400),
      'top=' + (screen.height / 2 - 300),
      'resizable=yes',
      'scrollbars=no',
      'toolbar=no',
      'menubar=no',
      'location=no',
      'status=no'
    ].join(',');

    const popup = window.open('', 'PomodoroTimer', popupFeatures);
    
    if (popup) {
      // Criar conteúdo HTML para o popup
      const popupContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pomodoro Timer</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { margin: 0; padding: 0; overflow: hidden; }
            .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          </style>
        </head>
        <body class="gradient-bg text-white">
          <div class="min-h-screen flex items-center justify-center p-8">
            <div class="text-center">
              <div class="mb-8">
                <h1 class="text-4xl font-bold mb-4">Pomodoro Timer</h1>
                <div class="w-full max-w-md mx-auto bg-white/20 rounded-full h-4 mb-8">
                  <div id="progress-bar" class="bg-white h-4 rounded-full transition-all duration-1000 ease-linear" style="width: 0%"></div>
                </div>
              </div>
              
              <div class="mb-8">
                <div id="timer-display" class="text-8xl font-mono font-bold mb-4 tracking-wider">
                  ${formatTime(timeLeft)}
                </div>
                <p id="timer-message" class="text-2xl text-white/80">
                  ${state === 'focus' ? 'Mantenha o foco nos estudos' : 
                    state === 'shortBreak' ? 'Descanse um pouco' : 
                    'Faça uma pausa mais longa'}
                </p>
              </div>
              
              <div class="flex justify-center space-x-6">
                <button id="play-pause-btn" class="flex items-center justify-center w-20 h-20 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110">
                  <svg class="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                    ${isActive ? 
                      '<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>' : 
                      '<path d="M8 5v14l11-7z"/>'
                    }
                  </svg>
                </button>
                
                <button id="reset-btn" class="flex items-center justify-center w-20 h-20 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110">
                  <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                </button>
                
                <button id="skip-btn" class="flex items-center justify-center w-20 h-20 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110">
                  <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
              
              <div class="mt-8 text-white/60 text-lg">
                Pressione <kbd class="px-2 py-1 bg-white/20 rounded text-sm">ESC</kbd> para fechar
              </div>
            </div>
          </div>
          
          <script>
            // Sincronização com a janela principal
            let timerInterval;
            let currentTime = ${timeLeft};
            let isRunning = ${isActive};
            let currentState = '${state}';
            
            function updateDisplay() {
              const minutes = Math.floor(currentTime / 60);
              const seconds = currentTime % 60;
              document.getElementById('timer-display').textContent = 
                minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
              
              const totalTime = currentState === 'focus' ? 25 * 60 : 
                               currentState === 'shortBreak' ? 5 * 60 : 15 * 60;
              const progress = ((totalTime - currentTime) / totalTime) * 100;
              document.getElementById('progress-bar').style.width = progress + '%';
            }
            
            function startTimer() {
              if (!isRunning) {
                isRunning = true;
                timerInterval = setInterval(() => {
                  if (currentTime > 0) {
                    currentTime--;
                    updateDisplay();
                  } else {
                    clearInterval(timerInterval);
                    isRunning = false;
                    // Notificar conclusão
                    alert('Ciclo concluído!');
                  }
                }, 1000);
              }
            }
            
            function pauseTimer() {
              isRunning = false;
              clearInterval(timerInterval);
            }
            
            function resetTimer() {
              pauseTimer();
              currentTime = currentState === 'focus' ? 25 * 60 : 
                           currentState === 'shortBreak' ? 5 * 60 : 15 * 60;
              updateDisplay();
            }
            
            function skipCycle() {
              pauseTimer();
              // Lógica para pular ciclo
              if (currentState === 'focus') {
                currentState = 'shortBreak';
                currentTime = 5 * 60;
              } else {
                currentState = 'focus';
                currentTime = 25 * 60;
              }
              updateDisplay();
            }
            
            // Event listeners
            document.getElementById('play-pause-btn').addEventListener('click', () => {
              if (isRunning) {
                pauseTimer();
              } else {
                startTimer();
              }
            });
            
            document.getElementById('reset-btn').addEventListener('click', resetTimer);
            document.getElementById('skip-btn').addEventListener('click', skipCycle);
            
            // Fechar popup com ESC
            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') {
                window.close();
              }
            });
            
            // Inicializar display
            updateDisplay();
          </script>
        </body>
        </html>
      `;
      
      popup.document.write(popupContent);
      popup.document.close();
      popup.focus();
      
      toast.success('Timer aberto em popup! 🚀');
    } else {
      toast.error('Não foi possível abrir o popup. Verifique se popups estão habilitados.');
    }
  };

  // Verificar se está montado no cliente
  useEffect(() => {
    setMounted(true);
    
    // Carregar sessões agendadas
    loadScheduledSessions();
    
    // Verificar sessões próximas a cada minuto
    const checkInterval = setInterval(() => {
      checkForScheduledSession();
    }, 60000);
    
    return () => {
      clearInterval(checkInterval);
    };
  }, []);
  
  // Verificar sessões quando a lista de sessões agendadas mudar
  useEffect(() => {
    checkForScheduledSession();
  }, [scheduledSessions]);

  // Persistir estado no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('study-pomodoro-state', state);
      localStorage.setItem('study-pomodoro-time', timeLeft.toString());
      localStorage.setItem('study-pomodoro-active', isActive.toString());
      localStorage.setItem('study-pomodoro-sessions', completedSessions.toString());
      
      // Sincronizar com PiP se estiver aberto
      if (pipWindow && !pipWindow.closed) {
        syncWithPiP();
      }
    }
  }, [state, timeLeft, isActive, completedSessions, pipWindow]);

  // Inicializar áudio e eventos
  useEffect(() => {
    audioRef.current = typeof Audio !== 'undefined' ? new Audio('/notification.mp3') : null;
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Detectar tecla ESC para sair do modo tela cheia
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    // Listener para mensagens do PiP
    const handlePipMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      switch (event.data.action) {
        case 'toggleTimer':
          isActive ? pauseTimer() : startTimer();
          break;
        case 'resetTimer':
          resetTimer();
          break;
        case 'skipCycle':
          skipCycle();
          break;
        case 'pipClosed':
          setPipWindow(null);
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    window.addEventListener('message', handlePipMessage);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pipSyncRef.current) clearInterval(pipSyncRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('message', handlePipMessage);
    };
  }, [isFullscreen, isActive]);

  // Gerenciar timer
  useEffect(() => {
    if (isActive) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        endTimeRef.current = startTimeRef.current + (timeLeft * 1000);
      }
      
      timerRef.current = setInterval(() => {
        const now = Date.now();
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
      if (timeLeft > 0) {
        startTimeRef.current = null;
        endTimeRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && isActive && endTimeRef.current) {
      const now = Date.now();
      if (now >= endTimeRef.current) {
        handleTimerComplete();
      } else {
        const remaining = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
        setTimeLeft(remaining);
      }
    }
  };

  const handleTimerComplete = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    startTimeRef.current = null;
    endTimeRef.current = null;
    setIsActive(false);
    
    // Tocar som de notificação
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
    
    // Lógica especial para sessões agendadas com ciclos
    if (isScheduledSession && currentScheduledSession) {
      if (state === 'focus') {
        // Salvar sessão de foco no banco de dados
        console.log('💾 Salvando sessão de foco no banco de dados...');
        PomodoroService.recordPomodoroSession(focusTime, 'focus')
          .then(() => {
            console.log('✅ Sessão de foco salva com sucesso no banco!');
          })
          .catch((error) => {
            console.error('❌ Erro ao salvar sessão de foco:', error);
            toast.error('Erro ao salvar sessão no banco de dados');
          });
        
        // Verificar se é o último ciclo
        if (currentCycle >= totalCycles) {
          // Sessão completa!
          toast.success(`Sessão "${currentScheduledSession.title}" concluída! 🎉 Todos os ${totalCycles} ciclos foram completados.`);
          
          // Marcar sessão agendada como concluída
          PomodoroSchedulingService.completeScheduledSession(currentScheduledSession.id!)
            .then(() => {
              console.log('✅ Sessão agendada marcada como concluída');
              loadScheduledSessions();
            })
            .catch((error) => {
              console.error('❌ Erro ao marcar sessão agendada como concluída:', error);
            });
          
          // Resetar estados da sessão agendada
          setCurrentScheduledSession(null);
          setIsScheduledSession(false);
          setCurrentCycle(0);
          setTotalCycles(0);
          setIsFullscreen(false);
          
          return;
        } else {
          // Ir para pausa entre ciclos
          setState('shortBreak');
          setTimeLeft(shortBreakTime * 60);
          toast.success(`Ciclo ${currentCycle} de ${totalCycles} concluído! Pausa de 5 minutos.`);
          
          // Reiniciar automaticamente após 3 segundos
          setTimeout(() => {
            setIsActive(true);
            const now = Date.now();
            startTimeRef.current = now;
            endTimeRef.current = now + (shortBreakTime * 60 * 1000);
          }, 3000);
          
          return;
        }
      } else if (state === 'shortBreak') {
        // Pausa concluída, ir para próximo ciclo
        setCurrentCycle(currentCycle + 1);
        setState('focus');
        setTimeLeft(focusTime * 60);
        toast.success(`Pausa concluída! Iniciando ciclo ${currentCycle + 1} de ${totalCycles}.`);
        
        // Reiniciar automaticamente após 3 segundos
        setTimeout(() => {
          setIsActive(true);
          const now = Date.now();
          startTimeRef.current = now;
          endTimeRef.current = now + (focusTime * 60 * 1000);
        }, 3000);
        
        return;
      }
    }
    
    // Lógica original para sessões normais (não agendadas)
    let nextState: PomodoroState;
    let message = '';
    
    if (state === 'focus') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      
      // Salvar sessão de foco no banco de dados
      console.log('💾 Salvando sessão de foco no banco de dados...');
      PomodoroService.recordPomodoroSession(focusTime, 'focus')
        .then(() => {
          console.log('✅ Sessão de foco salva com sucesso no banco!');
        })
        .catch((error) => {
          console.error('❌ Erro ao salvar sessão de foco:', error);
          toast.error('Erro ao salvar sessão no banco de dados');
        });
      
      if (newCompletedSessions % longBreakInterval === 0) {
        nextState = 'longBreak';
        message = 'Pausa longa! Descanse por 15 minutos.';
        setTimeLeft(longBreakTime * 60);
      } else {
        nextState = 'shortBreak';
        message = 'Pausa curta! Descanse por 5 minutos.';
        setTimeLeft(shortBreakTime * 60);
      }
      
      toast.success('Sessão de foco concluída! 🎉');
    } else {
      nextState = 'focus';
      message = 'Hora de focar! Sessão de 25 minutos.';
      setTimeLeft(focusTime * 60);
      toast.success('Pausa concluída! Hora de estudar! 📚');
    }
    
    setState(nextState);
    setNotificationMessage(message);
    setShowNotification(true);
    
    setTimeout(() => setShowNotification(false), 5000);
    
    // Reiniciar automaticamente após 3 segundos
    setTimeout(() => {
      setIsActive(true);
      const now = Date.now();
      startTimeRef.current = now;
      const newTimeInSeconds = nextState === 'focus' ? focusTime * 60 : 
                              nextState === 'shortBreak' ? shortBreakTime * 60 : 
                              longBreakTime * 60;
      endTimeRef.current = now + (newTimeInSeconds * 1000);
    }, 3000);
    
    onStateChange?.(nextState);
    onComplete?.();
  };

  const startTimer = () => {
    setIsActive(true);
    setIsFullscreen(true); // Ativar tela cheia ao iniciar
    startTimeRef.current = Date.now();
    endTimeRef.current = startTimeRef.current + (timeLeft * 1000);
  };

  const pauseTimer = () => {
    setIsActive(false);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsFullscreen(false); // Sair da tela cheia ao resetar
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    startTimeRef.current = null;
    endTimeRef.current = null;
    
    const newTime = state === 'focus' ? focusTime * 60 : 
                   state === 'shortBreak' ? shortBreakTime * 60 : 
                   longBreakTime * 60;
    
    setTimeLeft(newTime);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('study-pomodoro-time');
      localStorage.removeItem('study-pomodoro-active');
    }
  };

  const skipCycle = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    startTimeRef.current = null;
    endTimeRef.current = null;
    setIsActive(false);
    
    let nextState: PomodoroState;
    
    if (state === 'focus') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      
      if (newCompletedSessions % longBreakInterval === 0) {
        nextState = 'longBreak';
        setTimeLeft(longBreakTime * 60);
      } else {
        nextState = 'shortBreak';
        setTimeLeft(shortBreakTime * 60);
      }
    } else {
      nextState = 'focus';
      setTimeLeft(focusTime * 60);
    }
    
    setState(nextState);
    onStateChange?.(nextState);
  };

  // Hook do Picture-in-Picture
  const pipController = PomodoroPiP({
    timeLeft,
    isActive,
    state,
    completedSessions,
    onToggle: () => isActive ? pauseTimer() : startTimer(),
    onReset: resetTimer,
    onSkip: skipCycle
  });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    const totalTime = state === 'focus' ? focusTime * 60 : 
                     state === 'shortBreak' ? shortBreakTime * 60 : 
                     longBreakTime * 60;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  const getStateColor = () => {
    switch (state) {
      case 'focus': return 'from-red-500 to-red-700';
      case 'shortBreak': return 'from-green-500 to-green-700';
      case 'longBreak': return 'from-blue-500 to-blue-700';
      case 'idle':
      default: return 'from-red-500 to-red-700'; // Usar cores de foco por padrão
    }
  };

  const getStateIcon = () => {
    switch (state) {
      case 'focus': return <BookOpen className="h-5 w-5" />;
      case 'shortBreak': return <Coffee className="h-5 w-5" />;
      case 'longBreak': return <Coffee className="h-5 w-5" />;
      default: return <Timer className="h-5 w-5" />;
    }
  };

  const getStateText = () => {
    switch (state) {
      case 'focus': return 'Foco';
      case 'shortBreak': return 'Pausa Curta';
      case 'longBreak': return 'Pausa Longa';
      default: return 'Pomodoro';
    }
  };

  const finishAndSaveSession = () => {
    if (completedSessions === 0) {
      toast.error('Nenhuma sessão para salvar!');
      return;
    }
  
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const totalTime = completedSessions * focusTime; // Total em minutos
    
    const newRecord: SessionRecord = {
      date: today,
      sessions: completedSessions,
      totalTime: totalTime
    };
  
    const updatedHistory = [...sessionHistory];
    const existingIndex = updatedHistory.findIndex(record => record.date === today);
    
    if (existingIndex >= 0) {
      // Atualizar registro existente
      updatedHistory[existingIndex] = {
        ...updatedHistory[existingIndex],
        sessions: updatedHistory[existingIndex].sessions + completedSessions,
        totalTime: updatedHistory[existingIndex].totalTime + totalTime
      };
    } else {
      // Adicionar novo registro
      updatedHistory.push(newRecord);
    }
  
    // Manter apenas os últimos 30 dias
    const sortedHistory = updatedHistory
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);
  
    setSessionHistory(sortedHistory);
    localStorage.setItem('study-pomodoro-history', JSON.stringify(sortedHistory));
    
    // Resetar sessões atuais
    setCompletedSessions(0);
    localStorage.setItem('study-pomodoro-sessions', '0');
    
    // Resetar timer para estado inicial (25 minutos de foco)
    setIsActive(false);
    setIsFullscreen(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    startTimeRef.current = null;
    endTimeRef.current = null;
    
    // Definir explicitamente para estado de foco com 25 minutos
    setState('focus');
    setTimeLeft(focusTime * 60);
    
    // Salvar no localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('study-pomodoro-state', 'focus');
      localStorage.setItem('study-pomodoro-time', (focusTime * 60).toString());
      localStorage.removeItem('study-pomodoro-active');
    }
    
    toast.success(`Sessão salva! ${completedSessions} pomodoros concluídos hoje.`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateString === today.toISOString().split('T')[0]) {
      return 'Hoje';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        year: '2-digit'
      });
    }
  };

  // Componente do timer em tela cheia usando Portal
  const FullscreenTimer = () => {
    if (!mounted) return null;
    
    return createPortal(
      <div className={`fixed inset-0 z-[9999] bg-gradient-to-br ${getStateColor()} flex items-center justify-center`} style={{ zIndex: 2147483647 }}>
        {/* Elementos decorativos de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mt-48 -mr-48 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full -mb-48 -ml-48 blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-ping"></div>
        
        {/* Botões do canto superior direito */}
        <div className="absolute top-8 right-8 flex space-x-3 z-10">
          <button
            onClick={openPiP}
            className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all hover:scale-110"
            title="Abrir Picture-in-Picture"
          >
            <ExternalLink className="h-6 w-6 text-white" />
          </button>
          <button
            onClick={() => setIsFullscreen(false)}
            className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all hover:scale-110"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>
        
        <div className="text-center text-white relative z-10 max-w-2xl mx-auto px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-white/20 rounded-full mr-4">
                {getStateIcon()}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">{getStateText()}</h1>
            </div>
            <div className="text-xl text-white/80">
              Sessão {completedSessions + 1} • {completedSessions} concluídas
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full max-w-md mx-auto bg-white/20 rounded-full h-4 mb-12">
            <div 
              className="bg-white h-4 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          
          {/* Timer Display */}
          <div className="mb-12">
            <div className="text-8xl md:text-9xl font-mono font-bold mb-6 tracking-wider">
              {formatTime(timeLeft)}
            </div>
            <p className="text-2xl text-white/80">
              {state === 'focus' ? 'Mantenha o foco nos estudos' : 
               state === 'shortBreak' ? 'Descanse um pouco' : 
               'Faça uma pausa mais longa'}
            </p>
            {isScheduledSession && currentScheduledSession && (
              <div className="mt-4">
                <div className="text-xl font-semibold text-white">
                  {currentScheduledSession.title}
                </div>
                <div className="text-lg text-white/80">
                  Ciclo {currentCycle} de {totalCycles}
                </div>
              </div>
            )}
          </div>
          
          {/* Controls */}
          <div className="flex justify-center space-x-6">
            <button
              onClick={isActive ? pauseTimer : startTimer}
              className="flex items-center justify-center w-20 h-20 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110 group"
            >
              {isActive ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
            </button>
            
            <button
              onClick={resetTimer}
              className="flex items-center justify-center w-20 h-20 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110"
            >
              <RotateCcw className="h-8 w-8" />
            </button>
            
            <button
              onClick={skipCycle}
              className="flex items-center justify-center w-20 h-20 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110"
            >
              <SkipForward className="h-8 w-8" />
            </button>
          </div>
          
          {/* Dica para sair */}
          <div className="mt-12 text-white/60 text-lg">
            Pressione <kbd className="px-2 py-1 bg-white/20 rounded text-sm">ESC</kbd> para minimizar
          </div>
        </div>
        
        {/* Notification */}
        {showNotification && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-20">
            <div className="bg-white text-gray-800 p-8 rounded-2xl text-center max-w-md mx-4">
              <Bell className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-2xl font-bold mb-2">Ciclo Concluído!</h3>
              <p className="text-lg">{notificationMessage}</p>
            </div>
          </div>
        )}
      </div>,
      document.body
    );
  };

  return (
    <>
      {/* Timer compacto na sidebar */}
      <div className={`bg-gradient-to-br ${getStateColor()} rounded-xl p-6 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-all`}>
        {/* Elementos decorativos de fundo */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mt-20 -mr-20 transition-transform group-hover:scale-150"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full -mb-20 -ml-20 transition-transform group-hover:scale-150"></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center">
              {getStateIcon()}
              <span className="ml-2">{getStateText()}</span>
            </h2>
            <div className="flex items-center space-x-2">
              <div className="text-sm bg-white/20 px-2 py-1 rounded-full">
                {completedSessions} sessões
              </div>
              <button
                onClick={openPiP}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all hover:scale-110"
                title="Abrir Picture-in-Picture"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
              {isActive && (
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  title="Expandir para tela cheia"
                >
                  <Maximize className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-2 mb-4">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          
          {/* Timer Display */}
          <div className="text-center mb-6">
            <div className="text-4xl font-mono font-bold mb-2">
              {formatTime(timeLeft)}
            </div>
            <p className="text-white/80 text-sm">
              {state === 'focus' ? 'Mantenha o foco nos estudos' : 
               state === 'shortBreak' ? 'Descanse um pouco' : 
               'Faça uma pausa mais longa'}
            </p>
          </div>

          {/* Aviso Picture-in-Picture */}
          <div className="mb-4 p-2 bg-white/10 rounded-lg border border-white/20">
            <p className="text-xs text-white/80 text-center leading-relaxed">
              💡 <strong>Dica:</strong> Use o Picture-in-Picture para manter o cronômetro visível enquanto navega em outras abas ou aplicativos.
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex justify-center space-x-3 mb-4">
            <button
              onClick={isActive ? pauseTimer : startTimer}
              className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110"
            >
              {isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            
            <button
              onClick={resetTimer}
              className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            
            <button
              onClick={skipCycle}
              className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full transition-all hover:scale-110"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>



          {/* Botão Finalizar */}
          {completedSessions > 0 && (
            <button
              onClick={finishAndSaveSession}
              className="w-full bg-white/20 hover:bg-white/30 rounded-lg py-3 px-4 transition-all hover:scale-105 flex items-center justify-center space-x-2 font-medium"
            >
              <CheckCircle className="h-5 w-5" />
              <span>Finalizar e Salvar</span>
            </button>
          )}
          

        </div>
      </div>

      {/* Sessões Agendadas */}
      <div className="mt-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-500" />
            Sessões Agendadas
          </h3>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center space-x-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Agendar</span>
          </button>
        </div>
        
        {scheduledSessions.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Nenhuma sessão agendada para hoje</p>
            <p className="text-xs text-gray-400 mt-1">Clique em "Agendar" para criar uma nova sessão</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {scheduledSessions.map((session) => {
              const sessionDate = new Date(session.scheduled_date);
              const now = new Date();
              const isUpcoming = sessionDate > now;
              const isActive = session.status === 'em_andamento';
              const isCompleted = session.status === 'concluida';
              
              return (
                <div 
                  key={session.id} 
                  className={`p-3 rounded-lg border ${
                    isActive ? 'bg-blue-50 border-blue-200' :
                    isCompleted ? 'bg-green-50 border-green-200' :
                    isUpcoming ? 'bg-gray-50 border-gray-200' :
                    'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-800 text-sm">{session.title}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? 'bg-blue-100 text-blue-800' :
                          isCompleted ? 'bg-green-100 text-green-800' :
                          isUpcoming ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {session.status === 'agendada' ? 'Agendada' :
                           session.status === 'em_andamento' ? 'Em andamento' :
                           session.status === 'concluida' ? 'Concluída' :
                           'Perdida'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600">
                        <span>{sessionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{session.duration_minutes} min</span>
                        {session.description && (
                          <span className="truncate max-w-32">{session.description}</span>
                        )}
                      </div>
                    </div>
                    
                    {session.status === 'agendada' && (
                      <button
                        onClick={() => startScheduledSession(session)}
                        className={`ml-2 px-3 py-1 rounded text-xs font-medium transition-colors ${
                          sessionDate <= new Date(Date.now() + 5 * 60 * 1000) 
                            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={false}
                         title="Iniciar sessão agendada"
                      >
                        Iniciar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Agendamento */}
       {showScheduleModal && (
         <PomodoroScheduleModal
           isOpen={showScheduleModal}
           onClose={() => setShowScheduleModal(false)}
           onSessionCreated={() => {
             loadScheduledSessions();
           }}
         />
       )}

      {/* Histórico de Sessões */}
      {sessionHistory.length > 0 && (
        <div className="mt-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500" />
            Histórico de Sessões Pomodoro
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {sessionHistory.slice(0, 5).map((record, index) => (
              <div key={record.date} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">
                    {formatDate(record.date)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-800">
                    {record.sessions} sessões
                  </div>
                  <div className="text-xs text-gray-500">
                    {record.totalTime} min
                  </div>
                </div>
              </div>
            ))}
          </div>
          {sessionHistory.length > 5 && (
            <div className="text-center mt-2">
              <span className="text-xs text-gray-500">
                +{sessionHistory.length - 5} registros anteriores
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Timer em tela cheia usando Portal */}
      {isFullscreen && <FullscreenTimer />}
    </>
  );
};

export default StudyPomodoroTimer;