import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { initializeSubscriptionUsage } from '@/utils/subscription-fix';
import { calculateQuestionHash } from '@/utils/question-hash';

export interface AnswerOption {
  id?: number;
  question_id?: number;
  text: string;
  is_correct: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionImage {
  id?: number;
  question_id?: number;
  image_url: string;
  image_name?: string;
  image_size?: number;
  mime_type?: string;
  position?: number;
  description?: string;
  uploaded_by?: string;
  created_at?: string;
  updated_at?: string;
  _tempFile?: File; // Arquivo temporário para questões novas
}

export interface Question {
  id?: number;
  user_id?: string;
  discipline_id?: number;
  subject_id?: number;
  topic_id?: number;
  content: string;
  explanation?: string;
  difficulty?: 'baixa' | 'média' | 'alta';
  question_type?: 'multiple_choice' | 'true_false' | 'essay';
  correct_answer?: string;
  tags?: string[];
  hash?: string; // Campo hash para evitar duplicações
  created_at?: string;
  updated_at?: string;
  answer_options?: AnswerOption[]; // Referência às opções de resposta
  images?: QuestionImage[]; // Referência às imagens da questão
  is_public?: boolean; // Indica se a questão está disponível no Genoma Bank
  creator_name?: string; // Nome do criador (para questões públicas)
  discipline_name?: string; // Nome da disciplina (para questões públicas)
  from_genoma_bank?: boolean; // Indica se a questão foi adicionada do Genoma Bank
}

export class QuestionsBankService {
  /**
   * Incrementa o contador de questões usadas hoje
   */
  static async incrementQuestionsUsedCounter(userId?: string): Promise<void> {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return;
      }
      
      // Se userId não for fornecido, obter o usuário atual
      let userIdToUse = userId;
      if (!userIdToUse) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) {
          console.error('Usuário não autenticado');
          return;
        }
        userIdToUse = userData.user.id;
      }
      
      console.log(`Incrementando contador de questões para usuário ${userIdToUse}`);
      
      // Verificar se já existe um registro para o usuário
      const { data: existingUsage, error: existingError } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', userIdToUse)
        .single();
      
      console.log('Resultado da busca por registro existente:', existingUsage, existingError);
      
      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Erro ao buscar registro existente:', existingError);
        throw existingError;
      }
      
      if (existingUsage) {
        console.log('Registro encontrado, atualizando contadores:', {
          questions_used_today_atual: existingUsage.questions_used_today || 0,
          questions_used_week_atual: existingUsage.questions_used_week || 0
        });
        
        // Atualizar o contador existente
        const { data: updateData, error: updateError } = await supabase
          .from('subscription_usage')
          .update({
            questions_used_today: (existingUsage.questions_used_today || 0) + 1,
            questions_used_week: (existingUsage.questions_used_week || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userIdToUse)
          .select();
        
        console.log('Resultado da atualização:', updateData, updateError);
        
        if (updateError) {
          console.error('Erro ao atualizar contador:', updateError);
          throw updateError;
        }
      } else {
        console.log('Registro não encontrado, criando novo registro');
        
        // Criar um novo registro
        const { data: insertData, error: insertError } = await supabase
          .from('subscription_usage')
          .insert({
            user_id: userIdToUse,
            questions_used_today: 1,
            questions_used_week: 1,
            disciplines_count: 0,
            subjects_per_discipline_count: 0,
            study_sessions_today: 0,
            flashcard_decks_count: 0,
            flashcards_per_deck_count: 0,
            simulados_created_week: 0,
            simulados_questions_count: 0,
            study_groups_created: 0,
            faculty_groups_created: 0,
            last_usage_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
        
        console.log('Resultado da inserção:', insertData, insertError);
        
        if (insertError) {
          console.error('Erro ao inserir novo registro:', insertError);
          throw insertError;
        }
      }
      
      console.log('Contador de questões incrementado com sucesso');
    } catch (error) {
      console.error('Erro ao incrementar contador de questões:', error);
      // Não lançar erro para não interromper o fluxo principal
    }
  }

  /**
   * Busca as questões do usuário
   */
  static async getUserQuestions(
    userId?: string,
    limit?: number,
    offset: number = 0,
    filters?: {
      disciplineId?: number;
      subjectId?: number;
      difficulty?: string;
      questionType?: string;
      searchTerm?: string;
    }
  ): Promise<Question[]> {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return [];
      }
      
      // Se userId não for fornecido, obter o usuário atual
      let userIdToUse = userId;
      if (!userIdToUse) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) {
          console.error('Usuário não autenticado');
          return [];
        }
        userIdToUse = userData.user.id;
      }
      
      // Se há termo de busca, buscar com alternativas para filtrar
      if (filters?.searchTerm) {
        let query = supabase
          .from('questions')
          .select(`
            *,
            answer_options (
              text
            ),
            question_images(*)
          `)
          .eq('user_id', userIdToUse)
          .range(0, 9999) // Buscar todas as questões (até 10000 para evitar problemas de performance)
          .order('created_at', { ascending: false });
        
        // Aplicar filtros básicos
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
        
        const { data: allQuestions, error } = await query;
        
        if (error) {
          throw error;
        }
        
        if (!allQuestions) {
          return [];
        }
        
        // Filtrar por termo de busca considerando conteúdo e alternativas
        const searchTerm = filters.searchTerm.toLowerCase();
        const filteredQuestions = allQuestions.filter(question => {
          // Buscar no conteúdo da questão
          const contentMatch = question.content.toLowerCase().includes(searchTerm);
          
          // Buscar nas tags se existirem
          const tagsMatch = question.tags && question.tags.some(tag => 
            tag.toLowerCase().includes(searchTerm)
          );
          
          // Buscar no conteúdo das alternativas
          const alternativesMatch = question.answer_options && question.answer_options.some(option => 
            option.text.toLowerCase().includes(searchTerm)
          );
          
          return contentMatch || tagsMatch || alternativesMatch;
        });
        
        // Aplicar paginação após filtrar
        const startIndex = offset;
        const endIndex = limit !== undefined ? offset + limit : filteredQuestions.length;
        
        return filteredQuestions
          .slice(startIndex, endIndex)
          .map(question => ({
            ...question,
            answer_options: undefined // Remover alternativas do resultado final
          }));
      }
      
      // Se não há termo de busca, usar consulta simples
      let query = supabase
        .from('questions')
        .select(`
          *,
          question_images(*)
        `)
        .eq('user_id', userIdToUse)
        .order('created_at', { ascending: false });
      
      // Aplicar paginação apenas se limit for especificado
      if (limit !== undefined) {
        query = query.range(offset, offset + limit - 1);
      } else {
        // Se não há limite especificado, buscar todas as questões (até 10000 para evitar problemas de performance)
        query = query.range(0, 9999);
      }
      
      // Aplicar filtros se fornecidos
      if (filters) {
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
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Mapear question_images para images para manter compatibilidade
      const questions = (data || []).map(question => {
        if (question.question_images) {
          question.images = question.question_images;
          delete question.question_images;
        }
        return question;
      });
      
      return questions;
    } catch (error) {
      console.error('Erro ao buscar questões do usuário:', error);
      return [];
    }
  }

  /**
   * Busca uma questão pelo ID
   */
  static async getQuestionById(id: number): Promise<Question | null> {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return null;
      }
      
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          answer_options(*),
          question_images(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        throw error;
      }
      
      // Mapear question_images para images para manter compatibilidade
      if (data && data.question_images) {
        data.images = data.question_images;
        delete data.question_images;
      }
      
      return data;
    } catch (error) {
      console.error(`Erro ao buscar questão com ID ${id}:`, error);
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
   * @param question A questão a ser adicionada
   * @param answerOptions Opções de resposta (para questões de múltipla escolha)
   * @param skipCounter Se true, não incrementa o contador de questões (usado internamente)
   * @param skipLimitCheck Se true, não verifica o limite diário (usado internamente)
   */
  static async addQuestion(
    question: Question, 
    answerOptions?: AnswerOption[], 
    skipCounter: boolean = false,
    skipLimitCheck: boolean = false,
    retryCount: number = 0
  ): Promise<number | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar o limite diário de questões, a menos que seja para pular essa verificação
      if (!skipLimitCheck) {
        const { limit, limitReached } = await this.checkDailyQuestionsLimit(user.user.id);
        if (limitReached && limit !== -1) {
          const limitText = limit === -1 ? 'ilimitadas' : `${limit}`;
          throw new Error(`Você atingiu o limite diário de ${limitText} questões. Faça upgrade para um plano superior para adicionar mais questões.`);
        }
      }
      
      // Calcular o hash da questão para evitar duplicações
      const questionHash = calculateQuestionHash(question, answerOptions);
      
      // Adiciona o user_id e hash à questão
      const newQuestion = {
        ...question,
        user_id: user.user.id,
        hash: questionHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Insere a questão usando ON CONFLICT para evitar duplicações
      const { data, error } = await supabase
        .from('questions')
        .insert([newQuestion])
        .select('id')
        .single();

      if (error) {
        // Se for erro de duplicação (violação de constraint UNIQUE), retornar null silenciosamente
        if (error.code === '23505' && error.message.includes('hash')) {
          console.log('Questão já existe (hash duplicado), pulando inserção');
          return null;
        }
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

      // Se houver imagens, insere na tabela question_images
      if (question.images && question.images.length > 0) {
        const imagesWithQuestionId = question.images.map(image => {
          // Remove o campo id e _tempFile para que o Supabase gere um novo ID
          const { id, _tempFile, ...imageWithoutId } = image;
          
          return {
            ...imageWithoutId,
            question_id: questionId,
            uploaded_by: user.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        // Insere as imagens
        const { error: imagesError } = await supabase
          .from('question_images')
          .insert(imagesWithQuestionId);

        if (imagesError) {
          console.error('Erro ao inserir imagens da questão:', imagesError);
          throw imagesError;
        }
      }
      
      // O contador é incrementado automaticamente pelo trigger SQL
      // Removido incremento manual para evitar duplicação
      
      return questionId;
    } catch (error: any) {
      console.error('Erro ao adicionar questão:', error);
      
      // Se for erro 406 (limite atingido) e ainda não tentamos inicializar, tentar uma vez
      if (error?.message?.includes('406') || 
          error?.message?.includes('limit') || 
          error?.message?.includes('subscription_usage') ||
          error?.code === 'P0001') {
        
        if (retryCount === 0) {
          console.log('Tentando inicializar subscription_usage para resolver erro 406...');
          
          const initResult = await initializeSubscriptionUsage();
          
          if (initResult.success) {
            console.log('Subscription usage inicializado, tentando adicionar questão novamente...');
            // Tentar novamente com retry count = 1 para evitar loop infinito
            return await this.addQuestion(question, answerOptions, skipCounter, skipLimitCheck, 1);
          } else {
            console.error('Falha ao inicializar subscription_usage:', initResult.message);
          }
        }
      }
      
      toast.error('Erro ao adicionar questão: ' + error.message);
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
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return false;
      }

      // Verificar se o usuário atual é o proprietário da questão
      const { data: user } = await supabase.auth.getUser();
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar a questão para verificar o proprietário
      const { data: existingQuestion, error: fetchError } = await supabase
        .from('questions')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Verificar se o usuário atual é o proprietário da questão
      if (!existingQuestion || existingQuestion.user_id !== user.user.id) {
        throw new Error('Você não tem permissão para editar esta questão');
      }

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

      // Atualiza as imagens da questão
      if (question.images !== undefined) {
        // Primeiro, exclui as imagens existentes
        const { error: deleteImagesError } = await supabase
          .from('question_images')
          .delete()
          .eq('question_id', id);

        if (deleteImagesError) {
          console.error('Erro ao excluir imagens existentes:', deleteImagesError);
          throw deleteImagesError;
        }

        // Se houver novas imagens, insere na tabela question_images
        if (question.images && question.images.length > 0) {
          const imagesWithQuestionId = question.images.map(image => {
            // Remove o campo id e _tempFile para que o Supabase gere um novo ID
            const { id: imageId, _tempFile, ...imageWithoutId } = image;
            
            return {
              ...imageWithoutId,
              question_id: id,
              uploaded_by: user.user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          });

          // Insere as novas imagens
          const { error: imagesError } = await supabase
            .from('question_images')
            .insert(imagesWithQuestionId);

          if (imagesError) {
            console.error('Erro ao inserir imagens da questão:', imagesError);
            throw imagesError;
          }
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
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return false;
      }

      // Verificar se o usuário atual é o proprietário da questão
      const { data: user } = await supabase.auth.getUser();
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar a questão para verificar o proprietário
      const { data: existingQuestion, error: fetchError } = await supabase
        .from('questions')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Verificar se o usuário atual é o proprietário da questão
      if (!existingQuestion || existingQuestion.user_id !== user.user.id) {
        throw new Error('Você não tem permissão para excluir esta questão');
      }

      // Primeiro, exclui as opções de resposta associadas
      const { error: optionsError } = await supabase
        .from('answer_options')
        .delete()
        .eq('question_id', id);

      if (optionsError) {
        throw optionsError;
      }

      // Exclui as imagens associadas
      const { error: imagesError } = await supabase
        .from('question_images')
        .delete()
        .eq('question_id', id);

      if (imagesError) {
        console.error('Erro ao excluir imagens da questão:', imagesError);
        throw imagesError;
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
      toast.error('Erro ao excluir questão: ' + (error as any).message);
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

  /**
   * Busca questões públicas disponíveis no Genoma Bank
   */
  static async getPublicQuestions(
    limit: number = 20,
    offset: number = 0,
    filters?: {
      disciplineId?: number;
      subjectId?: number;
      difficulty?: string;
      questionType?: string;
      searchTerm?: string;
      disciplineName?: string; // Filtro para pesquisar por nome de disciplina
    }
  ): Promise<Question[]> {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return [];
      }
      
      // Buscar questões com suas alternativas para permitir busca no conteúdo das alternativas
      let query = supabase
        .from('questions')
        .select(`
          *,
          disciplines:discipline_id (
            name
          ),
          answer_options (
            text
          ),
          question_images(*)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      
      // Aplicar filtros se fornecidos
      if (filters) {
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
        
        // Pesquisa por nome de disciplina
        if (filters.disciplineName) {
          query = query.filter('disciplines.name', 'ilike', `%${filters.disciplineName}%`);
        }
      }
      
      const { data: questions, error } = await query;
      
      if (error) {
        throw error;
      }

      // Se não temos questões, retornar array vazio
      if (!questions || questions.length === 0) {
        return [];
      }
      
      // Filtrar questões por termo de busca considerando conteúdo e alternativas
      let filteredQuestions = questions;
      if (filters?.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        console.log('🔍 Termo de busca:', searchTerm);
        console.log('📊 Total de questões antes do filtro:', questions.length);
        
        filteredQuestions = questions.filter(question => {
          // Buscar no conteúdo da questão
          const contentMatch = question.content.toLowerCase().includes(searchTerm);
          
          // Buscar nas tags se existirem
          const tagsMatch = question.tags && question.tags.some(tag => 
            tag.toLowerCase().includes(searchTerm)
          );
          
          // Buscar no conteúdo das alternativas
          const alternativesMatch = question.answer_options && question.answer_options.some(option => 
            option.text.toLowerCase().includes(searchTerm)
          );
          
          // Log para depuração
          if (contentMatch || tagsMatch || alternativesMatch) {
            console.log('✅ Questão encontrada:', {
              id: question.id,
              content: question.content.substring(0, 50) + '...',
              contentMatch,
              tagsMatch,
              alternativesMatch,
              alternativas: question.answer_options?.map(opt => opt.text.substring(0, 30) + '...') || []
            });
          }
          
          return contentMatch || tagsMatch || alternativesMatch;
        });
        
        console.log('📊 Total de questões após filtro:', filteredQuestions.length);
      }

      // Aplicar paginação após a filtragem
      const paginatedQuestions = filteredQuestions.slice(offset, offset + limit);
      console.log('📄 Questões paginadas:', paginatedQuestions.length, 'de', filteredQuestions.length);

      // Buscar informações dos usuários da tabela profiles
      const userIds = [...new Set(paginatedQuestions.map(q => q.user_id).filter(Boolean))];
      let profiles = null;
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);
        
        profiles = profilesData;
        
        if (profilesError) {
          console.error('Erro ao buscar informações dos perfis:', profilesError);
        }
      }
      
      // Criar um mapa de ID do usuário para nome
      const userMap = profiles ? 
        profiles.reduce((map, profile) => {
          map[profile.id] = {
            full_name: profile.full_name,
            username: profile.username
          };
          return map;
        }, {}) : {};
      
      // Adicionar informações do criador a cada questão
      return paginatedQuestions.map(question => {
        const userProfile = userMap[question.user_id];
        const discipline = question.disciplines;
        
        // Mapear question_images para images para manter compatibilidade
        if (question.question_images) {
          question.images = question.question_images;
        }
        
        return {
          ...question,
          disciplines: undefined, // Remover o objeto aninhado
          answer_options: undefined, // Remover as alternativas do resultado final para manter compatibilidade
          question_images: undefined, // Remover question_images após mapeamento
          creator_name: userProfile ? (userProfile.full_name || userProfile.username || 'Usuário anônimo') : 'Usuário anônimo',
          discipline_name: discipline ? discipline.name : undefined
        };
      });
    } catch (error) {
      console.error('Erro ao buscar questões públicas:', error);
      return [];
    }
  }

  /**
   * Atualiza o status público de uma questão
   */
  static async updateQuestionPublicStatus(id: number, isPublic: boolean): Promise<boolean> {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return false;
      }
      
      // Verificar se o usuário atual é o proprietário da questão
      const { data: user } = await supabase.auth.getUser();
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar a questão para verificar o proprietário
      const { data: existingQuestion, error: fetchError } = await supabase
        .from('questions')
        .select('user_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Verificar se o usuário atual é o proprietário da questão
      if (!existingQuestion || existingQuestion.user_id !== user.user.id) {
        throw new Error('Você não tem permissão para alterar o status desta questão');
      }
      
      const { error } = await supabase
        .from('questions')
        .update({ is_public: isPublic })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar status público da questão ${id}:`, error);
      toast.error('Erro ao atualizar status da questão: ' + (error as any).message);
      return false;
    }
  }

  /**
   * Conta o total de questões do usuário
   */
  static async countUserQuestions(
    userId?: string,
    filters?: {
      disciplineId?: number;
      subjectId?: number;
      difficulty?: string;
      questionType?: string;
      searchTerm?: string;
    }
  ): Promise<number> {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return 0;
      }
      
      // Se userId não for fornecido, obter o usuário atual
      let userIdToUse = userId;
      if (!userIdToUse) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) {
          console.error('Usuário não autenticado');
          return 0;
        }
        userIdToUse = userData.user.id;
      }
      
      // Se há termo de busca, precisamos buscar as questões com alternativas para filtrar
      if (filters?.searchTerm) {
        const { data: questions, error } = await supabase
          .from('questions')
          .select(`
            id,
            content,
            tags,
            discipline_id,
            subject_id,
            difficulty,
            question_type,
            answer_options (
              text
            )
          `)
          .eq('user_id', userIdToUse);
          
        if (error) {
          console.error('Erro ao buscar questões para contagem:', error);
          return 0;
        }
        
        if (!questions) {
          return 0;
        }
        
        // Aplicar filtros básicos
        let filteredQuestions = questions;
        
        if (filters.disciplineId) {
          filteredQuestions = filteredQuestions.filter(q => q.discipline_id === filters.disciplineId);
        }
        
        if (filters.subjectId) {
          filteredQuestions = filteredQuestions.filter(q => q.subject_id === filters.subjectId);
        }
        
        if (filters.difficulty) {
          filteredQuestions = filteredQuestions.filter(q => q.difficulty === filters.difficulty);
        }
        
        if (filters.questionType) {
          filteredQuestions = filteredQuestions.filter(q => q.question_type === filters.questionType);
        }
        
        // Filtrar por termo de busca considerando conteúdo e alternativas
        const searchTerm = filters.searchTerm.toLowerCase();
        filteredQuestions = filteredQuestions.filter(question => {
          // Buscar no conteúdo da questão
          const contentMatch = question.content.toLowerCase().includes(searchTerm);
          
          // Buscar nas tags se existirem
          const tagsMatch = question.tags && question.tags.some(tag => 
            tag.toLowerCase().includes(searchTerm)
          );
          
          // Buscar no conteúdo das alternativas
          const alternativesMatch = question.answer_options && question.answer_options.some(option => 
            option.text.toLowerCase().includes(searchTerm)
          );
          
          return contentMatch || tagsMatch || alternativesMatch;
        });
        
        return filteredQuestions.length;
      }
      
      // Se não há termo de busca, usar contagem simples
      let query = supabase
        .from('questions')
        .select('id', { count: 'exact' })
        .eq('user_id', userIdToUse);
      
      // Aplicar filtros se fornecidos
      if (filters) {
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
      }
      
      const { count, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Erro ao contar questões do usuário:', error);
      return 0;
    }
  }

  /**
   * Conta o total de questões públicas disponíveis
   */
  static async countPublicQuestions(filters?: {
    disciplineId?: number;
    subjectId?: number;
    difficulty?: string;
    questionType?: string;
    searchTerm?: string;
    disciplineName?: string; // Filtro para pesquisar por nome de disciplina
  }): Promise<number> {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return 0;
      }
      
      // Se há termo de busca, precisamos buscar as questões com alternativas para filtrar
      if (filters?.searchTerm) {
        const { data: questions, error } = await supabase
          .from('questions')
          .select(`
            id,
            content,
            tags,
            discipline_id,
            subject_id,
            difficulty,
            question_type,
            answer_options (
              text
            ),
            disciplines:discipline_id (
              name
            )
          `)
          .eq('is_public', true);
          
        if (error) {
          console.error('Erro ao buscar questões para contagem:', error);
          return 0;
        }
        
        if (!questions) {
          return 0;
        }
        
        // Aplicar filtros básicos
        let filteredQuestions = questions;
        
        if (filters.disciplineId) {
          filteredQuestions = filteredQuestions.filter(q => q.discipline_id === filters.disciplineId);
        }
        
        if (filters.subjectId) {
          filteredQuestions = filteredQuestions.filter(q => q.subject_id === filters.subjectId);
        }
        
        if (filters.difficulty) {
          filteredQuestions = filteredQuestions.filter(q => q.difficulty === filters.difficulty);
        }
        
        if (filters.questionType) {
          filteredQuestions = filteredQuestions.filter(q => q.question_type === filters.questionType);
        }
        
        if (filters.disciplineName) {
          filteredQuestions = filteredQuestions.filter(q => 
            q.disciplines?.name?.toLowerCase().includes(filters.disciplineName!.toLowerCase())
          );
        }
        
        // Filtrar por termo de busca considerando conteúdo e alternativas
        const searchTerm = filters.searchTerm.toLowerCase();
        filteredQuestions = filteredQuestions.filter(question => {
          // Buscar no conteúdo da questão
          const contentMatch = question.content.toLowerCase().includes(searchTerm);
          
          // Buscar nas tags se existirem
          const tagsMatch = question.tags && question.tags.some(tag => 
            tag.toLowerCase().includes(searchTerm)
          );
          
          // Buscar no conteúdo das alternativas
          const alternativesMatch = question.answer_options && question.answer_options.some(option => 
            option.text.toLowerCase().includes(searchTerm)
          );
          
          return contentMatch || tagsMatch || alternativesMatch;
        });
        
        return filteredQuestions.length;
      }
      
      // Se não há termo de busca, usar contagem simples
      let query = supabase
        .from('questions')
        .select('id', { count: 'exact' })
        .eq('is_public', true);
      
      // Aplicar filtros se fornecidos
      if (filters) {
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
        
        // Pesquisa por nome de disciplina
        if (filters.disciplineName) {
          // Para pesquisar por nome de disciplina, precisamos usar uma abordagem diferente
          if (!supabase) {
            console.error('Supabase client is not initialized');
            return 0;
          }
          
          // Buscar IDs de questões que correspondem ao nome da disciplina
          const { data: questionsWithDisciplines } = await supabase
            .from('questions')
            .select(`
              id,
              disciplines:discipline_id (
                name
              )
            `)
            .eq('is_public', true);
          
          if (!questionsWithDisciplines || questionsWithDisciplines.length === 0) {
            return 0;
          }
          
          // Filtrar manualmente as questões que correspondem ao nome da disciplina
          const matchingQuestionIds = questionsWithDisciplines
            .filter(q => 
              q.disciplines && 
              q.disciplines.name && 
              q.disciplines.name.toLowerCase().includes(filters.disciplineName!.toLowerCase())
            )
            .map(q => q.id);
          
          if (matchingQuestionIds.length === 0) {
            return 0;
          }
          
          // Usar os IDs filtrados na consulta principal
          query = query.in('id', matchingQuestionIds);
        }
      }
      
      const { count, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Erro ao contar questões públicas:', error);
      return 0;
    }
  }

  /**
   * Clona uma questão pública para o banco pessoal do usuário
   */
  static async clonePublicQuestion(questionId: number, retryCount: number = 0): Promise<number | null> {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return null;
      }

      // Obter detalhes da questão original
      const question = await this.getQuestionById(questionId);
      if (!question) {
        throw new Error('Questão não encontrada');
      }

      // Verificar se a questão é pública
      if (!question.is_public) {
        throw new Error('Esta questão não é pública e não pode ser clonada');
      }

      // Verificar se o usuário atingiu o limite diário de questões
      const { data: user } = await supabase.auth.getUser();
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar o limite diário de questões (apenas para usuários com limite definido)
      const { limit, used, limitReached } = await this.checkDailyQuestionsLimit(user.user.id);
      if (limitReached && limit !== -1) {
        const limitText = limit === -1 ? 'ilimitadas' : limit.toString();
        throw new Error(`Você atingiu o limite diário de ${limitText} questões. Faça upgrade para um plano superior para adicionar mais questões.`);
      }

      // Obter opções de resposta se for questão de múltipla escolha
      let answerOptions: AnswerOption[] = [];
      if (question.question_type === 'multiple_choice') {
        answerOptions = await this.getAnswerOptions(questionId);
      }

      // Criar uma nova questão baseada na original (sem o ID e removendo flags de questão pública)
      const {
        id, 
        user_id, 
        is_public, 
        created_at, 
        updated_at, 
        answer_options, 
        creator_name, 
        discipline_name, 
        from_genoma_bank, 
        ...questionData
      } = question;

      // Adicionar a nova questão ao banco do usuário usando o método addQuestion
      const newQuestionData = {
        ...questionData,
        is_public: false, // A nova questão não será pública por padrão
        from_genoma_bank: true, // Indica que a questão foi clonada do Genoma Bank
        // Removido is_cloned: true para que questões do genoma bank sejam contadas no limite
      };
      
      // Usar o método addQuestion com skipLimitCheck=true porque já verificamos o limite anteriormente
      // O contador será incrementado automaticamente pelo trigger SQL
      const newQuestionId = await this.addQuestion(newQuestionData, answerOptions, false, true);
      
      return newQuestionId;
    } catch (error: any) {
      console.error('Erro ao clonar questão:', error);
      
      // Se for erro 406 (limite atingido) e ainda não tentamos inicializar, tentar uma vez
      if ((error?.message?.includes('406') || 
           error?.message?.includes('limit') || 
           error?.message?.includes('subscription_usage') ||
           error?.code === 'P0001') && retryCount === 0) {
        
        console.log('Tentando inicializar subscription_usage para resolver erro 406 na clonagem...');
        
        const initResult = await initializeSubscriptionUsage();
        
        if (initResult.success) {
          console.log('Subscription usage inicializado, tentando clonar questão novamente...');
          // Tentar novamente com retry count = 1 para evitar loop infinito
          return await this.clonePublicQuestion(questionId, 1);
        } else {
          console.error('Falha ao inicializar subscription_usage:', initResult.message);
        }
      }
      
      toast.error('Erro ao adicionar questão ao seu banco: ' + error.message);
      return null;
    }
  }

  /**
   * Verifica se o usuário atingiu o limite diário de questões
   * @returns Um objeto com o limite, uso atual e se o limite foi atingido
   */
  static async checkDailyQuestionsLimit(userId?: string): Promise<{
    limit: number;
    used: number;
    limitReached: boolean;
  }> {
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return { limit: 10, used: 0, limitReached: false };
      }

      // Se userId não for fornecido, obter o usuário atual
      let userIdToUse = userId;
      if (!userIdToUse) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) {
          console.error('Usuário não autenticado');
          return { limit: 10, used: 0, limitReached: false };
        }
        userIdToUse = userData.user.id;
      }

      // Verificar o uso atual
      const { data: usageData } = await supabase
        .from('subscription_usage')
        .select('questions_used_today')
        .eq('user_id', userIdToUse)
        .single();

      // Buscar o limite do plano
      const { data: subscriptionData } = await supabase
        .from('user_subscriptions')
        .select(`
          tier,
          subscription_plans:plan_id(features)
        `)
        .eq('user_id', userIdToUse)
        .single();

      // Obter o limite diário de questões
      let questionsLimit = 10; // Valor padrão para plano Free
      if (subscriptionData?.subscription_plans?.features?.maxQuestionsPerDay) {
        questionsLimit = parseInt(subscriptionData.subscription_plans.features.maxQuestionsPerDay);
      }

      // Verificar se o usuário atingiu o limite
      const questionsUsed = usageData?.questions_used_today || 0;
      // Se o limite for -1, significa ilimitado
      const limitReached = questionsLimit !== -1 && questionsUsed >= questionsLimit;

      return {
        limit: questionsLimit,
        used: questionsUsed,
        limitReached: limitReached
      };
    } catch (error) {
      console.error('Erro ao verificar limite diário de questões:', error);
      return { limit: 10, used: 0, limitReached: false };
    }
  }
}