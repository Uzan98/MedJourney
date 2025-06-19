'use client';

import { supabase } from '@/lib/supabase';

export interface StudyGroupMember {
  user_id: string;
  username: string;
  avatar_url?: string;
  joined_at: string;
  is_admin: boolean;
  is_active: boolean;
  total_study_time: number; // em segundos
  last_active_at: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  access_code: string;
  is_private: boolean;
  discipline_id?: number;
  subject_id?: number;
  max_members: number;
  image_url?: string;
  color_theme: string;
  members_count?: number; // Contagem de membros (calculada)
  online_count?: number; // Contagem de membros online (calculada)
}

export class StudyGroupService {
  private static channels: Record<string, any> = {};
  
  /**
   * Garantir que o perfil do usuário exista
   * @param userId ID do usuário
   * @param email Email do usuário para fallback do nome
   */
  private static async ensureUserProfile(userId: string, email?: string): Promise<string> {
    try {
      // Verificar se o perfil já existe
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();
      
      if (profile?.username) {
        return profile.username;
      }
      
      // Se não existir, criar um novo perfil
      const username = email ? email.split('@')[0] : 'Usuário';
      
      await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      return username;
    } catch (error) {
      console.error('Erro ao verificar/criar perfil:', error);
      return email ? email.split('@')[0] : 'Anônimo';
    }
  }
  
  /**
   * Buscar todos os grupos de estudos que o usuário participa
   */
  static async getUserGroups(): Promise<StudyGroup[]> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: memberships, error: membershipError } = await supabase
        .from('study_group_members')
        .select('group_id')
        .eq('user_id', userData.user.id);

      if (membershipError) {
        throw membershipError;
      }

      // Se o usuário não participa de nenhum grupo, retorna array vazio
      if (!memberships || memberships.length === 0) {
        return [];
      }

      // Buscar detalhes dos grupos
      const groupIds = memberships.map(m => m.group_id);
      
      const { data: groups, error: groupsError } = await supabase
        .from('study_groups')
        .select(`
          *,
          members_count:study_group_members(count)
        `)
        .in('id', groupIds);

      if (groupsError) {
        throw groupsError;
      }

      // Processar dados para incluir contagens
      return await Promise.all((groups || []).map(async group => {
        // Contar membros online para cada grupo
        const { count: onlineCount, error: onlineError } = await supabase
          .from('study_group_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('group_id', group.id)
          .eq('is_active', true);

        return {
          ...group,
          members_count: group.members_count ? (group.members_count as any).count || 0 : 0,
          online_count: onlineCount || 0
        };
      }));
    } catch (error) {
      console.error('Erro ao buscar grupos do usuário:', error);
      return [];
    }
  }

  /**
   * Buscar todos os grupos de estudos públicos ou por código
   * @param searchTerm Termo para busca (nome do grupo ou código)
   */
  static async searchGroups(searchTerm: string = ''): Promise<StudyGroup[]> {
    try {
      let query = supabase
        .from('study_groups')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        // Verificar se é um código de acesso exato ou uma busca por nome
        if (searchTerm.length === 6 && searchTerm === searchTerm.toUpperCase()) {
          // Busca por código de acesso exato
          query = query.eq('access_code', searchTerm);
        } else {
          // Busca por nome (parcial)
          query = query.ilike('name', `%${searchTerm}%`);
        }
      } else {
        // Se não houver termo de busca, mostrar apenas grupos públicos
        query = query.eq('is_private', false);
      }

      const { data: groups, error } = await query;

      if (error) {
        throw error;
      }

      // Processar dados para incluir contagens
      return await Promise.all((groups || []).map(async group => {
        // Contar membros
        const { count: membersCount, error: membersError } = await supabase
          .from('study_group_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('group_id', group.id);
          
        // Contar membros online para cada grupo
        const { count: onlineCount, error: onlineError } = await supabase
          .from('study_group_members')
          .select('user_id', { count: 'exact', head: true })
          .eq('group_id', group.id)
          .eq('is_active', true);

        return {
          ...group,
          members_count: membersCount || 0,
          online_count: onlineCount || 0
        };
      }));
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      return [];
    }
  }

  /**
   * Obter detalhes de um grupo específico
   * @param groupId ID do grupo
   */
  static async getGroupDetails(groupId: string): Promise<StudyGroup | null> {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      // Contar membros
      const { count: membersCount, error: membersError } = await supabase
        .from('study_group_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('group_id', groupId);
        
      // Contar membros online
      const { count: onlineCount, error: onlineError } = await supabase
        .from('study_group_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('is_active', true);

      return {
        ...data,
        members_count: membersCount || 0,
        online_count: onlineCount || 0
      };
    } catch (error) {
      console.error('Erro ao buscar detalhes do grupo:', error);
      return null;
    }
  }

  /**
   * Verificar se um usuário é membro de um grupo
   * @param groupId ID do grupo
   */
  static async isGroupMember(groupId: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        return false;
      }

      const { data, error } = await supabase
        .from('study_group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', userData.user.id)
        .single();

      return !!data;
    } catch (error) {
      console.error('Erro ao verificar membro do grupo:', error);
      return false;
    }
  }

  /**
   * Criar um novo grupo de estudos
   */
  static async createGroup(groupData: Partial<StudyGroup>): Promise<StudyGroup | null> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Usuário não autenticado');
      }

      // Garantir que o perfil do usuário exista
      const username = await this.ensureUserProfile(userData.user.id, userData.user.email);

      // Gerar código de acesso aleatório se não foi fornecido
      if (!groupData.access_code) {
        // Gerar código aleatório de 6 caracteres (letras e números)
        groupData.access_code = Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      // Criar o novo grupo
      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .insert({
          ...groupData,
          owner_id: userData.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (groupError) {
        throw groupError;
      }

      // Adicionar o criador como membro administrador
      const { error: memberError } = await supabase
        .from('study_group_members')
        .insert({
          group_id: group.id,
          user_id: userData.user.id,
          is_admin: true,
          joined_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          is_active: false,
          total_study_time: 0
        });

      if (memberError) {
        throw memberError;
      }

      return group;
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      return null;
    }
  }

  /**
   * Entrar em um grupo usando código de acesso
   * @param accessCode Código de acesso do grupo
   */
  static async joinGroupByCode(accessCode: string): Promise<{success: boolean, groupId?: string, message?: string}> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        return { success: false, message: 'Usuário não autenticado' };
      }

      // Garantir que o perfil do usuário exista
      const username = await this.ensureUserProfile(userData.user.id, userData.user.email);

      // Buscar grupo pelo código
      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .select('id, max_members')
        .eq('access_code', accessCode)
        .single();

      if (groupError || !group) {
        return { success: false, message: 'Código de acesso inválido' };
      }

      // Verificar se o usuário já é membro
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('study_group_members')
        .select('user_id')
        .eq('group_id', group.id)
        .eq('user_id', userData.user.id)
        .single();

      if (existingMember) {
        return { success: true, groupId: group.id, message: 'Você já é membro deste grupo' };
      }

      // Verificar se o grupo está cheio
      const { count: membersCount, error: countError } = await supabase
        .from('study_group_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('group_id', group.id);
        
      if ((membersCount || 0) >= group.max_members) {
        return { success: false, message: 'Este grupo já atingiu o número máximo de membros' };
      }

      // Adicionar usuário como membro
      const { error: joinError } = await supabase
        .from('study_group_members')
        .insert({
          group_id: group.id,
          user_id: userData.user.id,
          is_admin: false,
          joined_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          is_active: false,
          total_study_time: 0
        });

      if (joinError) {
        throw joinError;
      }

      return { success: true, groupId: group.id, message: 'Você entrou no grupo com sucesso' };
    } catch (error) {
      console.error('Erro ao entrar no grupo:', error);
      return { success: false, message: 'Erro ao entrar no grupo' };
    }
  }

  /**
   * Entrar em um grupo (marcar como ativo)
   * @param groupId ID do grupo
   */
  static async enterGroup(groupId: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Verificar se o usuário é membro do grupo
      const { data: memberData, error: memberError } = await supabase
        .from('study_group_members')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('group_id', groupId)
        .single();
      
      if (memberError) {
        if (memberError.code === 'PGRST116') {
          // Não é membro, não pode entrar
          console.error('Usuário não é membro do grupo');
          return false;
        }
        throw memberError;
      }
      
      // Atualizar status para ativo e registrar hora de entrada
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('study_group_members')
        .update({
          is_active: true,
          joined_at: now,
          last_active_at: now
        })
        .eq('user_id', userData.user.id)
        .eq('group_id', groupId);
      
      if (updateError) {
        throw updateError;
      }
      
      // Configurar canal de presença para este grupo
      this.setupPresenceChannel(groupId, userData.user.id);
      
      return true;
    } catch (error) {
      console.error('Erro ao entrar no grupo:', error);
      return false;
    }
  }

  /**
   * Sair temporariamente de um grupo (marcar como inativo)
   * @param groupId ID do grupo
   */
  static async exitGroup(groupId: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Parar o heartbeat imediatamente para evitar que o usuário seja marcado como online novamente
      this.stopPresenceHeartbeat(groupId);
      
      // Obter informações do membro
      const { data: memberData, error: memberError } = await supabase
        .from('study_group_members')
        .select('joined_at, total_study_time, is_active')
        .eq('user_id', userData.user.id)
        .eq('group_id', groupId)
        .single();
      
      if (memberError) {
        throw memberError;
      }
      
      // Se já estiver inativo, não há nada a fazer
      if (!memberData.is_active) {
        return true;
      }
      
      // Calcular tempo de estudo desta sessão
      const joinedTime = new Date(memberData.joined_at).getTime();
      const exitTime = new Date().getTime();
      const sessionTime = Math.floor((exitTime - joinedTime) / 1000); // em segundos
      const totalTime = (memberData.total_study_time || 0) + sessionTime;
      
      console.log(`Tempo de estudo nesta sessão: ${sessionTime}s, Total acumulado: ${totalTime}s`);
      
      // Atualizar registro no banco
      const { error: updateError } = await supabase
        .from('study_group_members')
        .update({
          is_active: false,
          total_study_time: totalTime,
          last_active_at: new Date().toISOString()
        })
        .eq('user_id', userData.user.id)
        .eq('group_id', groupId);
      
      if (updateError) {
        throw updateError;
      }
      
      // Verificar se a atualização foi bem-sucedida
      const { data: checkData } = await supabase
        .from('study_group_members')
        .select('is_active')
        .eq('user_id', userData.user.id)
        .eq('group_id', groupId)
        .single();
        
      if (checkData && checkData.is_active) {
        console.error('Falha ao marcar usuário como inativo, tentando novamente');
        
        // Tentar novamente com uma abordagem mais direta
        try {
          await supabase.rpc('force_exit_group', {
            p_user_id: userData.user.id,
            p_group_id: groupId,
            p_total_time: totalTime
          });
        } catch (error) {
          console.error('RPC não disponível, usando método padrão');
          await supabase
            .from('study_group_members')
            .update({
              is_active: false,
              total_study_time: totalTime
            })
            .eq('user_id', userData.user.id)
            .eq('group_id', groupId);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao sair do grupo:', error);
      return false;
    }
  }

  /**
   * Sair permanentemente de um grupo
   * @param groupId ID do grupo
   */
  static async leaveGroup(groupId: string): Promise<boolean> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Primeiro, registrar o tempo de estudo acumulado
      await this.exitGroup(groupId);
      
      // Depois, remover o usuário do grupo
      const { error } = await supabase
        .from('study_group_members')
        .delete()
        .eq('user_id', userData.user.id)
        .eq('group_id', groupId);
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao sair do grupo:', error);
      return false;
    }
  }

  /**
   * Buscar membros de um grupo
   * @param groupId ID do grupo
   */
  static async getGroupMembers(groupId: string): Promise<StudyGroupMember[]> {
    try {
      console.log(`Buscando membros do grupo ${groupId}...`);
      
      // Buscar todos os membros de um grupo
      const { data: membersData, error } = await supabase
        .from('study_group_members')
        .select(`
          user_id,
          joined_at,
          is_admin,
          is_active,
          total_study_time,
          last_active_at
        `)
        .eq('group_id', groupId);

      if (error) {
        console.error('Erro ao buscar membros:', error);
        throw error;
      }

      if (!membersData || membersData.length === 0) {
        console.log(`Nenhum membro encontrado para o grupo ${groupId}`);
        return [];
      }

      console.log(`Encontrados ${membersData.length} membros para o grupo ${groupId}, verificando status...`);
      
      // Verificar membros inativos há mais de 1 minuto e marcar como offline
      const now = new Date().getTime();
      const inactivityThreshold = 60 * 1000; // 1 minuto em milissegundos
      const updatedMembers = [];
      
      // Atualizar status de membros inativos
      for (const member of membersData) {
        // Verificar se o membro está marcado como ativo
        if (member.is_active === true) {
          const lastActiveTime = new Date(member.last_active_at).getTime();
          const timeSinceLastActive = now - lastActiveTime;
          
          // Se estiver inativo por mais tempo que o limite, marcar como offline
          if (timeSinceLastActive > inactivityThreshold) {
            console.log(`Membro ${member.user_id} está inativo há ${Math.round(timeSinceLastActive/1000)}s, marcando como offline`);
            
            // Atualizar no objeto local
            member.is_active = false;
            
            // Atualizar no banco de dados
            await supabase
              .from('study_group_members')
              .update({ 
                is_active: false,
                // Não atualizar last_active_at para preservar o timestamp real da última atividade
              })
              .eq('group_id', groupId)
              .eq('user_id', member.user_id);
              
            console.log(`Status do membro ${member.user_id} atualizado para offline no banco de dados`);
          } else {
            console.log(`Membro ${member.user_id} está ativo (última atividade há ${Math.round(timeSinceLastActive/1000)}s)`);
          }
        } else {
          console.log(`Membro ${member.user_id} já está marcado como offline`);
        }
        
        updatedMembers.push(member);
      }

      // Buscar informações de perfil para cada membro
      const userProfiles = await Promise.all(updatedMembers.map(async (member) => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', member.user_id)
            .single();

          const result = {
            ...member,
            username: profile?.username || 'Usuário',
            avatar_url: profile?.avatar_url
          };
          
          console.log(`Perfil carregado para ${member.user_id}: ${result.username}, status: ${result.is_active ? 'online' : 'offline'}`);
          return result;
        } catch (profileError) {
          console.error(`Erro ao buscar perfil do usuário ${member.user_id}:`, profileError);
          
          // Tentar criar perfil se não existir
          await this.ensureUserProfile(member.user_id);
          
          return {
            ...member,
            username: 'Usuário',
            avatar_url: undefined
          };
        }
      }));

      // Log resumido dos membros online
      const onlineMembers = userProfiles.filter(m => m.is_active === true);
      console.log(`Total de ${userProfiles.length} membros, ${onlineMembers.length} online: ${onlineMembers.map(m => m.username).join(', ')}`);
      
      return userProfiles;
    } catch (error) {
      console.error('Erro ao buscar membros do grupo:', error);
      return [];
    }
  }

  /**
   * Obter os melhores membros por tempo de estudo
   * @param groupId ID do grupo
   * @param limit Número máximo de membros a retornar
   */
  static async getTopMembers(groupId: string, limit: number = 5): Promise<StudyGroupMember[]> {
    try {
      // Buscar membros ordenados por tempo de estudo
      const { data, error } = await supabase
        .from('study_group_members')
        .select(`
          user_id,
          joined_at,
          is_admin,
          is_active,
          total_study_time,
          last_active_at
        `)
        .eq('group_id', groupId)
        .order('total_study_time', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      if (!data) {
        return [];
      }

      // Buscar informações de perfil para cada membro
      const userProfiles = await Promise.all(data.map(async (member) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', member.user_id)
          .single();

        return {
          ...member,
          username: profile?.username || 'Usuário',
          avatar_url: profile?.avatar_url
        };
      }));

      return userProfiles;
    } catch (error) {
      console.error('Erro ao buscar ranking de membros:', error);
      return [];
    }
  }

  /**
   * Obter estatísticas de estudo do usuário atual em todos os grupos
   */
  static async getUserStats(): Promise<{ total_time: number; groups: number }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar todas as participações do usuário
      const { data, error } = await supabase
        .from('study_group_members')
        .select('total_study_time')
        .eq('user_id', userData.user.id);

      if (error) {
        throw error;
      }

      // Calcular tempo total e número de grupos
      const totalTime = data.reduce((acc, group) => acc + (group.total_study_time || 0), 0);

      return {
        total_time: totalTime,
        groups: data.length
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas do usuário:', error);
      return { total_time: 0, groups: 0 };
    }
  }

  /**
   * Configurar o canal de presença para o grupo
   */
  private static setupPresenceChannel(groupId: string, userId: string) {
    // Verificar se já existe um canal para este grupo
    if (this.channels[groupId]) {
      return this.channels[groupId];
    }

    // Criar novo canal
    const channel = supabase.channel(`study_group_${groupId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Configurar eventos de presença
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Estado de presença sincronizado:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Novo usuário entrou:', key, newPresences);
        // Atualizar status do usuário no banco de dados
        this.updateUserActiveStatus(groupId, key, true);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Usuário saiu:', key, leftPresences);
        // Atualizar status do usuário no banco de dados
        this.updateUserActiveStatus(groupId, key, false);
      });

    // Registrar presença do usuário
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString()
        });
      }
    });

    // Armazenar o canal
    this.channels[groupId] = channel;

    return channel;
  }

  /**
   * Atualizar o status de atividade do usuário no banco de dados
   */
  private static async updateUserActiveStatus(groupId: string, userId: string, isActive: boolean) {
    try {
      // Atualizar status do usuário no banco de dados
      const { error } = await supabase
        .from('study_group_members')
        .update({
          is_active: isActive,
          last_active_at: new Date().toISOString()
        })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao atualizar status de atividade:', error);
      }
    } catch (error) {
      console.error('Erro ao atualizar status de atividade:', error);
    }
  }

  /**
   * Enviar mensagem para o chat do grupo
   * @param groupId ID do grupo
   * @param message Texto da mensagem
   */
  static async sendMessage(groupId: string, message: string): Promise<boolean> {
    try {
      console.log(`Enviando mensagem para o grupo ${groupId}: "${message.substring(0, 20)}${message.length > 20 ? '...' : ''}"`);
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Usuário não autenticado');
      }

      // Garantir que o perfil do usuário exista
      const username = await this.ensureUserProfile(userData.user.id, userData.user.email);
      
      // Preparar dados da mensagem
      const messageData = {
        group_id: groupId,
        user_id: userData.user.id,
        message: message,
        created_at: new Date().toISOString(),
        is_system_message: false
      };
      
      console.log('Dados da mensagem a ser inserida:', messageData);

      // Inserir mensagem no banco
      const { data, error } = await supabase
        .from('study_group_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Erro ao inserir mensagem:', error);
        throw error;
      }
      
      console.log('Mensagem inserida com sucesso:', data);

      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  }

  /**
   * Buscar mensagens do chat de um grupo
   * @param groupId ID do grupo
   * @param limit Número máximo de mensagens a retornar
   */
  static async getGroupMessages(groupId: string, limit: number = 100): Promise<any[]> {
    try {
      // Buscar mensagens do grupo
      const { data: messages, error } = await supabase
        .from('study_group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      if (!messages) {
        return [];
      }

      // Buscar informações dos usuários para cada mensagem
      const messagesWithUserInfo = await Promise.all(messages.map(async (msg) => {
        // Pular busca de perfil para mensagens do sistema
        if (msg.is_system_message) {
          return {
            ...msg,
            username: 'Sistema'
          };
        }

        // Garantir que o perfil do usuário exista
        const username = await this.ensureUserProfile(msg.user_id);

        return {
          ...msg,
          username
        };
      }));

      return messagesWithUserInfo;
    } catch (error) {
      console.error('Erro ao buscar mensagens do grupo:', error);
      return [];
    }
  }

  /**
   * Configurar subscription para novas mensagens
   * @param groupId ID do grupo
   * @param callback Função a ser chamada quando uma nova mensagem chegar
   */
  static subscribeToMessages(groupId: string, callback: (message: any) => void): any {
    try {
      console.log(`Configurando subscription para mensagens do grupo ${groupId}`);
      
      // Verificar se já existe um canal para este grupo
      if (this.channels[`messages_${groupId}`]) {
        console.log('Reusando canal de mensagens existente');
        return this.channels[`messages_${groupId}`];
      }
      
      // Criar novo canal
      const channel = supabase
        .channel(`messages_${groupId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'study_group_messages',
            filter: `group_id=eq.${groupId}`
          },
          async (payload) => {
            console.log('Nova mensagem recebida via realtime:', payload);
            const newMessage = payload.new;
            
            try {
              // Buscar informações do usuário
              if (!newMessage.is_system_message) {
                // Buscar perfil do usuário diretamente
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('username')
                  .eq('id', newMessage.user_id)
                  .single();
                  
                newMessage.username = profile?.username || 'Usuário';
              } else {
                newMessage.username = 'Sistema';
              }
              
              console.log('Mensagem processada com sucesso:', newMessage);
              callback(newMessage);
            } catch (error) {
              console.error('Erro ao processar mensagem recebida:', error);
              // Ainda enviar a mensagem mesmo com erro no processamento
              newMessage.username = 'Usuário';
              callback(newMessage);
            }
          }
        );
      
      // Inscrever no canal e armazenar
      channel.subscribe((status) => {
        console.log(`Status da subscription de mensagens: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log(`Subscription de mensagens ativa para o grupo ${groupId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Erro na subscription de mensagens do grupo ${groupId}`);
        }
      });
      
      // Armazenar o canal para reutilização
      this.channels[`messages_${groupId}`] = {
        channel,
        unsubscribe: () => {
          console.log(`Cancelando subscription de mensagens do grupo ${groupId}`);
          channel.unsubscribe();
          delete this.channels[`messages_${groupId}`];
        }
      };
        
      return this.channels[`messages_${groupId}`];
    } catch (error) {
      console.error('Erro ao configurar subscription de mensagens:', error);
      return {
        unsubscribe: () => console.log('Nada para desinscrever (erro na configuração)')
      };
    }
  }

  /**
   * Configurar subscription para atualizações de presença
   * @param groupId ID do grupo
   * @param callback Função a ser chamada quando houver mudança na presença
   */
  static subscribeToPresence(groupId: string, callback: (members: StudyGroupMember[]) => void): any {
    try {
      console.log(`Configurando subscription para presença no grupo ${groupId}`);
      
      // Configuramos um canal para mudanças no banco de dados
      const dbChannel = supabase
        .channel(`db_presence_${groupId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'study_group_members',
            filter: `group_id=eq.${groupId}`
          },
          async () => {
            console.log('Mudança na tabela de membros, buscando membros atualizados');
            // Buscar lista atualizada de membros quando houver mudança no banco
            const members = await this.getGroupMembers(groupId);
            callback(members);
          }
        )
        .subscribe();
      
      // Iniciar o heartbeat para manter o usuário online
      this.startPresenceHeartbeat(groupId);
      
      // Configurar verificação periódica de membros inativos
      const checkInterval = setInterval(async () => {
        try {
          console.log('Verificando membros inativos periodicamente...');
          await this.checkAndUpdateInactiveMembers(groupId);
          
          // Atualizar a lista de membros após a verificação
          const updatedMembers = await this.getGroupMembers(groupId);
          callback(updatedMembers);
        } catch (error) {
          console.error('Erro ao verificar membros inativos:', error);
        }
      }, 15000); // Verificar a cada 15 segundos
      
      // Retornar um objeto que permite desinscrever do canal
      return {
        unsubscribe: () => {
          console.log('Cancelando subscription de presença');
          dbChannel.unsubscribe();
          clearInterval(checkInterval);
          this.stopPresenceHeartbeat(groupId);
        }
      };
    } catch (error) {
      console.error('Erro ao configurar subscription de presença:', error);
      return {
        unsubscribe: () => {}
      };
    }
  }
  
  /**
   * Verificar e atualizar membros inativos
   * @param groupId ID do grupo
   */
  private static async checkAndUpdateInactiveMembers(groupId: string): Promise<void> {
    try {
      // Buscar membros ativos
      const { data: activeMembers, error } = await supabase
        .from('study_group_members')
        .select('user_id, last_active_at')
        .eq('group_id', groupId)
        .eq('is_active', true);
        
      if (error) {
        console.error('Erro ao buscar membros ativos:', error);
        return;
      }
      
      if (!activeMembers || activeMembers.length === 0) {
        return;
      }
      
      console.log(`Verificando ${activeMembers.length} membros ativos`);
      
      const now = new Date().getTime();
      const inactivityThreshold = 30 * 1000; // 30 segundos de inatividade
      let updatedAny = false;
      
      // Verificar cada membro ativo
      for (const member of activeMembers) {
        const lastActiveTime = new Date(member.last_active_at).getTime();
        const timeSinceLastActive = now - lastActiveTime;
        
        if (timeSinceLastActive > inactivityThreshold) {
          console.log(`Membro ${member.user_id} está inativo há ${Math.round(timeSinceLastActive/1000)}s, marcando como offline`);
          
          // Marcar como inativo no banco de dados
          const { error: updateError } = await supabase
            .from('study_group_members')
            .update({ 
              is_active: false 
            })
            .eq('group_id', groupId)
            .eq('user_id', member.user_id);
            
          if (updateError) {
            console.error('Erro ao atualizar status do membro:', updateError);
          } else {
            updatedAny = true;
          }
        }
      }
      
      // Se algum membro foi atualizado, enviar mensagem de sistema
      if (updatedAny) {
        console.log('Membros atualizados, enviando notificação');
      }
    } catch (error) {
      console.error('Erro ao verificar membros inativos:', error);
    }
  }
  
  // Armazenar os intervalos de heartbeat
  private static heartbeatIntervals: Record<string, NodeJS.Timeout> = {};

  /**
   * Iniciar o heartbeat para manter o usuário online
   * @param groupId ID do grupo
   */
  private static async startPresenceHeartbeat(groupId: string) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Limpar qualquer intervalo existente para este grupo
      this.stopPresenceHeartbeat(groupId);

      // Atualizar o status para ativo imediatamente
      await this.updateUserActiveStatus(groupId, userData.user.id, true);

      // Configurar um intervalo para atualizar o status periodicamente
      this.heartbeatIntervals[groupId] = setInterval(async () => {
        await this.updateUserActiveStatus(groupId, userData.user.id, true);
      }, 10000); // Atualizar a cada 10 segundos

      // Configurar evento para quando o usuário fechar a página
      if (typeof window !== 'undefined') {
        const handleBeforeUnload = async () => {
          console.log('Página sendo fechada, marcando usuário como inativo');
          await this.updateUserActiveStatus(groupId, userData.user.id, false);
        };
        
        // Remover handler existente se houver
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        // Adicionar novo handler
        window.addEventListener('beforeunload', handleBeforeUnload);
      }
    } catch (error) {
      console.error('Erro ao iniciar heartbeat:', error);
    }
  }

  /**
   * Parar o heartbeat
   * @param groupId ID do grupo
   */
  private static stopPresenceHeartbeat(groupId: string) {
    if (this.heartbeatIntervals[groupId]) {
      clearInterval(this.heartbeatIntervals[groupId]);
      delete this.heartbeatIntervals[groupId];
    }
  }
}
