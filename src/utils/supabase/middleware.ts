import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  try {
    // Criar uma resposta que preservaremos e modificaremos
    const response = NextResponse.next();
    
    // Criar cliente Supabase para o middleware usando os cookies da requisição
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        },
      }
    );
    
    // Atualizar sessão no Supabase - isso verifica e atualiza tokens se necessário
    const { data: { session } } = await supabase.auth.getSession();
    
    // Para fins de diagnóstico
    console.log(`Middleware Session Update: Session exists: ${!!session}`);
    if (session) {
      console.log(`Middleware Session Update: User ID: ${session.user.id}`);
    }
    
    return response;
  } catch (e) {
    // Para qualquer erro, continuamos com a requisição sem interrupção
    console.error('Error in middleware session update:', e);
    return NextResponse.next();
  }
} 