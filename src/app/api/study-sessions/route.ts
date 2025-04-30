import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../../lib/db';

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
}

// Função para processar datas vindas do banco
function processStudySessions(sessions: StudySessionDB[]) {
  return sessions.map(session => ({
    id: session.Id.toString(),
    title: session.Title,
    disciplineName: session.DisciplineName,
    scheduledDate: new Date(session.ScheduledDate), // Garantir que é um objeto Date
    duration: session.Duration,
    completed: session.Completed,
    actualDuration: session.ActualDuration,
    notes: session.Notes
  }));
}

// GET - Listar sessões de estudo
export async function GET(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter parâmetros da requisição
    const { searchParams } = new URL(request.url);
    const completed = searchParams.get('completed');
    const upcoming = searchParams.get('upcoming') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    // Construir a consulta SQL
    let query = `
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
        CreatedAt
      FROM StudySessions
      WHERE UserId = @userId
    `;
    
    // Parâmetros da query
    const queryParams: any = { userId };
    
    // Adicionar filtro por status de conclusão
    if (completed !== null) {
      const completedBool = completed === 'true' || completed === '1';
      query += ` AND Completed = @completed`;
      queryParams.completed = completedBool ? 1 : 0;
    }
    
    // Adicionar filtro para sessões futuras
    if (upcoming) {
      query += ` AND ScheduledDate >= CAST(GETDATE() AS DATE)`;
    }
    
    // Ordenar por data agendada
    query += ` ORDER BY ScheduledDate`;
    
    // Adicionar limite
    if (limit) {
      query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
      queryParams.limit = limit;
    }
    
    // Executar a consulta
    const sessionsRaw = await executeQuery(query, queryParams);
    
    // Processar os dados antes de retornar
    const sessions = processStudySessions(sessionsRaw);
    
    return NextResponse.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Erro ao listar sessões de estudo:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar nova sessão de estudo
export async function POST(request: Request) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    const { 
      title, 
      disciplineName, 
      scheduledDate, 
      duration, 
      studyPlanId = null,
      notes = null
    } = await request.json();
    
    // Validar dados de entrada
    if (!title || !disciplineName || !scheduledDate || !duration) {
      return NextResponse.json(
        { error: 'Título, disciplina, data e duração são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Validar data
    const dateObj = new Date(scheduledDate);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: 'Data inválida. Use o formato ISO 8601 (ex: 2023-04-25T14:30:00Z)' },
        { status: 400 }
      );
    }
    
    // Validar duração (pelo menos 5 minutos)
    if (duration < 5) {
      return NextResponse.json(
        { error: 'A duração mínima é de 5 minutos' },
        { status: 400 }
      );
    }
    
    // Inserir nova sessão de estudo
    const result = await executeQuery(
      `INSERT INTO StudySessions 
        (UserId, StudyPlanId, Title, DisciplineName, ScheduledDate, Duration, Notes) 
       OUTPUT INSERTED.Id, INSERTED.UserId, INSERTED.StudyPlanId, INSERTED.Title, 
              INSERTED.DisciplineName, INSERTED.ScheduledDate, INSERTED.Duration, 
              INSERTED.Completed, INSERTED.ActualDuration, INSERTED.Notes, 
              INSERTED.CreatedAt, INSERTED.UpdatedAt
       VALUES (@userId, @studyPlanId, @title, @disciplineName, @scheduledDate, @duration, @notes)`,
      { 
        userId, 
        studyPlanId, 
        title, 
        disciplineName, 
        scheduledDate: dateObj.toISOString(), 
        duration, 
        notes 
      }
    );
    
    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao criar sessão de estudo' },
        { status: 500 }
      );
    }
    
    // Retornar dados da sessão criada
    const newSession = result[0];
    
    return NextResponse.json({
      success: true,
      session: newSession
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar sessão de estudo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 