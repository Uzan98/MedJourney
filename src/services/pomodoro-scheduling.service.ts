import { supabase } from '@/lib/supabase';
import { PlanningService, StudyPlanSession } from './planning.service';
import { getCurrentUserId } from '@/lib/auth-utils';

export interface PomodoroScheduledSession extends StudyPlanSession {
  // Herda todas as propriedades de StudyPlanSession
}

export interface CreatePomodoroSessionData {
  title: string;
  scheduled_date: string;
  duration_minutes: number;
  discipline_id?: number;
  subject_id?: number;
  notes?: string;
}

export class PomodoroSchedulingService {
  /**
   * Cria uma nova sessão pomodoro agendada
   */
  static async createScheduledSession(sessionData: CreatePomodoroSessionData): Promise<PomodoroScheduledSession | null> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.error('Usuário não autenticado');
        return null;
      }

      const sessionToCreate: Omit<StudyPlanSession, 'id' | 'created_at' | 'updated_at'> = {
        ...sessionData,
        user_id: userId,
        status: 'agendada',
        type: 'pomodoro',
        description: sessionData.notes
      };

      const createdSession = await PlanningService.createPlannedSession(sessionToCreate);
      return createdSession as PomodoroScheduledSession;
    } catch (error) {
      console.error('Erro ao criar sessão pomodoro agendada:', error);
      return null;
    }
  }

  /**
   * Busca sessões pomodoro agendadas do usuário
   */
  static async getScheduledSessions(
    startDate?: Date,
    endDate?: Date
  ): Promise<PomodoroScheduledSession[]> {
    try {
      const sessions = await PlanningService.getPlannedSessions(startDate, endDate);
      // Filtrar apenas sessões do tipo pomodoro
      return sessions.filter(session => session.type === 'pomodoro') as PomodoroScheduledSession[];
    } catch (error) {
      console.error('Erro ao buscar sessões pomodoro agendadas:', error);
      return [];
    }
  }

  /**
   * Atualiza uma sessão agendada
   */
  static async updateScheduledSession(
    sessionId: number, 
    updates: Partial<StudyPlanSession>
  ): Promise<PomodoroScheduledSession | null> {
    try {
      const updatedSession = await PlanningService.updatePlannedSession(sessionId, updates);
      return updatedSession as PomodoroScheduledSession;
    } catch (error) {
      console.error('Erro ao atualizar sessão agendada:', error);
      return null;
    }
  }

  /**
   * Cancela uma sessão agendada
   */
  static async cancelScheduledSession(sessionId: number): Promise<boolean> {
    try {
      const updatedSession = await this.updateScheduledSession(sessionId, {
        status: 'cancelada'
      });
      
      return updatedSession !== null;
    } catch (error) {
      console.error('Erro ao cancelar sessão agendada:', error);
      return false;
    }
  }

  /**
   * Inicia uma sessão agendada
   */
  static async startScheduledSession(sessionId: number): Promise<boolean> {
    try {
      const updatedSession = await this.updateScheduledSession(sessionId, {
        status: 'em_andamento'
      });
      
      return updatedSession !== null;
    } catch (error) {
      console.error('Erro ao iniciar sessão agendada:', error);
      return false;
    }
  }

  /**
   * Completa uma sessão agendada
   */
  static async completeScheduledSession(sessionId: number): Promise<boolean> {
    try {
      const updatedSession = await this.updateScheduledSession(sessionId, {
        status: 'concluida'
      });
      
      return updatedSession !== null;
    } catch (error) {
      console.error('Erro ao completar sessão agendada:', error);
      return false;
    }
  }

  /**
   * Busca sessões próximas (nas próximas 2 horas)
   */
  static async getUpcomingSessions(): Promise<PomodoroScheduledSession[]> {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    return this.getScheduledSessions(now, twoHoursLater);
  }

  /**
   * Busca sessões agendadas para hoje
   */
  static async getTodaysSessions(): Promise<PomodoroScheduledSession[]> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    return this.getScheduledSessions(startOfDay, endOfDay);
  }
}