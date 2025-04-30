import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeQuerySingle } from '../../../lib/db';

// GET - Listar planos de estudo
export async function GET(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter parâmetros da requisição
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    // Query base
    let query = `
      SELECT Id, Name, Description, StartDate, EndDate, Status, CreatedAt, UpdatedAt
      FROM StudyPlans
      WHERE UserId = @userId
    `;
    
    const params: any = { userId };
    
    // Filtrar por status, se especificado
    if (status) {
      query += ` AND Status = @status`;
      params.status = status;
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    query += ` ORDER BY CreatedAt DESC`;
    
    // Limitar o número de resultados, se especificado
    if (limit) {
      query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
      params.limit = limit;
    }
    
    const plans = await executeQuery(query, params);
    
    return NextResponse.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Erro ao listar planos de estudo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar novo plano de estudo
export async function POST(request: Request) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    const { name, description, startDate, endDate, status, metaData } = await request.json();

    // Validar dados de entrada
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nome do plano de estudo é obrigatório' },
        { status: 400 }
      );
    }

    // Inserir novo plano de estudo
    const result = await executeQuery(
      `INSERT INTO StudyPlans (UserId, Name, Description, StartDate, EndDate, Status, MetaData) 
       OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Description, INSERTED.StartDate,
              INSERTED.EndDate, INSERTED.Status, INSERTED.CreatedAt, INSERTED.UpdatedAt
       VALUES (@userId, @name, @description, @startDate, @endDate, @status, @metaData)`,
      { 
        userId, 
        name, 
        description: description || null,
        startDate: startDate || null,
        endDate: endDate || null,
        status: status || 'ativo',
        metaData: metaData || null
      }
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Erro ao criar plano de estudo' },
        { status: 500 }
      );
    }

    // Retornar dados do plano criado
    const newPlan = result[0];

    return NextResponse.json({
      success: true,
      plan: newPlan
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar plano de estudo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET individual plan by ID
export async function HEAD(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter ID do plano da URL
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');
    
    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'ID do plano é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar o plano
    const plan = await executeQuerySingle(`
      SELECT 
        Id as id,
        Name as name,
        Description as description,
        StartDate as startDate,
        EndDate as endDate,
        Status as status,
        CreatedAt as createdAt,
        UpdatedAt as updatedAt
      FROM StudyPlans
      WHERE Id = @planId AND UserId = @userId
    `, { planId, userId });
    
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado' },
        { status: 404 }
      );
    }
    
    // Obter sessões de estudo associadas ao plano
    const sessions = await executeQuery(`
      SELECT 
        Id as id,
        Title as title,
        DisciplineName as disciplineName,
        ScheduledDate as scheduledDate,
        Duration as duration,
        Completed as completed,
        ActualDuration as actualDuration,
        Notes as notes,
        CreatedAt as createdAt
      FROM StudySessions
      WHERE StudyPlanId = @planId
      ORDER BY ScheduledDate ASC
    `, { planId });
    
    return NextResponse.json({
      success: true,
      plan,
      sessions
    });
  } catch (error) {
    console.error('Erro ao obter plano de estudo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar plano de estudo
export async function PUT(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter dados da requisição
    const data = await request.json();
    
    // Validar dados
    if (!data.id) {
      return NextResponse.json(
        { success: false, error: 'ID do plano é obrigatório' },
        { status: 400 }
      );
    }
    
    // Construir conjuntos de campos para atualização
    const updateSets: string[] = [];
    const params: Record<string, any> = { userId, planId: data.id };
    
    if (data.name !== undefined) {
      updateSets.push('Name = @name');
      params.name = data.name;
    }
    
    if (data.description !== undefined) {
      updateSets.push('Description = @description');
      params.description = data.description;
    }
    
    if (data.startDate !== undefined) {
      updateSets.push('StartDate = @startDate');
      params.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    
    if (data.endDate !== undefined) {
      updateSets.push('EndDate = @endDate');
      params.endDate = data.endDate ? new Date(data.endDate) : null;
    }
    
    if (data.status !== undefined) {
      updateSets.push('Status = @status');
      params.status = data.status;
    }
    
    if (data.metaData !== undefined) {
      updateSets.push('MetaData = @metaData');
      params.metaData = data.metaData;
    }
    
    // Adicionar timestamp de atualização
    updateSets.push('UpdatedAt = GETDATE()');
    
    // Se não houver campos para atualizar, retornar erro
    if (updateSets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }
    
    // Atualizar plano
    const updateQuery = `
      UPDATE StudyPlans
      SET ${updateSets.join(', ')}
      WHERE Id = @planId AND UserId = @userId;
      
      SELECT @@ROWCOUNT AS affectedRows;
    `;
    
    const result = await executeQuery(updateQuery, params);
    const affectedRows = result[0]?.affectedRows || 0;
    
    if (affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado ou permissão negada' },
        { status: 404 }
      );
    }
    
    // Buscar o plano atualizado
    const plan = await executeQuerySingle(`
      SELECT 
        Id as id,
        Name as name,
        Description as description,
        StartDate as startDate,
        EndDate as endDate,
        Status as status,
        CreatedAt as createdAt,
        UpdatedAt as updatedAt
      FROM StudyPlans
      WHERE Id = @planId
    `, { planId: data.id });
    
    return NextResponse.json({
      success: true,
      message: 'Plano de estudo atualizado com sucesso',
      plan
    });
  } catch (error) {
    console.error('Erro ao atualizar plano de estudo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir plano de estudo
export async function DELETE(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter ID do plano da URL
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');
    
    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'ID do plano é obrigatório' },
        { status: 400 }
      );
    }
    
    // Primeiro, atualizar sessões de estudo associadas a este plano
    await executeQuery(`
      UPDATE StudySessions
      SET StudyPlanId = NULL
      WHERE StudyPlanId = @planId AND UserId = @userId;
    `, { planId, userId });
    
    // Excluir plano
    const result = await executeQuery(`
      DELETE FROM StudyPlans
      WHERE Id = @planId AND UserId = @userId;
      
      SELECT @@ROWCOUNT AS affectedRows;
    `, { planId, userId });
    
    const affectedRows = result[0]?.affectedRows || 0;
    
    if (affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado ou permissão negada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Plano de estudo excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir plano de estudo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 