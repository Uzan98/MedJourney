import { supabase } from '@/lib/supabase';

/**
 * Obtém o token de acesso do usuário autenticado
 * @returns Promise<string | null> - Token de acesso ou null se não autenticado
 */
export async function getAccessToken(): Promise<string | null> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting access token:', error);
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
  if (!supabase) {
    console.error('Supabase client not initialized');
    return null;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
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