import { supabase } from '@/lib/supabase';
import { StudyStreakService } from '@/lib/study-streak-service';
import { format } from 'date-fns';

export interface StudySession {
  id?: number;
  user_id: string;
  discipline_id?: number;
  subject_id?: number;
  title: string;
  scheduled_date?: string;
  duration_minutes: number;
  actual_duration_minutes?: number;
  notes?: string;
  completed?: boolean;
  status?: 'pendente' | 'agendada' | 'em-andamento' | 'concluida' | 'cancelada';
  type?: 'new-content' | 'revision' | 'practice' | 'exam-prep';
  created_at?: string;
  updated_at?: string;
}

export class StudySessionService {
  /**
   * Cria uma nova sessão de estudo
   * @param session Dados da sessão de estudo
   * @returns A sessão criada ou null em caso de erro
   */
  static async createSession(session: Omit<StudySession, 'id' | 'created_at' | 'updated_at'>): Promise<StudySession | null> {
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

      // Inserir a sessão no banco de dados
      const { data, error } = await supabase
        .from('study_sessions')
        .insert(session)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar sessão de estudo:', error);
        return null;
      }

      // Se a sessão já estiver marcada como concluída, registre a atividade
      if (session.completed && session.discipline_id) {
        await StudyStreakService.recordStudySession(
          session.duration_minutes,
          session.discipline_id,
          data.id
        );
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar sessão de estudo:', error);
      return null;
    }
  }

  /**
   * Atualiza uma sessão de estudo existente
   * @param id ID da sessão a ser atualizada
   * @param updates Dados a serem atualizados
   * @returns A sessão atualizada ou null em caso de erro
   */
  static async updateSession(id: number, updates: Partial<StudySession>): Promise<StudySession | null> {
    try {
      // Verificar se o usuário é o proprietário da sessão
      const { data: authData } = await supabase.auth.getSession();
      const userId = authData.session?.user?.id;
      
      if (!userId) {
        console.error('Usuário não autenticado');
        return null;
      }

      // Atualizar a sessão
      const { data, error } = await supabase
        .from('study_sessions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar sessão de estudo:', error);
        return null;
      }

      // Se a sessão foi marcada como concluída, registre a atividade
      if (updates.completed === true && updates.discipline_id) {
        await StudyStreakService.recordStudySession(
          updates.duration_minutes || data.duration_minutes,
          updates.discipline_id,
          id
        );
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar sessão de estudo:', error);
      return null;
    }
  }

  /**
   * Marca uma sessão como concluída
   * @param id ID da sessão
   * @param actualDuration Duração real da sessão (opcional)
   * @returns A sessão atualizada ou null em caso de erro
   */
  static async completeSession(id: number, actualDuration?: number): Promise<StudySession | null> {
    try {
      // Buscar a sessão primeiro para obter a disciplina e duração
      const { data: session, error: fetchError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar sessão de estudo:', fetchError);
        return null;
      }

      const updates = {
        completed: true,
        status: 'concluida' as const,
        actual_duration_minutes: actualDuration || session.duration_minutes
      };

      // Atualizar a sessão
      const { data, error } = await supabase
        .from('study_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao completar sessão de estudo:', error);
        return null;
      }

      // Registrar a atividade de estudo
      if (session.discipline_id) {
        await StudyStreakService.recordStudySession(
          updates.actual_duration_minutes,
          session.discipline_id,
          id
        );
      }

      return data;
    } catch (error) {
      console.error('Erro ao completar sessão de estudo:', error);
      return null;
    }
  }

  /**
   * Exclui uma sessão de estudo
   * @param id ID da sessão a ser excluída
   * @returns true se a exclusão foi bem-sucedida, false caso contrário
   */
  static async deleteSession(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir sessão de estudo:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao excluir sessão de estudo:', error);
      return false;
    }
  }

  /**
   * Busca todas as sessões de estudo do usuário atual
   * @param includeCompleted Define se deve incluir sessões concluídas
   * @returns Array de sessões de estudo ou array vazio em caso de erro
   */
  static async getUserSessions(includeCompleted: boolean = true): Promise<StudySession[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        console.error('Usuário não autenticado');
        return [];
      }

      let query = supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId);

      if (!includeCompleted) {
        query = query.eq('completed', false);
      }

      const { data, error } = await query.order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar sessões de estudo:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar sessões de estudo:', error);
      return [];
    }
  }

  /**
   * Busca sessões de estudo agendadas para os próximos dias
   * @param days Número de dias a considerar
   * @returns Array de sessões agendadas ou array vazio em caso de erro
   */
  static async getUpcomingSessions(days: number = 7): Promise<StudySession[]> {
    try {
      // Depuração
      console.log('getUpcomingSessions: Iniciando busca...');
      
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        console.error('getUpcomingSessions: Usuário não autenticado');
        return [];
      }

      // Obter data atual no início do dia (00:00:00) no fuso horário local
      const now = new Date();
      // Zeramos as horas para pegar qualquer sessão que esteja agendada para hoje
      now.setHours(0, 0, 0, 0);
      
      // Calcular data futura (hoje + days) no fuso horário local
      const future = new Date();
      future.setDate(future.getDate() + days);
      future.setHours(23, 59, 59, 999);
      
      // Converter para ISO String para usar no filtro
      const nowISO = now.toISOString();
      const futureISO = future.toISOString();
      
      console.log('getUpcomingSessions: Buscando sessões entre:', nowISO, 'e', futureISO);
      console.log('getUpcomingSessions: Usuário ID:', userId);

      // Verificar existência da tabela
      const { data: tableInfo, error: tableError } = await supabase
        .from('study_sessions')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error('getUpcomingSessions: Erro ao verificar tabela study_sessions:', tableError);
        return [];
      }
      
      console.log('getUpcomingSessions: Tabela study_sessions existe e está acessível');

      // Buscar sessões não completadas com data de agendamento a partir de hoje
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .gte('scheduled_date', nowISO)
        .lte('scheduled_date', futureISO)
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('getUpcomingSessions: Erro ao buscar sessões agendadas:', error);
        return [];
      }

      // Depuração 
      console.log('getUpcomingSessions: Sessões encontradas:', data?.length || 0);
      if (data && data.length > 0) {
        // Log mais detalhado para ajudar no diagnóstico do problema de horário
        console.log('getUpcomingSessions: Primeira sessão:', {
          id: data[0].id,
          title: data[0].title,
          raw_date: data[0].scheduled_date,
          js_date: new Date(data[0].scheduled_date).toLocaleString(),
          iso_date: new Date(data[0].scheduled_date).toISOString()
        });
      }

      return data || [];
    } catch (error) {
      console.error('getUpcomingSessions: Erro geral:', error);
      return [];
    }
  }

  /**
   * Registra uma sessão de estudo rápida (sem agendamento)
   * @param disciplineId ID da disciplina
   * @param durationMinutes Duração da sessão em minutos
   * @param notes Notas sobre a sessão
   * @returns A sessão criada ou null em caso de erro
   */
  static async recordQuickSession(
    disciplineId: number, 
    durationMinutes: number, 
    notes?: string
  ): Promise<StudySession | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        console.error('Usuário não autenticado');
        return null;
      }

      // Obter informações da disciplina
      const { data: discipline, error: disciplineError } = await supabase
        .from('disciplines')
        .select('name')
        .eq('id', disciplineId)
        .single();

      if (disciplineError) {
        console.error('Erro ao buscar disciplina:', disciplineError);
      }

      const sessionData: Omit<StudySession, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        discipline_id: disciplineId,
        title: `Sessão rápida: ${discipline?.name || 'Disciplina'}`,
        duration_minutes: durationMinutes,
        actual_duration_minutes: durationMinutes,
        completed: true,
        status: 'concluida',
        notes: notes,
        scheduled_date: new Date().toISOString()
      };

      // Criar a sessão
      const result = await this.createSession(sessionData);

      // Também registrar a atividade
      await StudyStreakService.recordStudySession(
        durationMinutes,
        disciplineId
      );

      return result;
    } catch (error) {
      console.error('Erro ao registrar sessão rápida:', error);
      return null;
    }
  }
} 