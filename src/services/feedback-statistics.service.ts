import { supabase } from '@/lib/supabase';
import { DisciplinePerformance, SubjectPerformance, FeedbackDetalhado } from '@/components/feedback/FeedbackDetalhado';

export interface CompleteExamAnswer {
  question_id: number;
  selected_option_key: string;
  is_correct: boolean;
}

export interface CompleteExamAttemptData {
  id: number;
  exam_id: number;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total_questions: number;
  correct_answers: number | null;
  user_answers: CompleteExamAnswer[];
  exam: {
    id: number;
    title: string;
    exam_type_id: number;
    questions: {
      id: number;
      discipline_id: number | null;
      topic_id: number | null;
      disciplines?: {
        id: number;
        name: string;
      } | null;
      topics?: {
        id: number;
        name: string;
        subject_id: number | null;
        subjects?: {
          id: number;
          name: string;
          title?: string;
        } | null;
      } | null;
    }[];
  };
}

export class FeedbackStatisticsService {
  /**
   * Calcula estatísticas detalhadas de desempenho por disciplina
   */
  static async calculateDisciplinePerformance(
    attemptData: CompleteExamAttemptData
  ): Promise<DisciplinePerformance[]> {
    try {
      const { user_answers, exam } = attemptData;
      
      if (!user_answers || !exam.questions) {
        return [];
      }

      // Mapear disciplinas
      const disciplineMap: Record<number, {
        id: number;
        name: string;
        total: number;
        correct: number;
      }> = {};

      // Inicializar mapa de disciplinas
      exam.questions.forEach(question => {
        if (question.discipline_id && question.disciplines) {
          const disciplineId = question.discipline_id;
          if (!disciplineMap[disciplineId]) {
            disciplineMap[disciplineId] = {
              id: disciplineId,
              name: question.disciplines.name,
              total: 0,
              correct: 0
            };
          }
        }
      });

      // Contar respostas por disciplina
      user_answers.forEach(answer => {
        const question = exam.questions.find(q => q.id === answer.question_id);
        if (question && question.discipline_id && disciplineMap[question.discipline_id]) {
          disciplineMap[question.discipline_id].total += 1;
          if (answer.is_correct) {
            disciplineMap[question.discipline_id].correct += 1;
          }
        }
      });

      // Converter para array e calcular porcentagem
      return Object.values(disciplineMap)
        .filter(d => d.total > 0)
        .map(discipline => ({
          name: discipline.name,
          questions: discipline.total,
          correct: discipline.correct,
          score: Math.round((discipline.correct / discipline.total) * 100)
        }))
        .sort((a, b) => b.score - a.score);

    } catch (error) {
      console.error('Erro ao calcular desempenho por disciplina:', error);
      return [];
    }
  }

  /**
   * Calcula estatísticas detalhadas de desempenho por assunto
   */
  static async calculateSubjectPerformance(
    attemptData: CompleteExamAttemptData
  ): Promise<SubjectPerformance[]> {
    try {
      const { user_answers, exam } = attemptData;
      
      if (!user_answers || !exam.questions) {
        return [];
      }

      // Mapear assuntos
      const subjectMap: Record<number, {
        id: number;
        name: string;
        total: number;
        correct: number;
      }> = {};

      // Inicializar mapa de assuntos
      exam.questions.forEach(question => {
        if (question.topics?.subject_id && question.topics.subjects) {
          const subjectId = question.topics.subject_id;
          if (!subjectMap[subjectId]) {
            // Usar name se disponível, senão title
            const subjectName = question.topics.subjects.name || question.topics.subjects.title || `Assunto ${subjectId}`;
            subjectMap[subjectId] = {
              id: subjectId,
              name: subjectName,
              total: 0,
              correct: 0
            };
          }
        }
      });

      // Contar respostas por assunto
      user_answers.forEach(answer => {
        const question = exam.questions.find(q => q.id === answer.question_id);
        if (question && question.topics?.subject_id && subjectMap[question.topics.subject_id]) {
          subjectMap[question.topics.subject_id].total += 1;
          if (answer.is_correct) {
            subjectMap[question.topics.subject_id].correct += 1;
          }
        }
      });

      // Converter para array e calcular porcentagem
      return Object.values(subjectMap)
        .filter(s => s.total > 0)
        .map(subject => ({
          name: subject.name,
          questions: subject.total,
          correct: subject.correct,
          score: Math.round((subject.correct / subject.total) * 100)
        }))
        .sort((a, b) => b.score - a.score);

    } catch (error) {
      console.error('Erro ao calcular desempenho por assunto:', error);
      return [];
    }
  }

  /**
   * Gera feedback detalhado completo
   */
  static async generateDetailedFeedback(
    attemptData: CompleteExamAttemptData
  ): Promise<FeedbackDetalhado> {
    try {
      const {
        user_answers,
        exam,
        started_at,
        completed_at,
        total_questions,
        correct_answers
      } = attemptData;

      // Calcular tempo gasto
      const startTime = new Date(started_at).getTime();
      const endTime = new Date(completed_at || started_at).getTime();
      const timeSpent = Math.round((endTime - startTime) / 1000 / 60); // em minutos

      // Calcular estatísticas básicas
      const totalCorrect = correct_answers || user_answers.filter(a => a.is_correct).length;
      const overallScore = total_questions > 0 ? Math.round((totalCorrect / total_questions) * 100) : 0;

      // Calcular desempenho por disciplina e assunto
      const [disciplinePerformance, subjectPerformance] = await Promise.all([
        this.calculateDisciplinePerformance(attemptData),
        this.calculateSubjectPerformance(attemptData)
      ]);

      // Determinar tipo de exame
      const examTypeMap: Record<number, string> = {
        1: 'Residência Médica',
        2: 'Concurso Público',
        3: 'ENEM',
        4: 'Vestibular'
      };
      const examType = examTypeMap[exam.exam_type_id] || 'Prova';

      return {
        totalQuestions: total_questions,
        totalCorrect,
        overallScore,
        timeSpent,
        disciplinePerformance,
        subjectPerformance,
        examTitle: exam.title,
        examType
      };

    } catch (error) {
      console.error('Erro ao gerar feedback detalhado:', error);
      throw error;
    }
  }

  /**
   * Busca dados de tentativa com informações completas para feedback
   */
  static async getAttemptDataForFeedback(
    attemptId: number
  ): Promise<CompleteExamAttemptData | null> {
    try {
      const { data: attempt, error } = await supabase
        .from('complete_exam_attempts')
        .select(`
          id,
          exam_id,
          user_id,
          started_at,
          completed_at,
          score,
          total_questions,
          correct_answers,
          complete_exams!inner (
            id,
            title,
            exam_type_id,
            complete_exam_questions!inner (
              id,
              discipline_id,
              topic_id,
              disciplines:discipline_id (
                id,
                name
              ),
              topics:topic_id (
                id,
                name,
                subject_id,
                subjects:subject_id (
                  id,
                  name,
                  title
                )
              )
            )
          )
        `)
        .eq('id', attemptId)
        .single();

      if (error) {
        console.error('Erro ao buscar dados da tentativa:', error);
        return null;
      }

      if (!attempt) {
        return null;
      }

      // Buscar respostas do usuário
      const { data: userAnswers, error: answersError } = await supabase
        .from('complete_exam_answers')
        .select('question_id, selected_option_key, is_correct')
        .eq('attempt_id', attemptId);

      if (answersError) {
        console.error('Erro ao buscar respostas do usuário:', error);
        return null;
      }

      // Estruturar dados
      return {
        id: attempt.id,
        exam_id: attempt.exam_id,
        user_id: attempt.user_id,
        started_at: attempt.started_at,
        completed_at: attempt.completed_at,
        score: attempt.score,
        total_questions: attempt.total_questions,
        correct_answers: attempt.correct_answers,
        user_answers: userAnswers || [],
        exam: {
          id: attempt.complete_exams.id,
          title: attempt.complete_exams.title,
          exam_type_id: attempt.complete_exams.exam_type_id,
          questions: attempt.complete_exams.complete_exam_questions
        }
      };

    } catch (error) {
      console.error('Erro ao buscar dados para feedback:', error);
      return null;
    }
  }

  /**
   * Gera recomendações de estudo baseadas no desempenho
   */
  static generateStudyRecommendations(
    disciplinePerformance: DisciplinePerformance[],
    subjectPerformance: SubjectPerformance[],
    overallScore: number
  ): {
    priority: 'high' | 'medium' | 'low';
    type: 'discipline' | 'subject' | 'general';
    title: string;
    description: string;
    action: string;
  }[] {
    const recommendations = [];

    // Recomendações baseadas no desempenho geral
    if (overallScore < 50) {
      recommendations.push({
        priority: 'high' as const,
        type: 'general' as const,
        title: 'Revisão Geral Necessária',
        description: 'Seu desempenho geral está abaixo do esperado.',
        action: 'Dedique mais tempo ao estudo e considere revisar os fundamentos.'
      });
    }

    // Recomendações por disciplina
    const weakDisciplines = disciplinePerformance.filter(d => d.score < 60);
    weakDisciplines.forEach(discipline => {
      recommendations.push({
        priority: discipline.score < 40 ? 'high' as const : 'medium' as const,
        type: 'discipline' as const,
        title: `Melhorar ${discipline.name}`,
        description: `Desempenho de ${discipline.score}% em ${discipline.name}.`,
        action: `Foque em estudar mais ${discipline.name} e resolva questões específicas desta disciplina.`
      });
    });

    // Recomendações por assunto
    const weakSubjects = subjectPerformance.filter(s => s.score < 60).slice(0, 3); // Top 3 piores
    weakSubjects.forEach(subject => {
      recommendations.push({
        priority: subject.score < 40 ? 'high' as const : 'medium' as const,
        type: 'subject' as const,
        title: `Revisar ${subject.name}`,
        description: `Apenas ${subject.score}% de acertos em ${subject.name}.`,
        action: `Estude especificamente sobre ${subject.name} e pratique questões relacionadas.`
      });
    });

    return recommendations.slice(0, 5); // Limitar a 5 recomendações
  }
}

export default FeedbackStatisticsService;