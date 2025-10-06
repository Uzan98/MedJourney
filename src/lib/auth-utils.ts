import { supabase, supabaseClient } from '@/lib/supabase';

// Cache para o token de acesso
let tokenCache: {
  token: string | null;
  timestamp: number;
  userId: string | null;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em millisegundos

/**
 * Obtém o token de acesso do usuário autenticado com cache para evitar chamadas repetidas
 * @returns Promise<string | null> - Token de acesso ou null se não autenticado
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    // Verificar se temos um token válido no cache
    if (tokenCache && 
        tokenCache.token && 
        (Date.now() - tokenCache.timestamp) < CACHE_DURATION) {
      console.log('🔄 getAccessToken: Usando token do cache');
      return tokenCache.token;
    }

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
      // Limpar cache em caso de erro
      tokenCache = null;
      return null;
    }

    if (!session) {
      console.error('❌ getAccessToken: Nenhuma sessão ativa encontrada');
      // Limpar cache se não há sessão
      tokenCache = null;
      return null;
    }

    console.log('✅ getAccessToken: Sessão encontrada, user ID:', session.user?.id);
    console.log('✅ getAccessToken: Token obtido com sucesso');

    // Atualizar cache
    tokenCache = {
      token: session.access_token,
      timestamp: Date.now(),
      userId: session.user?.id || null
    };

    return session.access_token;
  } catch (error) {
    console.error('❌ getAccessToken: Erro ao obter token de acesso:', error);
    // Limpar cache em caso de erro
    tokenCache = null;
    return null;
  }
}

/**
 * Limpa o cache do token de acesso (útil para logout ou mudança de usuário)
 */
export function clearTokenCache(): void {
  tokenCache = null;
  console.log('🧹 getAccessToken: Cache do token limpo');
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
