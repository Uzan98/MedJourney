import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Teste com cliente Supabase do cliente
    const { data: { session: clientSession }, error: clientError } = await supabase.auth.getSession();
    
    // Informações adicionais sobre a solicitação
    const headers = Object.fromEntries(request.headers);
    
    // Verificar se existe cookie de autenticação no cabeçalho
    const hasCookie = request.headers.get('cookie')?.includes('sb-');
    
    return NextResponse.json({
      success: true,
      clientAuth: {
        isAuthenticated: !!clientSession,
        userId: clientSession?.user?.id,
        email: clientSession?.user?.email,
        error: clientError?.message
      },
      request: {
        hasCookie,
        url: request.url,
        method: request.method,
      }
    });
  } catch (error: any) {
    console.error('Erro no teste de autenticação:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro desconhecido',
    }, { status: 500 });
  }
} 