import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeQuerySingle } from '../../../lib/db';

// GET - Listar notas
export async function GET(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter parâmetros da requisição
    const { searchParams } = new URL(request.url);
    const disciplineName = searchParams.get('disciplineName');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    // Construir a consulta SQL
    let query = `
      SELECT 
        Id as id,
        Title as title,
        Content as content,
        CreatedAt as createdAt,
        DisciplineName as disciplineName
      FROM Notes
      WHERE UserId = @userId
    `;
    
    // Adicionar filtro por disciplina
    if (disciplineName) {
      query += ` AND DisciplineName = @disciplineName`;
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    query += ` ORDER BY CreatedAt DESC`;
    
    // Adicionar limite
    if (limit) {
      query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
    }
    
    // Executar a consulta
    const notes = await executeQuery(query, { 
      userId, 
      disciplineName: disciplineName || undefined,
      limit: limit || undefined
    });
    
    return NextResponse.json({
      success: true,
      notes
    });
  } catch (error) {
    console.error('Erro ao obter notas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar nota
export async function POST(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter dados da requisição
    const data = await request.json();
    
    // Validar dados
    if (!data.title || !data.content) {
      return NextResponse.json(
        { success: false, error: 'Título e conteúdo são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Inserir nota
    const result = await executeQuery(`
      INSERT INTO Notes (
        UserId,
        Title,
        Content,
        DisciplineName
      )
      VALUES (
        @userId,
        @title,
        @content,
        @disciplineName
      );
      
      SELECT SCOPE_IDENTITY() AS id;
    `, {
      userId,
      title: data.title,
      content: data.content,
      disciplineName: data.disciplineName || null
    });
    
    // Obter ID da nota inserida
    const noteId = result[0]?.id;
    
    // Buscar a nota completa
    if (noteId) {
      const note = await executeQuerySingle(`
        SELECT 
          Id as id,
          Title as title,
          Content as content,
          CreatedAt as createdAt,
          DisciplineName as disciplineName
        FROM Notes
        WHERE Id = @noteId
      `, { noteId });
      
      return NextResponse.json({
        success: true,
        note
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Nota criada com sucesso',
      noteId
    });
  } catch (error) {
    console.error('Erro ao criar nota:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET individual note by ID
export async function HEAD(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter ID da nota da URL
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('id');
    
    if (!noteId) {
      return NextResponse.json(
        { success: false, error: 'ID da nota é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar a nota
    const note = await executeQuerySingle(`
      SELECT 
        Id as id,
        Title as title,
        Content as content,
        CreatedAt as createdAt,
        DisciplineName as disciplineName
      FROM Notes
      WHERE Id = @noteId AND UserId = @userId
    `, { noteId, userId });
    
    if (!note) {
      return NextResponse.json(
        { success: false, error: 'Nota não encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      note
    });
  } catch (error) {
    console.error('Erro ao obter nota:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar nota
export async function PUT(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter dados da requisição
    const data = await request.json();
    
    // Validar dados
    if (!data.id) {
      return NextResponse.json(
        { success: false, error: 'ID da nota é obrigatório' },
        { status: 400 }
      );
    }
    
    // Construir conjuntos de campos para atualização
    const updateSets = [];
    const params: any = { userId, noteId: data.id };
    
    if (data.title !== undefined) {
      updateSets.push('Title = @title');
      params.title = data.title;
    }
    
    if (data.content !== undefined) {
      updateSets.push('Content = @content');
      params.content = data.content;
    }
    
    if (data.disciplineName !== undefined) {
      updateSets.push('DisciplineName = @disciplineName');
      params.disciplineName = data.disciplineName;
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
    
    // Atualizar nota
    const updateQuery = `
      UPDATE Notes
      SET ${updateSets.join(', ')}
      WHERE Id = @noteId AND UserId = @userId;
      
      SELECT @@ROWCOUNT AS affectedRows;
    `;
    
    const result = await executeQuery(updateQuery, params);
    const affectedRows = result[0]?.affectedRows || 0;
    
    if (affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Nota não encontrada ou permissão negada' },
        { status: 404 }
      );
    }
    
    // Buscar a nota atualizada
    const note = await executeQuerySingle(`
      SELECT 
        Id as id,
        Title as title,
        Content as content,
        CreatedAt as createdAt,
        DisciplineName as disciplineName
      FROM Notes
      WHERE Id = @noteId
    `, { noteId: data.id });
    
    return NextResponse.json({
      success: true,
      message: 'Nota atualizada com sucesso',
      note
    });
  } catch (error) {
    console.error('Erro ao atualizar nota:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir nota
export async function DELETE(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter ID da nota da URL
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('id');
    
    if (!noteId) {
      return NextResponse.json(
        { success: false, error: 'ID da nota é obrigatório' },
        { status: 400 }
      );
    }
    
    // Excluir nota
    const result = await executeQuery(`
      DELETE FROM Notes
      WHERE Id = @noteId AND UserId = @userId;
      
      SELECT @@ROWCOUNT AS affectedRows;
    `, { noteId, userId });
    
    const affectedRows = result[0]?.affectedRows || 0;
    
    if (affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Nota não encontrada ou permissão negada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Nota excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir nota:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 