import { supabase } from '@/lib/supabase';
import { StudySessionService, StudySession } from './study-sessions.service';

export interface StudyPlanSession extends StudySession {
  plan_id?: number;
  is_revision?: boolean;
  original_session_id?: number;
}

export interface WeeklySchedule {
  day: number; // 0-6 (domingo-sábado)
  start_time: string; // formato HH:MM
  end_time: string; // formato HH:MM
  user_id: string;
}

export class PlanningService {
  /**
   * Cria uma nova sessão de estudo planejada manualmente
   * @param session Dados da sessão de estudo
   * @returns A sessão criada ou null em caso de erro
   */
  static async createPlannedSession(session: Omit<StudyPlanSession, 'id' | 'created_at' | 'updated_at'>): Promise<StudyPlanSession | null> {
    try {
      // Obter ID do usuário atual se não fornecido
      if (!session.user_id) {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession?.user) {
          console.error('Usuário não autenticado');
          return null;
        }
        session.user_id = authSession.user.id;
      }

      // Definir o status como 'agendada' se não for especificado
      if (!session.status) {
        session.status = 'agendada';
      }

      // Inserir a sessão no banco de dados usando o serviço existente
      const createdSession = await StudySessionService.createSession(session);
      
      if (!createdSession) {
        console.error('Erro ao criar sessão de estudo planejada');
        return null;
      }

      return createdSession as StudyPlanSession;
    } catch (error) {
      console.error('Erro ao criar sessão de estudo planejada:', error);
      return null;
    }
  }

  /**
   * Atualiza uma sessão de estudo planejada existente
   * @param id ID da sessão a ser atualizada
   * @param updates Dados a serem atualizados
   * @returns A sessão atualizada ou null em caso de erro
   */
  static async updatePlannedSession(id: number, updates: Partial<StudyPlanSession>): Promise<StudyPlanSession | null> {
    try {
      // Usar o serviço existente para atualizar a sessão
      const updatedSession = await StudySessionService.updateSession(id, updates);
      
      if (!updatedSession) {
        console.error('Erro ao atualizar sessão de estudo planejada');
        return null;
      }

      return updatedSession as StudyPlanSession;
    } catch (error) {
      console.error('Erro ao atualizar sessão de estudo planejada:', error);
      return null;
    }
  }

  /**
   * Exclui uma sessão de estudo planejada
   * @param id ID da sessão a ser excluída
   * @returns true se a exclusão foi bem-sucedida, false caso contrário
   */
  static async deletePlannedSession(id: number): Promise<boolean> {
    try {
      // Usar o serviço existente para excluir a sessão
      return await StudySessionService.deleteSession(id);
    } catch (error) {
      console.error('Erro ao excluir sessão de estudo planejada:', error);
      return false;
    }
  }

  /**
   * Busca todas as sessões de estudo planejadas do usuário atual
   * @param startDate Data de início para filtrar as sessões (opcional)
   * @param endDate Data de fim para filtrar as sessões (opcional)
   * @returns Array de sessões de estudo planejadas ou array vazio em caso de erro
   */
  static async getPlannedSessions(startDate?: Date, endDate?: Date): Promise<StudyPlanSession[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.error('Usuário não autenticado');
        return [];
      }

      let query = supabase
        .from('study_sessions')
        .select(`
          *,
          disciplines:discipline_id (id, name)
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'agendada')
        .order('scheduled_date', { ascending: true });

      // Aplicar filtros de data, se fornecidos
      if (startDate) {
        query = query.gte('scheduled_date', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('scheduled_date', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar sessões planejadas:', error);
        return [];
      }

      return data as unknown as StudyPlanSession[];
    } catch (error) {
      console.error('Erro ao buscar sessões planejadas:', error);
      return [];
    }
  }

  /**
   * Busca todas as sessões de estudo planejadas para uma semana específica
   * @param weekStartDate Data de início da semana (geralmente um domingo)
   * @returns Array de sessões de estudo planejadas para a semana ou array vazio em caso de erro
   */
  static async getWeeklyPlannedSessions(weekStartDate: Date): Promise<StudyPlanSession[]> {
    try {
      // Calcular a data de fim da semana (7 dias depois)
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      
      // Buscar sessões dentro do intervalo da semana
      return await this.getPlannedSessions(weekStartDate, weekEndDate);
    } catch (error) {
      console.error('Erro ao buscar sessões da semana:', error);
      return [];
    }
  }

  /**
   * Busca todas as sessões de estudo planejadas para um mês específico
   * @param year Ano
   * @param month Mês (1-12)
   * @returns Array de sessões de estudo planejadas para o mês ou array vazio em caso de erro
   */
  static async getMonthlyPlannedSessions(year: number, month: number): Promise<StudyPlanSession[]> {
    try {
      // Calcular a data de início do mês
      const monthStartDate = new Date(year, month - 1, 1);
      
      // Calcular a data de fim do mês
      const monthEndDate = new Date(year, month, 0);
      
      // Buscar sessões dentro do intervalo do mês
      return await this.getPlannedSessions(monthStartDate, monthEndDate);
    } catch (error) {
      console.error('Erro ao buscar sessões do mês:', error);
      return [];
    }
  }
} 