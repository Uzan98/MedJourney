import { useState } from 'react';
import Link from 'next/link';
import { Flame, Info, Calendar, Trophy, ChevronRight } from 'lucide-react';
import { StudyStreak as StudyStreakType } from '@/services/study-activities.service';
import StudyActivityInfo from './StudyActivityInfo';

interface StudyStreakProps {
  streak: StudyStreakType | null;
  isLoading: boolean;
}

const StudyStreak: React.FC<StudyStreakProps> = ({ streak, isLoading }) => {
  const [showInfo, setShowInfo] = useState(false);

  // Função para formatar a data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-5 animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4 w-1/2"></div>
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Flame className="h-5 w-5 text-orange-500 mr-2" />
          Sequência de Estudos
        </h3>
        <button
          onClick={() => setShowInfo(true)}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Informações sobre sequência de estudos"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-6">
          <div className="text-center">
            <span className="block text-sm font-medium text-gray-500">Sequência atual</span>
            <div className="flex items-center justify-center mt-1">
              <Flame className="h-5 w-5 text-orange-500 mr-1" />
              <span className="text-2xl font-bold">{streak?.currentStreak || 0}</span>
              <span className="text-sm text-gray-500 ml-1">dias</span>
            </div>
          </div>

          <div className="text-center">
            <span className="block text-sm font-medium text-gray-500">Maior sequência</span>
            <div className="flex items-center justify-center mt-1">
              <Trophy className="h-5 w-5 text-amber-500 mr-1" />
              <span className="text-2xl font-bold">{streak?.longestStreak || 0}</span>
              <span className="text-sm text-gray-500 ml-1">dias</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center mb-2">
            <Calendar className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Últimos 7 dias</span>
          </div>

          <div className="flex justify-between mt-3">
            {streak?.lastWeekActivities.map((day, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center mb-1 
                    ${day.hasActivity ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}
                >
                  {index === 6 ? <Flame className="h-4 w-4" /> : (index + 1)}
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(day.date).split(',')[0]}
                </span>
              </div>
            )) || Array(7).fill(0).map((_, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mb-1 text-gray-400">
                  {index + 1}
                </div>
                <span className="text-xs text-gray-500">-</span>
              </div>
            ))}
          </div>
        </div>

        {streak?.lastActivity && (
          <div className="mt-4 pt-4 border-t text-sm text-gray-600">
            <p>
              Última atividade:{' '}
              {new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(streak.lastActivity))}
            </p>
          </div>
        )}

        <Link
          href="/dashboard/estudos"
          className="mt-4 flex items-center justify-center text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Ver histórico de estudos <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      <StudyActivityInfo isOpen={showInfo} onClose={() => setShowInfo(false)} />
    </div>
  );
};

export default StudyStreak; 