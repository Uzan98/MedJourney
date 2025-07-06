import { supabase } from '@/lib/supabase';
import { 
  Post, 
  Comment, 
  Reaction, 
  PostType, 
  ReactionType, 
  CommunityFeedFilters 
} from '@/types/community';

export class CommunityFeedService {
  /**
   * Buscar posts do feed da comunidade com filtros opcionais
   */
  static async getPosts(filters?: CommunityFeedFilters, page: number = 1, limit: number = 10): Promise<Post[]> {
    try {
      // Simulação de dados para desenvolvimento inicial
      // TODO: Implementar a busca real no Supabase quando a tabela for criada
      const mockPosts: Post[] = [
        {
          id: '1',
          user_id: '123',
          username: 'Maria Silva',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
          content: 'Acabei de completar meu simulado de Cardiologia com 85% de acertos!',
          type: PostType.EXAM_RESULT,
          metadata: {
            exam_id: 'exam123',
            exam_title: 'Simulado de Cardiologia - Avançado',
            score: 85,
            total_questions: 40,
            correct_answers: 34,
            time_spent: 3600
          },
          visibility: 'public',
          reactions_count: {
            like: 12,
            celebrate: 5,
            insightful: 2,
            helpful: 1
          },
          comments_count: 3,
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '2',
          user_id: '456',
          username: 'João Pereira',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joao',
          content: 'Alcancei 30 dias consecutivos de estudo! 🔥',
          type: PostType.STUDY_MILESTONE,
          metadata: {
            milestone_type: 'streak',
            value: 30
          },
          visibility: 'public',
          reactions_count: {
            like: 25,
            celebrate: 10,
            insightful: 0,
            helpful: 0
          },
          comments_count: 5,
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '3',
          user_id: '789',
          username: 'Ana Costa',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
          content: 'Compartilhando meu resumo sobre Farmacologia Básica',
          type: PostType.NOTE,
          visibility: 'public',
          attachments: [
            {
              id: 'att1',
              post_id: '3',
              url: 'https://example.com/files/resumo-farmacologia.pdf',
              type: 'pdf',
              title: 'Resumo - Farmacologia Básica.pdf'
            }
          ],
          reactions_count: {
            like: 8,
            celebrate: 0,
            insightful: 15,
            helpful: 20
          },
          comments_count: 12,
          created_at: new Date(Date.now() - 172800000).toISOString(),
        }
      ];
      
      // Aplicar filtros se fornecidos
      let filteredPosts = [...mockPosts];
      
      if (filters) {
        if (filters.type) {
          filteredPosts = filteredPosts.filter(post => filters.type?.includes(post.type));
        }
        
        if (filters.user_id) {
          filteredPosts = filteredPosts.filter(post => post.user_id === filters.user_id);
        }
        
        if (filters.group_id) {
          filteredPosts = filteredPosts.filter(post => post.group_id === filters.group_id);
        }
        
        if (filters.discipline_id) {
          filteredPosts = filteredPosts.filter(post => post.discipline_id === filters.discipline_id);
        }
        
        if (filters.date_range) {
          const startDate = new Date(filters.date_range.start).getTime();
          const endDate = new Date(filters.date_range.end).getTime();
          
          filteredPosts = filteredPosts.filter(post => {
            const postDate = new Date(post.created_at).getTime();
            return postDate >= startDate && postDate <= endDate;
          });
        }
      }
      
      // Ordenar por data de criação (mais recentes primeiro)
      filteredPosts.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Aplicar paginação
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      return filteredPosts.slice(startIndex, endIndex);
    } catch (error) {
      console.error('Erro ao buscar posts do feed:', error);
      return [];
    }
  }
  
  /**
   * Criar um novo post no feed
   */
  static async createPost(post: Omit<Post, 'id' | 'created_at' | 'reactions_count' | 'comments_count'>): Promise<Post | null> {
    try {
      // TODO: Implementar a criação real no Supabase quando a tabela for criada
      console.log('Post a ser criado:', post);
      
      // Simulação de resposta
      return {
        ...post,
        id: `post-${Date.now()}`,
        created_at: new Date().toISOString(),
        reactions_count: {
          like: 0,
          celebrate: 0,
          insightful: 0,
          helpful: 0
        },
        comments_count: 0
      };
    } catch (error) {
      console.error('Erro ao criar post:', error);
      return null;
    }
  }
  
  /**
   * Buscar comentários de um post
   */
  static async getComments(postId: string, page: number = 1, limit: number = 10): Promise<Comment[]> {
    try {
      // Simulação de dados para desenvolvimento inicial
      // TODO: Implementar a busca real no Supabase quando a tabela for criada
      const mockComments: Comment[] = [
        {
          id: 'c1',
          post_id: postId,
          user_id: '111',
          username: 'Pedro Santos',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro',
          content: 'Parabéns pelo resultado! Quais materiais você usou para estudar?',
          created_at: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: 'c2',
          post_id: postId,
          user_id: '222',
          username: 'Carla Mendes',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carla',
          content: 'Impressionante! Continua assim.',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        }
      ];
      
      // Ordenar por data de criação (mais antigos primeiro)
      mockComments.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      // Aplicar paginação
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      return mockComments.slice(startIndex, endIndex);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      return [];
    }
  }
  
  /**
   * Adicionar um comentário a um post
   */
  static async addComment(comment: Omit<Comment, 'id' | 'created_at'>): Promise<Comment | null> {
    try {
      // TODO: Implementar a criação real no Supabase quando a tabela for criada
      console.log('Comentário a ser adicionado:', comment);
      
      // Simulação de resposta
      return {
        ...comment,
        id: `comment-${Date.now()}`,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      return null;
    }
  }
  
  /**
   * Adicionar ou remover uma reação a um post
   */
  static async toggleReaction(postId: string, userId: string, type: ReactionType): Promise<boolean> {
    try {
      // TODO: Implementar a lógica real no Supabase quando a tabela for criada
      console.log(`Alterando reação do tipo ${type} no post ${postId} pelo usuário ${userId}`);
      
      // Simulação de resposta bem-sucedida
      return true;
    } catch (error) {
      console.error('Erro ao alternar reação:', error);
      return false;
    }
  }
  
  /**
   * Excluir um post
   */
  static async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      // TODO: Implementar a exclusão real no Supabase quando a tabela for criada
      console.log(`Excluindo post ${postId} pelo usuário ${userId}`);
      
      // Simulação de resposta bem-sucedida
      return true;
    } catch (error) {
      console.error('Erro ao excluir post:', error);
      return false;
    }
  }
  
  /**
   * Compartilhar automaticamente uma conquista no feed
   */
  static async shareAchievement(userId: string, username: string, achievementData: any): Promise<boolean> {
    try {
      const post = {
        user_id: userId,
        username,
        content: `Acabei de conquistar: ${achievementData.achievement_title}`,
        type: PostType.ACHIEVEMENT,
        metadata: achievementData,
        visibility: 'public' as const
      };
      
      const result = await this.createPost(post);
      return !!result;
    } catch (error) {
      console.error('Erro ao compartilhar conquista:', error);
      return false;
    }
  }
  
  /**
   * Compartilhar automaticamente um resultado de simulado no feed
   */
  static async shareExamResult(userId: string, username: string, examResultData: any): Promise<boolean> {
    try {
      const post = {
        user_id: userId,
        username,
        content: `Completei o simulado ${examResultData.exam_title} com ${examResultData.score}% de acertos!`,
        type: PostType.EXAM_RESULT,
        metadata: examResultData,
        visibility: 'public' as const
      };
      
      const result = await this.createPost(post);
      return !!result;
    } catch (error) {
      console.error('Erro ao compartilhar resultado de simulado:', error);
      return false;
    }
  }
} 