import { NextResponse } from 'next/server';
import { executeQuery, executeQuerySingle } from '../../../../lib/db';
import crypto from 'crypto';

// Hash de senha simples para demonstração
// Em produção, use bcrypt ou argon2
function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // Validar dados de entrada
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o email já está em uso
    const existingUser = await executeQuerySingle(
      'SELECT Id FROM Users WHERE Email = @email',
      { email }
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está em uso' },
        { status: 409 }
      );
    }

    // Hash da senha
    const passwordHash = hashPassword(password);

    // Inserir novo usuário
    const result = await executeQuery(
      `INSERT INTO Users (Name, Email, PasswordHash) 
       OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Email, INSERTED.CreatedAt
       VALUES (@name, @email, @passwordHash)`,
      { name, email, passwordHash }
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      );
    }

    // Retornar dados do usuário criado (sem a senha)
    const newUser = result[0];

    return NextResponse.json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 