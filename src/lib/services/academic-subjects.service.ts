import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

export interface AcademicSubject {
  id: number;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  weekly_frequency: number;
  days_of_week: string[];
  approval_percentage: number;
  class_duration: number;
  total_classes: number;
  allowed_absences: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAcademicSubjectData {
  name: string;
  start_date: string;
  end_date: string;
  weekly_frequency: number;
  days_of_week: string[];
  approval_percentage: number;
  class_duration: number;
}

export interface UpdateAcademicSubjectData {
  name?: string;
  start_date?: string;
  end_date?: string;
  weekly_frequency?: number;
  days_of_week?: string[];
  approval_percentage?: number;
  class_duration?: number;
}

export class AcademicSubjectsService {
  static async getAcademicSubjects(): Promise<AcademicSubject[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('academic_subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar matérias acadêmicas:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar matérias acadêmicas:', error);
      throw error;
    }
  }

  static async createAcademicSubject(subjectData: CreateAcademicSubjectData): Promise<AcademicSubject> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('academic_subjects')
        .insert({
          user_id: user.id,
          name: subjectData.name,
          start_date: subjectData.start_date,
          end_date: subjectData.end_date,
          weekly_frequency: subjectData.weekly_frequency,
          days_of_week: subjectData.days_of_week,
          approval_percentage: subjectData.approval_percentage,
          class_duration: subjectData.class_duration,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar matéria acadêmica:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar matéria acadêmica:', error);
      throw error;
    }
  }

  static async updateAcademicSubject(id: number, subjectData: UpdateAcademicSubjectData): Promise<AcademicSubject> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('academic_subjects')
        .update({
          ...subjectData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar matéria acadêmica:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar matéria acadêmica:', error);
      throw error;
    }
  }

  static async deleteAcademicSubject(id: number): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('academic_subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao deletar matéria acadêmica:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro ao deletar matéria acadêmica:', error);
      throw error;
    }
  }

  static async getAcademicSubjectById(id: number): Promise<AcademicSubject | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('academic_subjects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Não encontrado
        }
        console.error('Erro ao buscar matéria acadêmica:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar matéria acadêmica:', error);
      throw error;
    }
  }

  static async getAcademicSubjectStats(id: number): Promise<{
    totalClasses: number;
    allowedAbsences: number;
    currentAbsences: number;
    attendancePercentage: number;
    status: 'safe' | 'warning' | 'danger';
  }> {
    try {
      const subject = await this.getAcademicSubjectById(id);
      if (!subject) {
        throw new Error('Matéria acadêmica não encontrada');
      }

      // Buscar faltas relacionadas a esta matéria
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: absences, error } = await supabase
        .from('absences')
        .select('*')
        .eq('user_id', user.id)
        .eq('academic_subject_id', id);

      if (error) {
        console.error('Erro ao buscar faltas da matéria:', error);
        throw error;
      }

      const currentAbsences = absences?.length || 0;
      const attendedClasses = Math.max(0, subject.total_classes - currentAbsences);
      const attendancePercentage = subject.total_classes > 0 
        ? (attendedClasses / subject.total_classes) * 100 
        : 100;

      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (currentAbsences >= subject.allowed_absences) {
        status = 'danger';
      } else if (currentAbsences >= subject.allowed_absences * 0.8) {
        status = 'warning';
      }

      return {
        totalClasses: subject.total_classes,
        allowedAbsences: subject.allowed_absences,
        currentAbsences,
        attendancePercentage,
        status
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas da matéria:', error);
      throw error;
    }
  }

  static async getAllSubjectsStats(): Promise<Array<{
    subject: AcademicSubject;
    stats: {
      totalClasses: number;
      allowedAbsences: number;
      currentAbsences: number;
      attendancePercentage: number;
      status: 'safe' | 'warning' | 'danger';
    };
  }>> {
    try {
      const subjects = await this.getAcademicSubjects();
      const subjectsWithStats = await Promise.all(
        subjects.map(async (subject) => {
          const stats = await this.getAcademicSubjectStats(subject.id);
          return { subject, stats };
        })
      );

      return subjectsWithStats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de todas as matérias:', error);
      throw error;
    }
  }
}