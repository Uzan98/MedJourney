import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Configurar esta rota como dinâmica para evitar erros de renderização estática
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Teste de autenticação com cliente Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Verificar cookies
    const cookieHeader = request.headers.get('cookie');
    const cookies = cookieHeader ? cookieHeader.split(';').map(c => c.trim()) : [];
    const authCookies = cookies.filter(c => c.startsWith('sb-'));
    
    // Obter outros cabeçalhos úteis
    const userAgent = request.headers.get('user-agent');
    const referer = request.headers.get('referer');
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      auth: {
        isAuthenticated: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        hasSession: !!session,
        error: error?.message
      },
      request: {
        url: request.url,
        method: request.method,
        referer,
        userAgent
      },
      cookies: {
        header: cookieHeader,
        authCookies,
        allCookies: cookies
      }
    });
  } catch (error: any) {
    console.error('Erro na depuração de autenticação:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro desconhecido',
      stack: error.stack
    }, { status: 500 });
  }
} 