import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { StudyStreakService } from '@/lib/study-streak-service';

export interface PomodoroSession {
  id?: number;
  user_id: string;
  title: string;
  duration_minutes: number;
  actual_duration_minutes: number;
  completed: boolean;
  status: string;
  type: string;
  created_at?: string;
  updated_at?: string;
}

export class PomodoroService {
  /**
   * Registra uma sessão Pomodoro completada no banco de dados
   * @param durationMinutes Duração da sessão Pomodoro em minutos
   * @param sessionType Tipo da sessão ('focus', 'short-break', 'long-break')
   * @returns A sessão criada ou null em caso de erro
   */
  static async recordPomodoroSession(
    durationMinutes: number,
    sessionType: 'focus' | 'short-break' | 'long-break' = 'focus'
  ): Promise<PomodoroSession | null> {
    try {
      console.log('🍅 PomodoroService: INICIANDO registro de sessão Pomodoro...', {
        durationMinutes,
        sessionType,
        timestamp: new Date().toISOString()
      });

      // Verificar se o usuário está autenticado
      console.log('🔐 PomodoroService: Verificando autenticação...');
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('❌ PomodoroService: Erro na autenticação:', authError);
        toast.error('Erro na autenticação');
        return null;
      }
      
      const userId = session?.user?.id;
      console.log('👤 PomodoroService: Dados do usuário:', {
        userId,
        userEmail: session?.user?.email,
        hasSession: !!session
      });

      if (!userId) {
        console.error('❌ PomodoroService: Usuário não autenticado - session ou userId ausente');
        toast.error('Usuário não autenticado');
        return null;
      }
      
      console.log('✅ PomodoroService: Usuário autenticado com sucesso');

      // Definir título baseado no tipo de sessão
      const sessionTitles = {
        'focus': 'Sessão Pomodoro - Foco',
        'short-break': 'Sessão Pomodoro - Pausa Curta',
        'long-break': 'Sessão Pomodoro - Pausa Longa'
      };

      const title = sessionTitles[sessionType];
      console.log('📝 PomodoroService: Título da sessão definido:', title);

      // Preparar dados para inserção
      const sessionData = {
        user_id: userId,
        title: title,
        duration_minutes: durationMinutes,
        actual_duration_minutes: durationMinutes,
        completed: true,
        status: 'concluida',
        type: 'pomodoro',
        notes: `Sessão Pomodoro ${sessionType} completada`,
        scheduled_date: new Date().toISOString()
      };
      
      console.log('💾 PomodoroService: Dados preparados para inserção:', sessionData);
      console.log('🔗 PomodoroService: Tentando inserir na tabela study_sessions...');

      // Criar registro na tabela study_sessions
      const { data, error } = await supabase
        .from('study_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('❌ PomodoroService: ERRO DETALHADO ao registrar sessão:', {
          error,
          errorMessage: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          sessionData
        });
        toast.error(`Erro ao registrar sessão Pomodoro: ${error.message}`);
        return null;
      }

      console.log('🎉 PomodoroService: Sessão registrada com SUCESSO no banco:', data);

      // Registrar atividade de estudo apenas para sessões de foco
      if (sessionType === 'focus') {
        try {
          console.log('🏃 PomodoroService: Registrando atividade de estudo no StudyStreakService...');
          await StudyStreakService.recordStudyActivity(
            userId,
            durationMinutes,
            'Sessão Pomodoro completada'
          );
          console.log('✅ PomodoroService: Atividade de estudo registrada com sucesso');
        } catch (streakError) {
          console.error('❌ PomodoroService: ERRO ao registrar atividade de estudo:', {
            streakError,
            userId,
            durationMinutes
          });
          // Não falha a operação principal se houver erro no streak
        }
      } else {
        console.log('⏸️ PomodoroService: Sessão de pausa - não registrando atividade de estudo');
      }

      console.log('🎊 PomodoroService: PROCESSO COMPLETO - sessão salva com sucesso!');
      toast.success(`Sessão ${sessionType === 'focus' ? 'de foco' : 'de pausa'} registrada!`);
      return data as PomodoroSession;

    } catch (error) {
      console.error('💥 PomodoroService: ERRO INESPERADO CAPTURADO:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        errorStack: error instanceof Error ? error.stack : undefined,
        durationMinutes,
        sessionType,
        timestamp: new Date().toISOString()
      });
      toast.error(`Erro inesperado ao registrar sessão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return null;
    }
  }

  /**
   * Busca todas as sessões Pomodoro do usuário
   * @param limit Limite de sessões a retornar (padrão: 50)
   * @returns Array de sessões Pomodoro ou array vazio em caso de erro
   */
  static async getPomodoroSessions(limit: number = 50): Promise<PomodoroSession[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        console.error('PomodoroService: Usuário não autenticado');
        return [];
      }

      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'pomodoro')
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('PomodoroService: Erro ao buscar sessões:', error);
        return [];
      }

      return data as PomodoroSession[];

    } catch (error) {
      console.error('PomodoroService: Erro inesperado ao buscar sessões:', error);
      return [];
    }
  }

  /**
   * Calcula estatísticas das sessões Pomodoro
   * @returns Objeto com estatísticas ou null em caso de erro
   */
  static async getPomodoroStats(): Promise<{
    totalSessions: number;
    totalMinutes: number;
    focusSessions: number;
    focusMinutes: number;
  } | null> {
    try {
      const sessions = await this.getPomodoroSessions(1000); // Buscar todas as sessões

      const focusSessions = sessions.filter(session => 
        session.title.includes('Foco')
      );

      const totalSessions = sessions.length;
      const totalMinutes = sessions.reduce((sum, session) => 
        sum + (session.actual_duration_minutes || 0), 0
      );
      const focusSessionsCount = focusSessions.length;
      const focusMinutes = focusSessions.reduce((sum, session) => 
        sum + (session.actual_duration_minutes || 0), 0
      );

      return {
        totalSessions,
        totalMinutes,
        focusSessions: focusSessionsCount,
        focusMinutes
      };

    } catch (error) {
      console.error('PomodoroService: Erro ao calcular estatísticas:', error);
      return null;
    }
  }
}

export default PomodoroService;