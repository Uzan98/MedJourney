import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

export interface Absence {
  id: string;
  subject_name: string;
  absence_date: string;
  reason?: string;
  is_justified: boolean;
  academic_subject_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAbsenceData {
  subject_name: string;
  absence_date: string;
  reason?: string;
  is_justified?: boolean;
  academic_subject_id?: number;
}

export interface UpdateAbsenceData {
  subject_name?: string;
  absence_date?: string;
  reason?: string;
  is_justified?: boolean;
  academic_subject_id?: number;
}

export class AbsencesService {
  static async getAbsences(): Promise<Absence[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('absences')
        .select('*')
        .eq('user_id', user.id)
        .order('absence_date', { ascending: false });

      if (error) {
        console.error('Erro ao buscar faltas:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro no AbsencesService.getAbsences:', error);
      throw error;
    }
  }

  static async createAbsence(absenceData: CreateAbsenceData): Promise<Absence> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('absences')
        .insert({
          user_id: user.id,
          subject_name: absenceData.subject_name,
          absence_date: absenceData.absence_date,
          reason: absenceData.reason || null,
          is_justified: absenceData.is_justified || false,
          academic_subject_id: absenceData.academic_subject_id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar falta:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro no AbsencesService.createAbsence:', error);
      throw error;
    }
  }

  static async updateAbsence(id: string, absenceData: UpdateAbsenceData): Promise<Absence> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('absences')
        .update({
          ...absenceData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar falta:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro no AbsencesService.updateAbsence:', error);
      throw error;
    }
  }

  static async deleteAbsence(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('absences')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao deletar falta:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro no AbsencesService.deleteAbsence:', error);
      throw error;
    }
  }

  static async getAbsencesBySubject(subject: string): Promise<Absence[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('absences')
        .select('*')
        .eq('user_id', user.id)
        .eq('subject_name', subject)
        .order('absence_date', { ascending: false });

      if (error) {
        console.error('Erro ao buscar faltas por matéria:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro no AbsencesService.getAbsencesBySubject:', error);
      throw error;
    }
  }

  static async getAbsencesStats(): Promise<{
    total: number;
    justified: number;
    unjustified: number;
    bySubject: Record<string, number>;
  }> {
    try {
      const absences = await this.getAbsences();
      
      const stats = {
        total: absences.length,
        justified: absences.filter(a => a.is_justified).length,
        unjustified: absences.filter(a => !a.is_justified).length,
        bySubject: {} as Record<string, number>
      };

      // Contar faltas por matéria
      absences.forEach(absence => {
        if (stats.bySubject[absence.subject_name]) {
          stats.bySubject[absence.subject_name]++;
        } else {
          stats.bySubject[absence.subject_name] = 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Erro no AbsencesService.getAbsencesStats:', error);
      throw error;
    }
  }

  // Novos métodos para trabalhar com matérias acadêmicas
  static async getAbsencesByAcademicSubject(academicSubjectId: number): Promise<Absence[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('absences')
        .select('*')
        .eq('user_id', user.id)
        .eq('academic_subject_id', academicSubjectId)
        .order('absence_date', { ascending: false });

      if (error) {
        console.error('Erro ao buscar faltas por matéria acadêmica:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro no AbsencesService.getAbsencesByAcademicSubject:', error);
      throw error;
    }
  }

  static async createAbsenceForAcademicSubject(
    academicSubjectId: number,
    absenceData: Omit<CreateAbsenceData, 'academic_subject_id'>
  ): Promise<Absence> {
    try {
      return await this.createAbsence({
        ...absenceData,
        academic_subject_id: academicSubjectId
      });
    } catch (error) {
      console.error('Erro no AbsencesService.createAbsenceForAcademicSubject:', error);
      throw error;
    }
  }

  static async getAbsencesStatsForAcademicSubject(academicSubjectId: number): Promise<{
    total: number;
    justified: number;
    unjustified: number;
    byMonth: Record<string, number>;
  }> {
    try {
      const absences = await this.getAbsencesByAcademicSubject(academicSubjectId);
      
      const stats = {
        total: absences.length,
        justified: absences.filter(a => a.is_justified).length,
        unjustified: absences.filter(a => !a.is_justified).length,
        byMonth: {} as Record<string, number>
      };

      // Contar faltas por mês
      absences.forEach(absence => {
        const month = new Date(absence.absence_date).toISOString().substring(0, 7); // YYYY-MM
        if (stats.byMonth[month]) {
          stats.byMonth[month]++;
        } else {
          stats.byMonth[month] = 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Erro no AbsencesService.getAbsencesStatsForAcademicSubject:', error);
      throw error;
    }
  }

  static async getEnhancedAbsencesStats(): Promise<{
    total: number;
    justified: number;
    unjustified: number;
    bySubject: Record<string, number>;
    byAcademicSubject: Record<number, {
      name: string;
      total: number;
      justified: number;
      unjustified: number;
    }>;
  }> {
    try {
      const absences = await this.getAbsences();
      
      const stats = {
        total: absences.length,
        justified: absences.filter(a => a.is_justified).length,
        unjustified: absences.filter(a => !a.is_justified).length,
        bySubject: {} as Record<string, number>,
        byAcademicSubject: {} as Record<number, {
          name: string;
          total: number;
          justified: number;
          unjustified: number;
        }>
      };

      // Contar faltas por matéria tradicional
      absences.forEach(absence => {
        if (stats.bySubject[absence.subject_name]) {
          stats.bySubject[absence.subject_name]++;
        } else {
          stats.bySubject[absence.subject_name] = 1;
        }
      });

      // Contar faltas por matéria acadêmica
      const academicSubjectAbsences = absences.filter(a => a.academic_subject_id);
      
      for (const absence of academicSubjectAbsences) {
        const academicSubjectId = absence.academic_subject_id!;
        
        if (!stats.byAcademicSubject[academicSubjectId]) {
          stats.byAcademicSubject[academicSubjectId] = {
            name: absence.subject_name,
            total: 0,
            justified: 0,
            unjustified: 0
          };
        }
        
        stats.byAcademicSubject[academicSubjectId].total++;
        if (absence.is_justified) {
          stats.byAcademicSubject[academicSubjectId].justified++;
        } else {
          stats.byAcademicSubject[academicSubjectId].unjustified++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Erro no AbsencesService.getEnhancedAbsencesStats:', error);
      throw error;
    }
  }
}