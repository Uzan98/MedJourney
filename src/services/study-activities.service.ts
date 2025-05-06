import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export interface StudySession {
  id?: string;
  user_id: string;
  subject_id: string;
  duration_minutes: number;
  date: string;
  notes?: string;
}

export interface StudyStreak {
  currentStreak: number;
  longestStreak: number;
  lastActivity: string | null;
  lastWeekActivities: {
    date: string;
    hasActivity: boolean;
  }[];
}

// Tipos de atividades de estudo
export enum StudyActivityType {
  SESSION = 'session',     // Sessão de estudo
  COMPLETION = 'completion', // Conclusão de assunto
  QUIZ = 'quiz',          // Completar um quiz
  NOTE = 'note',          // Criar uma anotação
}

export interface StudyActivity {
  id?: string;
  user_id: string;
  activity_type: StudyActivityType;
  related_id?: string;     // ID do assunto, disciplina ou quiz relacionado
  created_at?: string;     // Data e hora da atividade
}

/**
 * Registra uma nova atividade de estudo
 */
export const registerStudyActivity = async (
  user: User | null,
  activityType: StudyActivityType,
  relatedId?: string
): Promise<boolean> => {
  if (!user) return false;

  try {
    const { error } = await supabase.from('study_activities').insert({
      user_id: user.id,
      activity_type: activityType,
      related_id: relatedId || null,
      created_at: new Date().toISOString(),
    });

    return !error;
  } catch (error) {
    console.error('Erro ao registrar atividade de estudo:', error);
    return false;
  }
};

/**
 * Registra uma nova sessão de estudo
 */
export const registerStudySession = async (
  session: Omit<StudySession, 'id'>
): Promise<boolean> => {
  try {
    const { error } = await supabase.from('study_sessions').insert(session);

    if (!error) {
      // Também registra como uma atividade de estudo
      await registerStudyActivity(
        { id: session.user_id } as User,
        StudyActivityType.SESSION,
        session.subject_id
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erro ao registrar sessão de estudo:', error);
    return false;
  }
};

/**
 * Busca as sessões de estudo de um usuário
 */
export const getUserStudySessions = async (userId: string): Promise<StudySession[]> => {
  try {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar sessões de estudo:', error);
    return [];
  }
};

/**
 * Calcula a sequência atual e a maior sequência de estudos do usuário
 */
export const getUserStudyStreak = async (userId: string): Promise<StudyStreak> => {
  try {
    // Busca todas as atividades do usuário, ordenadas por data
    const { data, error } = await supabase
      .from('study_activities')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Se não há atividades, retorna zeros
    if (!data || data.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivity: null,
        lastWeekActivities: getLastWeekDays(new Date(), []),
      };
    }

    // Converte as datas para objetos Date
    const activitiesByDay = new Map<string, boolean>();
    data.forEach((activity: { created_at: string }) => {
      const date = new Date(activity.created_at);
      const dateString = date.toISOString().split('T')[0];
      activitiesByDay.set(dateString, true);
    });

    // Calcula a sequência atual
    let currentStreak = 0;
    let today = new Date();
    let checkDate = new Date(today);
    let yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayString = yesterday.toISOString().split('T')[0];
    const todayString = today.toISOString().split('T')[0];
    
    // Verifica se houve atividade hoje ou ontem para começar a contagem
    const hasActivityToday = activitiesByDay.has(todayString);
    const hasActivityYesterday = activitiesByDay.has(yesterdayString);
    
    if (hasActivityToday) {
      currentStreak = 1;
      checkDate = yesterday; // Começa a verificar a partir de ontem
    } else if (hasActivityYesterday) {
      currentStreak = 1;
      checkDate = new Date(yesterday);
      checkDate.setDate(checkDate.getDate() - 1); // Começa a verificar a partir de anteontem
    } else {
      // Não há atividade hoje nem ontem, então a sequência atual é 0
      return {
        currentStreak: 0,
        longestStreak: calculateLongestStreak(Array.from(activitiesByDay.keys())),
        lastActivity: data[0].created_at,
        lastWeekActivities: getLastWeekDays(today, Array.from(activitiesByDay.keys())),
      };
    }

    // Continua verificando dias anteriores
    let checking = true;
    while (checking) {
      const dateToCheck = checkDate.toISOString().split('T')[0];
      if (activitiesByDay.has(dateToCheck)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        checking = false;
      }
    }

    return {
      currentStreak,
      longestStreak: calculateLongestStreak(Array.from(activitiesByDay.keys())),
      lastActivity: data[0].created_at,
      lastWeekActivities: getLastWeekDays(today, Array.from(activitiesByDay.keys())),
    };
  } catch (error) {
    console.error('Erro ao calcular sequência de estudos:', error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivity: null,
      lastWeekActivities: getLastWeekDays(new Date(), []),
    };
  }
};

/**
 * Calcula a maior sequência de estudos com base nas datas de atividades
 */
function calculateLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  
  // Ordena as datas
  const sortedDates = [...dates].sort();
  
  let longestStreak = 1;
  let currentStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i-1]);
    const currDate = new Date(sortedDates[i]);
    
    // Verifica se as datas são consecutivas
    const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      currentStreak++;
    } else if (diffDays > 1) {
      // Se há um gap maior que 1 dia, reseta a sequência
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
      currentStreak = 1;
    }
  }
  
  // Verifica uma última vez ao final do loop
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }
  
  return longestStreak;
}

/**
 * Obtém os últimos 7 dias com indicação de atividade
 */
function getLastWeekDays(today: Date, activityDates: string[]): { date: string; hasActivity: boolean }[] {
  const result = [];
  const activitySet = new Set(activityDates);
  
  // Cria um array com os últimos 7 dias
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    result.push({
      date: dateString,
      hasActivity: activitySet.has(dateString),
    });
  }
  
  return result;
} 