import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeQuerySingle } from '../../../../../../lib/db';
import { Difficulty, Importance } from '@/types';

// Valores válidos para dificuldade
const validDifficulties = Object.values(Difficulty);

// Valores válidos para importância
const validImportances = Object.values(Importance);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; subjectId: string } }
) {
  const { id, subjectId } = params;
  
  try {
    // Extrair o ID da disciplina e do assunto dos parâmetros da rota
    const disciplineId = parseInt(id);
    const subjectIdNum = parseInt(subjectId);

    // Verificar se os IDs são válidos
    if (isNaN(disciplineId) || isNaN(subjectIdNum)) {
      return NextResponse.json(
        { error: 'ID de disciplina ou assunto inválido.' },
        { status: 400 }
      );
    }

    // Verificar se a disciplina existe
    const existingDiscipline = await executeQuerySingle(
      'SELECT Id FROM Disciplines WHERE Id = @disciplineId',
      { disciplineId }
    );

    if (!existingDiscipline) {
      return NextResponse.json(
        { error: 'Disciplina não encontrada.' },
        { status: 404 }
      );
    }

    // Verificar se o assunto existe e pertence à disciplina
    const existingSubject = await executeQuerySingle(
      'SELECT Id, Name FROM Subjects WHERE Id = @subjectId AND DisciplineId = @disciplineId',
      { subjectId: subjectIdNum, disciplineId }
    ) as { Id: number, Name: string } | null;

    if (!existingSubject) {
      return NextResponse.json(
        { error: 'Assunto não encontrado nesta disciplina.' },
        { status: 404 }
      );
    }

    // Extrair os dados do corpo da requisição
    const data = await request.json();
    const { name, difficulty, importance, estimatedHours, description } = data;

    // Verificar se a dificuldade é válida
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return NextResponse.json(
        { error: 'Nível de dificuldade inválido.' },
        { status: 400 }
      );
    }

    // Verificar se a importância é válida
    if (importance && !validImportances.includes(importance)) {
      return NextResponse.json(
        { error: 'Nível de importância inválido.' },
        { status: 400 }
      );
    }

    // Verificar se algum outro assunto com o mesmo nome já existe na disciplina
    if (name && name !== existingSubject.Name) {
      const duplicateSubject = await executeQuerySingle(
        'SELECT Id FROM Subjects WHERE Name = @name AND DisciplineId = @disciplineId AND Id != @subjectId',
        { name, disciplineId, subjectId: subjectIdNum }
      );

      if (duplicateSubject) {
        return NextResponse.json(
          { error: 'Já existe um assunto com este nome nesta disciplina.' },
          { status: 400 }
        );
      }
    }

    // Construir a query de atualização
    let updateQuery = 'UPDATE Subjects SET ';
    const updateParams: any = { subjectId: subjectIdNum };
    const updateFields: string[] = [];

    if (name) {
      updateFields.push('Name = @name');
      updateParams.name = name;
    }

    if (difficulty) {
      updateFields.push('Difficulty = @difficulty');
      updateParams.difficulty = difficulty;
    }

    if (importance) {
      updateFields.push('Importance = @importance');
      updateParams.importance = importance;
    }

    if (estimatedHours !== undefined) {
      updateFields.push('EstimatedHours = @estimatedHours');
      updateParams.estimatedHours = estimatedHours;
    }

    if (description !== undefined) {
      updateFields.push('Description = @description');
      updateParams.description = description;
    }

    // Adicionar a data de atualização
    updateFields.push('UpdatedAt = GETDATE()');

    // Finalizar a query
    updateQuery += updateFields.join(', ') + ' WHERE Id = @subjectId';

    // Executar a atualização
    await executeQuery(updateQuery, updateParams);

    // Obter o assunto atualizado
    const updatedSubject = await executeQuerySingle(
      `SELECT Id, DisciplineId, Name, Description, Difficulty, Importance, 
              EstimatedHours, CreatedAt, UpdatedAt 
       FROM Subjects 
       WHERE Id = @subjectId`,
      { subjectId: subjectIdNum }
    );

    // Retornar o assunto atualizado
    return NextResponse.json({ 
      success: true,
      subject: updatedSubject
    });
  } catch (error) {
    console.error('Erro ao atualizar assunto:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar assunto.' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir um assunto específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; subjectId: string } }
) {
  const { id, subjectId } = params;
  
  try {
    // Extrair o ID da disciplina e do assunto dos parâmetros da rota
    const disciplineId = parseInt(id);
    const subjectIdNum = parseInt(subjectId);

    // Verificar se os IDs são válidos
    if (isNaN(disciplineId) || isNaN(subjectIdNum)) {
      return NextResponse.json(
        { error: 'ID de disciplina ou assunto inválido.' },
        { status: 400 }
      );
    }

    // Verificar se a disciplina existe
    const existingDiscipline = await executeQuerySingle(
      'SELECT Id FROM Disciplines WHERE Id = @disciplineId',
      { disciplineId }
    );

    if (!existingDiscipline) {
      return NextResponse.json(
        { error: 'Disciplina não encontrada.' },
        { status: 404 }
      );
    }

    // Verificar se o assunto existe e pertence à disciplina
    const existingSubject = await executeQuerySingle(
      'SELECT Id FROM Subjects WHERE Id = @subjectId AND DisciplineId = @disciplineId',
      { subjectId: subjectIdNum, disciplineId }
    );

    if (!existingSubject) {
      return NextResponse.json(
        { error: 'Assunto não encontrado nesta disciplina.' },
        { status: 404 }
      );
    }

    // Excluir o assunto
    await executeQuery(
      'DELETE FROM Subjects WHERE Id = @subjectId AND DisciplineId = @disciplineId',
      { subjectId: subjectIdNum, disciplineId }
    );

    // Retornar resposta de sucesso
    return NextResponse.json({ 
      success: true,
      message: 'Assunto excluído com sucesso.'
    });
  } catch (error) {
    console.error('Erro ao excluir assunto:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir assunto.' },
      { status: 500 }
    );
  }
} 