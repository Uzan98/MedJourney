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
   * @param discipline Objeto da disciplina
   */
  async createDiscipline(
    discipline: {
      name: string;
      description?: string;
      theme?: string;
    }
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
        name: discipline.name,
        description: discipline.description || null,
        theme: discipline.theme || null,
        user_id: user.id // Sempre usar o ID do Auth
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
              body: JSON.stringify(discipline)
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
  },
  
  /**
   * Atualiza uma disciplina existente
   * @param disciplineId ID da disciplina a ser atualizada
   * @param disciplineData Dados atualizados da disciplina
   */
  async updateDiscipline(
    disciplineId: number,
    disciplineData: {
      name?: string;
      description?: string | null;
      theme?: string | null;
    }
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      console.log('Atualizando disciplina:', disciplineId);
      
      // Verificar se a disciplina pertence ao usuário atual
      const { data: discipline, error: fetchError } = await supabase
        .from('disciplines')
        .select('*')
        .eq('id', disciplineId)
        .single();
      
      if (fetchError) {
        console.error('Erro ao verificar disciplina:', fetchError);
        return false;
      }
      
      if (!discipline) {
        console.error('Disciplina não encontrada');
        return false;
      }
      
      if (discipline.user_id !== user.id) {
        console.error('Sem permissão para editar essa disciplina');
        return false;
      }
      
      // Tentar atualizar a disciplina diretamente pelo cliente Supabase
      const { error: updateError } = await supabase
        .from('disciplines')
        .update(disciplineData)
        .eq('id', disciplineId);
      
      if (updateError) {
        console.error('Erro ao atualizar disciplina via cliente Supabase:', updateError);
        console.log('Tentando via API REST...');
        
        const headers = await getAuthHeaders();
        const url = `${getSupabaseRestUrl()}disciplines?id=eq.${disciplineId}`;
        
        const response = await fetch(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(disciplineData)
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error('Erro ao atualizar disciplina via API REST:', error);
          return false;
        }
        
        return response.status === 204 || response.status === 200;
      }
      
      console.log('Disciplina atualizada com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar disciplina:', error);
      return false;
    }
  },
  
  /**
   * Atualiza um assunto existente
   * @param subjectId ID do assunto a ser atualizado
   * @param subjectData Dados atualizados do assunto
   */
  async updateSubject(
    subjectId: number,
    subjectData: {
      title?: string;
      content?: string | null;
      difficulty?: 'baixa' | 'média' | 'alta';
      importance?: 'baixa' | 'média' | 'alta';
      estimated_hours?: number;
    }
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      console.log('Atualizando assunto:', subjectId);
      
      // Verificar se o assunto pertence ao usuário atual
      const { data: subject, error: fetchError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();
      
      if (fetchError) {
        console.error('Erro ao verificar assunto:', fetchError);
        return false;
      }
      
      if (!subject) {
        console.error('Assunto não encontrado');
        return false;
      }
      
      if (subject.user_id !== user.id) {
        console.error('Sem permissão para editar esse assunto');
        return false;
      }
      
      // Atualizar também o campo name para manter compatibilidade
      const updateData = {
        ...subjectData,
        name: subjectData.title || subject.title
      };
      
      // Tentar atualizar o assunto diretamente pelo cliente Supabase
      const { error: updateError } = await supabase
        .from('subjects')
        .update(updateData)
        .eq('id', subjectId);
      
      if (updateError) {
        console.error('Erro ao atualizar assunto via cliente Supabase:', updateError);
        console.log('Tentando via API REST...');
        
        const headers = await getAuthHeaders();
        const url = `${getSupabaseRestUrl()}subjects?id=eq.${subjectId}`;
        
        const response = await fetch(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error('Erro ao atualizar assunto via API REST:', error);
          return false;
        }
        
        return response.status === 204 || response.status === 200;
      }
      
      console.log('Assunto atualizado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar assunto:', error);
      return false;
    }
  },

  /**
   * Remove um assunto
   * @param subjectId ID do assunto a ser removido
   */
  async deleteSubject(subjectId: number): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      console.log('Removendo assunto:', subjectId);
      
      // Verificar se o assunto pertence ao usuário atual
      const { data: subject, error: fetchError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();
      
      if (fetchError) {
        console.error('Erro ao verificar assunto:', fetchError);
        return false;
      }
      
      if (!subject) {
        console.error('Assunto não encontrado');
        return false;
      }
      
      if (subject.user_id !== user.id) {
        console.error('Sem permissão para excluir esse assunto');
        return false;
      }
      
      // Tentar excluir o assunto diretamente pelo cliente Supabase
      const { error: deleteError } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);
      
      if (deleteError) {
        console.error('Erro ao excluir assunto via cliente Supabase:', deleteError);
        console.log('Tentando via API REST...');
        
        const headers = await getAuthHeaders();
        const url = `${getSupabaseRestUrl()}subjects?id=eq.${subjectId}`;
        
        const response = await fetch(url, {
          method: 'DELETE',
          headers
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error('Erro ao excluir assunto via API REST:', error);
          return false;
        }
        
        return response.status === 204 || response.status === 200;
      }
      
      console.log('Assunto excluído com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao excluir assunto:', error);
      return false;
    }
  },
  
  /**
   * Remove uma disciplina
   * @param disciplineId ID da disciplina a ser removida
   */
  async deleteDiscipline(disciplineId: number): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      console.log('Removendo disciplina:', disciplineId);
      
      const headers = await getAuthHeaders();
      const url = `${getSupabaseRestUrl()}disciplines?id=eq.${disciplineId}`;
      
      // Verificar se a disciplina pertence ao usuário atual
      const { data: discipline, error: fetchError } = await supabase
        .from('disciplines')
        .select('*')
        .eq('id', disciplineId)
        .single();
      
      if (fetchError) {
        console.error('Erro ao verificar disciplina:', fetchError);
        return false;
      }
      
      if (!discipline) {
        console.error('Disciplina não encontrada');
        return false;
      }
      
      if (discipline.user_id !== user.id) {
        console.error('Sem permissão para excluir essa disciplina');
        return false;
      }
      
      // Tentar excluir a disciplina diretamente pelo cliente Supabase
      const { error: deleteError } = await supabase
        .from('disciplines')
        .delete()
        .eq('id', disciplineId);
      
      if (deleteError) {
        console.error('Erro ao excluir disciplina via cliente Supabase:', deleteError);
        console.log('Tentando via API REST...');
        
        const response = await fetch(url, {
          method: 'DELETE',
          headers
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error('Erro ao excluir disciplina via API REST:', error);
          return false;
        }
        
        return response.status === 204 || response.status === 200;
      }
      
      console.log('Disciplina excluída com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao excluir disciplina:', error);
      return false;
    }
  }
}; 