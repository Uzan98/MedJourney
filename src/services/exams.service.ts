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
  exam_type_id?: number; // Referência ao tipo de exame
  created_at?: string;
  updated_at?: string;
  creator_name?: string; // Nome do criador do simulado (para exibição)
  category?: string; // Categoria do simulado (opcional)
  isOwn?: boolean; // Indica se o simulado pertence ao usuário atual
  exam_type?: { id: number; name: string; description: string }; // Dados do tipo de exame
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
  static async getUserExams(examTypeId?: number): Promise<Exam[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error('Usuário não autenticado');
      }

      let query = supabase
        .from('exams')
        .select(`
          *,
          exam_types(id, name, description)
        `)
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });
      
      if (examTypeId) {
        query = query.eq('exam_type_id', examTypeId);
      }
      
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map(exam => ({
        ...exam,
        isOwn: true,
        exam_type: exam.exam_types
      }));
    } catch (error) {
      console.error('Erro ao buscar simulados:', error);
      return [];
    }
  }

  /**
   * Obter simulados públicos disponíveis para fazer
   * Filtra apenas as categorias: residência, enem, concursos, vestibulares
   */
  static async getPublicExams(examTypeId?: number): Promise<Exam[]> {
    try {
      console.log('Buscando simulados públicos...');
      
      // Categorias permitidas
      const allowedCategories = ['residencia', 'enem', 'concursos', 'vestibulares'];
      
      // Buscar simulados públicos apenas das categorias específicas
      let query = supabase
        .from('exams')
        .select(`
          *,
          exam_types!inner(id, name, description)
        `)
        .eq('is_public', true)
        .in('exam_types.name', allowedCategories)
        .order('created_at', { ascending: false });
      
      if (examTypeId) {
        query = query.eq('exam_type_id', examTypeId);
      }
      
      const { data: exams, error: examsError } = await query;

      if (examsError) {
        console.error('Erro ao buscar simulados públicos:', examsError);
        throw examsError;
      }

      // Se tiver simulados, buscar informações dos criadores
      if (exams && exams.length > 0) {
        // Obter IDs únicos dos usuários
        const userIds = [...new Set(exams.map(exam => exam.user_id))];
        
        // Buscar perfis dos usuários
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('Erro ao buscar perfis dos criadores:', profilesError);
        }
        
        // Mapear os perfis por ID para fácil acesso
        const profilesMap = new Map();
        if (profiles) {
          profiles.forEach(profile => {
            profilesMap.set(profile.id, profile);
          });
        }
        
        // Adicionar nome do criador a cada simulado
        const examsWithCreators = exams.map(exam => {
          const profile = profilesMap.get(exam.user_id);
          return {
            ...exam,
            creator_name: profile ? (profile.full_name || profile.username || 'Usuário anônimo') : 'Usuário anônimo'
          };
        });
        
        console.log('Simulados públicos encontrados:', examsWithCreators.length);
        return examsWithCreators;
      }
      
      console.log('Nenhum simulado público encontrado');
      return exams || [];
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
      // Validar ID
      if (!id || typeof id !== 'number' || isNaN(id)) {
        console.error('ID do simulado inválido:', id);
        return null;
      }

      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // Usar maybeSingle em vez de single para evitar erro quando não há resultados
      
      if (error) {
        throw error;
      }
      
      // Se não encontrou o simulado, retornar null
      if (!data) {
        console.log(`Simulado com ID ${id} não encontrado`);
        return null;
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
      // Validar examId
      if (!examId || typeof examId !== 'number' || isNaN(examId)) {
        console.error('ID do simulado inválido:', examId);
        return [];
      }

      let query = supabase
        .from('exam_questions')
        .select(includeQuestionDetails ? 'id, exam_id, question_id, position, weight, question:questions(*, question_images(*), exam_institutions!inner(name, acronym))' : '*')
        .eq('exam_id', examId)
        .order('position', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Se incluir detalhes da questão, mapear question_images para images e dados da instituição
      if (includeQuestionDetails && data) {
        data.forEach((examQuestion: any) => {
          if (examQuestion.question) {
            // Mapear imagens
            if (examQuestion.question.question_images) {
              examQuestion.question.images = examQuestion.question.question_images;
              delete examQuestion.question.question_images;
            }
            
            // Mapear dados da instituição
            if (examQuestion.question.exam_institutions) {
              const institutions = examQuestion.question.exam_institutions;
              const firstInstitution = Array.isArray(institutions) ? institutions[0] : institutions;
              examQuestion.question.institution_name = firstInstitution?.name;
              examQuestion.question.institution_acronym = firstInstitution?.acronym;
              delete examQuestion.question.exam_institutions;
            }
          }
        });
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
        exam_type_id: exam.exam_type_id,
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
          title: exam.title,
          description: exam.description,
          time_limit: exam.time_limit,
          is_public: exam.is_public,
          shuffle_questions: exam.shuffle_questions,
          show_answers: exam.show_answers,
          exam_type_id: exam.exam_type_id,
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
   * Adicionar múltiplas questões a um simulado
   */
  static async addQuestionsToExam(examId: number, questionIds: number[]): Promise<boolean> {
    try {
      // Validar examId
      if (!examId || typeof examId !== 'number' || isNaN(examId)) {
        console.error('ID do simulado inválido:', examId);
        return false;
      }

      // Filtrar valores null, undefined ou inválidos
      const validQuestionIds = questionIds.filter(id => 
        id !== null && id !== undefined && typeof id === 'number' && !isNaN(id)
      );
      
      if (!validQuestionIds.length) {
        console.warn('Nenhum ID de questão válido fornecido para addQuestionsToExam');
        return true; // Nada para adicionar
      }

      // Buscar a última posição no simulado
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
      
      let nextPosition = lastPosition ? (lastPosition.position || 0) + 1 : 1;
      
      // Verificar quais questões já existem no simulado
      const { data: existing, error: checkError } = await supabase
        .from('exam_questions')
        .select('question_id')
        .eq('exam_id', examId)
        .in('question_id', validQuestionIds);
      
      if (checkError) {
        throw checkError;
      }
      
      // Filtrar apenas as questões que ainda não existem no simulado
      const existingIds = existing ? existing.map(q => q.question_id) : [];
      const newQuestionIds = validQuestionIds.filter(id => !existingIds.includes(id));
      
      if (!newQuestionIds.length) {
        return true; // Todas as questões já existem no simulado
      }
      
      // Preparar os dados para inserção em massa
      const questionsToInsert = newQuestionIds.map((questionId, index) => ({
        exam_id: examId,
        question_id: questionId,
        position: nextPosition + index,
        weight: 1.0,
        created_at: new Date().toISOString()
      }));
      
      // Inserir todas as questões de uma vez
      const { error } = await supabase
        .from('exam_questions')
        .insert(questionsToInsert);

      if (error) {
        throw error;
      }
      
      toast.success(`${newQuestionIds.length} questões adicionadas ao simulado`);
      return true;
    } catch (error) {
      console.error(`Erro ao adicionar questões ao simulado ${examId}:`, error);
      toast.error('Erro ao adicionar questões ao simulado');
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

      // Incrementar contadores de tentativas de simulados
      try {
        await supabase.rpc('increment_exam_attempts', {
          user_id_param: user.user.id
        });
      } catch (incrementError) {
        console.error('Erro ao incrementar contadores de tentativas:', incrementError);
        // Não falha a operação se não conseguir incrementar
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
      
      // O trigger process_exam_completion será executado automaticamente no banco de dados
      // para atualizar os desafios de respostas corretas
      
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
      const { data: questionsWithDisciplines, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          discipline_id,
          disciplines (
            id,
            name
          )
        `)
        .in('id', questionIds);
      
      if (questionsError) throw questionsError;
      if (!questionsWithDisciplines || questionsWithDisciplines.length === 0) return [];
      
      // Agrupar por disciplina
      const disciplineMap: Record<number, {
        id: number,
        name: string,
        total: number,
        correct: number
      }> = {};
      
      // Inicializar o mapa de disciplinas
      questionsWithDisciplines.forEach(question => {
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
        const question = questionsWithDisciplines.find(q => q.id === answer.question_id);
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
      const { data: questionsWithDisciplines, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          discipline_id,
          disciplines (
            id,
            name
          )
        `)
        .in('id', questionIds);
      
      if (questionsError) throw questionsError;
      if (!questionsWithDisciplines || questionsWithDisciplines.length === 0) return [];
      
      // Agrupar por disciplina
      const disciplineMap: Record<number, {
        id: number,
        name: string,
        total: number,
        correct: number
      }> = {};
      
      // Inicializar o mapa de disciplinas
      questionsWithDisciplines.forEach(question => {
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
        const question = questionsWithDisciplines.find(q => q.id === answer.question_id);
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

  /**
   * Calcula o desempenho por assunto em uma tentativa de simulado
   */
  static async getAttemptPerformanceBySubject(attemptId: number): Promise<any[]> {
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
      
      // Buscar informações das questões (incluindo assunto)
      const { data: questionsWithSubjects, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          subject_id,
          subjects (
            id,
            name,
            title
          )
        `)
        .in('id', questionIds);
      
      if (questionsError) throw questionsError;
      if (!questionsWithSubjects || questionsWithSubjects.length === 0) return [];
      
      // Agrupar por assunto
      const subjectMap: Record<number, {
        id: number,
        name: string,
        total: number,
        correct: number
      }> = {};
      
      // Inicializar o mapa de assuntos
      questionsWithSubjects.forEach(question => {
        if (question.subject_id && question.subjects) {
          const subjectId = question.subject_id;
          if (!subjectMap[subjectId]) {
            // Usar o nome se estiver disponível, senão o título
            const subjectName = question.subjects.name || question.subjects.title;
            subjectMap[subjectId] = {
              id: subjectId,
              name: subjectName,
              total: 0,
              correct: 0
            };
          }
        }
      });
      
      // Contar respostas corretas por assunto
      answers.forEach(answer => {
        const question = questionsWithSubjects.find(q => q.id === answer.question_id);
        if (question && question.subject_id) {
          const subjectId = question.subject_id;
          if (subjectMap[subjectId]) {
            subjectMap[subjectId].total += 1;
            if (answer.is_correct) {
              subjectMap[subjectId].correct += 1;
            }
          }
        }
      });
      
      // Converter para array e calcular porcentagem
      return Object.values(subjectMap)
        .filter(s => s.total > 0) // Filtrar apenas assuntos com questões
        .map(subject => ({
          name: subject.name,
          questions: subject.total,
          correct: subject.correct,
          score: Math.round((subject.correct / subject.total) * 100)
        }))
        .sort((a, b) => b.score - a.score); // Ordenar por desempenho (decrescente)
      
    } catch (error) {
      console.error(`Erro ao calcular desempenho por assunto:`, error);
      return [];
    }
  }

  /**
   * Calcula o desempenho geral por assunto em todos os simulados do usuário
   */
  static async getUserPerformanceBySubject(): Promise<any[]> {
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
      
      // Buscar informações das questões (incluindo assunto)
      const { data: questionsWithSubjects, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          subject_id,
          subjects (
            id,
            name,
            title
          )
        `)
        .in('id', questionIds);
      
      if (questionsError) throw questionsError;
      if (!questionsWithSubjects || questionsWithSubjects.length === 0) return [];
      
      // Agrupar por assunto
      const subjectMap: Record<number, {
        id: number,
        name: string,
        total: number,
        correct: number
      }> = {};
      
      // Inicializar o mapa de assuntos
      questionsWithSubjects.forEach(question => {
        if (question.subject_id && question.subjects) {
          const subjectId = question.subject_id;
          if (!subjectMap[subjectId]) {
            // Usar o nome se estiver disponível, senão o título
            const subjectName = question.subjects.name || question.subjects.title;
            subjectMap[subjectId] = {
              id: subjectId,
              name: subjectName,
              total: 0,
              correct: 0
            };
          }
        }
      });
      
      // Contar respostas corretas por assunto
      answers.forEach(answer => {
        const question = questionsWithSubjects.find(q => q.id === answer.question_id);
        if (question && question.subject_id) {
          const subjectId = question.subject_id;
          if (subjectMap[subjectId]) {
            subjectMap[subjectId].total += 1;
            if (answer.is_correct) {
              subjectMap[subjectId].correct += 1;
            }
          }
        }
      });
      
      // Converter para array e calcular porcentagem
      return Object.values(subjectMap)
        .filter(s => s.total > 0) // Filtrar apenas assuntos com questões
        .map(subject => ({
          name: subject.name,
          questions: subject.total,
          correct: subject.correct,
          score: Math.round((subject.correct / subject.total) * 100)
        }))
        .sort((a, b) => b.score - a.score); // Ordenar por desempenho (decrescente)
        
    } catch (error) {
      console.error(`Erro ao calcular desempenho por assunto:`, error);
      return [];
    }
  }

  /**
   * Obter dados de desempenho em simulados por disciplina para o gráfico
   */
  static async getPerformanceByDisciplineForChart(): Promise<any[]> {
    try {
      console.log('Obtendo dados de desempenho por disciplina para o gráfico...');
      
      // Obter desempenho por disciplina
      const performanceData = await this.getUserPerformanceByDiscipline();
      
      if (!performanceData || performanceData.length === 0) {
        console.log('Nenhum dado de desempenho por disciplina encontrado');
        return [];
      }
      
      // Obter dados históricos (tentativas ao longo do tempo)
      const attempts = await this.getUserAttempts();
      
      if (!attempts || attempts.length === 0) {
        console.log('Nenhuma tentativa de simulado encontrada');
        return [];
      }
      
      // Filtrar apenas tentativas completas e ordenar por data
      const completedAttempts = attempts
        .filter(attempt => attempt.completed_at)
        .sort((a, b) => {
          const dateA = new Date(a.completed_at || a.created_at || '');
          const dateB = new Date(b.completed_at || b.created_at || '');
          return dateA.getTime() - dateB.getTime();
        });
      
      // Agrupar tentativas por data
      const attemptsByDate = new Map<string, any[]>();
      
      completedAttempts.forEach(attempt => {
        const date = new Date(attempt.completed_at || attempt.created_at || '');
        const dateStr = date.toLocaleDateString('pt-BR');
        
        if (!attemptsByDate.has(dateStr)) {
          attemptsByDate.set(dateStr, []);
        }
        
        attemptsByDate.get(dateStr)?.push(attempt);
      });
      
      // Calcular desempenho por disciplina para cada data
      const dates = Array.from(attemptsByDate.keys());
      const disciplineData: Record<string, { name: string, data: number[], dates: string[] }> = {};
      
      for (const discipline of performanceData) {
        disciplineData[discipline.name] = {
          name: discipline.name,
          data: [],
          dates: []
        };
      }
      
      // Para cada data, calcular o desempenho por disciplina
      for (const date of dates) {
        const attemptsForDate = attemptsByDate.get(date) || [];
        
        // Para cada tentativa nesta data, obter desempenho por disciplina
        for (const attempt of attemptsForDate) {
          if (!attempt.id) continue;
          
          const attemptPerformance = await this.getAttemptPerformanceByDiscipline(attempt.id);
          
          // Atualizar dados de desempenho para cada disciplina
          for (const discipline of attemptPerformance) {
            if (!disciplineData[discipline.name]) {
              disciplineData[discipline.name] = {
                name: discipline.name,
                data: [],
                dates: []
              };
            }
            
            disciplineData[discipline.name].data.push(discipline.score);
            disciplineData[discipline.name].dates.push(date);
          }
        }
      }
      
      // Converter para array
      return Object.values(disciplineData)
        .filter(d => d.data.length > 0) // Filtrar apenas disciplinas com dados
        .sort((a, b) => {
          // Calcular média de desempenho
          const avgA = a.data.reduce((sum, val) => sum + val, 0) / a.data.length;
          const avgB = b.data.reduce((sum, val) => sum + val, 0) / b.data.length;
          return avgB - avgA; // Ordenar por média (decrescente)
        });
      
    } catch (error) {
      console.error('Erro ao obter dados de desempenho por disciplina para o gráfico:', error);
      return [];
    }
  }
  
  /**
   * Obter dados de desempenho em simulados por assunto para o gráfico
   */
  static async getPerformanceBySubjectForChart(): Promise<any[]> {
    try {
      console.log('Obtendo dados de desempenho por assunto para o gráfico...');
      
      // Obter desempenho por assunto
      const performanceData = await this.getUserPerformanceBySubject();
      
      if (!performanceData || performanceData.length === 0) {
        console.log('Nenhum dado de desempenho por assunto encontrado');
        return [];
      }
      
      // Obter dados históricos (tentativas ao longo do tempo)
      const attempts = await this.getUserAttempts();
      
      if (!attempts || attempts.length === 0) {
        console.log('Nenhuma tentativa de simulado encontrada');
        return [];
      }
      
      // Filtrar apenas tentativas completas e ordenar por data
      const completedAttempts = attempts
        .filter(attempt => attempt.completed_at)
        .sort((a, b) => {
          const dateA = new Date(a.completed_at || a.created_at || '');
          const dateB = new Date(b.completed_at || b.created_at || '');
          return dateA.getTime() - dateB.getTime();
        });
      
      // Agrupar tentativas por data
      const attemptsByDate = new Map<string, any[]>();
      
      completedAttempts.forEach(attempt => {
        const date = new Date(attempt.completed_at || attempt.created_at || '');
        const dateStr = date.toLocaleDateString('pt-BR');
        
        if (!attemptsByDate.has(dateStr)) {
          attemptsByDate.set(dateStr, []);
        }
        
        attemptsByDate.get(dateStr)?.push(attempt);
      });
      
      // Calcular desempenho por assunto para cada data
      const dates = Array.from(attemptsByDate.keys());
      const subjectData: Record<string, { name: string, data: number[], dates: string[] }> = {};
      
      for (const subject of performanceData) {
        subjectData[subject.name] = {
          name: subject.name,
          data: [],
          dates: []
        };
      }
      
      // Para cada data, calcular o desempenho por assunto
      for (const date of dates) {
        const attemptsForDate = attemptsByDate.get(date) || [];
        
        // Para cada tentativa nesta data, obter desempenho por assunto
        for (const attempt of attemptsForDate) {
          if (!attempt.id) continue;
          
          const attemptPerformance = await this.getAttemptPerformanceBySubject(attempt.id);
          
          // Atualizar dados de desempenho para cada assunto
          for (const subject of attemptPerformance) {
            if (!subjectData[subject.name]) {
              subjectData[subject.name] = {
                name: subject.name,
                data: [],
                dates: []
              };
            }
            
            subjectData[subject.name].data.push(subject.score);
            subjectData[subject.name].dates.push(date);
          }
        }
      }
      
      // Converter para array
      return Object.values(subjectData)
        .filter(s => s.data.length > 0) // Filtrar apenas assuntos com dados
        .sort((a, b) => {
          // Calcular média de desempenho
          const avgA = a.data.reduce((sum, val) => sum + val, 0) / a.data.length;
          const avgB = b.data.reduce((sum, val) => sum + val, 0) / b.data.length;
          return avgB - avgA; // Ordenar por média (decrescente)
        });
      
    } catch (error) {
      console.error('Erro ao obter dados de desempenho por assunto para o gráfico:', error);
      return [];
    }
  }

  /**
   * Buscar todos os tipos de exames disponíveis
   * Filtra apenas as categorias: residência, enem, concursos, vestibulares
   */
  static async getExamTypes(): Promise<{ id: number; name: string; description: string }[]> {
    try {
      // Categorias permitidas
      const allowedCategories = ['residencia', 'enem', 'concursos', 'vestibulares'];
      
      const { data, error } = await supabase
        .from('exam_types')
        .select('*')
        .in('name', allowedCategories)
        .order('name');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar tipos de exames:', error);
      return [];
    }
  }

  /**
   * Buscar provas por categoria específica
   */
  static async getExamsByCategory(categoryName: string): Promise<Exam[]> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          exam_types!inner(id, name, description)
        `)
        .eq('exam_types.name', categoryName)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(exam => ({
        ...exam,
        exam_type: exam.exam_types,
        isOwn: false
      }));
    } catch (error) {
      console.error(`Erro ao buscar provas da categoria ${categoryName}:`, error);
      return [];
    }
  }

  /**
   * Buscar estatísticas de provas por categoria
   * Filtra apenas as categorias: residência, enem, concursos, vestibulares
   */
  static async getExamStatsByCategory(): Promise<{ category: string; count: number; description: string }[]> {
    try {
      // Categorias permitidas
      const allowedCategories = ['residencia', 'enem', 'concursos', 'vestibulares'];
      
      const { data, error } = await supabase
        .from('exam_types')
        .select(`
          name,
          description,
          exams(count)
        `)
        .in('name', allowedCategories);

      if (error) {
        throw error;
      }

      return (data || []).map(item => ({
        category: item.name,
        description: item.description,
        count: item.exams?.[0]?.count || 0
      }));
    } catch (error) {
      console.error('Erro ao buscar estatísticas por categoria:', error);
      return [];
    }
  }
}