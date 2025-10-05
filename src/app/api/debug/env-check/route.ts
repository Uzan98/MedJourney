import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verificar se é um ambiente de desenvolvimento ou se tem autorização admin
    const isDev = process.env.NODE_ENV === 'development';
    const authHeader = request.headers.get('authorization');
    const isAuthorized = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
    
    if (!isDev && !isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Lista de variáveis de ambiente necessárias para o sistema de flashcards
    const requiredEnvVars = [
      'GROQ_API_KEY',
      'SUPABASE_SERVICE_ROLE_KEY', 
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_APP_URL'
    ];

    const envStatus: Record<string, { exists: boolean; hasValue: boolean; length?: number }> = {};

    requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      envStatus[varName] = {
        exists: value !== undefined,
        hasValue: Boolean(value && value.trim().length > 0),
        length: value ? value.length : 0
      };
    });

    // Verificar se todas as variáveis necessárias estão configuradas
    const missingVars = requiredEnvVars.filter(varName => !envStatus[varName].hasValue);
    const allConfigured = missingVars.length === 0;

    return NextResponse.json({
      environment: process.env.NODE_ENV,
      allConfigured,
      missingVariables: missingVars,
      variableStatus: envStatus,
      timestamp: new Date().toISOString(),
      message: allConfigured 
        ? 'Todas as variáveis de ambiente necessárias estão configuradas'
        : `Variáveis faltando: ${missingVars.join(', ')}`
    });

  } catch (error: any) {
    console.error('Erro ao verificar variáveis de ambiente:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    }, { status: 500 });
  }
}