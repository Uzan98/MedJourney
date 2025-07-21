import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeQuerySingle } from '../../../../lib/db';

// Interface para sessão de estudo
interface StudySessionDB {
  Id: number;
  UserId: number;
  StudyPlanId: number | null;
  Title: string;
  DisciplineName: string;
  ScheduledDate: string;
  Duration: number;
  Completed: boolean;
  ActualDuration?: number;
  Notes?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

// Função para processar uma sessão de estudo
function processStudySession(session: StudySessionDB) {
  return {
    id: session.Id.toString(),
    title: session.Title,
    disciplineName: session.DisciplineName,
    scheduledDate: new Date(session.ScheduledDate),
    duration: session.Duration,
    completed: session.Completed,
    actualDuration: session.ActualDuration,
    notes: session.Notes,
    createdAt: new Date(session.CreatedAt),
    updatedAt: session.UpdatedAt ? new Date(session.UpdatedAt) : null
  };
}

// GET - Obter uma sessão de estudo específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Verificar se o ID foi fornecido
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da sessão é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar a sessão de estudo
    const session = await executeQuerySingle(`
      SELECT 
        Id,
        UserId,
        StudyPlanId,
        Title,
        DisciplineName,
        ScheduledDate,
        Duration,
        Completed,
        ActualDuration,
        Notes,
        CreatedAt,
        UpdatedAt
      FROM StudySessions
      WHERE Id = @id AND UserId = @userId
    `, { id, userId }) as StudySessionDB | null;
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sessão de estudo não encontrada' },
        { status: 404 }
      );
    }
    
    // Retornar a sessão processada
    return NextResponse.json({
      success: true,
      session: processStudySession(session)
    });
  } catch (error) {
    console.error('Erro ao obter sessão de estudo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar uma sessão de estudo
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Verificar se o ID foi fornecido
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da sessão é obrigatório' },
        { status: 400 }
      );
    }
    
    // Obter dados da requisição
    const { 
      title, 
      disciplineName, 
      scheduledDate, 
      duration, 
      notes,
      studyPlanId
    } = await request.json();
    
    // Validar dados obrigatórios
    if (!title && !disciplineName && !scheduledDate && !duration) {
      return NextResponse.json(
        { success: false, error: 'Pelo menos um campo para atualização é obrigatório' },
        { status: 400 }
      );
    }
    
    // Verificar se a sessão existe
    const existingSession = await executeQuerySingle(
      'SELECT Id FROM StudySessions WHERE Id = @id AND UserId = @userId',
      { id, userId }
    ) as { Id: number } | null;
    
    if (!existingSession) {
      return NextResponse.json(
        { success: false, error: 'Sessão de estudo não encontrada' },
        { status: 404 }
      );
    }
    
    // Construir a query de atualização
    let updateFields = [];
    let queryParams: any = { id, userId };
    
    if (title !== undefined) {
      updateFields.push('Title = @title');
      queryParams.title = title;
    }
    
    if (disciplineName !== undefined) {
      updateFields.push('DisciplineName = @disciplineName');
      queryParams.disciplineName = disciplineName;
    }
    
    if (scheduledDate !== undefined) {
      // Validar data
      const dateObj = new Date(scheduledDate);
      if (isNaN(dateObj.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Data inválida. Use o formato ISO 8601 (ex: 2023-04-25T14:30:00Z)' },
          { status: 400 }
        );
      }
      
      updateFields.push('ScheduledDate = @scheduledDate');
      queryParams.scheduledDate = dateObj.toISOString();
    }
    
    if (duration !== undefined) {
      // Validar duração (pelo menos 5 minutos)
      if (duration < 5) {
        return NextResponse.json(
          { success: false, error: 'A duração mínima é de 5 minutos' },
          { status: 400 }
        );
      }
      
      updateFields.push('Duration = @duration');
      queryParams.duration = duration;
    }
    
    if (notes !== undefined) {
      updateFields.push('Notes = @notes');
      queryParams.notes = notes;
    }
    
    if (studyPlanId !== undefined) {
      updateFields.push('StudyPlanId = @studyPlanId');
      queryParams.studyPlanId = studyPlanId === null ? null : studyPlanId;
    }
    
    // Adicionar campo UpdatedAt
    updateFields.push('UpdatedAt = GETDATE()');
    
    // Executar a atualização
    const query = `
      UPDATE StudySessions 
      SET ${updateFields.join(', ')} 
      OUTPUT 
        INSERTED.Id,
        INSERTED.UserId,
        INSERTED.StudyPlanId,
        INSERTED.Title,
        INSERTED.DisciplineName,
        INSERTED.ScheduledDate,
        INSERTED.Duration,
        INSERTED.Completed,
        INSERTED.ActualDuration,
        INSERTED.Notes,
        INSERTED.CreatedAt,
        INSERTED.UpdatedAt
      WHERE Id = @id AND UserId = @userId
    `;
    
    const updatedSession = await executeQuerySingle(query, queryParams) as StudySessionDB | null;
    
    if (!updatedSession) {
      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar a sessão de estudo' },
        { status: 500 }
      );
    }
    
    // Retornar a sessão atualizada
    return NextResponse.json({
      success: true,
      session: processStudySession(updatedSession)
    });
  } catch (error) {
    console.error('Erro ao atualizar sessão de estudo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir uma sessão de estudo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Verificar se o ID foi fornecido
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da sessão é obrigatório' },
        { status: 400 }
      );
    }
    
    // Verificar se a sessão existe
    const existingSession = await executeQuerySingle(
      'SELECT Id FROM StudySessions WHERE Id = @id AND UserId = @userId',
      { id, userId }
    ) as { Id: number } | null;
    
    if (!existingSession) {
      return NextResponse.json(
        { success: false, error: 'Sessão de estudo não encontrada' },
        { status: 404 }
      );
    }
    
    // Excluir a sessão
    const result = await executeQuery(
      'DELETE FROM StudySessions WHERE Id = @id AND UserId = @userId',
      { id, userId }
    );
    
    // Retornar sucesso
    return NextResponse.json({
      success: true,
      message: 'Sessão de estudo excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir sessão de estudo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 