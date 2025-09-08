import { supabase } from '@/lib/supabase';

export interface CompleteExam {
  id?: number;
  user_id?: string;
  exam_type_id: number;
  title: string;
  description?: string;
  institution?: string;
  year?: number;
  original_pdf_url?: string;
  extracted_text?: string;
  total_questions: number;
  time_limit?: number;
  is_public?: boolean;
  is_approved?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CompleteExamQuestion {
  id?: number;
  complete_exam_id: number;
  question_number: number;
  statement: string;
  explanation?: string;
  correct_answer_key: string;
  image_url?: string;
  position: number;
  created_at?: string;
}

export interface CompleteExamOption {
  id?: number;
  question_id: number;
  option_key: string;
  option_text: string;
  is_correct: boolean;
  created_at?: string;
}

export interface CompleteExamAttempt {
  id?: number;
  user_id: string;
  complete_exam_id: number;
  started_at: string;
  completed_at?: string;
  score?: number;
  total_questions: number;
  correct_answers?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CompleteExamAnswer {
  id?: number;
  attempt_id: number;
  question_id: number;
  selected_option_key?: string;
  is_correct?: boolean;
  created_at?: string;
  updated_at?: string;
}

export class CompleteExamsService {
  /**
   * Criar uma nova prova completa
   */
  static async createCompleteExam(examData: Omit<CompleteExam, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<number | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('complete_exams')
        .insert({
          ...examData,
          user_id: user.id,
          is_public: examData.is_public ?? false,
          is_approved: examData.is_approved // Preservar null para pending_review
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Erro ao criar prova completa:', error);
      return null;
    }
  }

  /**
   * Criar questão para uma prova completa
   */
  static async createCompleteExamQuestion(questionData: Omit<CompleteExamQuestion, 'id' | 'created_at'>): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('complete_exam_questions')
        .insert(questionData)
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Erro ao criar questão da prova completa:', error);
      return null;
    }
  }

  /**
   * Criar opções para uma questão
   */
  static async createCompleteExamOptions(options: Omit<CompleteExamOption, 'id' | 'created_at'>[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('complete_exam_options')
        .insert(options);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Erro ao criar opções da questão:', error);
      return false;
    }
  }

  /**
   * Buscar provas completas do usuário
   */
  static async getUserCompleteExams(): Promise<CompleteExam[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('complete_exams')
        .select(`
          *,
          exam_types(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar provas completas do usuário:', error);
      return [];
    }
  }

  /**
   * Buscar provas completas públicas e aprovadas
   */
  static async getPublicCompleteExams(examTypeId?: number): Promise<CompleteExam[]> {
    try {
      let query = supabase
        .from('complete_exams')
        .select(`
          *,
          exam_types(name)
        `)
        .eq('is_public', true)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (examTypeId) {
        query = query.eq('exam_type_id', examTypeId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar provas completas públicas:', error);
      return [];
    }
  }

  /**
   * Buscar uma prova completa com suas questões e opções
   */
  static async getCompleteExamWithQuestions(examId: number): Promise<CompleteExam & { questions: (CompleteExamQuestion & { options: CompleteExamOption[] })[] } | null> {
    try {
      // Buscar a prova
      const { data: exam, error: examError } = await supabase
        .from('complete_exams')
        .select(`
          *,
          exam_types(name)
        `)
        .eq('id', examId)
        .single();

      if (examError) {
        throw examError;
      }

      // Buscar as questões
      const { data: questions, error: questionsError } = await supabase
        .from('complete_exam_questions')
        .select('*')
        .eq('complete_exam_id', examId)
        .order('position');

      if (questionsError) {
        throw questionsError;
      }

      // Buscar as opções para cada questão
      const questionsWithOptions = await Promise.all(
        (questions || []).map(async (question) => {
          const { data: options, error: optionsError } = await supabase
            .from('complete_exam_options')
            .select('*')
            .eq('question_id', question.id)
            .order('option_key');

          if (optionsError) {
            console.error('Erro ao buscar opções da questão:', optionsError);
            return { ...question, options: [] };
          }

          return { ...question, options: options || [] };
        })
      );

      return {
        ...exam,
        questions: questionsWithOptions
      };
    } catch (error) {
      console.error('Erro ao buscar prova completa com questões:', error);
      return null;
    }
  }

  /**
   * Iniciar uma tentativa de prova
   */
  static async startCompleteExamAttempt(examId: number): Promise<number | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar o número total de questões
      const { data: exam, error: examError } = await supabase
        .from('complete_exams')
        .select('total_questions')
        .eq('id', examId)
        .single();

      if (examError) {
        throw examError;
      }

      const { data, error } = await supabase
        .from('complete_exam_attempts')
        .insert({
          user_id: user.id,
          complete_exam_id: examId,
          started_at: new Date().toISOString(),
          total_questions: exam.total_questions
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Erro ao iniciar tentativa de prova:', error);
      return null;
    }
  }

  /**
   * Salvar resposta de uma questão
   */
  static async saveCompleteExamAnswer(answerData: Omit<CompleteExamAnswer, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      // Verificar se há uma resposta selecionada
      if (!answerData.selected_option_key) {
        console.error('Nenhuma opção selecionada');
        return false;
      }

      // Verificar se a resposta está correta
      const { data: option, error: optionError } = await supabase
        .from('complete_exam_options')
        .select('is_correct')
        .eq('question_id', answerData.question_id)
        .eq('option_key', answerData.selected_option_key)
        .single();

      if (optionError) {
        console.error('Erro ao verificar resposta:', optionError);
        return false;
      }

      const { error } = await supabase
        .from('complete_exam_answers')
        .upsert({
          ...answerData,
          is_correct: option?.is_correct || false
        }, {
          onConflict: 'attempt_id,question_id'
        });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Erro ao salvar resposta:', error);
      return false;
    }
  }

  /**
   * Submeter tentativa de prova com respostas
   */
  static async submitCompleteExamAttempt(
    attemptId: number, 
    answers: { question_id: number; selected_option_key: string }[]
  ): Promise<boolean> {
    try {
      console.log('Iniciando submissão da tentativa:', attemptId);
      console.log('Respostas a serem salvas:', answers);

      // Salvar todas as respostas
      let savedAnswers = 0;
      for (const answer of answers) {
        const success = await this.saveCompleteExamAnswer({
          attempt_id: attemptId,
          question_id: answer.question_id,
          selected_option_key: answer.selected_option_key
        });
        
        if (success) {
          savedAnswers++;
        } else {
          console.error('Falha ao salvar resposta:', answer);
        }
      }

      console.log(`Respostas salvas: ${savedAnswers}/${answers.length}`);

      // Finalizar a tentativa
      const attempt = await this.finishCompleteExamAttempt(attemptId);
      
      if (attempt) {
        console.log('Tentativa finalizada com sucesso:', attempt);
        return true;
      } else {
        console.error('Falha ao finalizar tentativa');
        return false;
      }
    } catch (error) {
      console.error('Erro ao submeter tentativa:', error);
      return false;
    }
  }

  /**
   * Buscar resultado detalhado de uma tentativa
   */
  static async getCompleteExamAttemptResult(attemptId: number) {
    try {
      const { data: attempt, error: attemptError } = await supabase
        .from('complete_exam_attempts')
        .select(`
          *,
          complete_exams!inner (
            *,
            complete_exam_questions (
              *,
              complete_exam_options (*)
            )
          )
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) {
        throw attemptError;
      }

      // Buscar respostas do usuário
      const { data: userAnswers, error: answersError } = await supabase
        .from('complete_exam_answers')
        .select(`
          *,
          complete_exam_questions!inner (
            *,
            complete_exam_options (*)
          )
        `)
        .eq('attempt_id', attemptId);

      if (answersError) {
        throw answersError;
      }

      return {
        ...attempt,
        exam: {
          ...attempt.complete_exams,
          questions: attempt.complete_exams.complete_exam_questions.map(question => ({
            ...question,
            options: question.complete_exam_options || []
          }))
        },
        user_answers: userAnswers.map(answer => ({
          question_id: answer.question_id,
          selected_option_key: answer.selected_option_key,
          is_correct: answer.is_correct,
          question: {
            ...answer.complete_exam_questions,
            options: answer.complete_exam_questions.complete_exam_options || []
          }
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar resultado da tentativa:', error);
      return null;
    }
  }

  /**
   * Finalizar tentativa de prova
   */
  static async finishCompleteExamAttempt(attemptId: number): Promise<CompleteExamAttempt | null> {
    try {
      // Buscar todas as respostas desta tentativa
      const { data: answers, error: answersError } = await supabase
        .from('complete_exam_answers')
        .select('is_correct')
        .eq('attempt_id', attemptId);

      if (answersError) {
        throw answersError;
      }

      // Contar respostas corretas
      const correctAnswers = answers?.filter(a => a.is_correct).length || 0;

      // Buscar os detalhes da tentativa para calcular a pontuação
      const { data: attempt, error: attemptError } = await supabase
        .from('complete_exam_attempts')
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
        .from('complete_exam_attempts')
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
      console.error('Erro ao finalizar tentativa:', error);
      return null;
    }
  }

  /**
   * Buscar tentativas do usuário para uma prova
   */
  static async getUserCompleteExamAttempts(examId: number): Promise<CompleteExamAttempt[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('complete_exam_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('complete_exam_id', examId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar tentativas do usuário:', error);
      return [];
    }
  }

  /**
   * Buscar todas as tentativas de provas completas do usuário
   */
  static async getAllUserCompleteExamAttempts(): Promise<(CompleteExamAttempt & { exam: CompleteExam })[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('complete_exam_attempts')
        .select(`
          *,
          complete_exams!inner (
            id,
            title,
            description,
            exam_type_id,
            total_questions,
            exam_types(name)
          )
        `)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(attempt => ({
        ...attempt,
        exam: attempt.complete_exams
      }));
    } catch (error) {
      console.error('Erro ao buscar todas as tentativas do usuário:', error);
      return [];
    }
  }

  /**
   * Excluir uma prova completa
   */
  static async deleteCompleteExam(examId: number): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('complete_exams')
        .delete()
        .eq('id', examId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao deletar prova:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar prova:', error);
      return false;
    }
  }

  /**
   * Aprovar uma prova completa
   */
  static async approveCompleteExam(examId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('complete_exams')
        .update({ 
          is_approved: true, 
          is_public: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId);

      if (error) {
        console.error('Erro ao aprovar prova:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao aprovar prova:', error);
      return false;
    }
  }

  /**
   * Rejeitar uma prova completa
   */
  static async rejectCompleteExam(examId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('complete_exams')
        .update({ 
          is_approved: false, 
          is_public: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', examId);

      if (error) {
        console.error('Erro ao rejeitar prova:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao rejeitar prova:', error);
      return false;
    }
  }

  /**
   * Buscar todas as provas completas para gerenciamento
   */
  static async getAllCompleteExamsForManagement(): Promise<CompleteExam[]> {
    try {
      const { data, error } = await supabase
        .from('complete_exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar provas para gerenciamento:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar provas para gerenciamento:', error);
      return [];
    }
  }
}

export default CompleteExamsService;