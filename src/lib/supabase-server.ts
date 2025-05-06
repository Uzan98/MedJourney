import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Estas variáveis de ambiente precisam ser configuradas no arquivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Cria um cliente Supabase para o servidor que mantém a sessão do usuário
 * Importante: Deve ser usado APENAS no servidor (rotas de API, Server Components)
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Não queremos persistir sessão no servidor
      autoRefreshToken: false, // Token não deve ser renovado no servidor
      detectSessionInUrl: false,
    },
    // Passar cookies para manter a sessão do usuário
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });
}

/**
 * Cria um cliente Supabase específico para requests em middlewares e rotas API
 * que mantém a sessão do usuário através dos cookies da requisição
 */
export function createRequestSupabaseClient(request: NextRequest) {
  // Obter cookies do request
  const cookieHeader = request.headers.get('cookie') || '';
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        cookie: cookieHeader,
      },
    },
  });
} 