"use client";

import React from 'react';
import { Card } from '../ui/Card';
import { Play, Calendar, Clock, BookOpen, Calendar as CalendarIcon, GraduationCap } from 'lucide-react';
import { StudySession } from '../../lib/types/dashboard';
import { formatDate, formatTime } from '../../lib/utils';
import Link from 'next/link';

interface NextStudySessionProps {
  studySessions?: StudySession[];
  loading?: boolean;
  onStartSession: (session: StudySession) => void;
}

const NextStudySession: React.FC<NextStudySessionProps> = ({ 
  studySessions = [],
  loading = false,
  onStartSession
}) => {
  // Obter a próxima sessão (a mais próxima no futuro)
  const getNextSession = (): StudySession | null => {
    if (!studySessions || studySessions.length === 0) return null;
    
    const now = new Date();
    const futureSessions = studySessions
      .filter(session => {
        const sessionDate = typeof session.scheduledDate === 'string' 
          ? new Date(session.scheduledDate) 
          : session.scheduledDate;
        return sessionDate > now;
      })
      .sort((a, b) => {
        const dateA = typeof a.scheduledDate === 'string' ? new Date(a.scheduledDate) : a.scheduledDate;
        const dateB = typeof b.scheduledDate === 'string' ? new Date(b.scheduledDate) : b.scheduledDate;
        return dateA.getTime() - dateB.getTime();
      });
    
    return futureSessions.length > 0 ? futureSessions[0] : null;
  };
  
  const nextSession = getNextSession();
  
  // Calcular quanto tempo falta para a próxima sessão
  const getTimeUntil = (date: Date | string): string => {
    const sessionDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = sessionDate.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);
    
    if (diffMin < 0) return 'Agora';
    if (diffMin < 60) return `${diffMin} minutos`;
    
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      const remainingMinutes = diffMin % 60;
      return `${diffHours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} dias`;
  };
  
  // Formatar o horário da sessão
  const formatSessionTime = (date: Date | string): string => {
    const sessionDate = typeof date === 'string' ? new Date(date) : date;
    return sessionDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Formatar a data completa
  const formatFullDate = (date: Date | string): string => {
    const sessionDate = typeof date === 'string' ? new Date(date) : date;
    return sessionDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Verificar se a sessão é hoje
  const isToday = (date: Date | string): boolean => {
    const sessionDate = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return sessionDate.getDate() === today.getDate() &&
      sessionDate.getMonth() === today.getMonth() &&
      sessionDate.getFullYear() === today.getFullYear();
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Próxima Sessão</h3>
          <Link
            href="/planejamento"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <Calendar className="h-4 w-4" />
            Ver planejamento
          </Link>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Carregando sessões de estudo...</p>
          </div>
        ) : nextSession ? (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isToday(nextSession.scheduledDate) 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {isToday(nextSession.scheduledDate) ? 'Hoje' : 'Próxima sessão'}
                    </span>
                    <span className="text-sm text-gray-600">
                      em {getTimeUntil(nextSession.scheduledDate)}
                    </span>
                  </div>
                  
                  <h4 className="text-xl font-semibold text-gray-800 mb-1">
                    {nextSession.title}
                  </h4>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                      <BookOpen className="h-3.5 w-3.5" />
                      {nextSession.disciplineName}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(nextSession.duration)}
                    </span>
          </div>
          
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <CalendarIcon className="h-4 w-4 mr-2 text-blue-600" />
                    <span>
                      {formatFullDate(nextSession.scheduledDate)}
                    </span>
                  </div>
          </div>
        </div>
        
              <div className="mt-5 flex justify-end">
        <button 
                  onClick={() => onStartSession(nextSession)}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 font-medium"
        >
                  <Play className="h-4 w-4" />
                  Iniciar sessão
        </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-xl border border-gray-200">
            <GraduationCap className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-800 font-medium">Nenhuma sessão programada</p>
            <p className="text-sm text-gray-600 max-w-sm mt-1">
              Você não tem sessões de estudo programadas para os próximos dias.
            </p>
            <Link 
              href="/planejamento"
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm flex items-center gap-2 font-medium"
            >
              <Calendar className="h-4 w-4" />
              Programar estudo
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
};

export default NextStudySession; 