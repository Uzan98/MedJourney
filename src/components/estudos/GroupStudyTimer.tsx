'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';
import StudyTimer from '../StudyTimer';

interface GroupStudyTimerProps {
  startTime: string;
  isActive: boolean;
  className?: string;
  resetOnMount?: boolean;
}

export default function GroupStudyTimer({ startTime, isActive, className = '', resetOnMount = true }: GroupStudyTimerProps) {
  const [localIsActive, setLocalIsActive] = useState(isActive);
  const timerRef = useRef<HTMLDivElement>(null);
  
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
  
  return (
    <div 
      ref={timerRef}
      data-active={localIsActive.toString()}
      className={`bg-blue-50 px-4 py-2 rounded-lg flex items-center border border-blue-200 ${className}`}
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
        />
      </div>
    </div>
  );
} 