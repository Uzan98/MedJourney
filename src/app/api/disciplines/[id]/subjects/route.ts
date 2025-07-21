import { NextResponse } from 'next/server';
import { executeQuery } from '../../../../../lib/db';
import { Difficulty, Importance } from '@/types';

// Interface para assunto
interface Subject {
  Id: number;
  DisciplineId: number;
  Name: string;
  Description: string | null;
  Difficulty: string;
  Importance: string;
  EstimatedHours: number | null;
  CreatedAt: string;
  UpdatedAt: string;
}

// GET - Listar assuntos de uma disciplina
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    const disciplineId = parseInt(id);

    if (isNaN(disciplineId)) {
      return NextResponse.json(
        { error: 'ID de disciplina inválido' },
        { status: 400 }
      );
    }

    // Verificar se a disciplina existe
    const discipline = await executeQuery(
      'SELECT Id FROM Disciplines WHERE Id = @disciplineId',
      { disciplineId }
    );

    if (!discipline || discipline.length === 0) {
      return NextResponse.json(
        { error: 'Disciplina não encontrada' },
        { status: 404 }
      );
    }

    // Obter assuntos da disciplina
    const subjects = await executeQuery(
      `SELECT Id, DisciplineId, Name, Description, Difficulty, 
              Importance, EstimatedHours, CreatedAt, UpdatedAt 
       FROM Subjects 
       WHERE DisciplineId = @disciplineId 
       ORDER BY Name`,
      { disciplineId }
    ) as Subject[];

    return NextResponse.json({
      success: true,
      subjects
    });
  } catch (error) {
    console.error(`Erro ao listar assuntos da disciplina ${id}:`, error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar novo assunto em uma disciplina
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  try {
    const disciplineId = parseInt(id);
    const { 
      name, 
      description, 
      difficulty = 'média', 
      importance = 'média', 
      estimatedHours = 1 
    } = await request.json();

    if (isNaN(disciplineId)) {
      return NextResponse.json(
        { error: 'ID de disciplina inválido' },
        { status: 400 }
      );
    }

    // Validar dados de entrada
    if (!name) {
      return NextResponse.json(
        { error: 'Nome do assunto é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a disciplina existe
    const discipline = await executeQuery(
      'SELECT Id FROM Disciplines WHERE Id = @disciplineId',
      { disciplineId }
    );

    if (!discipline || discipline.length === 0) {
      return NextResponse.json(
        { error: 'Disciplina não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se o assunto já existe nesta disciplina
    const existingSubject = await executeQuery(
      'SELECT Id FROM Subjects WHERE DisciplineId = @disciplineId AND Name = @name',
      { disciplineId, name }
    );

    if (existingSubject && existingSubject.length > 0) {
      return NextResponse.json(
        { error: 'Já existe um assunto com este nome nesta disciplina' },
        { status: 409 }
      );
    }

    // Validar enums
    const validDifficulties = Object.values(Difficulty);
    const validImportances = Object.values(Importance);

    if (!validDifficulties.includes(difficulty)) {
      return NextResponse.json(
        { error: 'Dificuldade inválida. Use: baixa, média ou alta' },
        { status: 400 }
      );
    }

    if (!validImportances.includes(importance)) {
      return NextResponse.json(
        { error: 'Importância inválida. Use: baixa, média ou alta' },
        { status: 400 }
      );
    }

    // Inserir novo assunto
    const result = await executeQuery(
      `INSERT INTO Subjects (DisciplineId, Name, Description, Difficulty, Importance, EstimatedHours) 
       OUTPUT INSERTED.Id, INSERTED.DisciplineId, INSERTED.Name, INSERTED.Description, 
              INSERTED.Difficulty, INSERTED.Importance, INSERTED.EstimatedHours, 
              INSERTED.CreatedAt, INSERTED.UpdatedAt
       VALUES (@disciplineId, @name, @description, @difficulty, @importance, @estimatedHours)`,
      { 
        disciplineId, 
        name, 
        description: description || null, 
        difficulty, 
        importance, 
        estimatedHours 
      }
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao criar assunto' },
        { status: 500 }
      );
    }

    // Retornar dados do assunto criado
    const newSubject = result[0];

    return NextResponse.json({
      success: true,
      subject: newSubject
    }, { status: 201 });
  } catch (error) {
    console.error(`Erro ao criar assunto na disciplina ${id}:`, error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 