'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';
import StudyTimer from '../StudyTimer';

interface GroupStudyTimerProps {
  startTime: string;
  isActive: boolean;
  className?: string;
  resetOnMount?: boolean;
  showBackground?: boolean;
}

export default function GroupStudyTimer({ 
  startTime, 
  isActive, 
  className = '', 
  resetOnMount = false,
  showBackground = false
}: GroupStudyTimerProps) {
  const [localIsActive, setLocalIsActive] = useState(isActive);
  const timerRef = useRef<HTMLDivElement>(null);
  const timerKey = useRef<string>(`timer-${startTime}-${Date.now()}`);
  
  // Sincronizar o estado local com a prop isActive
  useEffect(() => {
    setLocalIsActive(isActive);
    
    // Quando o usuário sai, garantir que o timer pare
    if (!isActive) {
      console.log('Usuário saiu, parando timer');
      
      // Forçar atualização do DOM para garantir que o timer pare
      if (timerRef.current) {
        timerRef.current.dataset.active = 'false';
      }
    }
  }, [isActive]);
  
  // Se não tiver tempo de início ou não estiver ativo, não renderiza
  if (!startTime || !localIsActive) return null;
  
  // Versão simples (sem fundo) para usar no header
  return (
    <div key={timerKey.current}>
      {!showBackground ? (
        <StudyTimer 
          startTime={startTime} 
          className={`font-medium ${className}`}
          compact={false} 
          active={localIsActive} 
          resetOnMount={resetOnMount}
          key={`study-timer-${startTime}`}
        />
      ) : (
    <div 
      ref={timerRef}
      data-active={localIsActive.toString()}
          className={`bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center border border-white/20 shadow-sm ${className}`}
    >
      <Clock className="h-4 w-4 text-blue-600 mr-2" />
      <div className="flex flex-col">
        <span className="text-xs text-blue-700">Tempo no grupo</span>
        <StudyTimer 
          startTime={startTime} 
          className="text-blue-700 font-medium" 
          compact={true} 
          active={localIsActive} 
          resetOnMount={resetOnMount}
              key={`study-timer-${startTime}`}
        />
      </div>
        </div>
      )}
    </div>
  );
} 