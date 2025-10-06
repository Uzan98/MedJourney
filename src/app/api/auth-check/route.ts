import { NextRequest, NextResponse } from 'next/server';

// Configurar esta rota como dinâmica
export const dynamic = 'force-dynamic';

/**
 * Endpoint alternativo para verificar autenticação usando REST API do Supabase
 * Mais confiável que os clientes JavaScript
 */
export async function GET(request: NextRequest) {
  try {
    console.log('=== AUTH CHECK REST API ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Environment:', process.env.NODE_ENV);
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'Variáveis de ambiente do Supabase não configuradas',
        debug: {
          supabaseUrlExists: !!supabaseUrl,
          supabaseAnonKeyExists: !!supabaseAnonKey
        }
      }, { status: 500 });
    }
    
    // Obter cookies de autenticação
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const authCookies = cookies.filter(c => c.startsWith('sb-'));
    
    // Tentar obter token de acesso dos cookies
    let accessToken = null;
    for (const cookie of authCookies) {
      if (cookie.includes('access_token')) {
        try {
          const cookieValue = cookie.split('=')[1];
          const decoded = decodeURIComponent(cookieValue);
          const parsed = JSON.parse(decoded);
          accessToken = parsed.access_token;
          break;
        } catch (e) {
          // Continuar tentando outros cookies
        }
      }
    }
    
    // Se não encontrou token nos cookies, tentar no Authorization header
    if (!accessToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }
    
    let userInfo = null;
    let authError = null;
    
    if (accessToken) {
      try {
        // Fazer chamada REST para verificar o usuário
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          userInfo = await response.json();
        } else {
          const errorData = await response.text();
          authError = `HTTP ${response.status}: ${errorData}`;
        }
      } catch (error: any) {
        authError = `Fetch error: ${error.message}`;
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      authentication: {
        hasAccessToken: !!accessToken,
        isAuthenticated: !!userInfo,
        userId: userInfo?.id,
        email: userInfo?.email,
        error: authError
      },
      cookies: {
        header: cookieHeader,
        authCookies: authCookies.length,
        authCookiesList: authCookies
      },
      debug: {
        supabaseUrl,
        supabaseAnonKeyExists: !!supabaseAnonKey,
        method: 'REST_API'
      }
    });
    
  } catch (error: any) {
    console.error('Erro no auth-check:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro desconhecido',
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}