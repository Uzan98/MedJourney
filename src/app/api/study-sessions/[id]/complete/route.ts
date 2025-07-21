import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../../../../lib/db';

// Interface para sessão de estudo
interface StudySessionDB {
  Id: number;
  UserId: number;
  StudyPlanId: number;
  Title: string;
  DisciplineName: string;
  ScheduledDate: string;
  Duration: number;
  Completed: boolean;
  ActualDuration?: number;
  Notes?: string;
  CreatedAt: string;
  UpdatedAt?: string;
}

// Função para processar uma sessão de estudo
function processStudySession(session: StudySessionDB) {
  return {
    id: session.Id.toString(),
    title: session.Title,
    disciplineName: session.DisciplineName,
    scheduledDate: new Date(session.ScheduledDate), // Garantir que é um objeto Date
    duration: session.Duration,
    completed: session.Completed,
    actualDuration: session.ActualDuration,
    notes: session.Notes
  };
}

// PUT - Completar uma sessão de estudo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar se o ID foi fornecido
    if (!params.id) {
      return NextResponse.json(
        { success: false, error: 'ID da sessão de estudo não fornecido' },
        { status: 400 }
      );
    }

    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter dados da requisição
    const { actualDuration, notes } = await request.json();
    
    // Validar duração
    if (!actualDuration || typeof actualDuration !== 'number' || actualDuration < 1) {
      return NextResponse.json(
        { success: false, error: 'Duração real é obrigatória e deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Verificar se a sessão existe e pertence ao usuário
    const sessionExists = await executeQuery(
      `SELECT Id FROM StudySessions WHERE Id = @id AND UserId = @userId`,
      { id: params.id, userId }
    );

    if (!sessionExists || sessionExists.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sessão de estudo não encontrada' },
        { status: 404 }
      );
    }

    // Atualizar a sessão como concluída
    const result = await executeQuery(
      `UPDATE StudySessions 
       SET Completed = 1, 
           ActualDuration = @actualDuration, 
           Notes = @notes,
           UpdatedAt = GETDATE()
       OUTPUT INSERTED.Id, INSERTED.UserId, INSERTED.StudyPlanId, INSERTED.Title, 
              INSERTED.DisciplineName, INSERTED.ScheduledDate, INSERTED.Duration, 
              INSERTED.Completed, INSERTED.ActualDuration, INSERTED.Notes, 
              INSERTED.CreatedAt, INSERTED.UpdatedAt
       WHERE Id = @id AND UserId = @userId`,
      { 
        id: params.id, 
        userId, 
        actualDuration, 
        notes: notes || null 
      }
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Erro ao completar sessão de estudo' },
        { status: 500 }
      );
    }

    // Retornar dados atualizados da sessão
    const updatedSession = processStudySession(result[0]);
    
    return NextResponse.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    console.error('Erro ao completar sessão de estudo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 