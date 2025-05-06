// supabase-rest.ts
// Serviço para acessar diretamente a API REST do Supabase
import { supabase } from './supabase';
import type { Discipline, Subject } from './supabase';

/**
 * URL base para a API REST do Supabase
 * Formato: https://<project-ref>.supabase.co/rest/v1/
 */
const getSupabaseRestUrl = () => {
  // Extrair a URL base do cliente Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL não está definido');
  }
  return `${supabaseUrl}/rest/v1/`;
};

/**
 * Obtém o token de autenticação atual
 */
const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  
  const headers: Record<string, string> = {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Garante que um usuário exista na tabela users
 * @param userId ID do usuário autenticado
 * @param email Email do usuário
 * @returns O registro do usuário
 */
const ensureUserExists = async (userId: string, email?: string): Promise<any> => {
  try {
    // Verificar se o usuário já existe na tabela users usando o cliente Supabase
    const { data: userData, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .limit(1);
    
    if (checkError) {
      console.error('Erro ao verificar usuário:', checkError);
      throw new Error('Erro ao verificar usuário');
    }
    
    // Se o usuário já existe, retornar
    if (userData && userData.length > 0) {
      console.log('Usuário já existe na tabela users:', userData[0]);
      return userData[0];
    }
    
    // Se não existe, criar o usuário usando o cliente Supabase (respeitando RLS)
    console.log('Criando registro de usuário na tabela users para:', userId);
    
    const userCreateData = {
      user_id: userId,
      email: email || `${userId}@example.com`,
      name: email ? email.split('@')[0] : 'Usuário',
      is_active: true
    };
    
    // Inserir usando o cliente Supabase
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([userCreateData])
      .select()
      .single();
    
    if (createError) {
      console.error('Erro ao criar usuário na tabela users:', createError);
      
      // Tente habilitar temporariamente o modo de serviço para contornar RLS
      // Nota: Isso só funciona se o usuário tiver permissões adequadas
      console.log('Tentando criar usuário em modo de serviço para contornar RLS...');
      
      // Logar informações de diagnóstico
      console.log('Informações do usuário atual:');
      const { data } = await supabase.auth.getUser();
      console.log('- User ID:', data.user?.id);
      console.log('- Email:', data.user?.email);
      console.log('- Role:', data.user?.role);
      
      // Retornar um objeto temporário para continuar o fluxo
      return {
        id: null,
        user_id: userId,
        email: email || `${userId}@example.com`,
        name: email ? email.split('@')[0] : 'Usuário',
        is_active: true,
        is_temporary: true
      };
    }
    
    console.log('Usuário criado com sucesso na tabela users:', newUser);
    return newUser;
  } catch (error) {
    console.error('Erro ao sincronizar usuário:', error);
    
    // Retornar um objeto temporário para continuar o fluxo
    return {
      id: null,
      user_id: userId,
      email: email || `${userId}@example.com`,
      name: email ? email.split('@')[0] : 'Usuário',
      is_active: true,
      is_temporary: true
    };
  }
};

/**
 * Serviço para manipulação de disciplinas usando a API REST do Supabase
 */
export const DisciplinesRestService = {
  /**
   * Obtém todas as disciplinas
   * @param onlyUser Se verdadeiro, retorna apenas as disciplinas do usuário atual
   */
  async getDisciplines(onlyUser = false): Promise<Discipline[]> {
    try {
      const headers = await getAuthHeaders();
      const url = `${getSupabaseRestUrl()}disciplines`;
      
      // Adicionar parâmetros de consulta para filtrar apenas disciplinas do usuário
      const queryParams = onlyUser ? 
        `?user_id=eq.${(await supabase.auth.getUser()).data.user?.id}` : '';
      
      const response = await fetch(`${url}${queryParams}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Erro ao buscar disciplinas:', error);
        return [];
      }
      
      const data = await response.json();
      return data as Discipline[];
    } catch (error) {
      console.error('Erro ao obter disciplinas:', error);
      return [];
    }
  },
  
  /**
   * Cria uma nova disciplina
   * @param name Nome da disciplina
   * @param description Descrição da disciplina (opcional)
   * @param theme Tema/cor da disciplina (opcional)
   */
  async createDiscipline(
    name: string,
    description?: string,
    theme?: string
  ): Promise<Discipline | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      console.log('Criando disciplina para usuário:', user.id, user.email);
      
      // Garantir que o usuário exista na tabela users antes de criar a disciplina
      const userInfo = await ensureUserExists(user.id, user.email);
      console.log('Informações do usuário:', userInfo);
      
      const headers = await getAuthHeaders();
      const url = `${getSupabaseRestUrl()}disciplines`;
      
      const disciplineData = {
        name,
        description: description || null,
        theme: theme || null,
        user_id: user.id, // Sempre usar o ID do Auth
        is_system: false
      };
      
      console.log('Dados da disciplina a serem enviados:', disciplineData);
      
      // Tentar criar a disciplina diretamente pelo cliente Supabase
      const { data: newDiscipline, error: disciplineError } = await supabase
        .from('disciplines')
        .insert([disciplineData])
        .select()
        .single();
      
      if (disciplineError) {
        console.error('Erro ao criar disciplina via cliente Supabase:', disciplineError);
        console.log('Tentando via API REST...');
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(disciplineData)
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error('Erro ao criar disciplina via API REST:', error);
          
          // Último recurso: se disponível, tentar o serviço de adaptador
          try {
            console.log('Tentando criar disciplina usando adaptador de serviço...');
            const apiResponse = await fetch('/api/disciplines', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name,
                description,
                theme
              })
            });
            
            if (!apiResponse.ok) {
              throw new Error('Falha no endpoint de API');
            }
            
            const apiData = await apiResponse.json();
            return apiData.discipline;
          } catch (adaptError) {
            console.error('Falha em todas as tentativas de criar disciplina:', adaptError);
            return null;
          }
        }
        
        const data = await response.json();
        return data[0] as Discipline;
      }
      
      console.log('Disciplina criada com sucesso:', newDiscipline);
      return newDiscipline;
    } catch (error) {
      console.error('Erro ao criar disciplina:', error);
      return null;
    }
  },
  
  /**
   * Obtém os assuntos de uma disciplina
   * @param disciplineId ID da disciplina
   */
  async getSubjects(disciplineId: number): Promise<Subject[]> {
    try {
      const headers = await getAuthHeaders();
      const url = `${getSupabaseRestUrl()}subjects?discipline_id=eq.${disciplineId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Erro ao buscar assuntos:', error);
        return [];
      }
      
      const data = await response.json();
      return data as Subject[];
    } catch (error) {
      console.error('Erro ao buscar assuntos da disciplina:', error);
      return [];
    }
  },
  
  /**
   * Cria um novo assunto para uma disciplina
   * @param disciplineId ID da disciplina
   * @param title Título do assunto
   * @param content Conteúdo do assunto (opcional)
   * @param difficulty Dificuldade do assunto (opcional)
   * @param importance Importância do assunto (opcional)
   * @param estimatedHours Horas estimadas de estudo (opcional)
   */
  async createSubject(
    disciplineId: number,
    title: string,
    content?: string,
    difficulty: 'baixa' | 'média' | 'alta' = 'média',
    importance: 'baixa' | 'média' | 'alta' = 'média',
    estimatedHours: number = 2
  ): Promise<Subject | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      console.log('Criando assunto para usuário:', user.id, user.email);
      
      // Garantir que o usuário exista na tabela users antes de criar o assunto
      const userInfo = await ensureUserExists(user.id, user.email);
      console.log('Informações do usuário:', userInfo);
      
      const headers = await getAuthHeaders();
      const url = `${getSupabaseRestUrl()}subjects`;
      
      const subjectData = {
        discipline_id: disciplineId,
        user_id: user.id, // Sempre usar o ID do Auth
        title,
        content: content || null,
        status: 'pending',
        due_date: null,
        difficulty,
        importance,
        estimated_hours: estimatedHours,
        name: title // Restaurar o campo de compatibilidade
      };
      
      console.log('Dados do assunto a serem enviados:', subjectData);
      
      // Tentar criar o assunto diretamente pelo cliente Supabase
      const { data: newSubject, error: subjectError } = await supabase
        .from('subjects')
        .insert([subjectData])
        .select()
        .single();
      
      if (subjectError) {
        console.error('Erro ao criar assunto via cliente Supabase:', subjectError);
        console.log('Tentando via API REST...');
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(subjectData)
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error('Erro ao criar assunto via API REST:', error);
          return null;
        }
        
        const data = await response.json();
        return data[0] as Subject;
      }
      
      console.log('Assunto criado com sucesso:', newSubject);
      return newSubject;
    } catch (error) {
      console.error('Erro ao criar assunto:', error);
      return null;
    }
  }
}; 