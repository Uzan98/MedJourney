import { supabase } from '@/lib/supabase';
import { QuestionsBankService, Question, AnswerOption } from '@/services/questions-bank.service';
import { importQuestionsFromCompleteExam } from '@/utils/import-questions-from-exam';
import { calculateQuestionHash } from '@/utils/question-hash';

/**
 * Script de teste para validar o sistema de importação sem duplicações
 */

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Teste 1: Verificar se o campo hash foi adicionado à tabela questions
 */
async function testHashFieldExists(): Promise<TestResult> {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('hash')
      .limit(1);

    if (error) {
      return {
        success: false,
        message: `Erro ao verificar campo hash: ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Campo hash existe na tabela questions'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Erro inesperado: ${error.message}`
    };
  }
}

/**
 * Teste 2: Verificar se a função de hash funciona corretamente
 */
async function testHashFunction(): Promise<TestResult> {
  try {
    const testQuestion: Question = {
      user_id: 'test-user',
      content: 'Qual é a capital do Brasil?',
      difficulty: 'baixa',
      question_type: 'multiple_choice',
      correct_answer: 'A',
      tags: [],
      is_public: false,
      from_genoma_bank: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const testOptions: AnswerOption[] = [
      { text: 'Brasília', is_correct: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { text: 'São Paulo', is_correct: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { text: 'Rio de Janeiro', is_correct: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { text: 'Salvador', is_correct: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];

    const hash1 = calculateQuestionHash(testQuestion, testOptions);
    const hash2 = calculateQuestionHash(testQuestion, testOptions);

    if (hash1 !== hash2) {
      return {
        success: false,
        message: 'Função de hash não é determinística'
      };
    }

    if (hash1.length !== 64) {
      return {
        success: false,
        message: `Hash deve ter 64 caracteres, mas tem ${hash1.length}`
      };
    }

    // Testar com questão ligeiramente diferente
    const modifiedQuestion = { ...testQuestion, content: 'Qual é a capital do brasil?' }; // minúscula
    const hash3 = calculateQuestionHash(modifiedQuestion, testOptions);

    if (hash1 !== hash3) {
      return {
        success: false,
        message: 'Normalização não está funcionando corretamente'
      };
    }

    return {
      success: true,
      message: 'Função de hash está funcionando corretamente',
      details: { hash: hash1 }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Erro na função de hash: ${error.message}`
    };
  }
}

/**
 * Teste 3: Testar inserção de questão com hash
 */
async function testQuestionInsertionWithHash(): Promise<TestResult> {
  try {
    // Obter usuário autenticado
    const { data: user } = await supabase.auth.getUser();
    if (!user || !user.user) {
      return {
        success: false,
        message: 'Usuário não autenticado para teste'
      };
    }

    const testQuestion: Question = {
      user_id: user.user.id,
      content: `Teste de inserção com hash - ${Date.now()}`,
      difficulty: 'baixa',
      question_type: 'multiple_choice',
      correct_answer: 'A',
      tags: ['teste'],
      is_public: false,
      from_genoma_bank: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const testOptions: AnswerOption[] = [
      { text: 'Opção A', is_correct: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { text: 'Opção B', is_correct: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];

    // Primeira inserção
    const questionId1 = await QuestionsBankService.addQuestion(testQuestion, testOptions, false, true);

    if (!questionId1) {
      return {
        success: false,
        message: 'Falha na primeira inserção da questão'
      };
    }

    // Segunda inserção (deve ser ignorada por duplicação)
    const questionId2 = await QuestionsBankService.addQuestion(testQuestion, testOptions, false, true);

    if (questionId2) {
      return {
        success: false,
        message: 'Segunda inserção deveria ter sido ignorada por duplicação'
      };
    }

    // Verificar se apenas uma questão foi inserida
    const hash = calculateQuestionHash(testQuestion, testOptions);
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id')
      .eq('hash', hash);

    if (error) {
      return {
        success: false,
        message: `Erro ao verificar questões inseridas: ${error.message}`
      };
    }

    if (questions?.length !== 1) {
      return {
        success: false,
        message: `Esperado 1 questão, encontrado ${questions?.length}`
      };
    }

    // Limpar questão de teste
    await supabase.from('questions').delete().eq('id', questionId1);

    return {
      success: true,
      message: 'Sistema de prevenção de duplicação está funcionando',
      details: { questionId: questionId1, hash }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Erro no teste de inserção: ${error.message}`
    };
  }
}

/**
 * Teste 4: Testar importação de questões de prova completa (se houver provas disponíveis)
 */
async function testCompleteExamImport(): Promise<TestResult> {
  try {
    // Buscar uma prova completa para teste
    const { data: exams, error } = await supabase
      .from('complete_exams')
      .select('id, title')
      .limit(1);

    if (error) {
      return {
        success: false,
        message: `Erro ao buscar provas completas: ${error.message}`
      };
    }

    if (!exams || exams.length === 0) {
      return {
        success: true,
        message: 'Nenhuma prova completa disponível para teste (isso é normal)'
      };
    }

    const examId = exams[0].id;

    // Contar questões antes da importação
    const { data: questionsBefore, error: countError1 } = await supabase
      .from('questions')
      .select('id', { count: 'exact' });

    if (countError1) {
      return {
        success: false,
        message: `Erro ao contar questões antes: ${countError1.message}`
      };
    }

    const countBefore = questionsBefore?.length || 0;

    // Importar questões
    const importResult = await importQuestionsFromCompleteExam({
      examId,
      skipLimitCheck: true
    });

    // Contar questões depois da importação
    const { data: questionsAfter, error: countError2 } = await supabase
      .from('questions')
      .select('id', { count: 'exact' });

    if (countError2) {
      return {
        success: false,
        message: `Erro ao contar questões depois: ${countError2.message}`
      };
    }

    const countAfter = questionsAfter?.length || 0;

    return {
      success: importResult.success,
      message: `Importação testada: ${importResult.imported} importadas, ${importResult.skipped} puladas, ${importResult.errors} erros`,
      details: {
        examTitle: exams[0].title,
        questionsBefore: countBefore,
        questionsAfter: countAfter,
        importResult
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Erro no teste de importação: ${error.message}`
    };
  }
}

/**
 * Executar todos os testes
 */
export async function runAllTests(): Promise<TestResult[]> {
  console.log('🧪 Iniciando testes do sistema de importação...\n');

  const tests = [
    { name: 'Campo Hash na Tabela', test: testHashFieldExists },
    { name: 'Função de Hash', test: testHashFunction },
    { name: 'Inserção com Hash', test: testQuestionInsertionWithHash },
    { name: 'Importação de Prova', test: testCompleteExamImport }
  ];

  const results: TestResult[] = [];

  for (const { name, test } of tests) {
    console.log(`🔍 Executando teste: ${name}...`);
    
    try {
      const result = await test();
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${name}: ${result.message}`);
        if (result.details) {
          console.log(`   Detalhes:`, result.details);
        }
      } else {
        console.log(`❌ ${name}: ${result.message}`);
      }
    } catch (error: any) {
      const errorResult: TestResult = {
        success: false,
        message: `Erro inesperado: ${error.message}`
      };
      results.push(errorResult);
      console.log(`💥 ${name}: ${errorResult.message}`);
    }
    
    console.log('');
  }

  // Resumo
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`📊 Resumo dos testes: ${passed}/${total} passaram`);
  
  if (passed === total) {
    console.log('🎉 Todos os testes passaram! Sistema funcionando corretamente.');
  } else {
    console.log('⚠️  Alguns testes falharam. Verifique os detalhes acima.');
  }

  return results;
}

/**
 * Função para executar testes individuais
 */
export const testFunctions = {
  testHashFieldExists,
  testHashFunction,
  testQuestionInsertionWithHash,
  testCompleteExamImport,
  runAllTests
};