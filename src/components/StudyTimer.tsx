'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface StudyTimerProps {
  startTime: string;
  initialSeconds?: number;
  className?: string;
}

export default function StudyTimer({ startTime, initialSeconds = 0, className = '' }: StudyTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(initialSeconds);
  
  useEffect(() => {
    const startTimeMs = new Date(startTime).getTime();
    const initialElapsed = Math.floor((Date.now() - startTimeMs) / 1000) + initialSeconds;
    setElapsedTime(initialElapsed);
    
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [startTime, initialSeconds]);
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    } else {
      return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
    }
  };
  
  return (
    <div className={`flex items-center ${className}`}>
      <Clock className="w-4 h-4 mr-1 text-blue-500" />
      <span className="font-mono">{formatTime(elapsedTime)}</span>
    </div>
  );
} 