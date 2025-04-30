import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../../lib/db';

// Interface para disciplina
interface Discipline {
  Id: number;
  Name: string;
  Description: string;
  Theme?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

// GET - Listar todas as disciplinas
export async function GET(request: NextRequest) {
  try {
    // Em uma aplicação real, obter o userId do token de autenticação
    const userId = 1;
    
    // Obter parâmetros da requisição
    const { searchParams } = new URL(request.url);
    const onlyUser = searchParams.get('onlyUser') === 'true';
    
    // Query base
    let query = `
      SELECT Id, Name, Description, Theme, CreatedAt, UpdatedAt 
      FROM Disciplines
    `;
    
    const params: any = {};
    
    // Simplificando a lógica: se onlyUser for true, retornar apenas disciplinas
    // que começam com o prefixo "User:"
    if (onlyUser) {
      query += `
        WHERE Name LIKE @userPattern
      `;
      
      params.userPattern = 'User:%';
    }
    
    // Ordenar por nome
    query += ` ORDER BY Name`;
    
    const disciplines = await executeQuery(query, params) as Discipline[];

    console.log(`API disciplines: Retornando ${disciplines.length} disciplinas. onlyUser=${onlyUser}`);
    
    return NextResponse.json({
      success: true,
      disciplines
    });
  } catch (error) {
    console.error('Erro ao listar disciplinas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar nova disciplina
export async function POST(request: Request) {
  try {
    const { name, description, theme } = await request.json();

    // Validar dados de entrada
    if (!name) {
      return NextResponse.json(
        { error: 'Nome da disciplina é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se já existe uma disciplina com o mesmo nome
    const existingDisciplines = await executeQuery(
      'SELECT Id FROM Disciplines WHERE Name = @name',
      { name }
    );

    if (existingDisciplines.length > 0) {
      return NextResponse.json(
        { error: 'Já existe uma disciplina com este nome' },
        { status: 409 }
      );
    }

    // Inserir nova disciplina
    const result = await executeQuery(
      `INSERT INTO Disciplines (Name, Description, Theme) 
       OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Description, INSERTED.Theme, INSERTED.CreatedAt
       VALUES (@name, @description, @theme)`,
      { 
        name, 
        description: description || null,
        theme: theme || null
      }
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao criar disciplina' },
        { status: 500 }
      );
    }

    // Retornar dados da disciplina criada
    const newDiscipline = result[0];

    return NextResponse.json({
      success: true,
      discipline: newDiscipline
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar disciplina:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 