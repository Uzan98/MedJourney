import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeQuerySingle } from '../../../lib/db';
import sql from 'mssql';

// GET - Listar tarefas
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
        Id as id,
        Title as title,
        Description as description,
        DueDate as dueDate,
        Status as status,
        Priority as priority,
        DisciplineName as discipline
      FROM Tasks
      WHERE UserId = @userId
    `;
    
    // Adicionar filtro por status
    if (status) {
      query += ` AND Status = @status`;
    }
    
    // Ordenar por data de vencimento
    query += ` ORDER BY DueDate ASC`;
    
    // Adicionar limite
    if (limit) {
      query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
    }
    
    // Executar a consulta
    const tasks = await executeQuery(query, { 
      userId, 
      status: status || undefined,
      limit: limit || undefined
    });
    
    return NextResponse.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Erro ao obter tarefas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar tarefa
export async function POST(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter dados da requisição
    const data = await request.json();
    
    // Validar dados
    if (!data.title || !data.dueDate) {
      return NextResponse.json(
        { success: false, error: 'Título e data de vencimento são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Inserir tarefa
    const result = await executeQuery(`
      INSERT INTO Tasks (
        UserId,
        Title,
        Description,
        DueDate,
        Status,
        Priority,
        DisciplineName
      )
      VALUES (
        @userId,
        @title,
        @description,
        @dueDate,
        @status,
        @priority,
        @disciplineName
      );
      
      SELECT SCOPE_IDENTITY() AS id;
    `, {
      userId,
      title: data.title,
      description: data.description || null,
      dueDate: new Date(data.dueDate),
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      disciplineName: data.discipline || null
    });
    
    // Obter ID da tarefa inserida
    const taskId = result[0]?.id;
    
    // Buscar a tarefa completa
    if (taskId) {
      const task = await executeQuerySingle(`
        SELECT 
          Id as id,
          Title as title,
          Description as description,
          DueDate as dueDate,
          Status as status,
          Priority as priority,
          DisciplineName as discipline
        FROM Tasks
        WHERE Id = @taskId
      `, { taskId });
      
      return NextResponse.json({
        success: true,
        task
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Tarefa criada com sucesso',
      taskId
    });
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para atualizar o status de uma tarefa
export async function PUT(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter dados da requisição
    const data = await request.json();
    
    // Validar dados
    if (!data.id) {
      return NextResponse.json(
        { success: false, error: 'ID da tarefa é obrigatório' },
        { status: 400 }
      );
    }
    
    // Construir conjuntos de campos para atualização
    const updateSets = [];
    const params: any = { userId, taskId: data.id };
    
    if (data.title !== undefined) {
      updateSets.push('Title = @title');
      params.title = data.title;
    }
    
    if (data.description !== undefined) {
      updateSets.push('Description = @description');
      params.description = data.description;
    }
    
    if (data.dueDate !== undefined) {
      updateSets.push('DueDate = @dueDate');
      params.dueDate = new Date(data.dueDate);
    }
    
    if (data.status !== undefined) {
      updateSets.push('Status = @status');
      params.status = data.status;
    }
    
    if (data.priority !== undefined) {
      updateSets.push('Priority = @priority');
      params.priority = data.priority;
    }
    
    if (data.discipline !== undefined) {
      updateSets.push('DisciplineName = @disciplineName');
      params.disciplineName = data.discipline;
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
    
    // Atualizar tarefa
    const updateQuery = `
      UPDATE Tasks
      SET ${updateSets.join(', ')}
      WHERE Id = @taskId AND UserId = @userId;
      
      SELECT @@ROWCOUNT AS affectedRows;
    `;
    
    const result = await executeQuery(updateQuery, params);
    const affectedRows = result[0]?.affectedRows || 0;
    
    if (affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Tarefa não encontrada ou permissão negada' },
        { status: 404 }
      );
    }
    
    // Buscar a tarefa atualizada
    const task = await executeQuerySingle(`
      SELECT 
        Id as id,
        Title as title,
        Description as description,
        DueDate as dueDate,
        Status as status,
        Priority as priority,
        DisciplineName as discipline
      FROM Tasks
      WHERE Id = @taskId
    `, { taskId: data.id });
    
    return NextResponse.json({
      success: true,
      message: 'Tarefa atualizada com sucesso',
      task
    });
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir tarefa
export async function DELETE(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter ID da tarefa da URL
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');
    
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'ID da tarefa é obrigatório' },
        { status: 400 }
      );
    }
    
    // Excluir tarefa
    const result = await executeQuery(`
      DELETE FROM Tasks
      WHERE Id = @taskId AND UserId = @userId;
      
      SELECT @@ROWCOUNT AS affectedRows;
    `, { taskId, userId });
    
    const affectedRows = result[0]?.affectedRows || 0;
    
    if (affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Tarefa não encontrada ou permissão negada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Tarefa excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir tarefa:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 