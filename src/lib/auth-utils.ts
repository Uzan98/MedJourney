import { supabase, supabaseClient } from '@/lib/supabase';

/**
 * Obtém o token de acesso do usuário autenticado
 * @returns Promise<string | null> - Token de acesso ou null se não autenticado
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    console.log('🔍 getAccessToken: Iniciando obtenção do token...');
    
    const client = supabase || supabaseClient;
    
    if (!client) {
      console.error('❌ getAccessToken: Cliente Supabase não inicializado');
      return null;
    }

    console.log('✅ getAccessToken: Cliente Supabase inicializado');

    const { data: { session }, error } = await client.auth.getSession();
    
    if (error) {
      console.error('❌ getAccessToken: Erro ao obter sessão:', error);
      return null;
    }

    if (!session) {
      console.error('❌ getAccessToken: Nenhuma sessão ativa encontrada');
      return null;
    }

    console.log('✅ getAccessToken: Sessão encontrada, user ID:', session.user?.id);
    console.log('✅ getAccessToken: Token obtido com sucesso');

    return session.access_token;
  } catch (error) {
    console.error('❌ getAccessToken: Erro ao obter token de acesso:', error);
    return null;
  }
}

/**
 * Verifica se o usuário está autenticado
 * @returns Promise<boolean> - true se autenticado, false caso contrário
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

/**
 * Obtém o ID do usuário autenticado
 * @returns Promise<string | null> - ID do usuário ou null se não autenticado
 */
export async function getCurrentUserId(): Promise<string | null> {
  // Usar supabaseClient como fallback se supabase for null
  const client = supabase || supabaseClient;
  
  if (!client) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    return session?.user?.id || null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
}
