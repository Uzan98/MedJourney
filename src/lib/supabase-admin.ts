import { createClient } from '@supabase/supabase-js';

// URLs e chaves do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente Supabase com chave de serviço (bypassa RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Função para criar ou atualizar um usuário anônimo para desenvolvimento
 * Este usuário é usado quando estamos em modo de desenvolvimento sem autenticação
 */
export async function getOrCreateAnonUser() {
  try {
    // Verificar se o usuário anônimo já existe
    const { data: existingUser, error: getUserError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('user_id', 'anonymous')
      .single();
    
    if (getUserError && getUserError.code !== 'PGRST116') {
      console.error('Erro ao buscar usuário anônimo:', getUserError);
      return null;
    }
    
    if (existingUser) {
      console.log('Usuário anônimo encontrado:', existingUser.id);
      return existingUser;
    }
    
    // Criar usuário anônimo se não existir
    const { data: newUser, error: createUserError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          user_id: 'anonymous',
          name: 'Usuário Anônimo',
          email: 'anonymous@example.com',
          is_active: true
        }
      ])
      .select()
      .single();
    
    if (createUserError) {
      console.error('Erro ao criar usuário anônimo:', createUserError);
      return null;
    }
    
    console.log('Usuário anônimo criado:', newUser.id);
    return newUser;
  } catch (error) {
    console.error('Erro ao gerenciar usuário anônimo:', error);
    return null;
  }
}

/**
 * Função para executar uma consulta SQL direta 
 * (útil para contornar RLS quando absolutamente necessário)
 */
export async function executeSql(query: string, params: any[] = []) {
  try {
    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      query_text: query,
      query_params: params
    });
    
    if (error) {
      console.error('Erro ao executar SQL:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao executar SQL:', error);
    return { success: false, error };
  }
} 