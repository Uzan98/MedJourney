'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, RotateCcw, Coffee, BookOpen, Bell, SkipForward, Timer, X, Maximize, CheckCircle, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';

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
    if (typeof window === 'undefined') return 'idle';
    const storedState = localStorage.getItem('study-pomodoro-state');
    return storedState ? storedState as PomodoroState : 'idle';
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
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);

  // Verificar se está montado no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Persistir estado no localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('study-pomodoro-state', state);
      localStorage.setItem('study-pomodoro-time', timeLeft.toString());
      localStorage.setItem('study-pomodoro-active', isActive.toString());
      localStorage.setItem('study-pomodoro-sessions', completedSessions.toString());
    }
  }, [state, timeLeft, isActive, completedSessions]);

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
    
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isFullscreen]);

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
    
    let nextState: PomodoroState;
    let message = '';
    
    if (state === 'focus') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      
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
      default: return 'from-gray-500 to-gray-700';
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
        
        {/* Botão de fechar */}
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-8 right-8 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all hover:scale-110 z-10"
        >
          <X className="h-6 w-6 text-white" />
        </button>
        
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