'use client';

import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface StudyRoomUser {
  id: string;
  username: string;
  avatar_url?: string;
  entrou_em: string;
  tempo_total?: number; // em segundos
}

export interface StudyRoom {
  id: string;
  name: string;
  description?: string;
  capacity: number;
  active_users: number;
}

// Mapeamento de IDs antigos para novos UUIDs
// Este objeto será preenchido dinamicamente na inicialização
const legacyIdMapping: Record<string, string> = {};

export class StudyRoomService {
  private static channels: Record<string, any> = {};
  private static initialized = false;
  
  /**
   * Inicializar o serviço e carregar o mapeamento de IDs
   */
  private static async initialize() {
    if (this.initialized) return;
    
    try {
      const { data, error } = await supabase
        .from('study_rooms')
        .select('id, name')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      // Criar mapeamento baseado no nome da sala
      // Isso é uma solução temporária para compatibilidade
      if (data) {
        const nameToLegacyId: Record<string, string> = {
          'Cardiologia Avançada': 'cardiologia',
          'Neurologia e Neurociência': 'neurologia',
          'Técnicas Cirúrgicas': 'cirurgia',
          'Pediatria Geral': 'pediatria',
          'Preparação para Residência': 'residencia'
        };
        
        data.forEach(room => {
          const legacyId = nameToLegacyId[room.name];
          if (legacyId) {
            legacyIdMapping[legacyId] = room.id;
          }
        });
        
        console.log('Mapeamento de IDs antigos inicializado:', legacyIdMapping);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Erro ao inicializar mapeamento de IDs:', error);
    }
  }
  
  /**
   * Resolver ID da sala (suporta tanto IDs legados quanto UUIDs)
   */
  private static async resolveRoomId(roomId: string): Promise<string> {
    await this.initialize();
    
    // Verificar se é um ID legado
    if (legacyIdMapping[roomId]) {
      console.log(`ID legado '${roomId}' resolvido para UUID '${legacyIdMapping[roomId]}'`);
      return legacyIdMapping[roomId];
    }
    
    // Verificar se é um UUID válido ou outro formato não reconhecido
    return roomId;
  }
  
  /**
   * Obter todas as salas de estudo disponíveis
   */
  static async getStudyRooms(): Promise<StudyRoom[]> {
    await this.initialize();
    
    try {
      const { data, error } = await supabase
        .from('study_rooms')
        .select('*')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar salas de estudo:', error);
      return [];
    }
  }
  
  /**
   * Entrar em uma sala de estudo
   * @param roomId ID da sala
   * @param username Nome do usuário
   */
  static async joinRoom(roomId: string): Promise<boolean> {
    try {
      // Resolver o ID da sala
      const resolvedRoomId = await this.resolveRoomId(roomId);
      
      // Verificar se o usuário está autenticado
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Usuário não autenticado');
      }
      
      const user = userData.user;
      const timestamp = new Date().toISOString();
      
      // Obter o nome de usuário do perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
      
      const username = profileData?.username || user.email?.split('@')[0] || 'Anônimo';
      
      // Registrar entrada na sala
      const { error } = await supabase
        .from('study_room_users')
        .upsert({
          user_id: user.id,
          room_id: resolvedRoomId,
          username,
          avatar_url: profileData?.avatar_url,
          entrou_em: timestamp,
          esta_online: true
        }, {
          onConflict: 'user_id, room_id'
        });
      
      if (error) {
        throw error;
      }
      
      // Iniciar o canal de presença
      this.setupPresenceChannel(resolvedRoomId, user.id, username, profileData?.avatar_url);
      
      return true;
    } catch (error) {
      console.error('Erro ao entrar na sala:', error);
      return false;
    }
  }
  
  /**
   * Configurar o canal de presença para a sala
   */
  private static setupPresenceChannel(roomId: string, userId: string, username: string, avatarUrl?: string) {
    // Verificar se já existe um canal para esta sala
    if (this.channels[roomId]) {
      return this.channels[roomId];
    }
    
    // Criar um novo canal
    const channel = supabase.channel(`study_room_${roomId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });
    
    // Configurar os eventos de presença
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Estado de presença sincronizado:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Novo usuário entrou:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Usuário saiu:', key, leftPresences);
      });
    
    // Registrar presença do usuário
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          username,
          avatar_url: avatarUrl,
          entrou_em: new Date().toISOString()
        });
      }
    });
    
    // Armazenar o canal
    this.channels[roomId] = channel;
    
    return channel;
  }
  
  /**
   * Sair de uma sala de estudo
   * @param roomId ID da sala
   */
  static async leaveRoom(roomId: string): Promise<boolean> {
    try {
      console.log(`Iniciando processo de saída da sala: ${roomId}`);
      // Resolver o ID da sala
      const resolvedRoomId = await this.resolveRoomId(roomId);
      console.log(`ID resolvido: ${resolvedRoomId}`);
      
      // Verificar se o usuário está autenticado
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Usuário não autenticado');
      }
      
      const user = userData.user;
      console.log(`Usuário ${user.id} está saindo da sala ${resolvedRoomId}`);
      
      // Obter o horário de entrada
      const { data: userSession } = await supabase
        .from('study_room_users')
        .select('entrou_em, tempo_total, esta_online')
        .eq('user_id', user.id)
        .eq('room_id', resolvedRoomId)
        .single();
      
      if (userSession) {
        // Verificar se o usuário já está offline
        if (!userSession.esta_online) {
          console.log(`Usuário ${user.id} já está offline na sala ${resolvedRoomId}`);
          return true;
        }
        
        // Calcular tempo total de estudo
        const entradaTime = new Date(userSession.entrou_em).getTime();
        const saidaTime = new Date().getTime();
        const tempoSessao = Math.floor((saidaTime - entradaTime) / 1000); // em segundos
        const tempoTotal = (userSession.tempo_total || 0) + tempoSessao;
        
        console.log(`Tempo da sessão: ${tempoSessao}s, Tempo total atualizado: ${tempoTotal}s`);
        
        // Atualizar registro no banco
        const { error: updateError } = await supabase
          .from('study_room_users')
          .update({
            esta_online: false,
            tempo_total: tempoTotal
          })
          .eq('user_id', user.id)
          .eq('room_id', resolvedRoomId);
          
        if (updateError) {
          console.error('Erro ao atualizar status do usuário:', updateError);
          throw updateError;
        }
        
        console.log(`Status do usuário atualizado com sucesso na sala ${resolvedRoomId}`);
      } else {
        console.log(`Nenhuma sessão encontrada para o usuário ${user.id} na sala ${resolvedRoomId}`);
      }
      
      // Remover presença do canal
      if (this.channels[resolvedRoomId]) {
        console.log(`Removendo canal de presença para sala ${resolvedRoomId}`);
        await this.channels[resolvedRoomId].untrack();
        delete this.channels[resolvedRoomId];
      }
      
      // Também limpar o canal com o ID não resolvido, por segurança
      if (roomId !== resolvedRoomId && this.channels[roomId]) {
        console.log(`Removendo canal de presença adicional para ID ${roomId}`);
        await this.channels[roomId].untrack();
        delete this.channels[roomId];
      }
      
      console.log(`Usuário ${user.id} saiu com sucesso da sala ${resolvedRoomId}`);
      return true;
    } catch (error) {
      console.error('Erro ao sair da sala:', error);
      return false;
    }
  }
  
  /**
   * Obter usuários online em uma sala
   * @param roomId ID da sala
   */
  static async getOnlineUsers(roomId: string): Promise<StudyRoomUser[]> {
    try {
      // Resolver o ID da sala
      const resolvedRoomId = await this.resolveRoomId(roomId);
      
      const { data, error } = await supabase
        .from('study_room_users')
        .select('user_id, username, avatar_url, entrou_em, tempo_total')
        .eq('room_id', resolvedRoomId)
        .eq('esta_online', true)
        .order('entrou_em');
      
      if (error) {
        throw error;
      }
      
      // Mapear os dados para o formato correto
      return (data || []).map(user => ({
        id: user.user_id,
        username: user.username,
        avatar_url: user.avatar_url,
        entrou_em: user.entrou_em,
        tempo_total: user.tempo_total
      }));
    } catch (error) {
      console.error('Erro ao buscar usuários online:', error);
      return [];
    }
  }
  
  /**
   * Obter estatísticas de estudo do usuário atual
   */
  static async getUserStats(): Promise<{ total_time: number; sessions: number }> {
    try {
      // Verificar se o usuário está autenticado
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('Usuário não autenticado');
      }
      
      const user = userData.user;
      
      // Buscar todas as sessões do usuário
      const { data, error } = await supabase
        .from('study_room_users')
        .select('tempo_total')
        .eq('user_id', user.id);
      
      if (error) {
        throw error;
      }
      
      // Calcular tempo total e número de sessões
      const totalTime = data.reduce((acc, session) => acc + (session.tempo_total || 0), 0);
      
      return {
        total_time: totalTime,
        sessions: data.length
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas do usuário:', error);
      return { total_time: 0, sessions: 0 };
    }
  }
  
  /**
   * Obter o ranking dos usuários com mais tempo de estudo na sala
   * @param roomId ID da sala
   * @param limit Limite de usuários a serem retornados (padrão: 3)
   */
  static async getTopUsersByTime(roomId: string, limit: number = 3): Promise<StudyRoomUser[]> {
    try {
      // Resolver o ID da sala
      const resolvedRoomId = await this.resolveRoomId(roomId);
      
      const { data, error } = await supabase
        .from('study_room_users')
        .select('user_id, username, avatar_url, entrou_em, tempo_total')
        .eq('room_id', resolvedRoomId)
        .order('tempo_total', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw error;
      }
      
      // Mapear os dados para o formato correto
      return (data || []).map(user => ({
        id: user.user_id,
        username: user.username,
        avatar_url: user.avatar_url,
        entrou_em: user.entrou_em,
        tempo_total: user.tempo_total || 0
      }));
    } catch (error) {
      console.error('Erro ao buscar ranking de usuários:', error);
      return [];
    }
  }
} 