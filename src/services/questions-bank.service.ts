import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export interface Question {
  id?: number;
  user_id?: string;
  discipline_id?: number;
  subject_id?: number;
  content: string;
  explanation?: string;
  difficulty?: 'baixa' | 'média' | 'alta';
  question_type?: 'multiple_choice' | 'true_false' | 'essay';
  correct_answer?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  answer_options?: AnswerOption[]; // Referência às opções de resposta
}

export interface AnswerOption {
  /**
   * ID da opção de resposta
   * - No frontend: pode ser uma string temporária (ex: "temp-123456")
   * - No backend: será sempre um número (bigint no Supabase)
   * - Será removido antes de enviar ao backend para criação
   */
  id?: number | string;
  question_id: number;
  text: string;
  is_correct: boolean;
  created_at?: string;
  updated_at?: string;
}

export class QuestionsBankService {
  /**
   * Busca todas as questões do usuário atual
   */
  static async getUserQuestions(): Promise<Question[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar questões:', error);
      return [];
    }
  }

  /**
   * Busca uma questão específica pelo ID
   */
  static async getQuestionById(id: number): Promise<Question | null> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        throw error;
      }
      
      // Carregar as opções de resposta se for uma questão de múltipla escolha ou V/F
      if (data && (data.question_type === 'multiple_choice' || data.question_type === 'true_false')) {
        const options = await this.getAnswerOptions(data.id as number);
        data.answer_options = options;
      }
      
      return data;
    } catch (error) {
      console.error(`Erro ao buscar questão ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Busca as opções de resposta para uma questão específica
   */
  static async getAnswerOptions(questionId: number): Promise<AnswerOption[]> {
    try {
      const { data, error } = await supabase
        .from('answer_options')
        .select('*')
        .eq('question_id', questionId)
        .order('id');
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error(`Erro ao buscar opções de resposta para questão ${questionId}:`, error);
      return [];
    }
  }
  
  /**
   * Adiciona uma nova questão
   */
  static async addQuestion(question: Question, answerOptions?: AnswerOption[]): Promise<number | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Adiciona o user_id à questão
      const newQuestion = {
        ...question,
        user_id: user.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Insere a questão
      const { data, error } = await supabase
        .from('questions')
        .insert([newQuestion])
        .select('id')
        .single();

      if (error) {
        throw error;
      }
      
      const questionId = data.id;
      
      // Se houver opções de resposta e for uma questão de múltipla escolha ou V/F
      if (answerOptions && answerOptions.length > 0 && 
          (question.question_type === 'multiple_choice' || question.question_type === 'true_false')) {
        
        // Adiciona o question_id às opções de resposta e remove os IDs temporários
        const optionsWithQuestionId = answerOptions.map(option => {
          // Remove o campo id para que o Supabase gere um novo ID
          const { id, ...optionWithoutId } = option;
          
          return {
            ...optionWithoutId,
            question_id: questionId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        // Insere as opções de resposta
        const { error: optionsError } = await supabase
          .from('answer_options')
          .insert(optionsWithQuestionId);

        if (optionsError) {
          console.error('Erro ao inserir opções de resposta:', optionsError);
          throw optionsError;
        }
      }
      
      return questionId;
    } catch (error) {
      console.error('Erro ao adicionar questão:', error);
      toast.error('Erro ao adicionar questão: ' + (error as any).message);
      return null;
    }
  }

  /**
   * Alias para addQuestion, para compatibilidade com a interface
   */
  static async createQuestion(question: Question, answerOptions?: AnswerOption[]): Promise<Question | null> {
    const questionId = await this.addQuestion(question, answerOptions);
    if (questionId) {
      return {
        ...question,
        id: questionId
      };
    }
    return null;
  }

  /**
   * Atualiza uma questão existente
   */
  static async updateQuestion(id: number, question: Question, answerOptions?: AnswerOption[]): Promise<boolean> {
    try {
      // Atualiza a questão
      const { error } = await supabase
        .from('questions')
        .update({
          ...question,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        throw error;
      }
      
      // Se houver opções de resposta e for uma questão de múltipla escolha ou V/F
      if (answerOptions && answerOptions.length > 0 && 
          (question.question_type === 'multiple_choice' || question.question_type === 'true_false')) {
        
        // Primeiro, exclui as opções de resposta existentes
        const { error: deleteError } = await supabase
          .from('answer_options')
          .delete()
          .eq('question_id', id);

        if (deleteError) {
          throw deleteError;
        }

        // Adiciona o question_id às opções de resposta e remove os IDs temporários
        const optionsWithQuestionId = answerOptions.map(option => {
          // Remove o campo id para que o Supabase gere um novo ID
          const { id: optionId, ...optionWithoutId } = option;
          
          return {
            ...optionWithoutId,
            question_id: id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        // Insere as novas opções de resposta
        const { error: optionsError } = await supabase
          .from('answer_options')
          .insert(optionsWithQuestionId);

        if (optionsError) {
          console.error('Erro ao inserir opções de resposta:', optionsError);
          throw optionsError;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar questão ${id}:`, error);
      toast.error('Erro ao atualizar questão: ' + (error as any).message);
      return false;
    }
  }

  /**
   * Exclui uma questão e suas opções de resposta
   */
  static async deleteQuestion(id: number): Promise<boolean> {
    try {
      // Primeiro, exclui as opções de resposta associadas
      const { error: optionsError } = await supabase
        .from('answer_options')
        .delete()
        .eq('question_id', id);

      if (optionsError) {
        throw optionsError;
      }

      // Em seguida, exclui a questão
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error(`Erro ao excluir questão ${id}:`, error);
      return false;
    }
  }

  /**
   * Busca questões com base em filtros
   */
  static async getFilteredQuestions(filters: {
    disciplineId?: number;
    subjectId?: number;
    difficulty?: string;
    questionType?: string;
    searchTerm?: string;
  }): Promise<Question[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }
      
      let query = supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.user.id);
      
      // Aplica os filtros
      if (filters.disciplineId) {
        query = query.eq('discipline_id', filters.disciplineId);
      }
      
      if (filters.subjectId) {
        query = query.eq('subject_id', filters.subjectId);
      }
      
      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }
      
      if (filters.questionType) {
        query = query.eq('question_type', filters.questionType);
      }
      
      if (filters.searchTerm) {
        query = query.ilike('content', `%${filters.searchTerm}%`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao filtrar questões:', error);
      return [];
    }
  }
  
  /**
   * Verifica se as tabelas necessárias existem e contêm dados
   */
  static async checkTablesExist(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Erro ao verificar tabelas:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao verificar estrutura do banco de dados:', error);
      return false;
    }
  }
  
  /**
   * Gera dados de exemplo para o banco de questões
   */
  static getMockQuestions(): Question[] {
    return [
      {
        id: 1,
        content: 'Qual é o tratamento de primeira linha para hipertensão em pacientes com diabetes?',
        explanation: 'O tratamento de primeira linha mais recomendado é um inibidor da enzima conversora de angiotensina (IECA) ou bloqueador do receptor da angiotensina (BRA) devido à proteção renal adicional.',
        discipline_id: 1,
        subject_id: 3,
        difficulty: 'média',
        question_type: 'multiple_choice',
        tags: ['hipertensão', 'diabetes', 'tratamento'],
        created_at: '2025-01-15T10:30:00Z',
        answer_options: [
          { id: 1, question_id: 1, text: 'IECA ou BRA', is_correct: true },
          { id: 2, question_id: 1, text: 'Beta-bloqueadores', is_correct: false },
          { id: 3, question_id: 1, text: 'Bloqueadores de canais de cálcio', is_correct: false },
          { id: 4, question_id: 1, text: 'Diuréticos tiazídicos', is_correct: false }
        ]
      },
      {
        id: 2,
        content: 'Pacientes com fibrilação atrial devem sempre receber anticoagulação.',
        explanation: 'Falso. A decisão sobre anticoagulação em pacientes com fibrilação atrial deve ser baseada na avaliação de risco de AVC (ex.: escore CHA2DS2-VASc) e no risco de sangramento (ex.: escore HAS-BLED).',
        discipline_id: 1,
        subject_id: 4,
        difficulty: 'baixa',
        question_type: 'true_false',
        correct_answer: 'false',
        tags: ['fibrilação atrial', 'anticoagulação', 'cardiologia'],
        created_at: '2025-01-20T14:45:00Z'
      },
      {
        id: 3,
        content: 'Descreva os mecanismos fisiopatológicos da insuficiência cardíaca com fração de ejeção preservada (ICFEp).',
        explanation: 'A ICFEp é caracterizada por disfunção diastólica, rigidez ventricular, fibrose miocárdica, diminuição da complacência ventricular, disfunção microvascular e inflamação. A disfunção diastólica resulta em pressões de enchimento elevadas, causando sintomas de congestão pulmonar e edema.',
        discipline_id: 1,
        subject_id: 5,
        difficulty: 'alta',
        question_type: 'essay',
        tags: ['insuficiência cardíaca', 'fisiopatologia', 'fração de ejeção preservada'],
        created_at: '2025-01-25T09:15:00Z'
      },
      {
        id: 4,
        content: 'Qual dos seguintes não é considerado um sinal clássico de Parkinsonismo?',
        explanation: 'Os sinais clássicos do Parkinsonismo incluem tremor de repouso, rigidez, bradicinesia e instabilidade postural. A coreia (movimentos involuntários, rápidos e irregulares) é característicamente associada à doença de Huntington, não ao Parkinsonismo.',
        discipline_id: 2,
        subject_id: 8,
        difficulty: 'média',
        question_type: 'multiple_choice',
        tags: ['neurologia', 'parkinson', 'diagnóstico'],
        created_at: '2025-02-05T11:20:00Z',
        answer_options: [
          { id: 5, question_id: 4, text: 'Tremor de repouso', is_correct: false },
          { id: 6, question_id: 4, text: 'Rigidez', is_correct: false },
          { id: 7, question_id: 4, text: 'Coreia', is_correct: true },
          { id: 8, question_id: 4, text: 'Bradicinesia', is_correct: false }
        ]
      },
      {
        id: 5,
        content: 'A cetoacidose diabética é uma emergência médica que ocorre predominantemente em pacientes com diabetes tipo 2.',
        explanation: 'Falso. A cetoacidose diabética ocorre predominantemente em pacientes com diabetes tipo 1, embora possa ocorrer em diabetes tipo 2 em situações de estresse extremo (como infecções graves, trauma ou cirurgia).',
        discipline_id: 3,
        subject_id: 12,
        difficulty: 'baixa',
        question_type: 'true_false',
        correct_answer: 'false',
        tags: ['diabetes', 'emergência', 'cetoacidose'],
        created_at: '2025-02-10T16:05:00Z'
      }
    ];
  }
} 