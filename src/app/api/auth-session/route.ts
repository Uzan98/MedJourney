import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createRequestSupabaseClient } from '@/lib/supabase-server';

// Configurar esta rota como dinâmica para evitar erros de renderização estática
export const dynamic = 'force-dynamic';

/**
 * Endpoint para verificar o estado da sessão de autenticação
 * Util para depurar problemas de autenticação
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG AUTH SESSION ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Supabase URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Verificar sessão via cliente Supabase do servidor
    const serverClient = createServerSupabaseClient();
    const { data: { session: serverSession }, error: serverError } = await serverClient.auth.getSession();
    
    // Tentar obter a sessão através do cliente de middleware (para comparação)
    const middlewareClient = createRequestSupabaseClient(request);
    const { data: { session: middlewareSession }, error: middlewareError } = await middlewareClient.auth.getSession();
    
    // Verificar cookies
    const cookieHeader = request.headers.get('cookie');
    const cookies = cookieHeader ? cookieHeader.split(';').map(c => c.trim()) : [];
    const authCookies = cookies.filter(c => c.startsWith('sb-'));
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      serverAuth: {
        isAuthenticated: !!serverSession,
        userId: serverSession?.user?.id,
        email: serverSession?.user?.email,
        hasSession: !!serverSession,
        error: serverError?.message
      },
      middlewareAuth: {
        isAuthenticated: !!middlewareSession,
        userId: middlewareSession?.user?.id,
        email: middlewareSession?.user?.email,
        hasSession: !!middlewareSession,
        error: middlewareError?.message
      },
      cookies: {
        header: cookieHeader,
        authCookies,
        count: cookies.length
      },
      request: {
        url: request.url,
        method: request.method
      },
      debug: {
        supabaseUrlExists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });
  } catch (error: any) {
    console.error('Erro ao verificar sessão:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro desconhecido',
      stack: error.stack
    }, { status: 500 });
  }
}