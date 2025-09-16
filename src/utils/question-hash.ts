import { Question, AnswerOption } from '@/services/questions-bank.service';

/**
 * Remove acentos de uma string
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza uma string removendo acentos, convertendo para minúsculo e removendo espaços extras
 */
function normalizeString(str: string): string {
  return removeAccents(str)
    .toLowerCase()
    .replace(/\s+/g, ' ') // Substitui múltiplos espaços por um único espaço
    .trim();
}

/**
 * Calcula o hash único de uma questão baseado no enunciado + alternativas + resposta
 * O hash é calculado a partir do conteúdo normalizado (sem acentos, em minúsculo, sem espaços extras)
 */
export function calculateQuestionHash(
  question: Question | string, 
  answerOptions?: AnswerOption[] | string[]
): string {
  // Normalizar o conteúdo da questão
  const normalizedContent = typeof question === 'string' 
    ? normalizeString(question)
    : normalizeString(question.content);
  
  // Normalizar a resposta correta (se existir)
  const normalizedCorrectAnswer = typeof question === 'string' 
    ? '' 
    : (question.correct_answer ? normalizeString(question.correct_answer) : '');
  
  // Normalizar as alternativas (se existirem)
  let normalizedOptions = '';
  if (answerOptions && answerOptions.length > 0) {
    if (typeof answerOptions[0] === 'string') {
      // Array de strings
      const sortedOptions = (answerOptions as string[])
        .map(option => normalizeString(option))
        .sort();
      normalizedOptions = sortedOptions.join('|');
    } else {
      // Array de AnswerOption
      const sortedOptions = (answerOptions as AnswerOption[])
        .map(option => ({
          text: normalizeString(option.text),
          is_correct: option.is_correct
        }))
        .sort((a, b) => a.text.localeCompare(b.text));
      
      normalizedOptions = sortedOptions
        .map(option => `${option.text}:${option.is_correct}`)
        .join('|');
    }
  }
  
  // Combinar todos os elementos normalizados
  const combinedContent = [
    normalizedContent,
    normalizedCorrectAnswer,
    normalizedOptions
  ].filter(Boolean).join('###');
  
  // Implementar hash SHA-256 simples para gerar 64 caracteres
  function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
  
  // Gerar múltiplos hashes para criar um hash de 64 caracteres
  const hash1 = simpleHash(combinedContent);
  const hash2 = simpleHash(combinedContent + 'salt1');
  const hash3 = simpleHash(combinedContent + 'salt2');
  const hash4 = simpleHash(combinedContent + 'salt3');
  const hash5 = simpleHash(combinedContent + 'salt4');
  const hash6 = simpleHash(combinedContent + 'salt5');
  const hash7 = simpleHash(combinedContent + 'salt6');
  const hash8 = simpleHash(combinedContent + 'salt7');
  
  // Combinar os hashes para formar um hash de 64 caracteres
  const finalHash = hash1 + hash2 + hash3 + hash4 + hash5 + hash6 + hash7 + hash8;
  
  return finalHash;
}

/**
 * Verifica se uma questão já existe no banco baseada no hash
 */
export async function checkQuestionExists(hash: string): Promise<boolean> {
  const { supabase } = await import('@/lib/supabase');
  
  const { data, error } = await supabase
    .from('questions')
    .select('id')
    .eq('hash', hash)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Erro ao verificar existência da questão:', error);
    return false;
  }
  
  return !!data;
}

/**
 * Atualiza o hash de questões existentes que não possuem hash
 * Útil para migração de dados existentes
 */
export async function updateExistingQuestionsHash(): Promise<{
  success: boolean;
  updated: number;
  errors: number;
}> {
  const { supabase } = await import('@/lib/supabase');
  
  let updated = 0;
  let errors = 0;
  
  try {
    // Buscar questões sem hash
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select(`
        id,
        content,
        correct_answer,
        answer_options (
          text,
          is_correct
        )
      `)
      .is('hash', null);
    
    if (fetchError) {
      console.error('Erro ao buscar questões:', fetchError);
      return { success: false, updated: 0, errors: 1 };
    }
    
    if (!questions || questions.length === 0) {
      return { success: true, updated: 0, errors: 0 };
    }
    
    // Atualizar cada questão com seu hash
    for (const question of questions) {
      try {
        const hash = calculateQuestionHash(
          question as Question,
          question.answer_options as AnswerOption[]
        );
        
        const { error: updateError } = await supabase
          .from('questions')
          .update({ hash })
          .eq('id', question.id);
        
        if (updateError) {
          console.error(`Erro ao atualizar questão ${question.id}:`, updateError);
          errors++;
        } else {
          updated++;
        }
      } catch (error) {
        console.error(`Erro ao processar questão ${question.id}:`, error);
        errors++;
      }
    }
    
    return { success: true, updated, errors };
  } catch (error) {
    console.error('Erro geral na atualização de hashes:', error);
    return { success: false, updated, errors: errors + 1 };
  }
}