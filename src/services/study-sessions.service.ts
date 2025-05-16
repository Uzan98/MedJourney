import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import SmartPlanningService from './smart-planning.service';
import { toast } from 'react-hot-toast';
import { StudyStreakService } from '@/lib/study-streak-service';

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
      // Verificar em qual tabela a sessão existe
      
      // 1. Tentar buscar na tabela study_sessions
      const { data: regularSession, error: regularError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (regularError) {
        console.error('Erro ao buscar sessão de estudo regular:', regularError);
      }

      // 2. Tentar buscar na tabela smart_plan_sessions
      const { data: smartSession, error: smartError } = await supabase
        .from('smart_plan_sessions')
        .select('*, disciplines:discipline_id(id, name)')
        .eq('id', id)
        .maybeSingle();

      if (smartError) {
        console.error('Erro ao buscar sessão de plano inteligente:', smartError);
      }

      // Determinar em qual tabela está a sessão e proceder com a atualização
      if (regularSession) {
        // Completar sessão regular
        const updates = {
          completed: true,
          status: 'concluida' as const,
          actual_duration_minutes: actualDuration || regularSession.duration_minutes
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
        if (regularSession.discipline_id) {
          await StudyStreakService.recordStudySession(
            updates.actual_duration_minutes,
            regularSession.discipline_id,
            id
          );
        }

        return data;
      } 
      else if (smartSession) {
        // Completar sessão de plano inteligente
        // Como a tabela smart_plan_sessions pode não ter o campo 'completed',
        // vamos usar o campo metadata para guardar essa informação
        
        // Ler metadata atual, se existir
        let metadata: any = {};
        if (smartSession.metadata) {
          try {
            metadata = JSON.parse(smartSession.metadata);
          } catch (e) {
            console.warn('Erro ao analisar metadados da sessão:', e);
          }
        }
        
        // Atualizar metadata com informações de conclusão
        metadata.completed = true;
        metadata.completed_at = new Date().toISOString();
        metadata.actual_duration_minutes = actualDuration || smartSession.duration_minutes;
        
        const updates = {
          metadata: JSON.stringify(metadata)
        };
        
        // Atualizar a sessão
        const { data: updatedSmartSession, error } = await supabase
          .from('smart_plan_sessions')
          .update(updates)
          .eq('id', id)
          .select('*, disciplines:discipline_id(id, name)')
          .single();
          
        if (error) {
          console.error('Erro ao completar sessão de plano inteligente:', error);
          return null;
        }
        
        // Registrar a atividade de estudo
        await StudyStreakService.recordStudySession(
          actualDuration || smartSession.duration_minutes,
          smartSession.discipline_id,
          id
        );
        
        // Converter para o formato de sessão de estudo
        const convertedSession = SmartPlanningService.convertToStudySession({
          id: updatedSmartSession.id,
          title: updatedSmartSession.title,
          discipline_id: updatedSmartSession.discipline_id,
          discipline_name: updatedSmartSession.disciplines?.name || 'Disciplina',
          subject_id: updatedSmartSession.subject_id,
          date: updatedSmartSession.date,
          start_time: updatedSmartSession.start_time,
          end_time: updatedSmartSession.end_time,
          duration_minutes: updatedSmartSession.duration_minutes,
          is_revision: updatedSmartSession.is_revision,
          original_session_id: updatedSmartSession.original_session_id,
          plan_id: updatedSmartSession.plan_id
        });
        
        // Adicionar informações de conclusão ao objeto convertido
        return {
          ...convertedSession,
          completed: true,
          status: 'concluida',
          actual_duration_minutes: actualDuration || smartSession.duration_minutes
        };
      }
      else {
        console.error('Sessão não encontrada em nenhuma das tabelas:', id);
        return null;
      }
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

      // Obter a data atual para filtragem
      const today = new Date();
      
      // 1. Buscar sessões regulares
      let query = supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId);

      if (!includeCompleted) {
        // Filtrar por sessões não completadas
        query = query.eq('completed', false);
        
        // Para sessões não completadas, vamos limitar a apenas as do dia atual
        // Definimos o início e o fim do dia atual
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Aplicar filtro de data para o dia atual
        query = query
          .gte('scheduled_date', startOfDay.toISOString())
          .lt('scheduled_date', endOfDay.toISOString());
      }

      const { data: regularSessions, error } = await query.order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar sessões de estudo:', error);
        return [];
      }
      
      console.log('getUserSessions: Regular sessions encontradas:', regularSessions?.length || 0);

      // 2. Buscar sessões do planejamento inteligente
      try {
        // Buscar planos do usuário
        const { data: plans, error: plansError } = await supabase
          .from('smart_plans')
          .select('id')
          .eq('user_id', userId);

        if (plansError) {
          console.error('Erro ao buscar planos inteligentes:', plansError);
          return regularSessions || [];
        }

        if (!plans || plans.length === 0) {
          return regularSessions || [];
        }

        // Obter IDs dos planos
        const planIds = plans.map(plan => plan.id);
        
        // Buscar sessões associadas aos planos
        const { data: smartSessions, error: smartSessionsError } = await supabase
          .from('smart_plan_sessions')
          .select(`
            *,
            disciplines:discipline_id (id, name)
          `)
          .in('plan_id', planIds);

        if (smartSessionsError) {
          console.error('Erro ao buscar sessões de planos inteligentes:', smartSessionsError);
          return regularSessions || [];
        }

        // Obter a data atual para filtragem
        const today = new Date();
        
        // Converter sessões do planejamento inteligente para o formato de sessão regular
        let convertedSmartSessions = (smartSessions || []).map(session => {
          return SmartPlanningService.convertToStudySession({
            id: session.id,
            title: session.title,
            discipline_id: session.discipline_id,
            discipline_name: session.disciplines?.name || 'Disciplina',
            subject_id: session.subject_id,
            date: session.date,
            start_time: session.start_time,
            end_time: session.end_time,
            duration_minutes: session.duration_minutes,
            is_revision: session.is_revision,
            original_session_id: session.original_session_id,
            plan_id: session.plan_id
          });
        });
        
        // Filtrar sessões para mostrar apenas as do dia atual
        if (!includeCompleted) {
          convertedSmartSessions = convertedSmartSessions.filter(session => {
            if (!session.scheduled_date) return false;
            
            const sessionDate = new Date(session.scheduled_date);
            
            // Comparar ano, mês e dia localmente (sem conversão para UTC)
            return (
              sessionDate.getFullYear() === today.getFullYear() &&
              sessionDate.getMonth() === today.getMonth() &&
              sessionDate.getDate() === today.getDate()
            );
          });
        }

        console.log('getUserSessions: Smart sessions encontradas (após filtragem):', convertedSmartSessions.length);

        // Combinar os dois tipos de sessões
        return [...regularSessions || [], ...convertedSmartSessions];
      } catch (smartError) {
        console.error('Erro ao processar sessões de planos inteligentes:', smartError);
        return regularSessions || [];
      }
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
      console.log("getUpcomingSessions: Iniciando busca...");
      
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        console.error('getUpcomingSessions: Usuário não autenticado');
        return [];
      }
      
      // Calcular as datas de início e fim para o intervalo
      const startDate = new Date();
      
      // Se days=1, vamos buscar apenas o dia atual (hoje)
      // Senão, buscar o intervalo normal de dias
      let endDate;
      
      if (days === 1) {
        // Para 1 dia (hoje), definimos início às 00:00 e fim às 23:59
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Para múltiplos dias, mantemos a lógica original
        endDate = new Date();
        endDate.setDate(endDate.getDate() + days);
      }
      
      console.log(`getUpcomingSessions: Buscando sessões entre: ${startDate.toISOString()} e ${endDate.toISOString()}`);
      console.log(`getUpcomingSessions: Usuário ID: ${userId}`);
      
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
      // Removemos o filtro de status para pegar todas as sessões não completadas,
      // independentemente de serem 'agendada', 'pendente', etc.
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .gte('scheduled_date', startDate.toISOString())
        .lte('scheduled_date', endDate.toISOString())
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('getUpcomingSessions: Erro ao buscar sessões agendadas:', error);
        return [];
      }

      // Depuração mais detalhada
      console.log('getUpcomingSessions: Sessões encontradas:', data?.length || 0);
      if (data && data.length > 0) {
        // Log mais detalhado para ajudar no diagnóstico do problema de horário
        console.log('getUpcomingSessions: Primeira sessão:', {
          id: data[0].id,
          title: data[0].title,
          raw_date: data[0].scheduled_date,
          js_date: new Date(data[0].scheduled_date).toLocaleString(),
          iso_date: new Date(data[0].scheduled_date).toISOString(),
          completed: data[0].completed,
          status: data[0].status
        });
        
        // Imprimir resumo de todas as sessões para diagnóstico
        console.log('getUpcomingSessions: Resumo de todas as sessões:');
        data.forEach((session, index) => {
          console.log(`Sessão ${index + 1}:`, {
            id: session.id,
            title: session.title,
            date: new Date(session.scheduled_date || '').toLocaleString(),
            completed: session.completed,
            status: session.status
          });
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

  /**
   * Obtém uma sessão de estudo específica pelo ID
   * @param id ID da sessão
   * @returns A sessão encontrada ou null se não existir
   */
  static async getSessionById(id: number): Promise<StudySession | null> {
    try {
      console.log(`getSessionById: Buscando sessão com ID ${id}`);
      
      // 1. Tentar buscar na tabela study_sessions
      const { data: regularSession, error: regularError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (regularError) {
        console.error('Erro ao buscar sessão de estudo regular:', regularError);
      }

      // 2. Tentar buscar na tabela smart_plan_sessions
      const { data: smartSession, error: smartError } = await supabase
        .from('smart_plan_sessions')
        .select('*, disciplines:discipline_id(id, name)')
        .eq('id', id)
        .maybeSingle();

      if (smartError) {
        console.error('Erro ao buscar sessão de plano inteligente:', smartError);
      }

      // Se encontrou uma sessão regular, retorná-la
      if (regularSession) {
        console.log(`getSessionById: Encontrada sessão regular com ID ${id}`);
        return regularSession;
      } 
      
      // Se encontrou uma sessão de plano inteligente, convertê-la e retorná-la
      if (smartSession) {
        console.log(`getSessionById: Encontrada sessão de plano inteligente com ID ${id}`);
        
        const convertedSession = SmartPlanningService.convertToStudySession({
          id: smartSession.id,
          title: smartSession.title,
          discipline_id: smartSession.discipline_id,
          discipline_name: smartSession.disciplines?.name || 'Disciplina',
          subject_id: smartSession.subject_id,
          date: smartSession.date,
          start_time: smartSession.start_time,
          end_time: smartSession.end_time,
          duration_minutes: smartSession.duration_minutes,
          is_revision: smartSession.is_revision,
          original_session_id: smartSession.original_session_id,
          plan_id: smartSession.plan_id
        });
        
        // Verificar se a sessão está marcada como concluída (no metadata)
        if (smartSession.metadata) {
          try {
            const metadata = JSON.parse(smartSession.metadata);
            if (metadata.completed) {
              convertedSession.completed = true;
              convertedSession.status = 'concluida';
              convertedSession.actual_duration_minutes = metadata.actual_duration_minutes || smartSession.duration_minutes;
            }
          } catch (e) {
            console.warn('Erro ao analisar metadados da sessão:', e);
          }
        }
        
        return convertedSession;
      }
      
      // Se não encontrou em nenhuma tabela
      console.log(`getSessionById: Sessão com ID ${id} não encontrada em nenhuma tabela`);
      return null;
    } catch (error) {
      console.error(`Erro ao buscar sessão por ID ${id}:`, error);
      return null;
    }
  }
} 