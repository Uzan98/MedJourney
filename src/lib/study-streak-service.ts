import { supabase } from './supabase';
import { format, subDays, parseISO } from 'date-fns';

/**
 * Tipos de atividades de estudo que o usuário pode realizar
 */
export type StudyActivityType = 
  | 'subject_completed'   // Conclusão de um assunto
  | 'study_session'       // Sessão de estudo
  | 'quiz_completed'      // Conclusão de um quiz/teste
  | 'note_created'        // Criação de nota de estudo
  | 'daily_login';        // Login diário na plataforma

/**
 * Tipos de referência para as atividades
 */
export type ReferenceType = 'subject' | 'discipline' | 'quiz' | 'note' | 'session';

/**
 * Interface para os dados de uma atividade de estudo
 */
export interface StudyActivity {
  id?: number;
  user_id: string;
  activity_date: string;
  activity_type: StudyActivityType;
  reference_id?: number;
  reference_type?: ReferenceType;
  duration_minutes?: number;
  created_at?: string;
}

/**
 * Interface para os dados de sequência de estudo (streak)
 */
export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  totalDaysStudied: number;
  weekDays: WeekDay[];
}

/**
 * Interface para representar um dia na visualização semanal
 */
export interface WeekDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  hasStudied: boolean;
}

/**
 * Classe de serviço para gerenciar atividades de estudo e sequências
 */
export class StudyStreakService {
  /**
   * Registra uma atividade de estudo para o usuário
   * @param activityType Tipo da atividade realizada
   * @param referenceId ID de referência opcional (ex: ID do assunto)
   * @param referenceType Tipo de referência opcional
   * @param durationMinutes Duração em minutos (opcional)
   * @param date Data da atividade (padrão: hoje)
   * @returns Promise com o resultado da operação
   */
  static async recordActivity(
    activityType: StudyActivityType,
    referenceId?: number,
    referenceType?: ReferenceType,
    durationMinutes?: number,
    date?: Date
  ): Promise<boolean> {
    try {
      // Obter ID do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        console.error('Usuário não autenticado');
        return false;
      }
      
      // Formatar data
      const activityDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      
      // Verificar se já existe uma atividade do mesmo tipo para o usuário no mesmo dia
      const { data: existingActivity, error: checkError } = await supabase
        .from('study_activity')
        .select('id')
        .eq('user_id', userId)
        .eq('activity_date', activityDate)
        .eq('activity_type', activityType)
        .maybeSingle();
      
      if (checkError) {
        console.error('Erro ao verificar atividade existente:', checkError);
        return false;
      }
      
      if (existingActivity) {
        // Atualizar a atividade existente
        const { error: updateError } = await supabase
          .from('study_activity')
          .update({
            reference_id: referenceId,
            reference_type: referenceType,
            duration_minutes: durationMinutes || 0,
            created_at: new Date().toISOString()
          })
          .eq('id', existingActivity.id);
        
        if (updateError) {
          console.error('Erro ao atualizar atividade:', updateError);
          return false;
        }
      } else {
        // Criar nova atividade
        const { error: insertError } = await supabase
          .from('study_activity')
          .insert([{
            user_id: userId,
            activity_date: activityDate,
            activity_type: activityType,
            reference_id: referenceId,
            reference_type: referenceType,
            duration_minutes: durationMinutes || 0
          }]);
        
        if (insertError) {
          console.error('Erro ao inserir atividade:', insertError);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao registrar atividade de estudo:', error);
      return false;
    }
  }
  
  /**
   * Registra um login diário do usuário
   * @returns Promise com o resultado da operação
   */
  static async recordDailyLogin(): Promise<boolean> {
    return this.recordActivity('daily_login');
  }
  
  /**
   * Registra a conclusão de um assunto
   * @param subjectId ID do assunto concluído
   * @returns Promise com o resultado da operação
   */
  static async recordSubjectCompleted(subjectId: number): Promise<boolean> {
    return this.recordActivity('subject_completed', subjectId, 'subject');
  }
  
  /**
   * Registra uma sessão de estudo
   * @param durationMinutes Duração da sessão em minutos
   * @param disciplineId ID opcional da disciplina associada à sessão
   * @param sessionId ID opcional da sessão de estudo
   * @returns Promise com o resultado da operação
   */
  static async recordStudySession(
    durationMinutes: number, 
    disciplineId?: number,
    sessionId?: number
  ): Promise<boolean> {
    // Se temos um disciplineId, vamos usá-lo como referência
    if (disciplineId) {
      return this.recordActivity(
        'study_session', 
        disciplineId, 
        'discipline', 
        durationMinutes
      );
    }
    // Caso contrário, usamos o sessionId como referência (comportamento anterior)
    return this.recordActivity('study_session', sessionId, 'session', durationMinutes);
  }
  
  /**
   * Obtém os dados de sequência (streak) de estudo do usuário atual
   * @returns Promise com os dados de sequência
   */
  static async getStudyStreak(): Promise<StudyStreak | null> {
    try {
      // Obter ID do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        console.error('Usuário não autenticado');
        return null;
      }
      
      // Chamar a função SQL personalizada para calcular a sequência
      const { data, error } = await supabase.rpc('get_study_streak', {
        p_user_id: userId
      });
      
      if (error) {
        console.error('Erro ao obter sequência de estudo:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          totalDaysStudied: 0,
          weekDays: this.generateWeekDays([])
        };
      }
      
      const streakData = data[0];
      
      // Preparar os dados para a visualização
      return {
        currentStreak: streakData.current_streak || 0,
        longestStreak: streakData.longest_streak || 0,
        totalDaysStudied: streakData.total_days || 0,
        weekDays: this.generateWeekDays(streakData.streak_dates || [])
      };
    } catch (error) {
      console.error('Erro ao obter dados de sequência:', error);
      return null;
    }
  }
  
  /**
   * Obtém as atividades de estudo do usuário nos últimos dias
   * @param days Número de dias a considerar
   * @returns Promise com as atividades encontradas
   */
  static async getRecentActivities(days: number = 30): Promise<StudyActivity[]> {
    try {
      // Obter ID do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        console.error('Usuário não autenticado');
        return [];
      }
      
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('study_activity')
        .select('*')
        .eq('user_id', userId)
        .gte('activity_date', startDate)
        .order('activity_date', { ascending: false });
      
      if (error) {
        console.error('Erro ao obter atividades recentes:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro ao obter atividades recentes:', error);
      return [];
    }
  }
  
  /**
   * Gera os dados dos dias da semana para a visualização no dashboard
   * @param studyDates Lista de datas com atividades de estudo registradas
   * @returns Array com dados de cada dia da semana
   */
  private static generateWeekDays(studyDates: string[]): WeekDay[] {
    const today = new Date();
    const days: WeekDay[] = [];
    
    // Converter datas de string para objetos Date
    const studyDatesObjects = studyDates.map(d => parseISO(d));
    
    // Gerar dados para os últimos 7 dias
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0); // Normalizar para meia-noite
      
      // Verificar se este dia tem estudos registrados
      const hasStudied = studyDatesObjects.some(studyDate => {
        const d = new Date(studyDate);
        d.setHours(0, 0, 0, 0); // Normalizar para comparação
        return d.getTime() === date.getTime();
      });
      
      days.push({
        date,
        dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3),
        dayNumber: date.getDate(),
        isToday: i === 0,
        hasStudied
      });
    }
    
    return days;
  }
} 