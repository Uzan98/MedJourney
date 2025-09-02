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
      
      let queryParams = '';
      if (onlyUser) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData.user) {
          console.error('Usuário não autenticado:', userError);
          return [];
        }
        
        queryParams = `?user_id=eq.${userData.user.id}`;
      }
      
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
      // Verificar se o cliente Supabase está disponível
      if (!supabase) {
        console.error('Cliente Supabase não está disponível');
        throw new Error('Cliente Supabase não inicializado');
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      console.log('Criando disciplina para usuário:', user.id, user.email);
      
      // Garantir que o usuário exista na tabela users antes de criar a disciplina
      const userInfo = await ensureUserExists(user.id, user.email);
      console.log('Informações do usuário:', userInfo);
      
      // Verificar limites de assinatura antes de criar disciplina
      try {
        // Primeiro, contar as disciplinas existentes do usuário
        const { count: disciplinesCount, error: countError } = await supabase
          .from('disciplines')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
          
        if (countError) {
          console.error('Erro ao contar disciplinas:', countError);
          throw new Error('Não foi possível verificar o número atual de disciplinas');
        }
        
        // Buscar os limites do usuário usando a API
        const limitsResponse = await fetch('/api/subscription', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        if (!limitsResponse.ok) {
          throw new Error('Não foi possível obter os limites de assinatura');
        }
        
        const userLimits = await limitsResponse.json();
        
        // Verificar se o usuário atingiu o limite
        if (userLimits.disciplinesLimit !== -1 && 
            disciplinesCount && disciplinesCount >= userLimits.disciplinesLimit) {
          console.error(`Limite de disciplinas atingido. Atual: ${disciplinesCount}, Limite: ${userLimits.disciplinesLimit}`);
          throw new Error(`LIMIT_REACHED:${userLimits.disciplinesLimit}`);
        }
      } catch (limitError: any) {
        console.error('Erro ao verificar limites de assinatura:', limitError);
        
        // Verificar se é um erro de limite atingido
        if (limitError.message && limitError.message.startsWith('LIMIT_REACHED:')) {
          // Tentar criar via API para obter uma resposta mais detalhada
          try {
            console.log('Tentando criar via API para obter resposta detalhada sobre limites...');
            const apiResponse = await fetch('/api/disciplines', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(discipline)
            });
            
            if (!apiResponse.ok) {
              const apiError = await apiResponse.json();
              console.error('Resposta da API sobre limite:', apiError);
              
              // Se for erro de limite, lançar erro formatado
              if (apiError.limitReached) {
                throw new Error(`Você atingiu o limite de ${apiError.limit} disciplinas do seu plano atual. Para adicionar mais disciplinas, faça upgrade do seu plano em /perfil/assinatura.`);
              }
              
              throw new Error(apiError.error || 'Erro ao criar disciplina');
            }
          } catch (apiError: any) {
            console.error('Erro ao verificar limites via API:', apiError);
            throw apiError;
          }
        }
        
        // Não bloquear completamente, tentar criar via API que tem sua própria verificação
        console.log('Tentando criar via API que tem verificação de limites própria...');
      }
      
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
              const apiError = await apiResponse.json();
              console.error('Erro na API:', apiError);
              throw new Error(apiError.error || 'Falha no endpoint de API');
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
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;
      
      if (!userId) {
        console.log('Usuário não autenticado');
        return [];
      }
      
      const url = `${getSupabaseRestUrl()}subjects?discipline_id=eq.${disciplineId}&user_id=eq.${userId}`;
      
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
   * Configura uma disciplina como acadêmica com dados de controle de faltas
   * @param disciplineId ID da disciplina
   * @param academicData Dados acadêmicos da disciplina
   */
  async setDisciplineAsAcademic(
    disciplineId: number,
    academicData: {
      semester_start_date: string;
      semester_end_date: string;
      weekly_frequency: number;
      minimum_attendance_percentage: number;
      class_schedule?: any;
    }
  ): Promise<Discipline | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Primeiro, buscar a disciplina para obter o nome
      const { data: discipline, error: disciplineError } = await supabase
        .from('disciplines')
        .select('name')
        .eq('id', disciplineId)
        .eq('user_id', user.id)
        .single();
      
      if (disciplineError || !discipline) {
        console.error('Erro ao buscar disciplina:', disciplineError);
        return null;
      }
      
      console.log('🔍 Verificando se já existe academic_subject para disciplina:', {
        disciplineId,
        userId: user.id,
        disciplineName: discipline.name
      });
      
      // Verificar se já existe um academic_subject para esta disciplina
      // Usando .limit(1) ao invés de .single() para evitar erro PGRST116 com duplicatas
      const { data: existingAcademicSubjects, error: checkError } = await supabase
        .from('academic_subjects')
        .select('id, name, created_at')
        .eq('discipline_id', disciplineId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10); // Buscar até 10 para detectar duplicatas
      
      console.log('📊 Resultado da verificação:', {
        existingAcademicSubjects,
        checkError,
        count: existingAcademicSubjects?.length || 0
      });
      
      // Se encontrou múltiplos registros, limpar duplicatas
      if (existingAcademicSubjects && existingAcademicSubjects.length > 1) {
        console.log('⚠️ Detectadas duplicatas de academic_subject. Limpando...');
        await this.cleanDuplicateAcademicSubjects(disciplineId, user.id);
        
        // Buscar novamente após limpeza
        const { data: cleanedSubjects } = await supabase
          .from('academic_subjects')
          .select('id, name')
          .eq('discipline_id', disciplineId)
          .eq('user_id', user.id)
          .limit(1);
        
        var existingAcademicSubject = cleanedSubjects?.[0] || null;
      } else {
        var existingAcademicSubject = existingAcademicSubjects?.[0] || null;
      }
      
      // Se não existe, criar o academic_subject
      if (!existingAcademicSubject) {
        console.log('➕ Criando novo academic_subject...');
        
        // Calcular total de aulas e faltas permitidas
        const startDate = new Date(academicData.semester_start_date);
        const endDate = new Date(academicData.semester_end_date);
        const weeksDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
        const totalClasses = weeksDiff * academicData.weekly_frequency;
        const allowedAbsences = Math.floor(totalClasses * (1 - academicData.minimum_attendance_percentage / 100));
        
        const academicSubjectData = {
          user_id: user.id,
          discipline_id: disciplineId,
          name: discipline.name,
          start_date: academicData.semester_start_date,
          end_date: academicData.semester_end_date,
          weekly_frequency: academicData.weekly_frequency,
          days_of_week: ['segunda', 'terça', 'quarta', 'quinta', 'sexta'].slice(0, academicData.weekly_frequency),
          approval_percentage: academicData.minimum_attendance_percentage,
          class_duration: 60, // Duração padrão de 60 minutos
          total_classes: totalClasses,
          allowed_absences: allowedAbsences
        };
        
        console.log('📝 Dados do academic_subject a ser criado:', academicSubjectData);
        
        const { data: createdAcademicSubject, error: academicSubjectError } = await supabase
          .from('academic_subjects')
          .insert(academicSubjectData)
          .select('id, name, discipline_id')
          .single();
        
        if (academicSubjectError) {
          console.error('❌ Erro ao criar academic_subject:', academicSubjectError);
          return null;
        }
        
        console.log('✅ Academic subject criado com sucesso:', createdAcademicSubject);
      } else {
        console.log('ℹ️ Academic subject já existe:', existingAcademicSubject);
      }
      
      // Atualizar a disciplina como acadêmica
      const updateData = {
        ...academicData,
        is_academic: true
      };
      
      const { data: updatedDiscipline, error } = await supabase
        .from('disciplines')
        .update(updateData)
        .eq('id', disciplineId)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao configurar disciplina como acadêmica:', error);
        return null;
      }
      
      return updatedDiscipline;
    } catch (error) {
      console.error('Erro ao configurar disciplina acadêmica:', error);
      return null;
    }
  },
  
  /**
   * Obtém estatísticas de frequência de uma disciplina
   * @param disciplineId ID da disciplina
   */
  async getDisciplineAttendanceStats(disciplineId: number): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      const { data, error } = await supabase
        .rpc('get_discipline_attendance_stats', {
          discipline_id: disciplineId,
          user_id_param: user.id
        });
      
      if (error) {
        console.error('Erro ao obter estatísticas de frequência:', error);
        return null;
      }
      
      return data?.[0] || null;
    } catch (error) {
      console.error('Erro ao obter estatísticas de frequência:', error);
      return null;
    }
  },
  
  /**
   * Calcula faltas permitidas para uma disciplina
   * @param disciplineId ID da disciplina
   */
  async calculateAllowedAbsences(disciplineId: number): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_allowed_absences', {
          discipline_id: disciplineId
        });
      
      if (error) {
        console.error('Erro ao calcular faltas permitidas:', error);
        return 0;
      }
      
      return data || 0;
    } catch (error) {
      console.error('Erro ao calcular faltas permitidas:', error);
      return 0;
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
  },

  /**
   * Limpa registros duplicados de academic_subjects para uma disciplina
   * @param disciplineId ID da disciplina
   * @param userId ID do usuário
   */
  async cleanDuplicateAcademicSubjects(disciplineId: number, userId: string): Promise<void> {
    try {
      console.log('🧹 Iniciando limpeza de duplicatas para disciplina:', disciplineId);
      
      // Buscar todos os academic_subjects duplicados
      const { data: duplicates, error } = await supabase
        .from('academic_subjects')
        .select('id, created_at')
        .eq('discipline_id', disciplineId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar duplicatas:', error);
        return;
      }
      
      if (!duplicates || duplicates.length <= 1) {
        console.log('✅ Nenhuma duplicata encontrada');
        return;
      }
      
      // Manter o mais recente (primeiro da lista ordenada) e remover os outros
      const toKeep = duplicates[0];
      const toDelete = duplicates.slice(1);
      
      console.log(`🗑️ Removendo ${toDelete.length} duplicatas, mantendo ID ${toKeep.id}`);
      
      // Remover duplicatas
      for (const duplicate of toDelete) {
        const { error: deleteError } = await supabase
          .from('academic_subjects')
          .delete()
          .eq('id', duplicate.id);
        
        if (deleteError) {
          console.error(`❌ Erro ao remover duplicata ${duplicate.id}:`, deleteError);
        } else {
          console.log(`✅ Duplicata ${duplicate.id} removida`);
        }
      }
      
      console.log('🧹 Limpeza de duplicatas concluída');
    } catch (error) {
      console.error('❌ Erro durante limpeza de duplicatas:', error);
    }
  }
};