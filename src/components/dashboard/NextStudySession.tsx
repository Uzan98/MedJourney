"use client";

import React from 'react';
import { BookOpen, Clock, CalendarDays, GraduationCap } from 'lucide-react';
import { Card } from '../ui/Card';
import { StudySession } from '../../lib/types/dashboard';
import { formatDate, formatTime } from '../../lib/utils';

interface NextStudySessionProps {
  session: StudySession | null;
}

const NextStudySession = ({ session }: NextStudySessionProps) => {
  if (!session) {
    return (
      <Card 
        title="Próxima Sessão de Estudo" 
        className="h-full"
        icon={<GraduationCap className="h-5 w-5" />}
        showOptions
      >
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <BookOpen className="h-12 w-12 text-blue-200 mb-2" />
          <p className="text-gray-500">Não há sessões programadas</p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Próxima Sessão de Estudo" 
      className="h-full"
      icon={<GraduationCap className="h-5 w-5" />}
      showOptions
    >
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-800 text-lg">{session.title}</h3>
          <div className="text-sm bg-blue-50 text-blue-600 px-2 py-1 rounded-full inline-block mt-1">
            {session.disciplineName}
          </div>
        </div>
        
        <div className="flex flex-col space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <CalendarDays className="h-4 w-4 mr-2 text-gray-400" />
            <span>{formatDate(session.scheduledDate)}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2 text-gray-400" />
            <span>Duração: {formatTime(session.duration)}</span>
          </div>
        </div>
        
        <button 
          className="w-full flex justify-center items-center bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md transition-colors text-sm font-medium"
          aria-label="Iniciar sessão de estudo"
          tabIndex={0}
        >
          Iniciar Sessão
        </button>
      </div>
    </Card>
  );
};

export default NextStudySession; 