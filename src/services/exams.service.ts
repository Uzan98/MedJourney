import { supabase } from '@/lib/supabase';
import { Question } from '@/services/questions-bank.service';
import { toast } from 'react-hot-toast';

export interface Exam {
  id?: number;
  user_id?: string;
  title: string;
  description?: string;
  time_limit?: number | null;
  is_public?: boolean;
  shuffle_questions?: boolean;
  show_answers?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ExamQuestion {
  id?: number;
  exam_id: number;
  question_id: number;
  position?: number;
  weight?: number;
  created_at?: string;
  question?: Question; // Usado para carregar os detalhes da questão
}

export interface ExamAttempt {
  id?: number;
  user_id?: string;
  exam_id: number;
  started_at?: string;
  completed_at?: string;
  score?: number;
  total_questions: number;
  correct_answers?: number;
  created_at?: string;
  updated_at?: string;
  exam?: Exam; // Carregado para exibir detalhes do simulado
}

export interface ExamAnswer {
  id?: number;
  attempt_id: number;
  question_id: number;
  selected_option_id?: number | null;
  answer_text?: string | null;
  true_false_answer?: boolean | null;
  is_correct?: boolean;
  created_at?: string;
  updated_at?: string;
}

export class ExamsService {
  /**
   * Obter todos os simulados do usuário atual
   */
  static async getUserExams(): Promise<Exam[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar simulados:', error);
      return [];
    }
  }

  /**
   * Obter simulados públicos disponíveis para fazer
   */
  static async getPublicExams(): Promise<Exam[]> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar simulados públicos:', error);
      return [];
    }
  }

  /**
   * Obter um simulado específico pelo ID
   */
  static async getExamById(id: number): Promise<Exam | null> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error(`Erro ao buscar simulado ${id}:`, error);
      return null;
    }
  }

  /**
   * Obter as questões de um simulado
   */
  static async getExamQuestions(examId: number, includeQuestionDetails = false): Promise<ExamQuestion[]> {
    try {
      let query = supabase
        .from('exam_questions')
        .select(includeQuestionDetails ? 'id, exam_id, question_id, position, weight, question:questions(*)' : '*')
        .eq('exam_id', examId)
        .order('position', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data as ExamQuestion[];
    } catch (error) {
      console.error(`Erro ao buscar questões do simulado ${examId}:`, error);
      return [];
    }
  }

  /**
   * Adicionar um novo simulado
   */
  static async addExam(exam: Exam): Promise<number | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Adiciona o user_id ao simulado
      const newExam = {
        ...exam,
        user_id: user.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Insere o simulado
      const { data, error } = await supabase
        .from('exams')
        .insert([newExam])
        .select('id')
        .single();

      if (error) {
        throw error;
      }
      
      return data.id;
    } catch (error) {
      console.error('Erro ao adicionar simulado:', error);
      return null;
    }
  }

  /**
   * Atualizar um simulado existente
   */
  static async updateExam(id: number, exam: Exam): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('exams')
        .update({
          ...exam,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar simulado ${id}:`, error);
      return false;
    }
  }

  /**
   * Excluir um simulado e todas as suas questões
   */
  static async deleteExam(id: number): Promise<boolean> {
    try {
      // Não precisamos excluir as questões associadas devido ao ON DELETE CASCADE
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error(`Erro ao excluir simulado ${id}:`, error);
      return false;
    }
  }

  /**
   * Adicionar uma questão a um simulado
   */
  static async addQuestionToExam(examId: number, questionId: number, position?: number, weight: number = 1.0): Promise<boolean> {
    try {
      // Verifica se a questão já existe no simulado
      const { data: existing, error: checkError } = await supabase
        .from('exam_questions')
        .select('id')
        .eq('exam_id', examId)
        .eq('question_id', questionId)
        .maybeSingle();
      
      if (checkError) {
        throw checkError;
      }
      
      if (existing) {
        // A questão já existe neste simulado
        return true;
      }
      
      // Se a posição não foi especificada, adiciona ao final
      if (!position) {
        const { data: lastPosition, error: posError } = await supabase
          .from('exam_questions')
          .select('position')
          .eq('exam_id', examId)
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (posError) {
          throw posError;
        }
        
        position = lastPosition ? (lastPosition.position || 0) + 1 : 1;
      }
      
      // Adiciona a questão ao simulado
      const { error } = await supabase
        .from('exam_questions')
        .insert([{
          exam_id: examId,
          question_id: questionId,
          position,
          weight,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error(`Erro ao adicionar questão ${questionId} ao simulado ${examId}:`, error);
      return false;
    }
  }

  /**
   * Remover uma questão de um simulado
   */
  static async removeQuestionFromExam(examId: number, questionId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('exam_questions')
        .delete()
        .eq('exam_id', examId)
        .eq('question_id', questionId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error(`Erro ao remover questão ${questionId} do simulado ${examId}:`, error);
      return false;
    }
  }

  /**
   * Reordenar as questões de um simulado
   */
  static async reorderExamQuestions(examId: number, questionIds: number[]): Promise<boolean> {
    try {
      // Para cada ID de questão, atualiza sua posição
      for (let i = 0; i < questionIds.length; i++) {
        const { error } = await supabase
          .from('exam_questions')
          .update({ position: i + 1 })
          .eq('exam_id', examId)
          .eq('question_id', questionIds[i]);
        
        if (error) {
          throw error;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Erro ao reordenar questões do simulado ${examId}:`, error);
      return false;
    }
  }

  /**
   * Iniciar uma nova tentativa de simulado
   */
  static async startExamAttempt(examId: number): Promise<number | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Obter o número total de questões no simulado
      const { data: questions, error: questionsError } = await supabase
        .from('exam_questions')
        .select('question_id')
        .eq('exam_id', examId);
      
      if (questionsError) {
        throw questionsError;
      }
      
      const totalQuestions = questions?.length || 0;
      
      if (totalQuestions === 0) {
        throw new Error('Este simulado não contém questões');
      }
      
      // Criar a tentativa
      const { data, error } = await supabase
        .from('exam_attempts')
        .insert([{
          user_id: user.user.id,
          exam_id: examId,
          started_at: new Date().toISOString(),
          total_questions: totalQuestions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        throw error;
      }
      
      return data.id;
    } catch (error) {
      console.error(`Erro ao iniciar tentativa para o simulado ${examId}:`, error);
      return null;
    }
  }

  /**
   * Finalizar uma tentativa de simulado e calcular a pontuação
   */
  static async finishExamAttempt(attemptId: number): Promise<ExamAttempt | null> {
    try {
      // Buscar todas as respostas desta tentativa
      const { data: answers, error: answersError } = await supabase
        .from('exam_answers')
        .select('is_correct')
        .eq('attempt_id', attemptId);
      
      if (answersError) {
        throw answersError;
      }
      
      // Contar respostas corretas
      const correctAnswers = answers?.filter(a => a.is_correct).length || 0;
      
      // Buscar os detalhes da tentativa para calcular a pontuação
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();
      
      if (attemptError) {
        throw attemptError;
      }
      
      // Calcular a pontuação (percentual)
      const totalQuestions = attempt.total_questions;
      const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
      
      // Atualizar a tentativa com os resultados
      const { data, error } = await supabase
        .from('exam_attempts')
        .update({
          completed_at: new Date().toISOString(),
          correct_answers: correctAnswers,
          score,
          updated_at: new Date().toISOString()
        })
        .eq('id', attemptId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error(`Erro ao finalizar tentativa ${attemptId}:`, error);
      return null;
    }
  }

  /**
   * Salvar uma resposta para uma questão do simulado
   */
  static async saveExamAnswer(answer: ExamAnswer): Promise<boolean> {
    try {
      // Verificar se já existe uma resposta para esta questão nesta tentativa
      const { data: existing, error: checkError } = await supabase
        .from('exam_answers')
        .select('id')
        .eq('attempt_id', answer.attempt_id)
        .eq('question_id', answer.question_id)
        .maybeSingle();
      
      if (checkError) {
        throw checkError;
      }
      
      if (existing) {
        // Atualizar resposta existente
        const { error } = await supabase
          .from('exam_answers')
          .update({
            selected_option_id: answer.selected_option_id,
            answer_text: answer.answer_text,
            true_false_answer: answer.true_false_answer,
            is_correct: answer.is_correct,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (error) {
          throw error;
        }
      } else {
        // Inserir nova resposta
        const { error } = await supabase
          .from('exam_answers')
          .insert([{
            ...answer,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        if (error) {
          throw error;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Erro ao salvar resposta para questão ${answer.question_id}:`, error);
      return false;
    }
  }

  /**
   * Obter as respostas de uma tentativa de simulado
   */
  static async getExamAnswers(attemptId: number): Promise<ExamAnswer[]> {
    try {
      const { data, error } = await supabase
        .from('exam_answers')
        .select('*')
        .eq('attempt_id', attemptId);
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error(`Erro ao buscar respostas da tentativa ${attemptId}:`, error);
      return [];
    }
  }

  /**
   * Obter as tentativas de simulado do usuário atual
   */
  static async getUserAttempts(): Promise<ExamAttempt[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*, exam:exams(*)')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data as ExamAttempt[];
    } catch (error) {
      console.error('Erro ao buscar tentativas de simulados:', error);
      return [];
    }
  }

  /**
   * Obter detalhes de uma tentativa de simulado
   */
  static async getAttemptById(attemptId: number): Promise<ExamAttempt | null> {
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*, exam:exams(*)')
        .eq('id', attemptId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return data as ExamAttempt;
    } catch (error) {
      console.error(`Erro ao buscar tentativa ${attemptId}:`, error);
      return null;
    }
  }

  /**
   * Gerar dados de amostra para simulados (para desenvolvimento)
   */
  static getMockExams(): Exam[] {
    return [
      {
        id: 1,
        title: 'Simulado de Cardiologia',
        description: 'Teste seus conhecimentos em cardiologia com questões de múltipla escolha.',
        time_limit: 60, // 60 minutos
        is_public: true,
        created_at: '2023-11-10T14:30:00Z'
      },
      {
        id: 2,
        title: 'Revisão de Neurologia',
        description: 'Revisão completa dos principais temas de neurologia para provas de residência.',
        time_limit: 120, // 2 horas
        is_public: false,
        created_at: '2023-11-05T09:45:00Z'
      },
      {
        id: 3,
        title: 'Simulado Geral - Medicina Interna',
        description: 'Questões gerais de medicina interna abrangendo vários sistemas.',
        time_limit: null, // Sem limite de tempo
        is_public: true,
        created_at: '2023-10-28T18:15:00Z'
      }
    ];
  }

  /**
   * Calcula o desempenho por disciplina em uma tentativa de simulado
   */
  static async getAttemptPerformanceByDiscipline(attemptId: number): Promise<any[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Buscar respostas do simulado
      const { data: answers, error: answersError } = await supabase
        .from('exam_answers')
        .select(`
          question_id,
          is_correct
        `)
        .eq('attempt_id', attemptId);
      
      if (answersError) throw answersError;
      if (!answers || answers.length === 0) return [];
      
      // Obter IDs das questões
      const questionIds = answers.map(answer => answer.question_id);
      
      // Buscar informações das questões (incluindo disciplina)
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          discipline_id,
          disciplines:discipline_id (
            id,
            name
          )
        `)
        .in('id', questionIds);
      
      if (questionsError) throw questionsError;
      if (!questions || questions.length === 0) return [];
      
      // Agrupar por disciplina
      const disciplineMap: Record<number, {
        id: number,
        name: string,
        total: number,
        correct: number
      }> = {};
      
      // Inicializar o mapa de disciplinas
      questions.forEach(question => {
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
      
      // Contar respostas corretas por disciplina
      answers.forEach(answer => {
        const question = questions.find(q => q.id === answer.question_id);
        if (question && question.discipline_id) {
          const disciplineId = question.discipline_id;
          if (disciplineMap[disciplineId]) {
            disciplineMap[disciplineId].total += 1;
            if (answer.is_correct) {
              disciplineMap[disciplineId].correct += 1;
            }
          }
        }
      });
      
      // Converter para array e calcular porcentagem
      return Object.values(disciplineMap)
        .filter(d => d.total > 0) // Filtrar apenas disciplinas com questões
        .map(discipline => ({
          name: discipline.name,
          questions: discipline.total,
          correct: discipline.correct,
          score: Math.round((discipline.correct / discipline.total) * 100)
        }))
        .sort((a, b) => b.score - a.score); // Ordenar por desempenho (decrescente)
      
    } catch (error) {
      console.error(`Erro ao calcular desempenho por disciplina:`, error);
      return [];
    }
  }

  /**
   * Calcula o desempenho geral por disciplina em todos os simulados do usuário
   */
  static async getUserPerformanceByDiscipline(): Promise<any[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Buscar todas as tentativas concluídas do usuário
      const { data: attempts, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select('id')
        .eq('user_id', user.user.id)
        .not('completed_at', 'is', null);
      
      if (attemptsError) throw attemptsError;
      if (!attempts || attempts.length === 0) return [];
      
      // Buscar todas as respostas de todas as tentativas
      const attemptIds = attempts.map(attempt => attempt.id);
      const { data: answers, error: answersError } = await supabase
        .from('exam_answers')
        .select(`
          question_id,
          is_correct
        `)
        .in('attempt_id', attemptIds);
      
      if (answersError) throw answersError;
      if (!answers || answers.length === 0) return [];
      
      // Obter IDs das questões
      const questionIds = [...new Set(answers.map(answer => answer.question_id))];
      
      // Buscar informações das questões (incluindo disciplina)
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          discipline_id,
          disciplines:discipline_id (
            id,
            name
          )
        `)
        .in('id', questionIds);
      
      if (questionsError) throw questionsError;
      if (!questions || questions.length === 0) return [];
      
      // Agrupar por disciplina
      const disciplineMap: Record<number, {
        id: number,
        name: string,
        total: number,
        correct: number
      }> = {};
      
      // Inicializar o mapa de disciplinas
      questions.forEach(question => {
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
      
      // Contar respostas corretas por disciplina
      answers.forEach(answer => {
        const question = questions.find(q => q.id === answer.question_id);
        if (question && question.discipline_id) {
          const disciplineId = question.discipline_id;
          if (disciplineMap[disciplineId]) {
            disciplineMap[disciplineId].total += 1;
            if (answer.is_correct) {
              disciplineMap[disciplineId].correct += 1;
            }
          }
        }
      });
      
      // Converter para array e calcular porcentagem
      return Object.values(disciplineMap)
        .filter(d => d.total > 0) // Filtrar apenas disciplinas com questões
        .map(discipline => ({
          name: discipline.name,
          questions: discipline.total,
          correct: discipline.correct,
          score: Math.round((discipline.correct / discipline.total) * 100)
        }))
        .sort((a, b) => b.score - a.score); // Ordenar por desempenho (decrescente)
      
    } catch (error) {
      console.error(`Erro ao calcular desempenho geral por disciplina:`, error);
      return [];
    }
  }
} 