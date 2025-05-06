import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createMiddlewareSupabaseClient } from '@/lib/supabase-server';

/**
 * Endpoint para verificar o estado da sessão de autenticação
 * Util para depurar problemas de autenticação
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar sessão via cliente Supabase padrão
    const { data: { session: clientSession }, error: clientError } = await supabase.auth.getSession();
    
    // Tentar obter a sessão através do cliente de middleware (para comparação)
    const res = NextResponse.next();
    const middlewareClient = createMiddlewareSupabaseClient(request, res);
    const { data: { session: middlewareSession }, error: middlewareError } = await middlewareClient.auth.getSession();
    
    // Verificar cookies
    const cookieHeader = request.headers.get('cookie');
    const cookies = cookieHeader ? cookieHeader.split(';').map(c => c.trim()) : [];
    const authCookies = cookies.filter(c => c.startsWith('sb-'));
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      clientAuth: {
        isAuthenticated: !!clientSession,
        userId: clientSession?.user?.id,
        email: clientSession?.user?.email,
        hasSession: !!clientSession,
        error: clientError?.message
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