import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../../../lib/db';

// Interface para simulado (mantida consistente com o arquivo principal)
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

// Função para processar dados de simulado
function processSimulatedTest(test: SimulatedTest) {
  return {
    id: test.Id.toString(),
    title: test.Title,
    date: new Date(test.TestDate),
    correctAnswers: test.CorrectAnswers,
    totalQuestions: test.TotalQuestions,
    duration: test.Duration,
    status: test.Status,
    description: test.Description
  };
}

// GET - Obter simulado por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Em uma aplicação real, obteríamos o userId do token de autenticação
    const userId = 1;
    const testId = params.id;

    if (!testId) {
      return NextResponse.json(
        { success: false, error: 'ID do simulado não fornecido' },
        { status: 400 }
      );
    }

    // Consultar o simulado específico no banco de dados
    const query = `
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
      WHERE Id = @testId AND UserId = @userId
    `;

    const results = await executeQuery(query, { testId, userId });

    if (!results || results.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Simulado não encontrado' },
        { status: 404 }
      );
    }

    // Processar o resultado
    const test = processSimulatedTest(results[0]);

    return NextResponse.json({
      success: true,
      test
    });
  } catch (error) {
    console.error('Erro ao obter simulado por ID:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar simulado por ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Em uma aplicação real, obteríamos o userId do token de autenticação
    const userId = 1;
    const testId = params.id;

    if (!testId) {
      return NextResponse.json(
        { success: false, error: 'ID do simulado não fornecido' },
        { status: 400 }
      );
    }

    // Obter dados do corpo da requisição
    const {
      title,
      description,
      testDate,
      duration,
      totalQuestions,
      correctAnswers,
      status
    } = await request.json();

    // Verificar se o simulado existe
    const checkQuery = `
      SELECT Id FROM SimulatedTests
      WHERE Id = @testId AND UserId = @userId
    `;
    
    const existingTest = await executeQuery(checkQuery, { testId, userId });
    
    if (!existingTest || existingTest.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Simulado não encontrado' },
        { status: 404 }
      );
    }

    // Construir a consulta de atualização com os campos fornecidos
    let updateFields = [];
    const queryParams: any = { testId, userId };

    if (title !== undefined) {
      updateFields.push('Title = @title');
      queryParams.title = title;
    }

    if (description !== undefined) {
      updateFields.push('Description = @description');
      queryParams.description = description;
    }

    if (testDate !== undefined) {
      updateFields.push('TestDate = @testDate');
      queryParams.testDate = new Date(testDate).toISOString();
    }

    if (duration !== undefined) {
      updateFields.push('Duration = @duration');
      queryParams.duration = duration;
    }

    if (totalQuestions !== undefined) {
      updateFields.push('TotalQuestions = @totalQuestions');
      queryParams.totalQuestions = totalQuestions;
    }

    if (correctAnswers !== undefined) {
      updateFields.push('CorrectAnswers = @correctAnswers');
      queryParams.correctAnswers = correctAnswers;
    }

    if (status !== undefined) {
      updateFields.push('Status = @status');
      queryParams.status = status;
    }

    // Adicionar campo UpdatedAt
    updateFields.push('UpdatedAt = GETDATE()');

    // Se não houver campos para atualizar, retornar erro
    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo fornecido para atualização' },
        { status: 400 }
      );
    }

    // Construir e executar a consulta de atualização
    const updateQuery = `
      UPDATE SimulatedTests
      SET ${updateFields.join(', ')}
      OUTPUT 
        INSERTED.Id,
        INSERTED.UserId,
        INSERTED.Title,
        INSERTED.Description,
        INSERTED.TestDate,
        INSERTED.Duration,
        INSERTED.TotalQuestions,
        INSERTED.CorrectAnswers,
        INSERTED.Status,
        INSERTED.CreatedAt,
        INSERTED.UpdatedAt
      WHERE Id = @testId AND UserId = @userId
    `;

    const updatedResult = await executeQuery(updateQuery, queryParams);

    if (!updatedResult || updatedResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar simulado' },
        { status: 500 }
      );
    }

    // Processar e retornar o resultado
    const updatedTest = processSimulatedTest(updatedResult[0]);

    return NextResponse.json({
      success: true,
      test: updatedTest
    });
  } catch (error) {
    console.error('Erro ao atualizar simulado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir simulado por ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Em uma aplicação real, obteríamos o userId do token de autenticação
    const userId = 1;
    const testId = params.id;

    if (!testId) {
      return NextResponse.json(
        { success: false, error: 'ID do simulado não fornecido' },
        { status: 400 }
      );
    }

    // Verificar se o simulado existe
    const checkQuery = `
      SELECT Id FROM SimulatedTests
      WHERE Id = @testId AND UserId = @userId
    `;
    
    const existingTest = await executeQuery(checkQuery, { testId, userId });
    
    if (!existingTest || existingTest.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Simulado não encontrado' },
        { status: 404 }
      );
    }

    // Executar a exclusão
    const deleteQuery = `
      DELETE FROM SimulatedTests
      WHERE Id = @testId AND UserId = @userId
    `;

    await executeQuery(deleteQuery, { testId, userId });

    return NextResponse.json({
      success: true,
      message: 'Simulado excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir simulado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 