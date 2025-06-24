'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, Clock, Calendar, ChevronRight, Target } from 'lucide-react';
import { CommunityChallenge, CommunityChallengService } from '@/services/community-challenges.service';
import { useAuth } from '@/contexts/AuthContext';

export default function ChallengesWidget() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeChallenges, setActiveChallenges] = useState<CommunityChallenge[]>([]);

  useEffect(() => {
    if (user) {
      loadActiveChallenges();
      // Registrar o usuário em desafios ativos quando o componente é montado
      CommunityChallengService.registerInActiveChallenges(user.id);
    }
  }, [user]);
  
  const loadActiveChallenges = async () => {
    setLoading(true);
    try {
      const challenges = await CommunityChallengService.getActiveChallenges();
      // Limitar a 2 desafios para o widget
      setActiveChallenges(challenges.slice(0, 2));
    } catch (error) {
      console.error('Erro ao carregar desafios:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'study_time':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'exams_completed':
        return <Target className="h-5 w-5 text-green-500" />;
      case 'correct_answers':
        return <Target className="h-5 w-5 text-purple-500" />;
      case 'study_streak':
        return <Target className="h-5 w-5 text-orange-500" />;
      default:
        return <Trophy className="h-5 w-5 text-amber-500" />;
    }
  };
  
  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    return `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`;
  };
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <div className="flex items-center mb-3">
          <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
          <h3 className="text-lg font-medium">Desafios da Comunidade</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (activeChallenges.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <div className="flex items-center mb-3">
          <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
          <h3 className="text-lg font-medium">Desafios da Comunidade</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Não há desafios ativos no momento. Fique atento para novos desafios em breve!
        </p>
        <Link href="/comunidade/desafios" className="mt-3 flex items-center text-blue-600 hover:text-blue-800 text-sm">
          Ver todos os desafios <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
          <h3 className="text-lg font-medium">Desafios da Comunidade</h3>
        </div>
      </div>
      
      <div className="space-y-3">
        {activeChallenges.map((challenge) => (
          <Link 
            href={`/comunidade/desafios/${challenge.id}`} 
            key={challenge.id}
            className="block bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg p-3 transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{challenge.title}</h4>
                <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-300">
                  <Target className="h-4 w-4 mr-1" />
                  <span>Meta: {challenge.goal_value} {getChallengeTypeLabel(challenge.challenge_type)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(challenge.end_date)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <Link href="/comunidade/desafios" className="mt-3 flex items-center text-blue-600 hover:text-blue-800 text-sm">
        Ver todos os desafios <ChevronRight className="h-4 w-4 ml-1" />
      </Link>
    </div>
  );
}

// Função auxiliar para formatar o tipo de desafio
function getChallengeTypeLabel(type: string): string {
  switch (type) {
    case 'study_time':
      return 'minutos estudados';
    case 'exams_completed':
      return 'simulados concluídos';
    case 'correct_answers':
      return 'respostas corretas';
    case 'study_streak':
      return 'dias consecutivos';
    default:
      return '';
  }
}

// Função auxiliar para formatar data
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}