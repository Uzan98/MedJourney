import { NextResponse } from 'next/server';
import { executeQuery, executeQuerySingle } from '../../../lib/db';
import crypto from 'crypto';

// Interface para o objeto de usuário
interface User {
  Id: number;
  Name: string;
  Email: string;
  PasswordHash: string;
  [key: string]: any; // Para outras propriedades possíveis
}

// Hash de senha simples para demonstração
// Em produção, use bcrypt ou argon2
function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
}

// Handler para login de usuário
export async function POST(request: Request) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }
  const { supabase } = await import('@/lib/supabase');

  try {
    const { email, password } = await request.json();

    // Validar dados de entrada
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar usuário por email
    const user = await executeQuerySingle(
      'SELECT Id, Name, Email, PasswordHash FROM Users WHERE Email = @email',
      { email }
    ) as User | null;

    // Verificar se o usuário existe
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verificar senha
    const hashedPassword = hashPassword(password);
    if (user.PasswordHash !== hashedPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Remover senha do objeto de resposta
    delete user.PasswordHash;

    // Em uma implementação real, gere um token JWT aqui
    // e configure cookies httpOnly

    return NextResponse.json({
      success: true,
      user,
      // token: generatedToken
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 