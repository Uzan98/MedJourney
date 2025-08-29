import { supabase } from '@/lib/supabase';
import { Faculty, FacultyMember, FacultyPost, FacultyExam, FacultyMaterial, FacultyComment, ForumTopic, ForumReply, ForumTag } from '@/types/faculty';
import { FacultyEvent } from '@/types/community';
import { ExamsService } from '@/services/exams.service';

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

  /**
   * Busca os posts de uma faculdade
   * @param facultyId ID da faculdade
   * @param limit Limite de posts (padrão: 10)
   * @param offset Offset para paginação (padrão: 0)
   * @param postId ID específico de um post para buscar (opcional)
   * @param type Tipo de post (opcional)
   * @returns Array de posts ou array vazio em caso de erro
   */
  static async getFacultyPosts(
    facultyId: number, 
    limit: number = 10, 
    offset: number = 0,
    postId?: number,
    type?: string
  ): Promise<FacultyPost[]> {
    try {
      let query = supabase
        .rpc('get_faculty_posts', {
          p_faculty_id: facultyId,
          p_limit: limit,
          p_offset: offset,
          p_type: type
        });

      // Se um ID específico de post foi fornecido, adicionar filtro adicional
      if (postId) {
        // Como estamos usando RPC, não podemos filtrar diretamente na consulta
        // Vamos buscar os dados e filtrar manualmente
        const { data, error } = await query;

        if (error || !data) {
          console.error('Erro ao buscar posts:', error);
          return [];
        }

        // Filtrar pelo ID do post
        const filteredData = data.filter((post: any) => post.id === postId);

        // Formatar os dados para o formato FacultyPost
        return filteredData.map((post: any) => ({
          id: post.id,
          faculty_id: post.faculty_id,
          user_id: post.user_id,
          title: post.title,
          content: post.content,
          created_at: post.created_at,
          updated_at: post.updated_at,
          user: {
            id: post.user_id,
            name: post.user_name,
            email: post.user_email,
            avatar_url: post.user_avatar_url,
            role: post.user_role
          },
          type: post.type,
          attachment_url: post.attachment_url,
          attachment_type: post.attachment_type,
          likes_count: post.likes_count,
          comment_count: post.comments_count,
          user_liked: post.user_liked
        }));
      } else {
        // Busca normal sem filtro por ID
        const { data, error } = await query;

        if (error || !data) {
          console.error('Erro ao buscar posts:', error);
          return [];
        }

        // Formatar os dados para o formato FacultyPost
        return data.map((post: any) => ({
          id: post.id,
          faculty_id: post.faculty_id,
          user_id: post.user_id,
          title: post.title,
          content: post.content,
          created_at: post.created_at,
          updated_at: post.updated_at,
          user: {
            id: post.user_id,
            name: post.user_name,
            email: post.user_email,
            avatar_url: post.user_avatar_url,
            role: post.user_role
          },
          type: post.type,
          attachment_url: post.attachment_url,
          attachment_type: post.attachment_type,
          likes_count: post.likes_count,
          comment_count: post.comments_count,
          user_liked: post.user_liked
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar posts da faculdade:', error);
      return [];
    }
  }

  /**
   * Cria um novo post na faculdade
   * @param facultyId ID da faculdade
   * @param title Título do post
   * @param content Conteúdo do post
   * @param type Tipo do post (padrão: 'announcement')
   * @param attachmentUrl URL do anexo (opcional)
   * @param attachmentType Tipo do anexo (opcional)
   * @returns ID do post criado ou null em caso de erro
   */
  static async createPost(
    facultyId: number, 
    title: string, 
    content: string, 
    type: string = 'announcement',
    attachmentUrl?: string,
    attachmentType?: string
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .rpc('create_faculty_post', {
          p_faculty_id: facultyId,
          p_title: title,
          p_content: content,
          p_type: type,
          p_attachment_url: attachmentUrl || null,
          p_attachment_type: attachmentType || null
        });

      if (error) {
        console.error('Erro ao criar post:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar post:', error);
      return null;
    }
  }

  /**
   * Busca os comentários de um post
   * @param postId ID do post
   * @param limit Limite de comentários (padrão: 20)
   * @param offset Offset para paginação (padrão: 0)
   * @returns Array de comentários ou array vazio em caso de erro
   */
  static async getPostComments(
    postId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<FacultyComment[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_faculty_comments', {
          p_post_id: postId,
          p_limit: limit,
          p_offset: offset
        });

      if (error) {
        console.error('Erro ao buscar comentários:', error);
        return [];
      }

      // Formatar os dados para o formato FacultyComment
      return data.map((comment: any) => ({
        id: comment.id,
        post_id: comment.post_id,
        user_id: comment.user_id,
        content: comment.content,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        user: {
          id: comment.user_id,
          name: comment.user_name,
          email: comment.user_email,
          avatar_url: comment.user_avatar_url,
          role: comment.user_role
        }
      }));
    } catch (error) {
      console.error('Erro ao buscar comentários do post:', error);
      return [];
    }
  }

  /**
   * Adiciona um comentário a um post
   * @param postId ID do post
   * @param content Conteúdo do comentário
   * @returns ID do comentário criado ou null em caso de erro
   */
  static async createComment(postId: number, content: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .rpc('create_faculty_comment', {
          p_post_id: postId,
          p_content: content
        });

      if (error) {
        console.error('Erro ao criar comentário:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      return null;
    }
  }

  /**
   * Alterna o status de curtida em um post
   * @param postId ID do post
   * @returns true se curtiu, false se descurtiu, null em caso de erro
   */
  static async togglePostLike(postId: number): Promise<boolean | null> {
    try {
      const { data, error } = await supabase
        .rpc('toggle_faculty_post_like', {
          p_post_id: postId
        });

      if (error) {
        console.error('Erro ao curtir/descurtir post:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao curtir/descurtir post:', error);
      return null;
    }
  }

  /**
   * Verifica se o usuário curtiu um post
   * @param postId ID do post
   * @returns true se curtiu, false caso contrário
   */
  static async hasLikedPost(postId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('has_liked_faculty_post', {
          p_post_id: postId
        });

      if (error) {
        console.error('Erro ao verificar curtida:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Erro ao verificar curtida:', error);
      return false;
    }
  }

  /**
   * Obtém a contagem de curtidas de um post específico
   * @param postId ID do post
   * @returns Objeto com contagem de curtidas e se o usuário curtiu
   */
  static async getPostLikesCount(postId: number): Promise<{count: number, user_liked: boolean}> {
    try {
      const { data, error } = await supabase
        .rpc('get_post_likes_count', {
          p_post_id: postId
        });

      if (error) {
        console.error('Erro ao obter contagem de curtidas:', error);
        return { count: 0, user_liked: false };
      }

      return data || { count: 0, user_liked: false };
    } catch (error) {
      console.error('Erro ao obter contagem de curtidas:', error);
      return { count: 0, user_liked: false };
    }
  }

  // Métodos para o Fórum de Dúvidas

  /**
   * Busca tópicos do fórum de uma faculdade
   * @param facultyId ID da faculdade
   * @param limit Limite de tópicos (padrão: 20)
   * @param offset Offset para paginação (padrão: 0)
   * @param tagId ID da tag para filtrar (opcional)
   * @param isResolved Filtrar por tópicos resolvidos (opcional)
   * @param search Termo de busca (opcional)
   * @returns Array de tópicos ou array vazio em caso de erro
   */
  static async getForumTopics(
    facultyId: number,
    limit: number = 20,
    offset: number = 0,
    tagId?: number,
    isResolved?: boolean,
    search?: string
  ): Promise<ForumTopic[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_faculty_forum_topics', {
          p_faculty_id: facultyId,
          p_limit: limit,
          p_offset: offset,
          p_tag_id: tagId || null,
          p_is_resolved: isResolved === undefined ? null : isResolved,
          p_search: search || null
        });

      if (error) {
        console.error('Erro ao buscar tópicos do fórum:', error);
        return [];
      }

      // Formatar os dados para o formato ForumTopic
      return data.map((topic: any) => ({
        id: topic.id,
        faculty_id: topic.faculty_id,
        user_id: topic.user_id,
        title: topic.title,
        content: topic.content,
        is_resolved: topic.is_resolved,
        is_pinned: topic.is_pinned,
        view_count: topic.view_count,
        created_at: topic.created_at,
        updated_at: topic.updated_at,
        user: {
          id: topic.user_id,
          name: topic.user_name,
          email: topic.user_email,
          avatar_url: topic.user_avatar_url,
          role: topic.user_role
        },
        replies_count: topic.replies_count,
        votes_count: topic.votes_count,
        tags: Array.isArray(topic.tags) ? topic.tags : []
      }));
    } catch (error) {
      console.error('Erro ao buscar tópicos do fórum:', error);
      return [];
    }
  }

  /**
   * Cria um novo tópico no fórum
   * @param facultyId ID da faculdade
   * @param title Título do tópico
   * @param content Conteúdo do tópico
   * @param tags Array de IDs de tags (opcional)
   * @returns ID do tópico criado ou null em caso de erro
   */
  static async createForumTopic(
    facultyId: number,
    title: string,
    content: string,
    tags?: number[]
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .rpc('create_faculty_forum_topic', {
          p_faculty_id: facultyId,
          p_title: title,
          p_content: content,
          p_tags: tags || null
        });

      if (error) {
        console.error('Erro ao criar tópico no fórum:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar tópico no fórum:', error);
      return null;
    }
  }

  /**
   * Incrementa a contagem de visualizações de um tópico
   * @param topicId ID do tópico
   */
  static async incrementTopicViewCount(topicId: number): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('increment_forum_topic_view_count', {
          p_topic_id: topicId
        });

      if (error) {
        console.error('Erro ao incrementar visualizações do tópico:', error);
      }
    } catch (error) {
      console.error('Erro ao incrementar visualizações do tópico:', error);
    }
  }

  /**
   * Busca respostas de um tópico do fórum
   * @param topicId ID do tópico
   * @param limit Limite de respostas (padrão: 50)
   * @param offset Offset para paginação (padrão: 0)
   * @returns Array de respostas ou array vazio em caso de erro
   */
  static async getForumReplies(
    topicId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<ForumReply[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_faculty_forum_replies', {
          p_topic_id: topicId,
          p_limit: limit,
          p_offset: offset
        });

      if (error) {
        console.error('Erro ao buscar respostas do fórum:', error);
        return [];
      }

      // Formatar os dados para o formato ForumReply
      return data.map((reply: any) => ({
        id: reply.id,
        topic_id: reply.topic_id,
        user_id: reply.user_id,
        content: reply.content,
        is_solution: reply.is_solution,
        created_at: reply.created_at,
        updated_at: reply.updated_at,
        user: {
          id: reply.user_id,
          name: reply.user_name,
          email: reply.user_email,
          avatar_url: reply.user_avatar_url,
          role: reply.user_role
        },
        votes_count: reply.votes_count
      }));
    } catch (error) {
      console.error('Erro ao buscar respostas do fórum:', error);
      return [];
    }
  }

  /**
   * Cria uma nova resposta em um tópico do fórum
   * @param topicId ID do tópico
   * @param content Conteúdo da resposta
   * @returns ID da resposta criada ou null em caso de erro
   */
  static async createForumReply(
    topicId: number,
    content: string
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .rpc('create_faculty_forum_reply', {
          p_topic_id: topicId,
          p_content: content
        });

      if (error) {
        console.error('Erro ao criar resposta no fórum:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar resposta no fórum:', error);
      return null;
    }
  }

  /**
   * Vota em um tópico ou resposta do fórum
   * @param topicId ID do tópico (opcional)
   * @param replyId ID da resposta (opcional)
   * @param voteType Tipo de voto (1 para upvote, -1 para downvote)
   * @returns true se o voto foi registrado, false caso contrário
   */
  static async voteForumItem(
    topicId: number | null,
    replyId: number | null,
    voteType: number = 1
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('vote_faculty_forum_item', {
          p_topic_id: topicId,
          p_reply_id: replyId,
          p_vote_type: voteType
        });

      if (error) {
        console.error('Erro ao votar em item do fórum:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Erro ao votar em item do fórum:', error);
      return false;
    }
  }

  /**
   * Marca uma resposta como solução
   * @param replyId ID da resposta
   * @param isSolution Se a resposta é uma solução (padrão: true)
   * @returns true se a operação foi bem-sucedida, false caso contrário
   */
  static async markReplyAsSolution(
    replyId: number,
    isSolution: boolean = true
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('mark_forum_reply_as_solution', {
          p_reply_id: replyId,
          p_is_solution: isSolution
        });

      if (error) {
        console.error('Erro ao marcar resposta como solução:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Erro ao marcar resposta como solução:', error);
      return false;
    }
  }

  /**
   * Busca tags do fórum de uma faculdade
   * @param facultyId ID da faculdade
   * @returns Array de tags ou array vazio em caso de erro
   */
  static async getForumTags(facultyId: number): Promise<ForumTag[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_faculty_forum_tags', {
          p_faculty_id: facultyId
        });

      if (error) {
        console.error('Erro ao buscar tags do fórum:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar tags do fórum:', error);
      return [];
    }
  }

  /**
   * Cria uma nova tag para o fórum
   * @param facultyId ID da faculdade
   * @param name Nome da tag
   * @param color Cor da tag (formato hexadecimal, padrão: '#3b82f6')
   * @returns ID da tag criada ou null em caso de erro
   */
  static async createForumTag(
    facultyId: number,
    name: string,
    color: string = '#3b82f6'
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .rpc('create_faculty_forum_tag', {
          p_faculty_id: facultyId,
          p_name: name,
          p_color: color
        });

      if (error) {
        console.error('Erro ao criar tag do fórum:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar tag do fórum:', error);
      return null;
    }
  }

  /**
   * Busca materiais de estudo de uma faculdade
   * @param facultyId ID da faculdade
   * @param limit Limite de materiais (padrão: 50)
   * @param offset Offset para paginação (padrão: 0)
   * @returns Array de materiais ou array vazio em caso de erro
   */
  static async getFacultyMaterials(
    facultyId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<FacultyMaterial[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_faculty_materials', {
          p_faculty_id: facultyId,
          p_limit: limit,
          p_offset: offset
        });

      if (error) {
        console.error('Erro ao buscar materiais de estudo:', error);
        return [];
      }

      // Buscar informações dos usuários
      const userIds = data.map(material => material.user_id).filter(Boolean);
      const userMap = await this.getUsersInfo(userIds);
      
      // Formatar os dados para incluir o objeto user corretamente
      return data.map((material: any) => {
        const userInfo = userMap[material.user_id];
        
        return {
          id: material.id,
          faculty_id: material.faculty_id,
          user_id: material.user_id,
          title: material.title,
          description: material.description,
          file_url: material.file_url,
          file_type: material.file_type,
          file_size: material.file_size,
          periodo: material.periodo,
          disciplina: material.disciplina,
          created_at: material.created_at,
          download_count: material.download_count,
          user: userInfo ? {
            id: material.user_id,
            name: userInfo.name || 'Usuário',
            email: userInfo.email || '',
            avatar_url: userInfo.avatar_url || '',
            role: material.user_role
          } : {
            id: material.user_id,
            name: 'Usuário',
            email: '',
            avatar_url: '',
            role: material.user_role
          }
        };
      });
    } catch (error) {
      console.error('Erro ao buscar materiais de estudo:', error);
      return [];
    }
  }

  /**
   * Faz upload de um arquivo para o bucket de materiais
   * @param facultyId ID da faculdade
   * @param userId ID do usuário
   * @param file Arquivo a ser enviado
   * @returns URL do arquivo ou null em caso de erro
   */
  static async uploadMaterialFile(
    facultyId: number,
    userId: string,
    file: File
  ): Promise<string | null> {
    try {
      // Sanitizar o nome do arquivo (remover acentos e caracteres especiais)
      const sanitizeFileName = (fileName: string): string => {
        // Primeiro, normalizar o texto para decompor os caracteres acentuados
        const normalized = fileName.normalize('NFD')
          // Remover os acentos (diacríticos)
          .replace(/[\u0300-\u036f]/g, '')
          // Substituir espaços por hífens
          .replace(/\s+/g, '-')
          // Remover caracteres que não sejam alfanuméricos, hífens ou pontos
          .replace(/[^a-zA-Z0-9\-_.]/g, '')
          // Evitar múltiplos hífens consecutivos
          .replace(/-+/g, '-');
        
        return normalized;
      };
      
      // O caminho do arquivo será: faculty_id/user_id/timestamp_nome-arquivo-sanitizado
      const timestamp = Date.now();
      const sanitizedFileName = sanitizeFileName(file.name);
      const filePath = `${facultyId}/${userId}/${timestamp}_${sanitizedFileName}`;
      
      const { data, error } = await supabase.storage
        .from('faculty_materials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Erro ao fazer upload do arquivo:', error);
        return null;
      }

      // Criar URL de download que funciona com políticas de acesso
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('faculty_materials')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // URL válida por 1 ano

      if (signedUrlError) {
        console.error('Erro ao gerar URL assinada:', signedUrlError);
        
        // Fallback para URL pública
        const { data: publicUrlData } = supabase.storage
          .from('faculty_materials')
          .getPublicUrl(filePath);
        
        return publicUrlData.publicUrl;
      }

      return signedUrlData.signedUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo:', error);
      return null;
    }
  }

  /**
   * Cria um novo material de estudo
   * @param facultyId ID da faculdade
   * @param title Título do material
   * @param description Descrição do material
   * @param fileUrl URL do arquivo
   * @param fileType Tipo do arquivo
   * @param fileSize Tamanho do arquivo em bytes
   * @param periodo Período acadêmico (1-12, opcional)
   * @param disciplina Nome da disciplina (opcional)
   * @returns ID do material criado ou null em caso de erro
   */
  static async createFacultyMaterial(
    facultyId: number,
    title: string,
    description: string,
    fileUrl: string,
    fileType: string,
    fileSize: number,
    periodo?: number | null,
    disciplina?: string | null
  ): Promise<number | null> {
    try {
      // Garantir que valores undefined ou vazios sejam convertidos para null
      const periodoValue = periodo || null;
      const disciplinaValue = disciplina && disciplina.trim() !== '' ? disciplina.trim() : null;
      
      console.log("Valores sendo enviados para o backend:", {
        p_faculty_id: facultyId,
        p_title: title,
        p_description: description,
        p_file_url: fileUrl,
        p_file_type: fileType,
        p_file_size: fileSize,
        p_periodo: periodoValue,
        p_disciplina: disciplinaValue
      });
      
      const { data, error } = await supabase
        .rpc('create_faculty_material', {
          p_faculty_id: facultyId,
          p_title: title,
          p_description: description,
          p_file_url: fileUrl,
          p_file_type: fileType,
          p_file_size: fileSize,
          p_periodo: periodoValue,
          p_disciplina: disciplinaValue
        });

      if (error) {
        console.error('Erro ao criar material de estudo:', error);
        return null;
      }

      console.log("Material criado com sucesso, ID:", data);
      return data;
    } catch (error) {
      console.error('Erro ao criar material de estudo:', error);
      return null;
    }
  }

  /**
   * Incrementa o contador de downloads de um material
   * @param materialId ID do material
   */
  static async incrementMaterialDownloadCount(materialId: number): Promise<void> {
    try {
      // Primeiro, obter o valor atual do contador
      const { data: material, error: fetchError } = await supabase
        .from('faculty_materials')
        .select('download_count')
        .eq('id', materialId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar contador de downloads:', fetchError);
        return;
      }

      // Calcular o novo valor do contador
      const currentCount = material?.download_count || 0;
      const newCount = currentCount + 1;

      // Atualizar o contador
      const { error: updateError } = await supabase
        .from('faculty_materials')
        .update({ download_count: newCount })
        .eq('id', materialId);

      if (updateError) {
        console.error('Erro ao incrementar contador de downloads:', updateError);
      }
    } catch (error) {
      console.error('Erro ao incrementar contador de downloads:', error);
    }
  }

  /**
   * Exclui um material de estudo
   * @param materialId ID do material
   * @param filePath Caminho do arquivo no storage
   * @returns true se a operação foi bem-sucedida, false caso contrário
   */
  static async deleteFacultyMaterial(
    materialId: number,
    filePath: string
  ): Promise<boolean> {
    try {
      console.log('Excluindo material:', materialId, 'Caminho:', filePath);
      
      // Primeiro excluir o arquivo do storage
      const { error: storageError } = await supabase.storage
        .from('faculty_materials')
        .remove([filePath]);

      if (storageError) {
        console.error('Erro ao excluir arquivo do storage:', storageError);
        // Continuar mesmo com erro no storage, pois o mais importante é remover do banco
      }

      // Excluir diretamente da tabela usando a política RLS existente
      // Não precisamos de uma função RPC para isso
      const { error: dbError } = await supabase
        .from('faculty_materials')
        .delete()
        .eq('id', materialId);

      if (dbError) {
        console.error('Erro ao excluir material do banco de dados:', dbError);
        return false;
      }

      return true; // Exclusão bem-sucedida
    } catch (error) {
      console.error('Erro ao excluir material de estudo:', error);
      return false;
    }
  }

  /**
   * Busca as disciplinas de uma faculdade
   * @param facultyId ID da faculdade
   * @returns Lista de nomes de disciplinas
   */
  static async getFacultyDisciplines(facultyId: number): Promise<string[]> {
    try {
      // Buscar disciplinas dos materiais
      const { data: materialDisciplinas, error: materialError } = await supabase
        .from('faculty_materials')
        .select('disciplina')
        .eq('faculty_id', facultyId)
        .not('disciplina', 'is', null);
      
      if (materialError) {
        console.error('Erro ao buscar disciplinas de materiais:', materialError);
        return [];
      }

      // Buscar disciplinas dos exames
      const { data: examDisciplinas, error: examError } = await supabase
        .from('faculty_exams')
        .select('disciplina')
        .eq('faculty_id', facultyId)
        .not('disciplina', 'is', null);
      
      if (examError) {
        console.error('Erro ao buscar disciplinas de exames:', examError);
        return [];
      }
      
      // Combinar e remover duplicatas
      const allDisciplinas = [
        ...materialDisciplinas.map(m => m.disciplina),
        ...examDisciplinas.map(e => e.disciplina)
      ]
      .filter(Boolean) // Remover valores null/undefined
      .filter(d => d.trim() !== ''); // Remover strings vazias
      
      // Remover duplicatas e ordenar
      const uniqueDisciplinas = [...new Set(allDisciplinas)].sort();
      
      return uniqueDisciplinas;
    } catch (error) {
      console.error('Erro ao buscar disciplinas da faculdade:', error);
      return [];
    }
  }

  /**
   * Compartilha um simulado com a faculdade
   * @param facultyId ID da faculdade
   * @param examId ID do simulado original
   * @param examData Dados adicionais do simulado
   * @returns ID do simulado compartilhado ou null em caso de erro
   */
  static async shareFacultyExam(
    facultyId: number,
    examId: number,
    examData: {
      title: string;
      description?: string;
      category?: string;
      disciplina?: string;
      periodo?: number;
    }
  ): Promise<number | null> {
    try {
      // Verificar se o simulado existe e é público
      const examDetails = await ExamsService.getExamById(examId);
      if (!examDetails) {
        console.error('Erro ao compartilhar simulado: Simulado não encontrado');
        return null;
      }
      
      // Verificar se o simulado é público
      if (!examDetails.is_public) {
        console.error('Erro ao compartilhar simulado: Simulado não é público');
        return null;
      }
      
      // Obter o ID do usuário atual
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error('Erro ao obter usuário atual:', userError);
        return null;
      }
      
      // Inserir diretamente na tabela faculty_exams
      const { data, error } = await supabase
        .from('faculty_exams')
        .insert({
          faculty_id: facultyId,
          creator_id: userData.user.id,
          title: examData.title,
          description: examData.description || null,
          external_exam_id: examId,
          category: examData.category || null,
          disciplina: examData.disciplina || null,
          periodo: examData.periodo || null,
          is_published: true
        })
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao compartilhar simulado:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Erro ao compartilhar simulado:', error);
      return null;
    }
  }

  /**
   * Busca os simulados compartilhados em uma faculdade
   * @param facultyId ID da faculdade
   * @param limit Limite de simulados (padrão: 50)
   * @param offset Offset para paginação (padrão: 0)
   * @returns Lista de simulados ou array vazio em caso de erro
   */
  static async getFacultyExams(
    facultyId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<FacultyExam[]> {
    try {
      // Buscar diretamente da tabela faculty_exams sem tentar fazer join
      const { data: exams, error } = await supabase
        .from('faculty_exams')
        .select('*')
        .eq('faculty_id', facultyId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Erro ao buscar simulados:', error);
        return [];
      }

      // Buscar informações dos usuários separadamente usando nossa função auxiliar
      const userIds = exams.map(exam => exam.creator_id).filter(Boolean);
      const userMap = await this.getUsersInfo(userIds);

            // Formatar os dados para o formato FacultyExam
      return exams.map((exam: any) => {
        // Obter informações do usuário do mapa, se disponível
        const userInfo = userMap[exam.creator_id];
        
        return {
          id: exam.id,
          faculty_id: exam.faculty_id,
          creator_id: exam.creator_id,
          title: exam.title,
          description: exam.description,
          scheduled_date: exam.scheduled_date,
          duration_minutes: exam.duration_minutes,
          max_score: exam.max_score,
          is_published: exam.is_published,
          external_exam_id: exam.external_exam_id,
          category: exam.category,
          disciplina: exam.disciplina,
          periodo: exam.periodo,
          created_at: exam.created_at,
          updated_at: exam.updated_at,
          user: userInfo ? {
            id: exam.creator_id,
            name: userInfo.name || 'Usuário',
            email: userInfo.email || '',
            avatar_url: userInfo.avatar_url || ''
          } : {
            id: exam.creator_id,
            name: 'Usuário', // Fallback para quando não temos informações
            email: '',
            avatar_url: ''
          }
        };
            });
    } catch (error) {
      console.error('Erro ao buscar simulados da faculdade:', error);
      return [];
    }
  }

  /**
   * Exclui um simulado da faculdade
   * @param examId ID do simulado
   * @returns true se excluído com sucesso, false caso contrário
   */
  static async deleteFacultyExam(examId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('faculty_exams')
        .delete()
        .eq('id', examId);
      
      if (error) {
        console.error('Erro ao excluir simulado:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir simulado:', error);
      return false;
    }
  }

  /**
   * Busca os eventos de uma faculdade
   * @param facultyId ID da faculdade
   * @param startDate Data de início (opcional)
   * @param endDate Data de fim (opcional)
   * @param limit Limite de resultados (padrão: 10)
   * @returns Lista de eventos ou array vazio em caso de erro
   */
  static async getFacultyEvents(
    facultyId: number,
    startDate?: string,
    endDate?: string,
    limit: number = 10
  ): Promise<FacultyEvent[]> {
    try {
      // Verificar permissão de acesso
      const { data: hasAccess } = await supabase
        .rpc('is_faculty_member', { faculty_id_param: facultyId });
      
      if (!hasAccess) {
        console.error('Acesso negado aos eventos do ambiente');
        return [];
      }
      
      // Iniciar a consulta - usar apenas os dados básicos sem tentar fazer join
      let query = supabase
        .from('faculty_events')
        .select('*')
        .eq('faculty_id', facultyId)
        .order('start_date', { ascending: true });
      
      // Filtrar por data de início, se fornecida
      if (startDate) {
        query = query.gte('start_date', startDate);
      }
      
      // Filtrar por data de fim, se fornecida
      if (endDate) {
        query = query.lte('start_date', endDate);
      }
      
      // Aplicar limite
      query = query.limit(limit);
      
      // Executar a consulta
      const { data: events, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar eventos:', error);
        return [];
      }
      
      if (!events || events.length === 0) {
        return [];
      }
      
      // Buscar informações dos criadores
      const creatorIds = [...new Set(events.map(event => event.creator_id))];
      const usersInfo = await this.getUsersInfo(creatorIds);
      
      // Adicionar informações dos usuários aos eventos
      const eventsWithUsers = events.map(event => ({
        ...event,
        user: usersInfo[event.creator_id] || {
          id: event.creator_id
        }
      }));
      
      return eventsWithUsers;
    } catch (error) {
      console.error('Erro ao buscar eventos da faculdade:', error);
      return [];
    }
  }
  
  /**
   * Cria um novo evento na faculdade
   * @param facultyId ID da faculdade
   * @param eventData Dados do evento
   * @returns ID do evento criado ou null em caso de erro
   */
  static async createFacultyEvent(
    facultyId: number,
    eventData: {
      title: string;
      description?: string;
      location?: string;
      start_date: string;
      end_date?: string;
      all_day: boolean;
      color?: string;
      type: 'exam' | 'assignment' | 'lecture' | 'meeting' | 'other';
      is_public: boolean;
    }
  ): Promise<number | null> {
    try {
      // Obter o ID do usuário atual
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error('Erro ao obter usuário atual:', userError);
        return null;
      }
      
      // Verificar se o usuário é administrador
      const { data: isAdmin } = await supabase
        .rpc('is_faculty_admin', { faculty_id_param: facultyId });
      
      if (!isAdmin) {
        console.error('Permissão negada: apenas administradores podem criar eventos');
        return null;
      }
      
      // Criar o evento
      const { data, error } = await supabase
        .from('faculty_events')
        .insert({
          faculty_id: facultyId,
          creator_id: userData.user.id,
          title: eventData.title,
          description: eventData.description || null,
          location: eventData.location || null,
          start_date: eventData.start_date,
          end_date: eventData.end_date || null,
          all_day: eventData.all_day,
          color: eventData.color || null,
          type: eventData.type,
          is_public: eventData.is_public
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Erro ao criar evento:', error);
        return null;
      }
      
      return data.id;
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      return null;
    }
  }
  
  /**
   * Atualiza um evento existente
   * @param eventId ID do evento
   * @param eventData Dados atualizados do evento
   * @returns true se a operação foi bem-sucedida, false caso contrário
   */
  static async updateFacultyEvent(
    eventId: number,
    eventData: {
      title?: string;
      description?: string | null;
      location?: string | null;
      start_date?: string;
      end_date?: string | null;
      all_day?: boolean;
      color?: string | null;
      type?: 'exam' | 'assignment' | 'lecture' | 'meeting' | 'other';
      is_public?: boolean;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('faculty_events')
        .update(eventData)
        .eq('id', eventId);
      
      if (error) {
        console.error('Erro ao atualizar evento:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      return false;
    }
  }
  
  /**
   * Exclui um evento
   * @param eventId ID do evento
   * @returns true se a operação foi bem-sucedida, false caso contrário
   */
  static async deleteFacultyEvent(eventId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('faculty_events')
        .delete()
        .eq('id', eventId);
      
      if (error) {
        console.error('Erro ao excluir evento:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      return false;
    }
  }

  /**
   * Busca os próximos eventos de uma faculdade
   * @param facultyId ID da faculdade
   * @param limit Limite de resultados (padrão: 5)
   * @returns Lista de próximos eventos ou array vazio em caso de erro
   */
  static async getUpcomingFacultyEvents(
    facultyId: number,
    limit: number = 5
  ): Promise<FacultyEvent[]> {
    try {
      // Obter a data atual no formato ISO
      const currentDate = new Date().toISOString();
      
      // Buscar eventos a partir da data atual
      return this.getFacultyEvents(facultyId, currentDate, undefined, limit);
    } catch (error) {
      console.error('Erro ao buscar próximos eventos:', error);
      return [];
    }
  }

  /**
   * Busca informações de vários usuários de uma vez
   * @param userIds Array de IDs de usuários
   * @returns Mapa de informações de usuários ou objeto vazio em caso de erro
   */
  static async getUsersInfo(userIds: string[]): Promise<Record<string, any>> {
    if (!userIds || userIds.length === 0) {
      return {};
    }

    try {
      // Buscar informações dos perfis diretamente
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);
      
      if (error) {
        console.error('Erro ao buscar perfis:', error);
        return {};
      }
      
      // Criar um mapa de ID do usuário para informações do perfil
      const userMap: Record<string, any> = {};
      
      profiles?.forEach(profile => {
        userMap[profile.id] = {
          id: profile.id,
          name: profile.full_name || profile.username,
          username: profile.username,
          avatar_url: profile.avatar_url
        };
      });
      
      return userMap;
    } catch (error) {
      console.error('Erro ao buscar informações dos usuários:', error);
      return {};
    }
  }

  /**
   * Deleta um ambiente de faculdade
   * @param facultyId ID do ambiente a ser deletado
   * @returns true se foi deletado com sucesso, false caso contrário
   */
  static async deleteFaculty(facultyId: number): Promise<boolean> {
    try {
      // Verificar se o usuário é o proprietário
      const { data: isOwner } = await supabase
        .rpc('is_faculty_owner', { faculty_id_param: facultyId });
      
      if (!isOwner) {
        console.error('Apenas o proprietário pode excluir o ambiente');
        return false;
      }
      
      // Deletar o ambiente
      const { error } = await supabase
        .from('faculties')
        .delete()
        .eq('id', facultyId);
      
      if (error) {
        console.error('Erro ao deletar ambiente:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao deletar ambiente:', error);
      return false;
    }
  }
}