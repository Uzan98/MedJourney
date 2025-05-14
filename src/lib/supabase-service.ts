import { supabase, User, Discipline, Subject } from './supabase';

/**
 * Serviço para lidar com operações no Supabase
 */
class SupabaseService {
  /**
   * Verifica se é possível conectar ao banco de dados
   */
  async canConnect(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      console.error('Erro ao conectar ao Supabase:', error);
      return false;
    }
  }

  /**
   * Obtém um usuário pelo ID ou cria um novo usuário
   * @param userId ID do usuário
   * @param name Nome do usuário (opcional)
   * @param email Email do usuário (opcional)
   */
  async getOrCreateUser(userId: string, name?: string, email?: string): Promise<User | null> {
    try {
      if (!userId) {
        console.error('UserId não fornecido');
        return null;
      }

      // Tentar obter o usuário pelo user_id
      const { data: existingUsers, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (fetchError) {
        console.error('Erro ao buscar usuário:', fetchError);
        return null;
      }

      // Se o usuário já existir, retorná-lo
      if (existingUsers && existingUsers.length > 0) {
        console.log('Usuário existente encontrado:', existingUsers[0]);
        return existingUsers[0] as User;
      }

      // Se não existe, criar novo usuário
      console.log('Criando novo usuário para:', { userId, name, email });
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            user_id: userId,
            name: name || 'Usuário',
            email: email || `${userId}@example.com`,
            is_active: true
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('Erro ao criar usuário:', createError);
        return null;
      }

      console.log('Novo usuário criado:', newUser);
      return newUser as User;
    } catch (error) {
      console.error('Erro ao obter ou criar usuário:', error);
      return null;
    }
  }

  /**
   * Obtém ou cria um usuário de teste para desenvolvimento
   */
  async getOrCreateTestUser(): Promise<User | null> {
    const testUserId = 'user_test123'; // ID único para o usuário de teste
    return this.getOrCreateUser(testUserId, 'Usuário Teste', 'teste@example.com');
  }

  /**
   * Obtém as disciplinas de um usuário
   * @param userId ID do usuário
   */
  async getUserDisciplines(userId: string): Promise<Discipline[]> {
    try {
      const { data, error } = await supabase
        .from('disciplines')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar disciplinas:', error);
        return [];
      }

      return data as Discipline[] || [];
    } catch (error) {
      console.error('Erro ao buscar disciplinas do usuário:', error);
      return [];
    }
  }

  /**
   * Cria uma nova disciplina
   * @param userId ID do usuário
   * @param name Nome da disciplina
   * @param description Descrição da disciplina (opcional)
   * @param theme Tema/cor da disciplina (opcional)
   */
  async createDiscipline(
    userId: string,
    name: string,
    description?: string,
    theme?: string
  ): Promise<Discipline | null> {
    try {
      const { data, error } = await supabase
        .from('disciplines')
        .insert([
          {
            name,
            description,
            theme,
            user_id: userId
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar disciplina:', error);
        return null;
      }

      return data as Discipline;
    } catch (error) {
      console.error('Erro ao criar disciplina:', error);
      return null;
    }
  }

  /**
   * Obtém os assuntos de uma disciplina
   * @param disciplineId ID da disciplina
   */
  async getSubjects(disciplineId: number): Promise<Subject[]> {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('discipline_id', disciplineId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar assuntos:', error);
        return [];
      }

      return data as Subject[] || [];
    } catch (error) {
      console.error('Erro ao buscar assuntos da disciplina:', error);
      return [];
    }
  }

  /**
   * Cria um novo assunto
   * @param disciplineId ID da disciplina
   * @param userId ID do usuário
   * @param data Dados do assunto
   */
  async createSubject(
    disciplineId: number,
    userId: string,
    data: {
      title: string;
      content?: string;
      status?: string;
      due_date?: string | Date;
    }
  ): Promise<Subject | null> {
    try {
      const { data: newSubject, error } = await supabase
        .from('subjects')
        .insert([
          {
            discipline_id: disciplineId,
            user_id: userId,
            title: data.title,
            content: data.content || '',
            status: data.status || 'pending',
            due_date: data.due_date || null
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar assunto:', error);
        return null;
      }

      return newSubject as Subject;
    } catch (error) {
      console.error('Erro ao criar assunto:', error);
      return null;
    }
  }
}

// Criar uma instância do serviço e exportá-la
export const supabaseService = new SupabaseService(); 