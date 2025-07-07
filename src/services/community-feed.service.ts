import { supabase } from '@/lib/supabase';
import { 
  Post, 
  Comment, 
  Reaction, 
  PostType, 
  ReactionType, 
  CommunityFeedFilters,
  AcademicEvent,
  GradeAttendanceData
} from '@/types/community';

export class MinhaFaculService {
  private supabase = supabase;

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
          type: PostType.ACHIEVEMENT,
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
        },
        {
          id: '4',
          user_id: 'prof123',
          username: 'Prof. Ricardo Almeida',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ricardo',
          content: 'Atenção alunos: A prova de Fisiologia foi remarcada para o dia 18/05. Estudem o material adicional disponibilizado no portal.',
          type: PostType.ANNOUNCEMENT,
          visibility: 'public',
          reactions_count: {
            like: 5,
            celebrate: 0,
            insightful: 12,
            helpful: 18
          },
          comments_count: 7,
          created_at: new Date(Date.now() - 259200000).toISOString(),
        },
        {
          id: '5',
          user_id: 'coord456',
          username: 'Coordenação de Medicina',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Coordenacao',
          content: 'Palestra "Avanços em Medicina" confirmada para 22/05 às 19h no Auditório Principal. Palestrante: Dr. Paulo Mendes (Hospital Universitário)',
          type: PostType.ACADEMIC_EVENT,
          metadata: {
            event_id: 'evt123',
            event_title: 'Palestra: Avanços em Medicina',
            event_date: '2023-05-22',
            event_time: '19:00',
            location: 'Auditório Principal',
            description: 'Palestra sobre os avanços recentes em medicina com o Dr. Paulo Mendes do Hospital Universitário',
            event_type: 'lecture'
          },
          visibility: 'public',
          reactions_count: {
            like: 32,
            celebrate: 15,
            insightful: 8,
            helpful: 4
          },
          comments_count: 9,
          created_at: new Date(Date.now() - 345600000).toISOString(),
        },
        {
          id: '6',
          user_id: 'aluno123',
          username: 'Carlos Mendes',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
          content: 'Estou com dificuldade em entender o conceito de potencial de ação na membrana celular. Alguém poderia explicar de forma mais simples?',
          type: PostType.QUESTION_FORUM,
          metadata: {
            question_title: 'Dúvida sobre potencial de ação',
            subject_name: 'Fisiologia Celular',
            topic: 'Neurofisiologia',
            is_solved: false,
            answer_count: 2
          },
          visibility: 'public',
          reactions_count: {
            like: 3,
            celebrate: 0,
            insightful: 5,
            helpful: 7
          },
          comments_count: 2,
          created_at: new Date(Date.now() - 432000000).toISOString(),
        },
        {
          id: '7',
          user_id: 'aluno456',
          username: 'Mariana Costa',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mariana',
          content: 'Qual a diferença entre artérias elásticas e musculares? Estou confusa sobre as características histológicas de cada uma.',
          type: PostType.QUESTION_FORUM,
          metadata: {
            question_title: 'Diferença entre artérias elásticas e musculares',
            subject_name: 'Histologia',
            topic: 'Sistema Cardiovascular',
            is_solved: true,
            answer_count: 4,
            best_answer_id: 'comment-123'
          },
          visibility: 'public',
          reactions_count: {
            like: 8,
            celebrate: 0,
            insightful: 12,
            helpful: 15
          },
          comments_count: 4,
          created_at: new Date(Date.now() - 518400000).toISOString(),
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
  
  /**
   * Buscar eventos acadêmicos
   */
  static async getAcademicEvents(limit: number = 5): Promise<AcademicEvent[]> {
    try {
      // Simulação de dados para desenvolvimento inicial
      const mockEvents: AcademicEvent[] = [
        {
          id: 'evt1',
          title: 'Entrega do Trabalho de Anatomia',
          date: '2023-05-15',
          time: '23:59',
          description: 'Prazo final para entrega do trabalho sobre Sistema Nervoso',
          type: 'assignment',
          course_id: 'med101',
          course_name: 'Anatomia Humana I',
          importance: 'high'
        },
        {
          id: 'evt2',
          title: 'Prova de Fisiologia',
          date: '2023-05-18',
          time: '14:00',
          location: 'Sala 305',
          description: 'Prova sobre Sistema Cardiovascular e Respiratório',
          type: 'exam',
          course_id: 'med102',
          course_name: 'Fisiologia Médica I',
          importance: 'high'
        },
        {
          id: 'evt3',
          title: 'Palestra: Avanços em Medicina',
          date: '2023-05-22',
          time: '19:00',
          location: 'Auditório Principal',
          description: 'Palestra com Dr. Paulo Mendes do Hospital Universitário',
          type: 'lecture',
          importance: 'medium'
        },
        {
          id: 'evt4',
          title: 'Workshop de Habilidades Clínicas',
          date: '2023-05-25',
          time: '08:00',
          location: 'Laboratório de Simulação',
          description: 'Treinamento prático de anamnese e exame físico',
          type: 'workshop',
          course_id: 'med103',
          course_name: 'Habilidades Médicas I',
          importance: 'medium'
        },
        {
          id: 'evt5',
          title: 'Reunião do Colegiado',
          date: '2023-05-30',
          time: '15:00',
          location: 'Sala de Reuniões',
          description: 'Discussão sobre alterações curriculares',
          type: 'other',
          importance: 'low'
        }
      ];
      
      // Ordenar por data
      mockEvents.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
        const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
        return dateA - dateB;
      });
      
      return mockEvents.slice(0, limit);
    } catch (error) {
      console.error('Erro ao buscar eventos acadêmicos:', error);
      return [];
    }
  }
  
  /**
   * Buscar perguntas do fórum de dúvidas
   */
  static async getQuestions(subject?: string, isSolved?: boolean, limit: number = 10): Promise<Post[]> {
    try {
      // Buscar todos os posts
      const allPosts = await this.getPosts();
      
      // Filtrar apenas perguntas do fórum
      let questions = allPosts.filter(post => post.type === PostType.QUESTION_FORUM);
      
      // Aplicar filtros adicionais se fornecidos
      if (subject) {
        questions = questions.filter(post => 
          post.metadata?.subject_name?.toLowerCase().includes(subject.toLowerCase())
        );
      }
      
      if (isSolved !== undefined) {
        questions = questions.filter(post => post.metadata?.is_solved === isSolved);
      }
      
      // Ordenar por data (mais recentes primeiro)
      questions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      return questions.slice(0, limit);
    } catch (error) {
      console.error('Erro ao buscar perguntas do fórum:', error);
      return [];
    }
  }

  async getGradesAndAttendance(userId: string): Promise<GradeAttendanceData[]> {
    try {
      // Em um cenário real, isso buscaria dados do Supabase
      // Por enquanto, retornaremos dados de exemplo
      return [
        {
          disciplineId: '1',
          disciplineName: 'Cálculo I',
          professorName: 'Dr. Ricardo Oliveira',
          grades: [
            { evaluationName: 'Prova 1', grade: 7.5, maxGrade: 10, date: '2023-03-15', weight: 0.3 },
            { evaluationName: 'Trabalho', grade: 8.2, maxGrade: 10, date: '2023-04-10', weight: 0.2 },
            { evaluationName: 'Prova 2', grade: 6.8, maxGrade: 10, date: '2023-05-20', weight: 0.5 }
          ],
          attendance: {
            totalClasses: 30,
            attendedClasses: 26,
            absences: 4,
            attendancePercentage: 86.7,
            absencesAllowed: 7
          },
          averageGrade: 7.3,
          status: 'approved'
        },
        {
          disciplineId: '2',
          disciplineName: 'Física I',
          professorName: 'Dra. Mariana Santos',
          grades: [
            { evaluationName: 'Prova 1', grade: 5.5, maxGrade: 10, date: '2023-03-18', weight: 0.4 },
            { evaluationName: 'Laboratório', grade: 8.0, maxGrade: 10, date: '2023-04-15', weight: 0.2 },
            { evaluationName: 'Prova 2', grade: 6.0, maxGrade: 10, date: '2023-05-22', weight: 0.4 }
          ],
          attendance: {
            totalClasses: 32,
            attendedClasses: 25,
            absences: 7,
            attendancePercentage: 78.1,
            absencesAllowed: 8
          },
          averageGrade: 6.2,
          status: 'at_risk'
        },
        {
          disciplineId: '3',
          disciplineName: 'Programação I',
          professorName: 'Prof. Carlos Mendes',
          grades: [
            { evaluationName: 'Projeto 1', grade: 9.0, maxGrade: 10, date: '2023-03-25', weight: 0.3 },
            { evaluationName: 'Prova Prática', grade: 8.5, maxGrade: 10, date: '2023-04-20', weight: 0.3 },
            { evaluationName: 'Projeto Final', grade: 9.2, maxGrade: 10, date: '2023-05-30', weight: 0.4 }
          ],
          attendance: {
            totalClasses: 28,
            attendedClasses: 26,
            absences: 2,
            attendancePercentage: 92.9,
            absencesAllowed: 7
          },
          averageGrade: 8.9,
          status: 'approved'
        }
      ];
    } catch (error) {
      console.error('Erro ao buscar notas e faltas:', error);
      throw error;
    }
  }

  async updateGradeManually(userId: string, disciplineId: string, evaluationName: string, newGrade: number): Promise<boolean> {
    try {
      // Em um cenário real, isso atualizaria dados no Supabase
      console.log(`Atualizando nota de ${evaluationName} para ${newGrade} na disciplina ${disciplineId}`);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar nota:', error);
      return false;
    }
  }

  async updateAttendanceManually(userId: string, disciplineId: string, date: string, status: 'present' | 'absent'): Promise<boolean> {
    try {
      // Em um cenário real, isso atualizaria dados no Supabase
      console.log(`Marcando presença como ${status} para ${date} na disciplina ${disciplineId}`);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar presença:', error);
      return false;
    }
  }

  async shareGradeUpdate(userId: string, disciplineId: string, grade: number, evaluationName: string): Promise<Post | null> {
    try {
      const post: Post = {
        id: Math.random().toString(36).substring(7),
        user_id: userId,
        username: 'Usuário', // Normalmente seria obtido do perfil do usuário
        content: `Acabei de receber minha nota em ${evaluationName}!`,
        type: PostType.GRADE_ATTENDANCE,
        visibility: 'public',
        metadata: {
          disciplineId,
          evaluationName,
          grade
        },
        reactions_count: {
          like: 0,
          celebrate: 0,
          insightful: 0,
          helpful: 0
        },
        comments_count: 0,
        created_at: new Date().toISOString()
      };
      
      // Em um cenário real, isso salvaria o post no Supabase
      return post;
    } catch (error) {
      console.error('Erro ao compartilhar atualização de nota:', error);
      return null;
    }
  }
} 