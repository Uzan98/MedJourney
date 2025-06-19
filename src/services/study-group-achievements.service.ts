import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export type AchievementType = 
  | 'pomodoro_cycle_completed' 
  | 'pomodoro_cycles_milestone' 
  | 'study_time_milestone' 
  | 'joined_group' 
  | 'ranking_position' 
  | 'daily_streak';

export interface Achievement {
  id: string;
  group_id: string;
  user_id: string;
  username: string;
  achievement_type: AchievementType;
  achievement_data: any;
  created_at: string;
}

// Manter um registro de canais ativos para evitar duplicações
const activeChannels: Record<string, { channel: any; count: number }> = {};

export class StudyGroupAchievementsService {
  /**
   * Registra uma nova conquista para um usuário em um grupo
   */
  static async recordAchievement(
    groupId: string, 
    userId: string, 
    username: string, 
    achievementType: AchievementType, 
    achievementData: any = {}
  ): Promise<boolean> {
    try {
      console.log('Registrando nova conquista:', {
        groupId,
        userId,
        username,
        achievementType,
        achievementData
      });
      
      // Forçar reconexão do Realtime antes de inserir
      // Isso ajuda a garantir que os clientes recebam a notificação
      try {
        supabase.realtime.connect();
      } catch (err) {
        console.warn('Erro ao reconectar Realtime:', err);
      }
      
      const { data, error } = await supabase
        .from('study_group_achievements')
        .insert({
          group_id: groupId,
          user_id: userId,
          username,
          achievement_type: achievementType,
          achievement_data: achievementData
        })
        .select();
      
      if (error) {
        console.error('Erro ao registrar conquista:', error);
        return false;
      }
      
      console.log('Conquista registrada com sucesso:', data);
      
      // Pequeno atraso para garantir que o canal esteja pronto para receber eventos
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Erro ao registrar conquista:', error);
      return false;
    }
  }
  
  /**
   * Obtém as conquistas mais recentes de um grupo
   */
  static async getGroupAchievements(groupId: string): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('study_group_achievements')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Erro ao obter conquistas:', error);
        return [];
      }
      
      return data as Achievement[];
    } catch (error) {
      console.error('Erro:', error);
      return [];
    }
  }
  
  /**
   * Obtém as conquistas de um usuário específico em um grupo
   */
  static async getUserAchievements(groupId: string, userId: string): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('study_group_achievements')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Erro ao obter conquistas do usuário:', error);
        return [];
      }
      
      return data as Achievement[];
    } catch (error) {
      console.error('Erro ao obter conquistas do usuário:', error);
      return [];
    }
  }
  
  /**
   * Configura uma assinatura em tempo real para novas conquistas
   */
  static subscribeToAchievements(
    groupId: string, 
    callback: (achievement: Achievement) => void
  ) {
    try {
      // Verificar se já existe um canal ativo para este grupo
      const channelKey = `group_achievements_${groupId}`;
      
      if (activeChannels[channelKey]) {
        console.log(`Reutilizando canal existente para o grupo ${groupId}`);
        activeChannels[channelKey].count++;
        
        // Retornar um objeto de cancelamento que diminui o contador
        return {
          unsubscribe: () => {
            console.log(`Cancelando assinatura do canal compartilhado: ${channelKey}`);
            if (activeChannels[channelKey]) {
              activeChannels[channelKey].count--;
              
              // Se não há mais assinaturas, remover o canal
              if (activeChannels[channelKey].count <= 0) {
                console.log(`Removendo canal ${channelKey} por falta de assinantes`);
                activeChannels[channelKey].channel.unsubscribe();
                delete activeChannels[channelKey];
              }
            }
          }
        };
      }
      
      // Criar um novo canal
      console.log(`Criando novo canal de assinatura para o grupo ${groupId}: ${channelKey}`);
      
      // Forçar reconexão do Realtime antes de criar o canal
      try {
        supabase.realtime.connect();
      } catch (err) {
        console.warn('Erro ao reconectar Realtime:', err);
      }
      
      const channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'study_group_achievements',
            filter: `group_id=eq.${groupId}`
          },
          (payload) => {
            console.log('Nova conquista recebida:', payload);
            if (payload.new) {
              callback(payload.new as Achievement);
            }
          }
        )
        .subscribe((status) => {
          console.log(`Status da assinatura (${channelKey}):`, status);
          
          // Se o status for TIMED_OUT ou CHANNEL_ERROR, tentar reconectar
          if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            console.log(`Erro no canal ${channelKey}, tentando reconectar...`);
            
            // Remover o canal atual
            if (activeChannels[channelKey]) {
              delete activeChannels[channelKey];
            }
            
            // Tentar reconectar após um breve atraso
            setTimeout(() => {
              if (!activeChannels[channelKey]) {
                console.log(`Recriando canal ${channelKey} após erro`);
                this.subscribeToAchievements(groupId, callback);
              }
            }, 2000);
          }
        });
      
      // Armazenar o canal ativo
      activeChannels[channelKey] = { 
        channel, 
        count: 1 
      };
      
      return {
        unsubscribe: () => {
          console.log(`Cancelando assinatura do canal: ${channelKey}`);
          if (activeChannels[channelKey]) {
            activeChannels[channelKey].count--;
            
            // Se não há mais assinaturas, remover o canal
            if (activeChannels[channelKey].count <= 0) {
              console.log(`Removendo canal ${channelKey} por falta de assinantes`);
              activeChannels[channelKey].channel.unsubscribe();
              delete activeChannels[channelKey];
            }
          }
        }
      };
    } catch (error) {
      console.error('Erro ao configurar assinatura para conquistas:', error);
      // Retornar um objeto com método unsubscribe vazio para evitar erros
      return {
        unsubscribe: () => {
          console.log('Tentativa de cancelar uma assinatura que falhou na criação');
        }
      };
    }
  }
  
  /**
   * Registra conquista de ciclo Pomodoro completado
   */
  static async recordPomodoroCompletion(
    groupId: string,
    userId: string,
    username: string,
    cycleType: 'focus' | 'shortBreak' | 'longBreak',
    totalCompletedCycles: number
  ): Promise<boolean> {
    // Registrar o ciclo completado
    const success = await this.recordAchievement(
      groupId,
      userId,
      username,
      'pomodoro_cycle_completed',
      { cycleType, totalCompletedCycles }
    );
    
    // Se atingiu um marco de ciclos (5, 10, 25, 50, 100)
    const milestones = [5, 10, 25, 50, 100];
    if (success && milestones.includes(totalCompletedCycles)) {
      await this.recordAchievement(
        groupId,
        userId,
        username,
        'pomodoro_cycles_milestone',
        { milestone: totalCompletedCycles }
      );
    }
    
    return success;
  }
  
  /**
   * Registra conquista de tempo de estudo
   */
  static async recordStudyTimeMilestone(
    groupId: string,
    userId: string,
    username: string,
    totalMinutes: number
  ): Promise<boolean> {
    // Marcos de tempo de estudo em minutos (1h, 2h, 5h, 10h, 24h)
    const milestones = [60, 120, 300, 600, 1440];
    
    // Encontrar o maior marco atingido
    const achievedMilestone = milestones.filter(m => totalMinutes >= m).pop();
    
    if (achievedMilestone) {
      return await this.recordAchievement(
        groupId,
        userId,
        username,
        'study_time_milestone',
        { minutes: totalMinutes, milestone: achievedMilestone }
      );
    }
    
    return false;
  }
  
  /**
   * Registra conquista de posição no ranking
   */
  static async recordRankingPosition(
    groupId: string,
    userId: string,
    username: string,
    position: number
  ): Promise<boolean> {
    // Apenas registrar para top 3
    if (position <= 3) {
      return await this.recordAchievement(
        groupId,
        userId,
        username,
        'ranking_position',
        { position }
      );
    }
    
    return false;
  }
  
  /**
   * Formata a mensagem de conquista para exibição
   */
  static formatAchievementMessage(achievement: Achievement): string {
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
  }
  
  /**
   * Obtém o ícone para o tipo de conquista
   */
  static getAchievementIcon(achievementType: AchievementType): string {
    switch (achievementType) {
      case 'pomodoro_cycle_completed':
        return 'Timer';
      case 'pomodoro_cycles_milestone':
        return 'Award';
      case 'study_time_milestone':
        return 'Clock';
      case 'joined_group':
        return 'UserPlus';
      case 'ranking_position':
        return 'Trophy';
      case 'daily_streak':
        return 'Flame';
      default:
        return 'Star';
    }
  }
} 