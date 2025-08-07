import { supabase } from './supabase';
import type { DisciplineAttendanceStats } from './supabase';

export interface AcademicAbsence {
  id: number;
  academic_subject_id: number;
  user_id: string;
  absence_date: string;
  is_justified: boolean;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAcademicAbsenceData {
  academic_subject_id: number;
  absence_date: string;
  is_justified?: boolean;
  reason?: string;
}

export interface UpdateAcademicAbsenceData {
  academic_subject_id?: number;
  absence_date?: string;
  is_justified?: boolean;
  reason?: string;
}

export class AcademicAbsencesService {
  /**
   * Obtém todas as faltas de uma disciplina
   */
  static async getDisciplineAbsences(disciplineId: number): Promise<AcademicAbsence[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      const { data, error } = await supabase
        .from('absences')
        .select('*')
        .eq('academic_subject_id', disciplineId)
        .eq('user_id', user.id)
        .order('absence_date', { ascending: false });
      
      if (error) {
        console.error('Erro ao buscar faltas da disciplina:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar faltas da disciplina:', error);
      return [];
    }
  }
  
  /**
   * Cria uma nova falta
   */
  static async createAbsence(absenceData: CreateAcademicAbsenceData): Promise<AcademicAbsence | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Buscar o nome da matéria acadêmica
      const { data: academicSubject, error: subjectError } = await supabase
        .from('academic_subjects')
        .select('name')
        .eq('id', absenceData.academic_subject_id)
        .eq('user_id', user.id)
        .single();
      
      if (subjectError || !academicSubject) {
        console.error('Erro ao buscar matéria acadêmica:', subjectError);
        throw new Error('Matéria acadêmica não encontrada');
      }
      
      const { data, error } = await supabase
        .from('absences')
        .insert({
          academic_subject_id: absenceData.academic_subject_id,
          subject_name: academicSubject.name,
          absence_date: absenceData.absence_date,
          reason: absenceData.reason,
          user_id: user.id,
          is_justified: absenceData.is_justified || false
        })
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar falta:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao criar falta:', error);
      return null;
    }
  }
  
  /**
   * Atualiza uma falta existente
   */
  static async updateAbsence(
    absenceId: number,
    updateData: UpdateAcademicAbsenceData
  ): Promise<AcademicAbsence | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      const { data, error } = await supabase
        .from('absences')
        .update(updateData)
        .eq('id', absenceId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao atualizar falta:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao atualizar falta:', error);
      return null;
    }
  }
  
  /**
   * Remove uma falta
   */
  static async deleteAbsence(absenceId: number): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      const { error } = await supabase
        .from('absences')
        .delete()
        .eq('id', absenceId)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Erro ao remover falta:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao remover falta:', error);
      return false;
    }
  }
  
  /**
   * Obtém estatísticas de frequência de uma disciplina
   */
  static async getDisciplineStats(academicSubjectId: number): Promise<DisciplineAttendanceStats | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      const { data, error } = await supabase
        .rpc('get_discipline_attendance_stats', {
          p_academic_subject_id: academicSubjectId,
          p_user_id: user.id
        });
      
      if (error) {
        console.error('Erro ao obter estatísticas:', error);
        return null;
      }
      
      const stats = data?.[0];
      if (!stats) return null;
      
      // Determina o status de risco baseado na porcentagem restante
      let risk_status: 'safe' | 'warning' | 'critical' = 'safe';
      const remainingPercentage = (stats.remaining_absences / stats.allowed_absences) * 100;
      
      if (remainingPercentage <= 10) {
        risk_status = 'critical';
      } else if (remainingPercentage <= 30) {
        risk_status = 'warning';
      }
      
      return {
        total_absences: stats.total_absences || 0,
        allowed_absences: stats.allowed_absences || 0,
        remaining_absences: stats.remaining_absences || 0,
        attendance_percentage: stats.attendance_percentage || 100,
        risk_status
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }
  
  /**
   * Obtém resumo de todas as disciplinas acadêmicas do usuário
   */
  static async getAllDisciplinesStats(): Promise<Array<{
    discipline: any;
    stats: DisciplineAttendanceStats;
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Busca disciplinas acadêmicas
      const { data: disciplines, error: disciplinesError } = await supabase
        .from('disciplines')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_academic', true);
      
      if (disciplinesError) {
        console.error('Erro ao buscar disciplinas:', disciplinesError);
        return [];
      }
      
      if (!disciplines || disciplines.length === 0) {
        return [];
      }
      
      // Busca estatísticas para cada disciplina
      const results = await Promise.all(
        disciplines.map(async (discipline) => {
          // Busca o academic_subject_id correspondente
          const { data: academicSubject } = await supabase
            .from('academic_subjects')
            .select('id')
            .eq('discipline_id', discipline.id)
            .eq('user_id', user.id)
            .single();
          
          let stats = null;
          if (academicSubject) {
            stats = await this.getDisciplineStats(academicSubject.id);
          }
          
          return {
            discipline,
            stats: stats || {
              total_absences: 0,
              allowed_absences: 0,
              remaining_absences: 0,
              attendance_percentage: 100,
              risk_status: 'safe' as const
            }
          };
        })
      );
      
      return results;
    } catch (error) {
      console.error('Erro ao obter resumo de disciplinas:', error);
      return [];
    }
  }
}