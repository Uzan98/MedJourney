import { supabase } from '@/lib/supabase';
import { AcademicSubjectsService, AcademicSubject } from './academic-subjects.service';
import { AbsencesService, Absence } from './absences.service';

export interface AttendanceReport {
  subject: AcademicSubject;
  totalClasses: number;
  attendedClasses: number;
  absences: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  attendancePercentage: number;
  status: 'safe' | 'warning' | 'danger';
  allowedAbsences: number;
  remainingAbsences: number;
}

export interface MonthlyReport {
  month: string;
  totalAbsences: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  subjectsAffected: number;
}

export interface OverallStats {
  totalSubjects: number;
  totalAbsences: number;
  averageAttendance: number;
  subjectsAtRisk: number;
  subjectsInWarning: number;
  subjectsSafe: number;
}

export interface SubjectRiskAnalysis {
  subjectId: number;
  subjectName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  currentAbsences: number;
  allowedAbsences: number;
  attendancePercentage: number;
  projectedFinalAttendance: number;
  daysUntilEnd: number;
  recommendedAction: string;
}

export class StatisticsService {
  static async generateAttendanceReport(): Promise<AttendanceReport[]> {
    try {
      const subjectsWithStats = await AcademicSubjectsService.getAllSubjectsStats();
      
      const reports: AttendanceReport[] = await Promise.all(
        subjectsWithStats.map(async ({ subject, stats }) => {
          const absences = await AbsencesService.getAbsencesByAcademicSubject(subject.id);
          const justifiedAbsences = absences.filter(a => a.is_justified).length;
          const unjustifiedAbsences = absences.filter(a => !a.is_justified).length;
          
          return {
            subject,
            totalClasses: stats.totalClasses,
            attendedClasses: stats.totalClasses - stats.currentAbsences,
            absences: stats.currentAbsences,
            justifiedAbsences,
            unjustifiedAbsences,
            attendancePercentage: stats.attendancePercentage,
            status: stats.status,
            allowedAbsences: stats.allowedAbsences,
            remainingAbsences: Math.max(0, stats.allowedAbsences - stats.currentAbsences)
          };
        })
      );
      
      return reports.sort((a, b) => {
        // Ordenar por status de risco (danger primeiro, depois warning, depois safe)
        const statusOrder = { danger: 0, warning: 1, safe: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de frequência:', error);
      throw error;
    }
  }

  static async generateMonthlyReport(year: number): Promise<MonthlyReport[]> {
    try {
      const absences = await AbsencesService.getAbsences();
      const monthlyData: Record<string, {
        totalAbsences: number;
        justifiedAbsences: number;
        unjustifiedAbsences: number;
        subjectsAffected: Set<string>;
      }> = {};

      // Processar faltas por mês
      absences
        .filter(absence => new Date(absence.absence_date).getFullYear() === year)
        .forEach(absence => {
          const month = new Date(absence.absence_date).toISOString().substring(0, 7); // YYYY-MM
          
          if (!monthlyData[month]) {
            monthlyData[month] = {
              totalAbsences: 0,
              justifiedAbsences: 0,
              unjustifiedAbsences: 0,
              subjectsAffected: new Set()
            };
          }
          
          monthlyData[month].totalAbsences++;
          if (absence.is_justified) {
            monthlyData[month].justifiedAbsences++;
          } else {
            monthlyData[month].unjustifiedAbsences++;
          }
          monthlyData[month].subjectsAffected.add(absence.subject_name);
        });

      // Converter para array e ordenar por mês
      const reports: MonthlyReport[] = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          totalAbsences: data.totalAbsences,
          justifiedAbsences: data.justifiedAbsences,
          unjustifiedAbsences: data.unjustifiedAbsences,
          subjectsAffected: data.subjectsAffected.size
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return reports;
    } catch (error) {
      console.error('Erro ao gerar relatório mensal:', error);
      throw error;
    }
  }

  static async generateOverallStats(): Promise<OverallStats> {
    try {
      const subjectsWithStats = await AcademicSubjectsService.getAllSubjectsStats();
      const totalAbsences = await AbsencesService.getAbsences();
      
      const stats = {
        totalSubjects: subjectsWithStats.length,
        totalAbsences: totalAbsences.length,
        averageAttendance: 0,
        subjectsAtRisk: 0,
        subjectsInWarning: 0,
        subjectsSafe: 0
      };

      if (subjectsWithStats.length > 0) {
        // Calcular média de frequência
        const totalAttendance = subjectsWithStats.reduce(
          (sum, { stats: subjectStats }) => sum + subjectStats.attendancePercentage,
          0
        );
        stats.averageAttendance = totalAttendance / subjectsWithStats.length;

        // Contar matérias por status
        subjectsWithStats.forEach(({ stats: subjectStats }) => {
          switch (subjectStats.status) {
            case 'danger':
              stats.subjectsAtRisk++;
              break;
            case 'warning':
              stats.subjectsInWarning++;
              break;
            case 'safe':
              stats.subjectsSafe++;
              break;
          }
        });
      }

      return stats;
    } catch (error) {
      console.error('Erro ao gerar estatísticas gerais:', error);
      throw error;
    }
  }

  static async analyzeSubjectRisk(): Promise<SubjectRiskAnalysis[]> {
    try {
      const subjectsWithStats = await AcademicSubjectsService.getAllSubjectsStats();
      const currentDate = new Date();
      
      const analyses: SubjectRiskAnalysis[] = subjectsWithStats.map(({ subject, stats }) => {
        const endDate = new Date(subject.end_date);
        const daysUntilEnd = Math.max(0, Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        // Calcular nível de risco
        let riskLevel: 'low' | 'medium' | 'high' | 'critical';
        let recommendedAction: string;
        
        const absenceRatio = stats.currentAbsences / stats.allowedAbsences;
        
        if (stats.currentAbsences >= stats.allowedAbsences) {
          riskLevel = 'critical';
          recommendedAction = 'ATENÇÃO: Limite de faltas excedido! Contate a coordenação imediatamente.';
        } else if (absenceRatio >= 0.9) {
          riskLevel = 'high';
          recommendedAction = 'Evite faltar nas próximas aulas. Apenas ' + (stats.allowedAbsences - stats.currentAbsences) + ' falta(s) restante(s).';
        } else if (absenceRatio >= 0.7) {
          riskLevel = 'medium';
          recommendedAction = 'Cuidado com as faltas. Monitore sua frequência de perto.';
        } else {
          riskLevel = 'low';
          recommendedAction = 'Frequência em dia. Continue assim!';
        }
        
        // Projeção de frequência final (assumindo que não haverá mais faltas)
        const projectedFinalAttendance = stats.attendancePercentage;
        
        return {
          subjectId: subject.id,
          subjectName: subject.name,
          riskLevel,
          currentAbsences: stats.currentAbsences,
          allowedAbsences: stats.allowedAbsences,
          attendancePercentage: stats.attendancePercentage,
          projectedFinalAttendance,
          daysUntilEnd,
          recommendedAction
        };
      });
      
      // Ordenar por nível de risco (crítico primeiro)
      const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return analyses.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
    } catch (error) {
      console.error('Erro ao analisar risco das matérias:', error);
      throw error;
    }
  }

  static async exportAttendanceData(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const report = await this.generateAttendanceReport();
      
      if (format === 'csv') {
        const headers = [
          'Matéria',
          'Total de Aulas',
          'Aulas Assistidas',
          'Faltas',
          'Faltas Justificadas',
          'Faltas Injustificadas',
          'Percentual de Frequência',
          'Status',
          'Faltas Permitidas',
          'Faltas Restantes'
        ];
        
        const csvRows = [headers.join(',')];
        
        report.forEach(item => {
          const row = [
            `"${item.subject.name}"`,
            item.totalClasses,
            item.attendedClasses,
            item.absences,
            item.justifiedAbsences,
            item.unjustifiedAbsences,
            `${item.attendancePercentage.toFixed(2)}%`,
            item.status,
            item.allowedAbsences,
            item.remainingAbsences
          ];
          csvRows.push(row.join(','));
        });
        
        return csvRows.join('\n');
      }
      
      return JSON.stringify(report, null, 2);
    } catch (error) {
      console.error('Erro ao exportar dados de frequência:', error);
      throw error;
    }
  }

  static async getAttendanceTrends(subjectId: number, months: number = 6): Promise<{
    labels: string[];
    absencesData: number[];
    attendanceData: number[];
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      
      const absences = await AbsencesService.getAbsencesByAcademicSubject(subjectId);
      const filteredAbsences = absences.filter(absence => {
        const absenceDate = new Date(absence.absence_date);
        return absenceDate >= startDate && absenceDate <= endDate;
      });
      
      const monthlyData: Record<string, number> = {};
      const labels: string[] = [];
      
      // Gerar labels para os últimos N meses
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
        const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        labels.push(monthLabel);
        monthlyData[monthKey] = 0;
      }
      
      // Contar faltas por mês
      filteredAbsences.forEach(absence => {
        const monthKey = new Date(absence.absence_date).toISOString().substring(0, 7);
        if (monthlyData.hasOwnProperty(monthKey)) {
          monthlyData[monthKey]++;
        }
      });
      
      const absencesData = Object.values(monthlyData);
      
      // Calcular dados de frequência (assumindo frequência constante)
      const subject = await AcademicSubjectsService.getAcademicSubjectById(subjectId);
      const monthlyClasses = subject ? Math.ceil(subject.weekly_frequency * 4.33) : 0; // Aproximadamente 4.33 semanas por mês
      const attendanceData = absencesData.map(absences => Math.max(0, monthlyClasses - absences));
      
      return {
        labels,
        absencesData,
        attendanceData
      };
    } catch (error) {
      console.error('Erro ao obter tendências de frequência:', error);
      throw error;
    }
  }
}