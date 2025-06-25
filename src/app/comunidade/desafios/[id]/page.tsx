'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Trophy, Users, RefreshCw, Target, Award, Calendar, Clock, CheckCircle, ChevronUp, User, Medal } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityChallenge, ChallengeParticipant, CommunityChallengService } from '@/services/community-challenges.service';
import { Button } from '@/components/ui/button';

export default function DesafioDetalhesPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenge, setChallenge] = useState<CommunityChallenge | null>(null);
  const [participants, setParticipants] = useState<ChallengeParticipant[]>([]);
  const [userProgress, setUserProgress] = useState<ChallengeParticipant | null>(null);
  const [isParticipating, setIsParticipating] = useState(false);
  
  useEffect(() => {
    if (user && id) {
      loadChallengeDetails();
    }
  }, [user, id]);
  
  const loadChallengeDetails = async () => {
    if (!user || !id) return;
    
    setLoading(true);
    try {
      // Carregar detalhes do desafio
      const challengeDetails = await CommunityChallengService.getChallengeById(id as string);
      if (!challengeDetails) {
        toast.error('Desafio não encontrado');
        return;
      }
      
      setChallenge(challengeDetails);
      
      // Carregar ranking de participantes
      const ranking = await CommunityChallengService.getChallengeRanking(id as string);
      setParticipants(ranking);
      
      // Verificar participação do usuário
      const isUserParticipating = await CommunityChallengService.isUserParticipating(id as string, user.id);
      setIsParticipating(isUserParticipating);
      
      // Carregar progresso do usuário se estiver participando
      if (isUserParticipating) {
        const progress = await CommunityChallengService.getUserProgress(id as string, user.id);
        setUserProgress(progress);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes do desafio:', error);
      toast.error('Não foi possível carregar os detalhes do desafio');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChallengeDetails();
    setRefreshing(false);
  };
  
  const handleJoinChallenge = async () => {
    if (!user || !challenge) return;
    
    try {
      const success = await CommunityChallengService.joinChallenge(
        challenge.id,
        user.id,
        user.user_metadata?.name || 'Usuário',
        user.user_metadata?.avatar_url
      );
      
      if (success) {
        toast.success('Você entrou no desafio!');
        setIsParticipating(true);
        await loadChallengeDetails(); // Recarregar para obter o progresso
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
          <Link href="/comunidade/desafios" className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse mb-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full mr-3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (!challenge) {
    return (
      <div className="p-4">
        <div className="flex items-center mb-6">
          <Link href="/comunidade/desafios" className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Desafio não encontrado</h1>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            O desafio que você está procurando não foi encontrado ou não está mais disponível.
          </p>
          <Link href="/comunidade/desafios" className="text-blue-600 hover:text-blue-800">
            Voltar para a lista de desafios
          </Link>
        </div>
      </div>
    );
  }
  
  // Calcular progresso do usuário em porcentagem
  const userProgressPercent = userProgress 
    ? Math.min(Math.round((userProgress.current_value / challenge.goal_value) * 100), 100)
    : 0;
  
  // Verificar se o desafio está ativo
  const today = new Date();
  const startDate = new Date(challenge.start_date);
  const endDate = new Date(challenge.end_date);
  const isActive = today >= startDate && today <= endDate;
  const isCompleted = userProgress?.completed_at !== null;
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href="/comunidade/desafios" className="mr-4">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Detalhes do Desafio</h1>
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
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center mb-2">
          <Trophy className="h-6 w-6 text-yellow-500 mr-3" />
          <h2 className="text-xl font-bold">{challenge.title}</h2>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {challenge.description || 'Participe deste desafio da comunidade!'}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex items-center">
            <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-300">Meta</p>
              <p className="font-medium">{challenge.goal_value} {getChallengeTypeLabel(challenge.challenge_type)}</p>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 flex items-center">
            <Calendar className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
            <div>
              <p className="text-xs text-green-700 dark:text-green-300">Período</p>
              <p className="font-medium">{formatDateRange(challenge.start_date, challenge.end_date)}</p>
            </div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 flex items-center">
            <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-3" />
            <div>
              <p className="text-xs text-purple-700 dark:text-purple-300">Participantes</p>
              <p className="font-medium">{participants.length} participante(s)</p>
            </div>
          </div>
        </div>
        
        {isParticipating ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Seu progresso</h3>
              <span className="text-sm font-medium">
                {userProgress?.current_value || 0} / {challenge.goal_value} ({userProgressPercent}%)
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${isCompleted ? 'bg-green-600' : 'bg-blue-600'}`}
                style={{ width: `${userProgressPercent}%` }}
              ></div>
            </div>
            
            {isCompleted && (
              <div className="mt-3 flex items-center text-green-600 dark:text-green-500 text-sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>Desafio concluído! Parabéns!</span>
              </div>
            )}
          </div>
        ) : isActive ? (
          <Button 
            onClick={handleJoinChallenge}
            className="w-full"
          >
            Participar deste desafio
          </Button>
        ) : (
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              {today < startDate 
                ? 'Este desafio ainda não começou.' 
                : 'Este desafio já foi encerrado.'}
            </p>
          </div>
        )}
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Award className="h-5 w-5 mr-2 text-yellow-500" />
          Ranking de Participantes
        </h3>
        
        {participants.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 py-6">
            Nenhum participante ainda. Seja o primeiro a participar!
          </p>
        ) : (
          <div className="space-y-3">
            {participants.map((participant, index) => (
              <div 
                key={participant.id} 
                className={`flex items-center justify-between p-3 rounded-lg ${
                  participant.user_id === user?.id 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center mr-3">
                    {index < 3 ? (
                      <Medal className={`h-6 w-6 ${
                        index === 0 ? 'text-yellow-500' : 
                        index === 1 ? 'text-gray-400' : 
                        'text-amber-700'
                      }`} />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <p className="font-medium">
                      {participant.username || 'Usuário'}
                      {participant.user_id === user?.id && ' (Você)'}
                    </p>
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Target className="h-3 w-3 mr-1" />
                      <span>{participant.current_value} / {challenge.goal_value}</span>
                      
                      {participant.completed_at && (
                        <span className="ml-2 flex items-center text-green-600 dark:text-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Concluído
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {Math.min(Math.round((participant.current_value / challenge.goal_value) * 100), 100)}%
                  </div>
                  {participant.completed_at && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {formatDate(participant.completed_at)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
      return 'dias consecutivos';
    default:
      return '';
  }
}

// Função auxiliar para formatar data
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Função auxiliar para formatar intervalo de datas
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
}