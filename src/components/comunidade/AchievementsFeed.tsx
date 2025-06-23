'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Award, Clock, Timer, Trophy, UserPlus, Flame, Star, 
  ChevronRight, Sparkles, MoreHorizontal, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Achievement, StudyGroupAchievementsService } from '@/services/study-group-achievements.service';
import { supabase } from '@/lib/supabase';

interface AchievementsFeedProps {
  groupId: string;
}

export default function AchievementsFeed({ groupId }: AchievementsFeedProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedRef = useRef<Date>(new Date());
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  
  // Função para carregar as conquistas
  const loadAchievements = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    
    console.log('Carregando conquistas para o grupo:', groupId);
    
    try {
      const data = await StudyGroupAchievementsService.getGroupAchievements(groupId);
      console.log('Conquistas carregadas:', data);
      
      // Atualizar o estado apenas se houver novas conquistas
      setAchievements(prevAchievements => {
        // Se não há conquistas anteriores, simplesmente definir as novas
        if (prevAchievements.length === 0) return data;
        
        // Verificar se há novas conquistas
        const newAchievements = data.filter(newAchievement => 
          !prevAchievements.some(prevAchievement => prevAchievement.id === newAchievement.id)
        );
        
        if (newAchievements.length > 0) {
          console.log(`${newAchievements.length} novas conquistas encontradas via polling`);
          // Mesclar as novas conquistas com as existentes, mantendo a ordem por data
          const merged = [...newAchievements, ...prevAchievements];
          merged.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          return merged;
        }
        
        // Se não há novas conquistas, manter o estado anterior
        return prevAchievements;
      });
      
      // Atualizar o timestamp da última busca
      lastFetchedRef.current = new Date();
    } catch (err) {
      console.error('Erro ao carregar conquistas:', err);
      if (!silent) {
        setError('Não foi possível carregar as conquistas. Tente novamente.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [groupId]);
  
  // Configurar a assinatura em tempo real
  const setupRealtimeSubscription = useCallback(() => {
    console.log('Configurando assinatura em tempo real para o grupo:', groupId);
    
    // Cancelar assinatura anterior se existir
    if (subscriptionRef.current) {
      console.log('Cancelando assinatura anterior');
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    // Criar nova assinatura com nome de canal único para evitar conflitos
    const channelName = `group_achievements_${groupId}_${Date.now()}`;
    console.log(`Criando canal: ${channelName}`);
    
    try {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'study_group_achievements',
            filter: `group_id=eq.${groupId}`
          },
          (payload) => {
            console.log('Nova conquista recebida via subscription:', payload);
            setRealtimeStatus('connected');
            
            // Verificar se o payload contém os dados necessários
            if (payload.new && typeof payload.new === 'object') {
              const newAchievement = payload.new as Achievement;
              
              // Adicionar a nova conquista no início da lista
              setAchievements(prev => {
                // Verificar se a conquista já existe para evitar duplicatas
                const exists = prev.some(a => a.id === newAchievement.id);
                if (exists) {
                  return prev;
                }
                return [newAchievement, ...prev];
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('Status da assinatura:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('Assinatura realizada com sucesso!');
            setRealtimeStatus('connected');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Erro no canal, tentando reconectar...');
            setRealtimeStatus('disconnected');
            // Tentar reconectar após 2 segundos
            setTimeout(() => {
              setupRealtimeSubscription();
            }, 2000);
          } else if (status === 'TIMED_OUT') {
            console.error('Timeout na assinatura, tentando reconectar...');
            setRealtimeStatus('disconnected');
            // Tentar reconectar após 2 segundos
            setTimeout(() => {
              setupRealtimeSubscription();
            }, 2000);
          }
        });
      
      // Armazenar a referência para poder cancelar depois
      subscriptionRef.current = {
        unsubscribe: () => {
          console.log(`Cancelando assinatura do canal: ${channelName}`);
          channel.unsubscribe();
        }
      };
    } catch (error) {
      console.error('Erro ao configurar assinatura:', error);
      setRealtimeStatus('disconnected');
    }
  }, [groupId]);
  
  // Configurar polling como fallback
  const setupPolling = useCallback(() => {
    console.log('Configurando polling como fallback');
    
    // Limpar intervalo anterior se existir
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Configurar novo intervalo (a cada 15 segundos)
    pollingIntervalRef.current = setInterval(() => {
      console.log('Executando polling para buscar novas conquistas');
      loadAchievements(true); // Carregar silenciosamente
    }, 15000);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [loadAchievements]);
  
  // Efeito para carregar as conquistas e configurar assinatura
  useEffect(() => {
    console.log('AchievementsFeed montado com groupId:', groupId);
    
    // Carregar conquistas iniciais
    loadAchievements();
    
    // Configurar assinatura em tempo real
    setupRealtimeSubscription();
    
    // Configurar polling como fallback
    const cleanupPolling = setupPolling();
    
    // Limpar assinaturas e intervalos ao desmontar
    return () => {
      console.log('AchievementsFeed desmontado');
      
      if (subscriptionRef.current) {
        console.log('Limpando assinatura ao desmontar componente');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      
      cleanupPolling();
    };
  }, [groupId, loadAchievements, setupPolling, setupRealtimeSubscription]);
  
  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'pomodoro_cycle_completed':
        return <Timer className="h-5 w-5 text-blue-500" />;
      case 'pomodoro_cycles_milestone':
        return <Award className="h-5 w-5 text-purple-500" />;
      case 'study_time_milestone':
        return <Clock className="h-5 w-5 text-green-500" />;
      case 'joined_group':
        return <UserPlus className="h-5 w-5 text-indigo-500" />;
      case 'ranking_position':
        return <Trophy className="h-5 w-5 text-amber-500" />;
      case 'daily_streak':
        return <Flame className="h-5 w-5 text-orange-500" />;
      default:
        return <Star className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const getAchievementColor = (type: string) => {
    switch (type) {
      case 'pomodoro_cycle_completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pomodoro_cycles_milestone':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'study_time_milestone':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'joined_group':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'ranking_position':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'daily_streak':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatAchievementMessage = (achievement: Achievement) => {
    const { achievement_type, achievement_data, username } = achievement;
    
    switch (achievement_type) {
      case 'pomodoro_cycle_completed':
        const cycleType = achievement_data.cycleType;
        if (cycleType === 'focus') {
          return `${username} completou um ciclo de foco Pomodoro`;
        } else if (cycleType === 'shortBreak') {
          return `${username} completou uma pausa curta`;
        } else {
          return `${username} completou uma pausa longa`;
        }
        
      case 'pomodoro_cycles_milestone':
        return `${username} atingiu ${achievement_data.milestone} ciclos Pomodoro! 🎉`;
        
      case 'study_time_milestone':
        const hours = Math.floor(achievement_data.milestone / 60);
        return `${username} estudou por ${hours} hora${hours > 1 ? 's' : ''} no grupo! 🎓`;
        
      case 'joined_group':
        return `${username} entrou no grupo de estudos`;
        
      case 'ranking_position':
        const position = achievement_data.position;
        const medals = ['🥇', '🥈', '🥉'];
        return `${username} alcançou a ${position}ª posição no ranking! ${medals[position - 1]}`;
        
      case 'daily_streak':
        return `${username} estudou por ${achievement_data.days} dias consecutivos! 🔥`;
        
      default:
        return `${username} conquistou algo novo`;
    }
  };

  // Função para forçar atualização e reiniciar conexões
  const handleRefresh = () => {
    loadAchievements();
    setupRealtimeSubscription();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-10 h-10 rounded-full border-3 border-t-blue-500 border-blue-200 animate-spin"></div>
        <p className="mt-3 text-gray-600 text-sm">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
          <span className="text-red-500 text-xl">!</span>
        </div>
        <p className="text-gray-700 text-sm mb-3">{error}</p>
        <Button 
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="flex items-center"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-3">
          <Sparkles className="h-6 w-6 text-blue-400" />
        </div>
        <p className="text-gray-700 font-medium text-sm mb-1">Nenhuma atividade ainda</p>
        <p className="text-gray-500 text-xs max-w-md">
          As atividades dos membros do grupo aparecerão aqui quando eles completarem ciclos Pomodoro ou outras realizações.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">
          Atividades Recentes
          {realtimeStatus === 'connected' && (
            <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full" title="Atualizações em tempo real ativas"></span>
          )}
          {realtimeStatus === 'disconnected' && (
            <span className="ml-2 inline-block w-2 h-2 bg-amber-500 rounded-full" title="Usando polling para atualizações"></span>
          )}
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          className="text-gray-500 hover:text-gray-700 p-1 h-auto"
          title="Atualizar feed e reconectar"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
        {achievements.map((achievement) => (
          <div 
            key={achievement.id}
            className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start">
              <div className={`p-2 rounded-lg mr-2.5 ${getAchievementColor(achievement.achievement_type)}`}>
                {getAchievementIcon(achievement.achievement_type)}
              </div>
              
              <div className="flex-1">
                <p className="text-gray-800 text-sm font-medium">
                  {formatAchievementMessage(achievement)}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {formatTimestamp(achievement.created_at)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
