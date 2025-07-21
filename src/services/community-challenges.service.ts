'use client';

import { supabase } from '@/lib/supabase';

export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  challenge_type: 'study_time' | 'exams_completed' | 'correct_answers' | 'study_streak';
  goal_value: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  current_value: number;
  joined_at: string;
  completed_at: string | null;
  username?: string;
  avatar_url?: string;
}

export interface UserRankingItem {
  user_id: string;
  username: string;
  avatar_url?: string;
  total_xp: number;
}

interface GlobalXPRankingItem {
  user_id: string;
  username: string;
  avatar_url?: string;
  total_xp: number;
  rank: number;
}

export class CommunityChallengService {
  /**
   * Obter todos os desafios ativos
   */
  static async getActiveChallenges(): Promise<CommunityChallenge[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('community_challenges')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('end_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar desafios ativos:', error);
      return [];
    }
  }

  /**
   * Obter todos os desafios futuros
   */
  static async getUpcomingChallenges(): Promise<CommunityChallenge[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('community_challenges')
        .select('*')
        .eq('is_active', true)
        .gt('start_date', today)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar desafios futuros:', error);
      return [];
    }
  }

  /**
   * Obter detalhes de um desafio específico
   */
  static async getChallengeById(challengeId: string): Promise<CommunityChallenge | null> {
    try {
      const { data, error } = await supabase
        .from('community_challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Erro ao buscar desafio ${challengeId}:`, error);
      return null;
    }
  }

  /**
   * Verificar se o usuário está participando de um desafio
   */
  static async isUserParticipating(challengeId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error(`Erro ao verificar participação no desafio ${challengeId}:`, error);
      return false;
    }
  }

  /**
   * Obter o progresso do usuário em um desafio
   */
  static async getUserProgress(challengeId: string, userId: string): Promise<ChallengeParticipant | null> {
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Erro ao buscar progresso no desafio ${challengeId}:`, error);
      return null;
    }
  }

  /**
   * Participar de um desafio
   */
  static async joinChallenge(challengeId: string, userId: string, username: string, avatarUrl?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: userId,
          username,
          avatar_url: avatarUrl
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Erro ao participar do desafio ${challengeId}:`, error);
      return false;
    }
  }

  /**
   * Obter ranking de um desafio
   */
  static async getChallengeRanking(challengeId: string): Promise<ChallengeParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('current_value', { ascending: false })
        .order('completed_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Erro ao buscar ranking do desafio ${challengeId}:`, error);
      return [];
    }
  }

  /**
   * Obter ranking geral de XP dos usuários
   */
  static async getGlobalXPRanking(limit: number = 10): Promise<UserRankingItem[]> {
    try {
      // Tentar usar a função SQL para obter o ranking de XP
      const { data: xpData, error: xpError } = await supabase
        .rpc('get_global_xp_ranking', { p_limit: limit });

      // Se a função existe e retornou dados com sucesso
      if (!xpError && xpData && xpData.length > 0) {
        return xpData.map((user: GlobalXPRankingItem) => ({
          user_id: user.user_id,
          username: user.username || 'Usuário',
          avatar_url: user.avatar_url,
          total_xp: user.total_xp || 0
        }));
      }
      
      // Fallback: usar os dados dos participantes de desafios
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('user_id, username, avatar_url, current_value')
        .order('current_value', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Agrupar por usuário e somar o XP total
      const userXpMap = new Map<string, UserRankingItem>();
      
      data.forEach(participant => {
        const userId = participant.user_id;
        if (!userXpMap.has(userId)) {
          userXpMap.set(userId, {
            user_id: userId,
            username: participant.username || 'Usuário',
            avatar_url: participant.avatar_url,
            total_xp: participant.current_value || 0
          });
        } else {
          const existingUser = userXpMap.get(userId)!;
          existingUser.total_xp += participant.current_value || 0;
        }
      });
      
      // Converter o Map para array e ordenar por XP
      const result = Array.from(userXpMap.values())
        .sort((a, b) => b.total_xp - a.total_xp)
        .slice(0, limit);
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar ranking global de XP:', error);
      return [];
    }
  }

  /**
   * Registrar o usuário em todos os desafios ativos
   */
  static async registerInActiveChallenges(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('register_user_in_active_challenges', {
        user_uuid: userId
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao registrar em desafios ativos:', error);
      return false;
    }
  }

  /**
   * Atualizar manualmente o progresso do usuário em um desafio
   */
  static async updateChallengeProgress(challengeId: string, userId: string, progressValue: number): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_challenge_progress', {
        p_challenge_id: challengeId,
        p_user_id: userId,
        p_progress_value: progressValue
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar progresso no desafio ${challengeId}:`, error);
      return false;
    }
  }
}