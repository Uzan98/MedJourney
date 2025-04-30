import { NextResponse } from 'next/server';
import { executeQuery, executeQuerySingle } from '../../../../lib/db';

// Interface para disciplina
interface Discipline {
  Id: number;
  Name: string;
  Description: string;
  Theme?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

// GET - Obter uma disciplina específica
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: idParam } = params;
  
  try {
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const discipline = await executeQuerySingle(
      'SELECT Id, Name, Description, Theme, CreatedAt, UpdatedAt FROM Disciplines WHERE Id = @id',
      { id }
    ) as Discipline | null;

    if (!discipline) {
      return NextResponse.json(
        { error: 'Disciplina não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      discipline
    });
  } catch (error) {
    console.error(`Erro ao obter disciplina ${idParam}:`, error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar uma disciplina
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: idParam } = params;
  
  try {
    const id = parseInt(idParam);
    const { name, description, theme } = await request.json();

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Validar dados de entrada
    if (!name) {
      return NextResponse.json(
        { error: 'Nome da disciplina é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a disciplina existe
    const existingDiscipline = await executeQuerySingle(
      'SELECT Id FROM Disciplines WHERE Id = @id',
      { id }
    );

    if (!existingDiscipline) {
      return NextResponse.json(
        { error: 'Disciplina não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se o novo nome já existe (e não é desta disciplina)
    const nameExists = await executeQuerySingle(
      'SELECT Id FROM Disciplines WHERE Name = @name AND Id != @id',
      { name, id }
    );

    if (nameExists) {
      return NextResponse.json(
        { error: 'Já existe outra disciplina com este nome' },
        { status: 409 }
      );
    }

    // Atualizar disciplina
    await executeQuery(
      `UPDATE Disciplines 
       SET Name = @name, Description = @description, Theme = @theme, UpdatedAt = GETDATE()
       WHERE Id = @id`,
      { id, name, description: description || null, theme }
    );

    // Obter disciplina atualizada
    const updatedDiscipline = await executeQuerySingle(
      'SELECT Id, Name, Description, Theme, CreatedAt, UpdatedAt FROM Disciplines WHERE Id = @id',
      { id }
    ) as Discipline;

    return NextResponse.json({
      success: true,
      discipline: updatedDiscipline
    });
  } catch (error) {
    console.error(`Erro ao atualizar disciplina ${idParam}:`, error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir uma disciplina
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: idParam } = params;
  
  try {
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Verificar se a disciplina existe
    const existingDiscipline = await executeQuerySingle(
      'SELECT Id FROM Disciplines WHERE Id = @id',
      { id }
    );

    if (!existingDiscipline) {
      return NextResponse.json(
        { error: 'Disciplina não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se há assuntos relacionados (integridade referencial)
    const relatedSubjects = await executeQuery(
      'SELECT COUNT(*) as Count FROM Subjects WHERE DisciplineId = @id',
      { id }
    );

    if (relatedSubjects[0].Count > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir a disciplina pois há assuntos relacionados' },
        { status: 409 }
      );
    }

    // Excluir disciplina
    await executeQuery(
      'DELETE FROM Disciplines WHERE Id = @id',
      { id }
    );

    return NextResponse.json({
      success: true,
      message: 'Disciplina excluída com sucesso'
    });
  } catch (error) {
    console.error(`Erro ao excluir disciplina ${idParam}:`, error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 