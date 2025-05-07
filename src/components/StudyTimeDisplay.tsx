'use client';

import React from 'react';

interface StudyTimeDisplayProps {
  seconds: number;
  className?: string;
}

export default function StudyTimeDisplay({ seconds, className = '' }: StudyTimeDisplayProps) {
  const formatStudyTime = (totalSeconds: number) => {
    if (totalSeconds < 60) {
      return `${totalSeconds} segundos`;
    }
    
    const minutes = Math.floor(totalSeconds / 60);
    if (minutes < 60) {
      return `${minutes} minutos`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
      if (remainingMinutes === 0) {
        return `${hours} horas`;
      }
      return `${hours}h ${remainingMinutes}min`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (remainingHours === 0) {
      return `${days} dias`;
    }
    return `${days}d ${remainingHours}h`;
  };
  
  return (
    <span className={className}>{formatStudyTime(seconds)}</span>
  );
} 