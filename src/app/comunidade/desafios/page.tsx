'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Clock, Users, ChevronRight, RefreshCw, Target, Award, Calendar, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityChallenge, CommunityChallengService } from '@/services/community-challenges.service';
import { Button } from '@/components/ui/Button';
import UserRanking from '@/components/comunidade/UserRanking';

export default function DesafiosComunidadePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeChallenges, setActiveChallenges] = useState<CommunityChallenge[]>([]);
  const [upcomingChallenges, setUpcomingChallenges] = useState<CommunityChallenge[]>([]);
  const [userParticipations, setUserParticipations] = useState<{[key: string]: boolean}>({});
  
  useEffect(() => {
    if (user) {
      loadChallenges();
      // Registrar o usuário em todos os desafios ativos
      CommunityChallengService.registerInActiveChallenges(user.id);
    }
  }, [user]);
  
  const loadChallenges = async () => {
    setLoading(true);
    try {
      const active = await CommunityChallengService.getActiveChallenges();
      const upcoming = await CommunityChallengService.getUpcomingChallenges();
      
      setActiveChallenges(active);
      setUpcomingChallenges(upcoming);
      
      // Verificar participação do usuário em desafios ativos
      if (user && active.length > 0) {
        const participations: {[key: string]: boolean} = {};
        
        await Promise.all(active.map(async (challenge) => {
          const isParticipating = await CommunityChallengService.isUserParticipating(challenge.id, user.id);
          participations[challenge.id] = isParticipating;
        }));
        
        setUserParticipations(participations);
      }
    } catch (error) {
      console.error('Erro ao carregar desafios:', error);
      toast.error('Não foi possível carregar os desafios');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChallenges();
    setRefreshing(false);
  };
  
  const handleJoinChallenge = async (challengeId: string) => {
    if (!user) return;
    
    try {
      const success = await CommunityChallengService.joinChallenge(
        challengeId,
        user.id,
        user.user_metadata?.name || 'Usuário',
        user.user_metadata?.avatar_url
      );
      
      if (success) {
        toast.success('Você entrou no desafio!');
        setUserParticipations(prev => ({
          ...prev,
          [challengeId]: true
        }));
      }
    } catch (error) {
      console.error('Erro ao participar do desafio:', error);
      toast.error('Não foi possível participar do desafio');
    }
  };
  
  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center mb-6">
          <Link href="/comunidade" className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Desafios da Comunidade</h1>
        </div>
        
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="flex justify-between">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/comunidade" className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Desafios da Comunidade</h1>
        </div>
        
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {activeChallenges.length === 0 && upcomingChallenges.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
              <Trophy className="h-12 w-12 mx-auto text-yellow-500 mb-3" />
              <h2 className="text-xl font-bold mb-2">Nenhum desafio disponível</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Não há desafios ativos ou programados no momento. Novos desafios serão lançados em breve!
              </p>
            </div>
          ) : (
            <>
              {activeChallenges.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                    Desafios Ativos
                  </h2>
                  
                  <div className="grid gap-4">
                    {activeChallenges.map((challenge) => (
                      <div key={challenge.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-semibold">{challenge.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-2">
                              {challenge.description || 'Participe deste desafio da comunidade!'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                          <div className="flex items-center">
                            <Target className="h-4 w-4 mr-2 text-blue-500" />
                            <span>Meta: {challenge.goal_value} {getChallengeTypeLabel(challenge.challenge_type)}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-green-500" />
                            <span>Término: {formatDate(challenge.end_date)}</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <Link 
                            href={`/comunidade/desafios/${challenge.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            Ver detalhes <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                          
                          {userParticipations[challenge.id] ? (
                            <span className="text-green-600 dark:text-green-500 text-sm flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Participando
                            </span>
                          ) : (
                            <Button 
                              onClick={() => handleJoinChallenge(challenge.id)}
                              size="sm"
                              variant="outline"
                            >
                              Participar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {upcomingChallenges.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                    Próximos Desafios
                  </h2>
                  
                  <div className="grid gap-4">
                    {upcomingChallenges.map((challenge) => (
                      <div key={challenge.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-semibold">{challenge.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-2">
                              {challenge.description || 'Em breve disponível para participação!'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-2 text-sm">
                          <div className="flex items-center">
                            <Target className="h-4 w-4 mr-2 text-blue-500" />
                            <span>Meta: {challenge.goal_value} {getChallengeTypeLabel(challenge.challenge_type)}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-green-500" />
                            <span>Início: {formatDate(challenge.start_date)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="md:col-span-1">
          <UserRanking />
        </div>
      </div>
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
      return 'dias de sequência';
    default:
      return 'pontos';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}