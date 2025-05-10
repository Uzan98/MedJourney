import { Database as SupabaseDatabase } from '@supabase/supabase-js';

/**
 * Define a interface da Database do Supabase para o TypeScript
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string | number;
          email: string;
          name?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          email: string;
          name?: string;
          role?: string;
        };
        Update: {
          email?: string;
          name?: string;
          role?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string | number;
          title: string;
          description?: string;
          status: string;
          priority?: string;
          due_date?: string;
          user_id: string | number;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          title: string;
          description?: string;
          status: string;
          priority?: string;
          due_date?: string;
          user_id: string | number;
        };
        Update: {
          title?: string;
          description?: string;
          status?: string;
          priority?: string;
          due_date?: string;
          updated_at?: string;
        };
      };
      study_sessions: {
        Row: {
          id: string | number;
          subject: string;
          start_time: string;
          end_time?: string;
          actual_duration?: number;
          planned_duration?: number;
          user_id: string | number;
          created_at?: string;
        };
        Insert: {
          subject: string;
          start_time: string;
          end_time?: string;
          actual_duration?: number;
          planned_duration?: number;
          user_id: string | number;
        };
        Update: {
          subject?: string;
          start_time?: string;
          end_time?: string;
          actual_duration?: number;
          planned_duration?: number;
        };
      };
      notes: {
        Row: {
          id: string | number;
          title: string;
          content: string;
          subject_id?: string | number;
          user_id: string | number;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          title: string;
          content: string;
          subject_id?: string | number;
          user_id: string | number;
        };
        Update: {
          title?: string;
          content?: string;
          subject_id?: string | number;
          updated_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string | number;
          name: string;
          description?: string;
          color?: string;
          user_id: string | number;
          created_at?: string;
          updated_at?: string;
        };
        Insert: {
          name: string;
          description?: string;
          color?: string;
          user_id: string | number;
        };
        Update: {
          name?: string;
          description?: string;
          color?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [view_name: string]: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      get_user_tasks_summary: {
        Args: { userId: string | number };
        Returns: {
          completedTasks: number;
          pendingTasks: number;
          totalTasks: number;
          completionRate: number;
        };
      };
      get_study_stats: {
        Args: { userId: string | number };
        Returns: {
          totalMinutes: number;
          studyStreak: number;
          focusScore: number;
          lastSessionDate: string;
        };
      };
      get_performance_metrics: {
        Args: { userId: string | number };
        Returns: {
          weeklyProgress: Array<{ day: string; tasks: number; hours: number }>;
          subjectPerformance: Array<{ subject: string; score: number }>;
        };
      };
    };
  };
}

/**
 * Tipo para o cliente Supabase
 */
export type SupabaseClient = SupabaseDatabase<Database>;

/**
 * Interface para dados mockados durante o build
 */
export interface MockData {
  tasksMock: {
    completedTasks: number;
    pendingTasks: number;
    totalTasks: number;
    completionRate: number;
  };
  studyStatsMock: {
    totalMinutes: number;
    studyStreak: number;
    focusScore: number;
    lastWeekHours: number[];
    lastSessionDate: string;
    dailyGoalAchievement: number;
  };
  performanceMock: {
    weeklyProgress: Array<{ day: string; tasks: number; hours: number }>;
    subjectPerformance: Array<{ subject: string; score: number }>;
  };
  calendarMock: {
    events: Array<{ id: number; title: string; start: string; duration: number }>;
  };
} 