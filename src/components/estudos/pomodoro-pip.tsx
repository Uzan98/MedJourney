'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

interface PomodoroPiPProps {
  timeLeft: number;
  isActive: boolean;
  state: 'focus' | 'shortBreak' | 'longBreak' | 'idle';
  completedSessions: number;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export const PomodoroPiP = ({
  timeLeft,
  isActive,
  state,
  completedSessions,
  onToggle,
  onReset,
  onSkip
}: PomodoroPiPProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStateConfig = () => {
    switch (state) {
      case 'focus':
        return {
          colors: ['#ef4444', '#dc2626'],
          text: 'FOCO',
          totalTime: 25 * 60
        };
      case 'shortBreak':
        return {
          colors: ['#22c55e', '#16a34a'],
          text: 'PAUSA CURTA',
          totalTime: 5 * 60
        };
      case 'longBreak':
        return {
          colors: ['#3b82f6', '#2563eb'],
          text: 'PAUSA LONGA',
          totalTime: 15 * 60
        };
      default:
        return {
          colors: ['#ef4444', '#dc2626'],
          text: 'POMODORO',
          totalTime: 25 * 60
        };
    }
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = getStateConfig();
    
    // Configurar canvas
    canvas.width = 280;
    canvas.height = 120;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Criar gradiente de fundo
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, config.colors[0]);
    gradient.addColorStop(1, config.colors[1]);
    
    // Desenhar fundo
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Elementos decorativos
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(240, 20, 30, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(40, 100, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Texto do estado
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(config.text, canvas.width / 2, 25);

    // Barra de progresso
    const progressWidth = 200;
    const progressHeight = 6;
    const progressX = (canvas.width - progressWidth) / 2;
    const progressY = 32;
    
    // Fundo da barra
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(progressX, progressY, progressWidth, progressHeight);
    
    // Progresso
    const progress = ((config.totalTime - timeLeft) / config.totalTime) * progressWidth;
    ctx.fillStyle = 'white';
    ctx.fillRect(progressX, progressY, Math.max(0, progress), progressHeight);

    // Tempo principal
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(formatTime(timeLeft), canvas.width / 2, 70);

    // Sessões completadas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '10px Arial';
    ctx.fillText(`Sessões: ${completedSessions}`, canvas.width / 2, 80);

    // Status
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 11px Arial';
    const statusText = isActive ? '▶ ATIVO' : '⏸ PAUSADO';
    ctx.fillText(statusText, canvas.width / 2, 95);
  };

  const startPiP = async () => {
    try {
      // Verificar suporte
      if (!('pictureInPictureEnabled' in document)) {
        toast.error('Picture-in-Picture não suportado neste navegador.');
        return;
      }

      // Criar canvas
      const canvas = document.createElement('canvas');
      canvas.width = 280;
      canvas.height = 120;
      canvasRef.current = canvas;

      // Renderizar frame inicial
      renderCanvas();

      // Capturar stream
      const stream = canvas.captureStream(30);
      streamRef.current = stream;

      // Criar vídeo
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.style.position = 'fixed';
      video.style.top = '-9999px';
      document.body.appendChild(video);
      videoRef.current = video;

      // Aguardar carregamento
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });

      await video.play();
      await video.requestPictureInPicture();
      
      setIsPipActive(true);

      // Listener para fechamento
      video.addEventListener('leavepictureinpicture', () => {
        setIsPipActive(false);
        video.remove();
        if (canvasRef.current) {
          canvasRef.current.remove();
          canvasRef.current = null;
        }
        toast.info('Picture-in-Picture fechado.');
      });

      toast.success('Picture-in-Picture ativado! 🎬');
      
    } catch (error) {
      console.error('Erro PiP:', error);
      toast.error('Erro ao ativar Picture-in-Picture.');
    }
  };

  const stopPiP = async () => {
    try {
      if (videoRef.current && document.pictureInPictureElement === videoRef.current) {
        await document.exitPictureInPicture();
      }
    } catch (error) {
      console.error('Erro ao parar PiP:', error);
    }
  };

  // Sincronização em tempo real
  useEffect(() => {
    if (isPipActive && canvasRef.current) {
      renderCanvas();
    }
  }, [timeLeft, isActive, state, completedSessions, isPipActive]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.remove();
      }
      if (canvasRef.current) {
        canvasRef.current.remove();
      }
    };
  }, []);

  return {
    startPiP,
    stopPiP,
    isPipActive
  };
};

export default PomodoroPiP;