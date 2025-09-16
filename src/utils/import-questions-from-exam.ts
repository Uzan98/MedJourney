import { supabase } from '@/lib/supabase';
import { QuestionsBankService, Question, AnswerOption } from '@/services/questions-bank.service';
import { calculateQuestionHash } from '@/utils/question-hash';

export interface ImportQuestionFromExamOptions {
  examId: number;
  questionIds?: number[]; // Se não especificado, importa todas as questões
  skipLimitCheck?: boolean; // Pular verificação de limite diário
  userId?: string; // ID do usuário (se não especificado, usa o usuário autenticado)
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number; // Questões que já existiam (duplicadas)
  errors: number;
  errorMessages: string[];
}

/**
 * Converte uma questão de prova completa para o formato do banco de questões avulsas
 */
function convertCompleteExamQuestionToQuestion(
  examQuestion: any,
  options: any[],
  userId: string
): { question: Question; answerOptions: AnswerOption[] } {
  // Mapear dificuldade da tabela complete_exam_questions para questions
  const difficultyMap: { [key: string]: 'baixa' | 'média' | 'alta' } = {
    'fácil': 'baixa',
    'médio': 'média',
    'difícil': 'alta'
  };
  
  const mappedDifficulty = examQuestion.difficulty_level 
    ? difficultyMap[examQuestion.difficulty_level] || 'média'
    : 'média';

  // Converter a questão
  const question: Question = {
    user_id: userId,
    discipline_id: examQuestion.discipline_id || undefined,
    subject_id: examQuestion.subject_id || undefined,
    topic_id: examQuestion.topic_id || undefined,
    content: examQuestion.statement,
    explanation: examQuestion.explanation || undefined,
    difficulty: mappedDifficulty,
    question_type: 'multiple_choice',
    correct_answer: examQuestion.correct_answer_key,
    tags: [],
    is_public: false,
    from_genoma_bank: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Converter as opções de resposta
  const answerOptions: AnswerOption[] = options.map(option => ({
    text: option.option_text,
    is_correct: option.is_correct,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  return { question, answerOptions };
}

/**
 * Importa questões de uma prova completa para o banco de questões avulsas
 * Evita duplicações usando o sistema de hash
 */
export async function importQuestionsFromCompleteExam(
  options: ImportQuestionFromExamOptions
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    skipped: 0,
    errors: 0,
    errorMessages: []
  };

  try {
    // Obter usuário autenticado se não foi especificado
    let userId = options.userId;
    if (!userId) {
      const { data: user } = await supabase.auth.getUser();
      if (!user || !user.user) {
        result.errorMessages.push('Usuário não autenticado');
        return result;
      }
      userId = user.user.id;
    }

    // Buscar questões da prova completa
    let query = supabase
      .from('complete_exam_questions')
      .select(`
        *,
        complete_exam_options!inner (
          id,
          option_key,
          option_text,
          is_correct
        )
      `)
      .eq('complete_exam_id', options.examId)
      .order('position');

    // Filtrar por questões específicas se especificado
    if (options.questionIds && options.questionIds.length > 0) {
      query = query.in('id', options.questionIds);
    }

    const { data: examQuestions, error: fetchError } = await query;

    if (fetchError) {
      result.errorMessages.push(`Erro ao buscar questões da prova: ${fetchError.message}`);
      return result;
    }

    if (!examQuestions || examQuestions.length === 0) {
      result.errorMessages.push('Nenhuma questão encontrada na prova especificada');
      return result;
    }

    // Processar cada questão
    for (const examQuestion of examQuestions) {
      try {
        // Converter para formato do banco de questões
        const { question, answerOptions } = convertCompleteExamQuestionToQuestion(
          examQuestion,
          examQuestion.complete_exam_options || [],
          userId
        );

        // Calcular hash para verificar duplicação
        const questionHash = calculateQuestionHash(question, answerOptions);

        // Verificar se a questão já existe
        const { data: existingQuestion, error: checkError } = await supabase
          .from('questions')
          .select('id')
          .eq('hash', questionHash)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          // Erro diferente de "no rows returned"
          result.errors++;
          result.errorMessages.push(`Erro ao verificar duplicação da questão ${examQuestion.question_number}: ${checkError.message}`);
          continue;
        }

        if (existingQuestion) {
          // Questão já existe, pular
          result.skipped++;
          console.log(`Questão ${examQuestion.question_number} já existe (hash: ${questionHash}), pulando...`);
          continue;
        }

        // Inserir a questão usando o serviço existente
        const questionId = await QuestionsBankService.addQuestion(
          question,
          answerOptions,
          false, // skipCounter
          options.skipLimitCheck || false // skipLimitCheck
        );

        if (questionId) {
          result.imported++;
          console.log(`Questão ${examQuestion.question_number} importada com sucesso (ID: ${questionId})`);
        } else {
          result.errors++;
          result.errorMessages.push(`Falha ao importar questão ${examQuestion.question_number}`);
        }

      } catch (error: any) {
        result.errors++;
        result.errorMessages.push(`Erro ao processar questão ${examQuestion.question_number}: ${error.message}`);
        console.error(`Erro ao processar questão ${examQuestion.question_number}:`, error);
      }
    }

    result.success = result.errors === 0 || result.imported > 0;
    return result;

  } catch (error: any) {
    result.errorMessages.push(`Erro geral na importação: ${error.message}`);
    console.error('Erro geral na importação:', error);
    return result;
  }
}

/**
 * Importa todas as questões de uma prova completa
 */
export async function importAllQuestionsFromCompleteExam(
  examId: number,
  skipLimitCheck: boolean = false
): Promise<ImportResult> {
  return importQuestionsFromCompleteExam({
    examId,
    skipLimitCheck
  });
}

/**
 * Importa questões específicas de uma prova completa
 */
export async function importSpecificQuestionsFromCompleteExam(
  examId: number,
  questionIds: number[],
  skipLimitCheck: boolean = false
): Promise<ImportResult> {
  return importQuestionsFromCompleteExam({
    examId,
    questionIds,
    skipLimitCheck
  });
}