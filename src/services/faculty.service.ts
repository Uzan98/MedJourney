import { supabase } from '@/lib/supabase';
import { Faculty, FacultyMember, FacultyPost, FacultyExam, FacultyMaterial } from '@/types/faculty';

export class FacultyService {
  /**
   * Verifica se um usuário tem permissão para acessar um ambiente
   * @param facultyId ID do ambiente
   * @param userId ID do usuário
   * @returns true se tem permissão, false caso contrário
   */
  static async hasAccess(facultyId: number, userId: string): Promise<boolean> {
    try {
      // Verificar se o ambiente é público
      const { data: faculty } = await supabase
        .from('faculties')
        .select('is_public')
        .eq('id', facultyId)
        .single();
      
      if (faculty?.is_public) {
        return true; // Ambiente público, qualquer um pode acessar
      }
      
      // Verificar se o usuário é membro
      const { data: membership } = await supabase
        .rpc('is_faculty_member', { faculty_id_param: facultyId });
      
      return !!membership;
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  }
  
  /**
   * Verifica se um usuário é administrador de um ambiente
   * @param facultyId ID do ambiente
   * @param userId ID do usuário
   * @returns true se é admin, false caso contrário
   */
  static async isAdmin(facultyId: number, userId: string): Promise<boolean> {
    try {
      const { data: isAdmin } = await supabase
        .rpc('is_faculty_admin', { faculty_id_param: facultyId });
      
      return !!isAdmin;
    } catch (error) {
      console.error('Erro ao verificar se é admin:', error);
      return false;
    }
  }
  
  /**
   * Verifica se um usuário é proprietário de um ambiente
   * @param facultyId ID do ambiente
   * @param userId ID do usuário
   * @returns true se é proprietário, false caso contrário
   */
  static async isOwner(facultyId: number, userId: string): Promise<boolean> {
    try {
      const { data: isOwner } = await supabase
        .rpc('is_faculty_owner', { faculty_id_param: facultyId });
      
      return !!isOwner;
    } catch (error) {
      console.error('Erro ao verificar se é proprietário:', error);
      return false;
    }
  }

  /**
   * Busca todos os ambientes que o usuário participa
   * @param userId ID do usuário
   * @returns Lista de ambientes ou array vazio em caso de erro
   */
  static async getUserFaculties(userId: string): Promise<Faculty[]> {
    try {
      const { data: memberFaculties, error: memberError } = await supabase
        .from('faculty_members')
        .select(`
          faculty:faculty_id (
            id,
            name,
            description,
            institution,
            course,
            semester,
            is_public,
            code,
            owner_id,
            member_count,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (memberError) throw memberError;

      // Formatar os dados para exibição
      const formattedFaculties: Faculty[] = [];
      
      memberFaculties.forEach(item => {
        if (item.faculty) {
          formattedFaculties.push(item.faculty as unknown as Faculty);
        }
      });

      return formattedFaculties;
    } catch (error) {
      console.error('Erro ao buscar ambientes do usuário:', error);
      return [];
    }
  }

  /**
   * Busca detalhes de um ambiente específico
   * @param facultyId ID do ambiente
   * @returns Detalhes do ambiente ou null em caso de erro
   */
  static async getFacultyDetails(facultyId: number): Promise<Faculty | null> {
    try {
      // Verificar permissão de acesso (camada de serviço)
      const { data: hasAccess } = await supabase
        .rpc('is_faculty_member', { faculty_id_param: facultyId });
      
      // Se não tem acesso, verificar se é público
      if (!hasAccess) {
        const { data: faculty } = await supabase
          .from('faculties')
          .select('is_public')
          .eq('id', facultyId)
          .single();
          
        if (!faculty?.is_public) {
          console.error('Acesso negado ao ambiente');
          return null;
        }
      }
      
      // Buscar detalhes da faculdade
      const { data, error } = await supabase
        .from('faculties')
        .select('*')
        .eq('id', facultyId)
        .single();

      if (error) {
        console.error('Erro ao buscar detalhes:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Erro ao buscar detalhes do ambiente:', error);
      return null;
    }
  }

  /**
   * Busca os membros de um ambiente específico
   * @param facultyId ID do ambiente
   * @returns Lista de membros ou array vazio em caso de erro
   */
  static async getFacultyMembers(facultyId: number): Promise<FacultyMember[]> {
    try {
      // Verificar permissão de acesso (camada de serviço)
      const { data: hasAccess } = await supabase
        .rpc('is_faculty_member', { faculty_id_param: facultyId });
      
      if (!hasAccess) {
        console.error('Acesso negado aos membros do ambiente');
        return [];
      }
      
      // Buscar os membros da faculdade
      const { data: members, error: membersError } = await supabase
        .from('faculty_members')
        .select('*')
        .eq('faculty_id', facultyId)
        .order('role', { ascending: true });
      
      if (membersError) {
        console.error('Erro ao buscar membros:', membersError);
        return [];
      }
      
      if (!members || members.length === 0) {
        return [];
      }
      
      // Buscar informações dos usuários usando a função get_user_info (versão simplificada)
      const userIds = members.map(member => member.user_id);
      
      const { data: users, error: usersError } = await supabase
        .rpc('get_user_info', { user_ids: userIds });
      
      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError);
      }
      
      // Criar um mapa de usuários para facilitar o acesso
      const userMap = new Map();
      if (users) {
        users.forEach((user: any) => {
          userMap.set(user.id, user);
        });
      }
      
      // Mapear os resultados para o formato esperado
      const formattedMembers = members.map(member => {
        const user = userMap.get(member.user_id);
        
        let userName = '';
        let userEmail = '';
        
        // Verificar se temos dados do usuário
        if (user) {
          userName = user.name || '';
          userEmail = user.email || '';
        }
        
        // Se não tiver nome, usar parte do email ou ID como fallback
        if (!userName && userEmail) {
          userName = userEmail.split('@')[0];
          // Capitalizar primeira letra e substituir pontos/underscores por espaços
          userName = userName
            .charAt(0).toUpperCase() + userName.slice(1)
            .replace(/[._]/g, ' ');
        }
        
        // Se ainda não tiver nome, usar "Usuário" + últimos 4 caracteres do ID
        if (!userName) {
          const shortId = member.user_id.substring(member.user_id.length - 4);
          userName = `Usuário ${shortId}`;
        }
        
        return {
          ...member,
          user: {
            id: member.user_id,
            name: userName,
            email: userEmail,
            avatar_url: ''
          }
        };
      });
      
      // Ordenar por papel (admin, moderator, member) e depois por nome
      return formattedMembers.sort((a, b) => {
        // Primeiro por papel
        const roleOrder = { admin: 1, moderator: 2, member: 3 };
        const roleA = roleOrder[a.role as keyof typeof roleOrder];
        const roleB = roleOrder[b.role as keyof typeof roleOrder];
        
        if (roleA !== roleB) {
          return roleA - roleB;
        }
        
        // Depois por nome
        return (a.user?.name || '').localeCompare(b.user?.name || '');
      });
    } catch (error) {
      console.error('Erro ao buscar membros do ambiente:', error);
      return [];
    }
  }

  /**
   * Cria um novo ambiente
   * @param faculty Dados do ambiente a ser criado
   * @returns O ambiente criado ou null em caso de erro
   */
  static async createFaculty(faculty: Omit<Faculty, 'id' | 'created_at' | 'updated_at' | 'member_count'>): Promise<Faculty | null> {
    try {
      // Usar a função SQL personalizada para criar ambiente e membro em uma transação
      const { data, error } = await supabase.rpc('create_faculty_with_admin', {
        p_name: faculty.name,
        p_description: faculty.description,
        p_institution: faculty.institution || null,
        p_course: faculty.course || null,
        p_semester: faculty.semester || null,
        p_is_public: faculty.is_public,
        p_code: faculty.code,
        p_owner_id: faculty.owner_id
      });

      if (error) {
        console.error('Erro ao criar ambiente:', error);
        throw error;
      }

      // A função RPC retorna o ID do ambiente criado
      if (data) {
        // Retornar os dados diretamente, sem precisar buscar novamente
        return {
          id: data,
          name: faculty.name,
          description: faculty.description,
          institution: faculty.institution,
          course: faculty.course,
          semester: faculty.semester,
          is_public: faculty.is_public,
          code: faculty.code,
          owner_id: faculty.owner_id,
          member_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao criar ambiente:', error);
      throw error;
    }
  }

  /**
   * Adiciona um usuário como membro de um ambiente
   * @param facultyId ID do ambiente
   * @param userId ID do usuário
   * @param role Papel do usuário no ambiente (padrão: 'member')
   * @returns true se bem-sucedido, false caso contrário
   */
  static async addMember(facultyId: number, userId: string, role: 'admin' | 'moderator' | 'member' = 'member'): Promise<boolean> {
    try {
      // Verificar se o usuário está banido
      const isBanned = await this.isUserBanned(facultyId, userId);
      if (isBanned) {
        throw new Error('Usuário está banido deste ambiente e não pode ser adicionado como membro');
      }

      // Verificar se o usuário já é membro
      const { data: existingMember } = await supabase
        .from('faculty_members')
        .select('*')
        .eq('faculty_id', facultyId)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        return true; // Já é membro, consideramos sucesso
      }

      // Adicionar o usuário como membro
      const { error: memberError } = await supabase
        .from('faculty_members')
        .insert({
          faculty_id: facultyId,
          user_id: userId,
          role,
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      // Atualizar o contador de membros
      const { data: faculty } = await supabase
        .from('faculties')
        .select('member_count')
        .eq('id', facultyId)
        .single();

      if (faculty) {
        await supabase
          .from('faculties')
          .update({ member_count: (faculty.member_count || 0) + 1 })
          .eq('id', facultyId);
      }

      return true;
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      return false;
    }
  }

  /**
   * Verifica se um usuário é membro de um ambiente
   * @param facultyId ID do ambiente
   * @param userId ID do usuário
   * @returns Objeto com informações de membro ou null se não for membro
   */
  static async checkMembership(facultyId: number, userId: string): Promise<FacultyMember | null> {
    try {
      const { data, error } = await supabase
        .from('faculty_members')
        .select('*')
        .eq('faculty_id', facultyId)
        .eq('user_id', userId)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      console.error('Erro ao verificar associação:', error);
      return null;
    }
  }

  /**
   * Busca um ambiente pelo código
   * @param code Código do ambiente
   * @returns Ambiente encontrado ou null se não existir
   */
  static async getFacultyByCode(code: string): Promise<Faculty | null> {
    try {
      const { data, error } = await supabase
        .from('faculties')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      console.error('Erro ao buscar ambiente por código:', error);
      return null;
    }
  }

  /**
   * Método de depuração para mostrar os metadados dos usuários
   * @param facultyId ID do ambiente
   * @returns Dados de depuração
   */
  static async debugUserMetadata(facultyId: number): Promise<any[]> {
    try {
      // Primeiro, buscar os IDs dos usuários que são membros da faculdade
      const { data: members, error: membersError } = await supabase
        .from('faculty_members')
        .select('user_id')
        .eq('faculty_id', facultyId);
      
      if (membersError) {
        console.error('Erro ao buscar membros:', membersError);
        return [];
      }
      
      if (!members || members.length === 0) {
        return [];
      }
      
      // Extrair os IDs dos usuários
      const userIds = members.map(member => member.user_id);
      
      // Buscar informações dos usuários da tabela users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('user_id', userIds);
      
      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError);
        return [];
      }
      
      return users || [];
    } catch (error) {
      console.error('Erro ao depurar metadados:', error);
      return [];
    }
  }

  /**
   * Atualiza a função de um membro em um ambiente
   * @param facultyId ID do ambiente
   * @param userId ID do usuário
   * @param role Nova função do usuário
   * @returns true se bem-sucedido, false caso contrário
   */
  static async updateMemberRole(facultyId: number, userId: string, role: 'admin' | 'moderator' | 'member'): Promise<boolean> {
    try {
      // Verificar se o usuário é membro
      const { data: existingMember } = await supabase
        .from('faculty_members')
        .select('*')
        .eq('faculty_id', facultyId)
        .eq('user_id', userId)
        .single();

      if (!existingMember) {
        return false; // Não é membro
      }

      // Atualizar a função do membro
      const { error } = await supabase
        .from('faculty_members')
        .update({ role })
        .eq('faculty_id', facultyId)
        .eq('user_id', userId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erro ao atualizar função do membro:', error);
      throw error;
    }
  }

  /**
   * Remove um membro de um ambiente
   * @param facultyId ID do ambiente
   * @param userId ID do usuário a ser removido
   * @returns true se bem-sucedido, false caso contrário
   */
  static async removeMember(facultyId: number, userId: string): Promise<boolean> {
    try {
      // Verificar se o usuário é membro
      const { data: existingMember } = await supabase
        .from('faculty_members')
        .select('*')
        .eq('faculty_id', facultyId)
        .eq('user_id', userId)
        .single();

      if (!existingMember) {
        return false; // Não é membro
      }

      // Remover o membro
      const { error } = await supabase
        .from('faculty_members')
        .delete()
        .eq('faculty_id', facultyId)
        .eq('user_id', userId);

      if (error) throw error;

      // Atualizar o contador de membros (decrementar)
      await supabase.rpc('decrement_faculty_member_count', { faculty_id_param: facultyId });

      return true;
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      throw error;
    }
  }

  /**
   * Bane um usuário de uma faculdade
   * @param facultyId ID da faculdade
   * @param userId ID do usuário a ser banido
   * @param reason Motivo opcional do banimento
   * @returns true se bem-sucedido, false caso contrário
   */
  static async banUser(facultyId: number, userId: string, reason?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('ban_faculty_user', {
          p_faculty_id: facultyId,
          p_user_id: userId,
          p_reason: reason || null
        });

      if (error) {
        console.error('Erro ao banir usuário:', error);
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Erro ao banir usuário:', error);
      throw error;
    }
  }

  /**
   * Remove o banimento de um usuário
   * @param facultyId ID da faculdade
   * @param userId ID do usuário a ser desbanido
   * @returns true se bem-sucedido, false caso contrário
   */
  static async unbanUser(facultyId: number, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('unban_faculty_user', {
          p_faculty_id: facultyId,
          p_user_id: userId
        });

      if (error) {
        console.error('Erro ao desbanir usuário:', error);
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Erro ao desbanir usuário:', error);
      throw error;
    }
  }

  /**
   * Verifica se um usuário está banido de uma faculdade
   * @param facultyId ID da faculdade
   * @param userId ID do usuário
   * @returns true se estiver banido, false caso contrário
   */
  static async isUserBanned(facultyId: number, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('is_user_banned_from_faculty', {
          p_faculty_id: facultyId,
          p_user_id: userId
        });

      if (error) {
        console.error('Erro ao verificar banimento:', error);
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Erro ao verificar banimento:', error);
      return false;
    }
  }

  /**
   * Busca a lista de usuários banidos de uma faculdade
   * @param facultyId ID da faculdade
   * @returns Lista de usuários banidos
   */
  static async getBannedUsers(facultyId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('faculty_banned_users')
        .select(`
          id,
          user_id,
          banned_at,
          reason,
          is_active,
          unbanned_at,
          banned_by,
          unbanned_by
        `)
        .eq('faculty_id', facultyId)
        .eq('is_active', true)
        .order('banned_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários banidos:', error);
        throw error;
      }

      // Buscar informações dos usuários
      if (data && data.length > 0) {
        const userIds = data.map(ban => ban.user_id);
        const bannedByIds = data.map(ban => ban.banned_by).filter(id => id);
        const unbannedByIds = data.map(ban => ban.unbanned_by).filter(id => id);
        
        // Combinar todos os IDs de usuários únicos
        const allUserIds = [...new Set([...userIds, ...bannedByIds, ...unbannedByIds])];
        
        // Buscar detalhes dos usuários
        const { data: usersData } = await supabase
          .rpc('get_user_info', { user_ids: allUserIds });
        
        // Criar um mapa de usuários para facilitar o acesso
        const userMap = new Map();
        if (usersData) {
          usersData.forEach((user: any) => {
            userMap.set(user.id, user);
          });
        }
        
        // Adicionar informações de usuário aos banimentos
        return data.map(ban => {
          const bannedUser = userMap.get(ban.user_id);
          const bannedByUser = userMap.get(ban.banned_by);
          const unbannedByUser = ban.unbanned_by ? userMap.get(ban.unbanned_by) : null;
          
          return {
            ...ban,
            user: bannedUser ? {
              id: bannedUser.id,
              name: bannedUser.name || bannedUser.email?.split('@')[0] || 'Usuário',
              email: bannedUser.email
            } : null,
            banned_by_user: bannedByUser ? {
              id: bannedByUser.id,
              name: bannedByUser.name || bannedByUser.email?.split('@')[0] || 'Usuário',
              email: bannedByUser.email
            } : null,
            unbanned_by_user: unbannedByUser ? {
              id: unbannedByUser.id,
              name: unbannedByUser.name || unbannedByUser.email?.split('@')[0] || 'Usuário',
              email: unbannedByUser.email
            } : null
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar usuários banidos:', error);
      return [];
    }
  }
} 