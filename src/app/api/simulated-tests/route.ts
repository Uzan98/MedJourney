import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../../lib/db';

// Interface para simulado
interface SimulatedTest {
  Id: number;
  UserId: number;
  Title: string;
  Description?: string;
  TestDate: string;
  Duration: number;
  TotalQuestions: number;
  CorrectAnswers: number;
  Status: string;
  CreatedAt: string;
  UpdatedAt: string;
}

// Função para processar datas vindas do banco
function processSimulatedTests(tests: SimulatedTest[]) {
  return tests.map(test => ({
    id: test.Id.toString(),
    title: test.Title,
    date: new Date(test.TestDate), // Garantir que é um objeto Date
    correctAnswers: test.CorrectAnswers,
    totalQuestions: test.TotalQuestions,
    duration: test.Duration,
    status: test.Status,
    description: test.Description
  }));
}

// GET - Listar simulados
export async function GET(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter parâmetros da requisição
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    // Construir a consulta SQL
    let query = `
      SELECT 
        Id,
        UserId,
        Title,
        Description,
        TestDate,
        Duration,
        TotalQuestions,
        CorrectAnswers,
        Status,
        CreatedAt,
        UpdatedAt
      FROM SimulatedTests
      WHERE UserId = @userId
    `;
    
    // Adicionar filtro por status
    if (status) {
      query += ` AND Status = @status`;
    }
    
    // Ordenar por data do teste (mais recentes primeiro)
    query += ` ORDER BY TestDate DESC`;
    
    // Adicionar limite
    if (limit) {
      query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
    }
    
    // Executar a consulta
    const testsRaw = await executeQuery(query, { 
      userId, 
      status: status || undefined,
      limit: limit || undefined
    });
    
    // Processar os dados antes de retornar
    const tests = processSimulatedTests(testsRaw);
    
    return NextResponse.json({
      success: true,
      tests
    });
  } catch (error) {
    console.error('Erro ao listar simulados:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar novo simulado
export async function POST(request: Request) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    const { 
      title, 
      description, 
      duration, 
      totalQuestions,
      disciplineQuestions, // Array de {disciplineId, count}
      testDate = null // Se não fornecido, o simulado fica no estado 'criado'
    } = await request.json();
    
    // Validar dados de entrada
    if (!title || !duration || !totalQuestions) {
      return NextResponse.json(
        { error: 'Título, duração e número de questões são obrigatórios' },
        { status: 400 }
      );
    }
    
    if (totalQuestions < 1) {
      return NextResponse.json(
        { error: 'O simulado deve ter pelo menos uma questão' },
        { status: 400 }
      );
    }
    
    if (duration < 10) {
      return NextResponse.json(
        { error: 'A duração mínima é de 10 minutos' },
        { status: 400 }
      );
    }
    
    // Validar data (se fornecida)
    let dateObj = null;
    if (testDate) {
      dateObj = new Date(testDate);
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json(
          { error: 'Data inválida. Use o formato ISO 8601 (ex: 2023-04-25T14:30:00Z)' },
          { status: 400 }
        );
      }
    }
    
    // Determinando o status inicial do simulado
    // 'criado' - simulado criado, mas ainda não agendado
    // 'agendado' - simulado agendado para uma data futura 
    // 'em-andamento' - simulado em andamento
    // 'concluido' - simulado concluído 
    const status = testDate ? 'agendado' : 'criado';
    
    // Inserir novo simulado
    const result = await executeQuery(
      `INSERT INTO SimulatedTests 
        (UserId, Title, Description, TestDate, Duration, TotalQuestions, CorrectAnswers, Status) 
       OUTPUT INSERTED.Id, INSERTED.UserId, INSERTED.Title, INSERTED.Description,
              INSERTED.TestDate, INSERTED.Duration, INSERTED.TotalQuestions, 
              INSERTED.CorrectAnswers, INSERTED.Status, INSERTED.CreatedAt, INSERTED.UpdatedAt
       VALUES (@userId, @title, @description, @testDate, @duration, @totalQuestions, 0, @status)`,
      { 
        userId, 
        title, 
        description: description || null, 
        testDate: dateObj ? dateObj.toISOString() : null, 
        duration, 
        totalQuestions,
        status
      }
    );
    
    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao criar simulado' },
        { status: 500 }
      );
    }
    
    const newTest = result[0];
    const testId = newTest.Id;
    
    // Verificação adicional para garantir que temos o ID do teste
    if (!testId) {
      return NextResponse.json(
        { error: 'Erro ao obter o ID do simulado criado' },
        { status: 500 }
      );
    }
    
    // Se disciplineQuestions foi fornecido, processar cada disciplina e obter questões
    // Em uma implementação real, você selecionaria questões aleatórias com base nas disciplinas
    if (disciplineQuestions && Array.isArray(disciplineQuestions)) {
      // Verificar a consistência do total de questões
      const totalDisciplineQuestions = disciplineQuestions.reduce(
        (sum, dq) => sum + dq.count, 0
      );
      
      if (totalDisciplineQuestions !== totalQuestions) {
        return NextResponse.json({
          error: 'O total de questões nas disciplinas não corresponde ao total especificado',
          simulado: newTest // Retorna o simulado mesmo assim, mas com o erro
        }, { status: 400 });
      }
      
      // Aqui você pode adicionar código para selecionar questões aleatórias 
      // para cada disciplina e associá-las ao teste
      // Em uma aplicação real, isso seria feito em uma transação
    }
    
    return NextResponse.json({
      success: true,
      test: newTest
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar simulado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 