import { supabase } from './supabase';

/**
 * Interface para representar resultados de consultas
 */
interface QueryResult<T = any> {
  success: boolean;
  data?: T[];
  error?: string;
  offline_mode?: boolean;
}

/**
 * Obtém o ID do usuário atual da sessão Supabase
 * @returns Promise com o ID do usuário ou null
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return null;
  }
}

/**
 * Executa uma consulta e retorna múltiplas linhas
 * NOTA: Esta função é um adaptador para manter compatibilidade com código existente
 * que usava o Azure SQL. Ela traduz as consultas SQL para chamadas do Supabase.
 * 
 * @param query Consulta SQL (será analisada para determinar a operação Supabase equivalente)
 * @param params Parâmetros da consulta (serão extraídos os valores relevantes)
 * @returns Resultado da consulta formatado para compatibilidade
 */
export async function executeQuery(query: string, params?: any): Promise<QueryResult> {
  console.log('[db-adapter] Executando consulta', { query, params });
  
  try {
    // Simula a conexão offline para desenvolvimento, se necessário
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_OFFLINE === 'true') {
      console.log('[db-adapter] Modo offline simulado ativado');
      return { 
        success: true, 
        data: [], 
        offline_mode: true 
      };
    }

    // Obter o usuário atual para autenticação RLS
    const userId = await getCurrentUserId();
    console.log('[db-adapter] ID do usuário atual:', userId);
    
    // Determinar o tipo de consulta com base no texto SQL
    if (query.toLowerCase().includes('from disciplines')) {
      // Obtém todas as disciplinas (independente do usuário)
      const { data, error } = await supabase
        .from('disciplines')
        .select('*');

      if (error) {
        console.error('[db-adapter] Erro ao consultar disciplinas:', error);
        throw error;
      }
      
      console.log('[db-adapter] Disciplinas encontradas:', data?.length || 0);
      
      return {
        success: true,
        data: data.map(d => ({
          Id: d.id,
          Name: d.name,
          Description: d.description,
          Theme: d.theme,
          UserId: d.user_id,
          CreatedAt: d.created_at,
          UpdatedAt: d.updated_at
        }))
      };
    } 
    else if (query.toLowerCase().includes('insert into disciplines')) {
      // Extrair informações da inserção
      const name = params?.name;
      const description = params?.description || null;
      const theme = params?.theme || null;
      
      if (!name) {
        throw new Error('Nome da disciplina é obrigatório');
      }
      
      console.log('[db-adapter] Inserindo disciplina:', { name, user_id: userId });
      
      // Inserir disciplina com o userId atual
      const { data, error } = await supabase
        .from('disciplines')
        .insert([{
          name,
          description,
          theme,
          user_id: userId || 'anonymous', // Usar ID anônimo se não houver usuário
          is_system: false
        }])
        .select();
      
      if (error) {
        console.error('[db-adapter] Erro ao inserir disciplina:', error);
        throw error;
      }
      
      console.log('[db-adapter] Disciplina criada com sucesso:', data?.[0]?.id);
      
      return {
        success: true,
        data: data.map(d => ({
          Id: d.id,
          Name: d.name,
          Description: d.description,
          Theme: d.theme,
          UserId: d.user_id,
          CreatedAt: d.created_at,
          UpdatedAt: d.updated_at
        }))
      };
    }
    else if (query.toLowerCase().includes('from subjects')) {
      // Extrai o ID da disciplina do parâmetro, se existir
      let disciplineId = null;
      if (params && typeof params === 'object' && params.disciplineId) {
        disciplineId = params.disciplineId;
      }

      // Se tiver disciplineId, filtra os subjects por disciplina
      let queryBuilder = supabase.from('subjects').select('*');
      
      if (disciplineId) {
        queryBuilder = queryBuilder.eq('discipline_id', disciplineId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('[db-adapter] Erro ao consultar assuntos:', error);
        throw error;
      }
      
      console.log('[db-adapter] Assuntos encontrados:', data?.length || 0);
      
      return {
        success: true,
        data: data.map(s => ({
          Id: s.id,
          DisciplineId: s.discipline_id,
          Title: s.title || s.name,  // Compatibilidade
          Name: s.name || s.title,   // Compatibilidade
          Content: s.content || s.description, // Compatibilidade
          Description: s.description || s.content, // Compatibilidade
          Status: s.status,
          DueDate: s.due_date,
          UserId: s.user_id,
          CreatedAt: s.created_at,
          UpdatedAt: s.updated_at
        }))
      };
    }
    else if (query.toLowerCase().includes('insert into subjects')) {
      // Extrair informações da inserção
      const disciplineId = params?.disciplineId;
      const title = params?.title || params?.name;
      const content = params?.content || params?.description || null;
      const status = params?.status || 'pending';
      const dueDate = params?.dueDate || null;
      
      if (!disciplineId || !title) {
        throw new Error('ID da disciplina e título são obrigatórios');
      }
      
      console.log('[db-adapter] Inserindo assunto:', { title, discipline_id: disciplineId, user_id: userId });
      
      // Inserir subject com o userId atual
      const { data, error } = await supabase
        .from('subjects')
        .insert([{
          discipline_id: disciplineId,
          title,
          content,
          status,
          due_date: dueDate,
          user_id: userId || 'anonymous', // Usar ID anônimo se não houver usuário
        }])
        .select();
      
      if (error) {
        console.error('[db-adapter] Erro ao inserir assunto:', error);
        throw error;
      }
      
      console.log('[db-adapter] Assunto criado com sucesso:', data?.[0]?.id);
      
      return {
        success: true,
        data: data.map(s => ({
          Id: s.id,
          DisciplineId: s.discipline_id,
          Title: s.title,
          Name: s.title, // Compatibilidade
          Content: s.content,
          Description: s.content, // Compatibilidade
          Status: s.status,
          DueDate: s.due_date,
          UserId: s.user_id,
          CreatedAt: s.created_at,
          UpdatedAt: s.updated_at
        }))
      };
    }
    else {
      // Consulta não reconhecida
      console.warn('[db-adapter] Consulta não reconhecida:', query);
      return {
        success: false,
        error: 'Consulta não reconhecida'
      };
    }
  } catch (err) {
    console.error('[db-adapter] Erro ao processar consulta:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
}

/**
 * Executa uma consulta e retorna uma única linha
 * @param query Consulta SQL
 * @param params Parâmetros da consulta
 * @returns Resultado da consulta (única linha)
 */
export async function executeQuerySingle(query: string, params?: any): Promise<QueryResult> {
  try {
    const result = await executeQuery(query, params);
    
    if (!result.success) return result;
    
    return {
      ...result,
      data: result.data?.length ? [result.data[0]] : []
    };
  } catch (err) {
    console.error('[db-adapter] Erro ao processar consulta single:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
} 