'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FacultyService } from '@/services/faculty.service';
import { ExamsService } from '@/services/exams.service';
import { Faculty, FacultyMember, FacultyPost, ForumTopic, FacultyMaterial, ForumReply, FacultyExam } from '@/types/faculty';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/Spinner';
import { 
  Share2, Users, FileText, MessageSquare, Settings, Plus, 
  Bell, ThumbsUp, Heart, BookOpen, Calendar, School, 
  MoreHorizontal, Image, Smile, Send, Clock, TrendingUp,
  ArrowLeft, CheckCircle2, Eye, ThumbsDown, RefreshCw,
  BookCopy, FileQuestion, Activity
} from 'lucide-react';
import { ManageMembersModal } from '@/components/comunidade/ManageMembersModal';
import { PostCommentSection } from '@/components/comunidade/PostCommentSection';
import { MaterialsList } from '@/components/comunidade/MaterialsList';
import { UploadMaterialModal } from '@/components/comunidade/UploadMaterialModal';
import { ExamsList } from '@/components/comunidade/ExamsList';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FacultyTabMenu } from '@/components/comunidade/FacultyTabMenu';
import { CreateEventModal } from '@/components/comunidade/CreateEventModal';
import { EventsList } from '@/components/comunidade/EventsList';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function FacultyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [members, setMembers] = useState<FacultyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [manageMembersModalOpen, setManageMembersModalOpen] = useState(false);
  const [createTopicModalOpen, setCreateTopicModalOpen] = useState(false);
  const [uploadMaterialModalOpen, setUploadMaterialModalOpen] = useState(false);
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);
  
  // Estados para o formulário de nova discussão
  const [topicTitle, setTopicTitle] = useState('');
  const [topicContent, setTopicContent] = useState('');
  const [isSubmittingTopic, setIsSubmittingTopic] = useState(false);
  
  // Estados para o feed
  const [posts, setPosts] = useState<FacultyPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postsPage, setPostsPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const POSTS_PER_PAGE = 5;
  
  // Estados para inserção de link
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  
  // Estados para o fórum
  const [forumTopics, setForumTopics] = useState<ForumTopic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [forumTab, setForumTab] = useState<'all' | 'resolved' | 'unresolved'>('all');
  
  // Estado para o tópico selecionado
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  const [selectedTopicReplies, setSelectedTopicReplies] = useState<ForumReply[]>([]);
  const [isLoadingTopicReplies, setIsLoadingTopicReplies] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  // Estados para materiais
  const [materials, setMaterials] = useState<FacultyMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  
  // Estados para exames/simulados
  const [exams, setExams] = useState<FacultyExam[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [selectedExam, setSelectedExam] = useState<FacultyExam | null>(null);
  
  // Estado para o modal de confirmação de exclusão
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Refs para controle de carregamento e inscrições
  const dataLoadedRef = useRef(false);
  const realtimeChannelsRef = useRef<any[]>([]);
  const isPageVisibleRef = useRef(true);
  
  // Verificar se há um tópico na URL
  useEffect(() => {
    const topicId = searchParams.get('topic');
    
    if (topicId && faculty) {
      // Mudar para a aba de fórum
      setActiveTab('forum');
      
      // Carregar os detalhes do tópico
      const topicIdNumber = parseInt(topicId);
      const topic = forumTopics.find(t => t.id === topicIdNumber);
      
      if (topic) {
        setSelectedTopic(topic);
        loadTopicReplies(topicIdNumber);
      } else {
        // Se o tópico não foi encontrado nos já carregados, buscar diretamente
        FacultyService.getForumTopics(faculty.id, 1, 0, undefined, undefined)
          .then(topics => {
            if (topics.length > 0) {
              setSelectedTopic(topics[0]);
              loadTopicReplies(topicIdNumber);
            }
          });
      }
    } else {
      // Se não há tópico na URL, limpar o tópico selecionado
      setSelectedTopic(null);
      setSelectedTopicReplies([]);
    }
  }, [searchParams, faculty, forumTopics]);
  
  // Estado para forçar re-render do EventsList
  const [eventsKey, setEventsKey] = useState(0);

  // Função para recarregar eventos (callback para EventsList)
  const loadEvents = () => {
    // Força o componente EventsList a recarregar incrementando a key
    setEventsKey(prev => prev + 1);
    console.log('Recarregando eventos...');
  };

  // Função para carregar respostas de um tópico
  const loadTopicReplies = async (topicId: number) => {
    setIsLoadingTopicReplies(true);
    try {
      const replies = await FacultyService.getForumReplies(topicId);
      setSelectedTopicReplies(replies);
      
      // Incrementar visualizações
      await FacultyService.incrementTopicViewCount(topicId);
    } catch (error) {
      console.error('Erro ao carregar respostas:', error);
      toast({
        title: "Erro ao carregar respostas",
        description: "Não foi possível carregar as respostas deste tópico.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTopicReplies(false);
    }
  };
  
  // Função para enviar uma resposta
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTopic) return;
    if (!replyContent.trim()) {
      toast({
        title: "Conteúdo vazio",
        description: "Por favor, escreva uma resposta antes de enviar.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmittingReply(true);
    try {
      const replyId = await FacultyService.createForumReply(selectedTopic.id, replyContent);
      
      if (replyId) {
        toast({
          title: "Resposta enviada",
          description: "Sua resposta foi publicada com sucesso!",
        });
        setReplyContent('');
        
        // Recarregar respostas
        loadTopicReplies(selectedTopic.id);
      } else {
        throw new Error('Erro ao criar resposta');
      }
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
      toast({
        title: "Erro ao enviar resposta",
        description: "Não foi possível publicar sua resposta. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };
  
  // Função para marcar uma resposta como solução
  const handleMarkAsSolution = async (replyId: number, isSolution: boolean) => {
    if (!selectedTopic) return;
    
    try {
      const success = await FacultyService.markReplyAsSolution(replyId, isSolution);
      
      if (success) {
        toast({
          title: isSolution ? "Resposta marcada como solução" : "Marcação de solução removida",
          description: isSolution 
            ? "Esta resposta foi marcada como solução para o tópico." 
            : "A marcação de solução foi removida desta resposta.",
        });
        
        // Recarregar respostas
        loadTopicReplies(selectedTopic.id);
      }
    } catch (error) {
      console.error('Erro ao marcar resposta como solução:', error);
      toast({
        title: "Erro ao marcar solução",
        description: "Não foi possível marcar esta resposta como solução. Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };
  
  // Função para voltar à lista de tópicos
  const handleBackToTopics = () => {
    setSelectedTopic(null);
    setSelectedTopicReplies([]);
    router.push(`/minha-faculdade/${faculty?.id}`, { scroll: false });
  };

  // Função para carregar exames/simulados
  const loadExams = async (facultyId: number) => {
    if (!isPageVisibleRef.current) return; // Não carregar se a página não estiver visível
    
    setIsLoadingExams(true);
    try {
      const examsData = await FacultyService.getFacultyExams(facultyId);
      setExams(examsData);
    } catch (error) {
      console.error('Erro ao carregar simulados:', error);
      toast({
        title: "Erro ao carregar simulados",
        description: "Não foi possível carregar os simulados compartilhados.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingExams(false);
    }
  };
  
  // Função para abrir um exame
  const handleOpenExam = async (exam: FacultyExam) => {
    if (!exam.external_exam_id) {
      toast({
        title: "Simulado indisponível",
        description: "Este simulado não está disponível para visualização.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Verificar se o simulado existe
      const examDetails = await ExamsService.getExamById(exam.external_exam_id);
      
      if (!examDetails) {
        toast({
          title: "Simulado não encontrado",
          description: "O simulado compartilhado não foi encontrado ou pode ter sido excluído.",
        variant: "destructive"
      });
      return;
    }
    
    // Redirecionar para a página do simulado
    router.push(`/simulados/${exam.external_exam_id}`);
    } catch (error) {
      console.error("Erro ao abrir simulado:", error);
      toast({
        title: "Erro ao abrir simulado",
        description: "Não foi possível abrir o simulado. Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };

  // Gerenciar visibilidade da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = document.visibilityState === 'visible';
      console.log(`Visibilidade da página alterada: ${isPageVisibleRef.current ? 'visível' : 'oculta'}`);
      
      // Não recarregar dados quando a página volta a ficar visível
      // Isso evita recargas desnecessárias
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Efeito principal para carregar dados e configurar inscrições
  useEffect(() => {
    const facultyId = Number(params.id);
    if (isNaN(facultyId) || !user) {
      router.push('/minha-faculdade');
      return;
    }

    // Limpar canais anteriores ao montar o componente
    const cleanupChannels = () => {
      console.log('Limpando canais do Realtime...');
      realtimeChannelsRef.current.forEach(channel => {
        if (channel && channel.unsubscribe) {
          try {
            channel.unsubscribe();
          } catch (error) {
            console.error('Erro ao cancelar inscrição do canal:', error);
          }
        }
      });
      realtimeChannelsRef.current = [];
    };

    // Carregar dados apenas se ainda não foram carregados
    const loadFacultyDetails = async () => {
      if (dataLoadedRef.current && faculty) {
        console.log('Dados já carregados, pulando carregamento');
        return;
      }
      
      setIsLoading(true);
      try {
        // Carregar detalhes do ambiente
        const facultyDetails = await FacultyService.getFacultyDetails(facultyId);
        if (!facultyDetails) {
          router.push('/minha-faculdade');
          return;
        }
        setFaculty(facultyDetails);

        // Verificar se o usuário é membro
        const membership = await FacultyService.checkMembership(facultyId, user.id);
        if (!membership) {
          router.push('/minha-faculdade');
          return;
        }

        // Verificar se é administrador ou proprietário
        const isUserAdmin = membership.role === 'admin';
        const isUserOwner = facultyDetails.owner_id === user.id;
        setIsAdmin(isUserAdmin || isUserOwner);
        setIsOwner(isUserOwner);

        // Carregar membros
        try {
          const facultyMembers = await FacultyService.getFacultyMembers(facultyId);
          console.log('Membros carregados:', facultyMembers.length);
          setMembers(facultyMembers);
        } catch (membersError) {
          console.error('Erro ao carregar membros:', membersError);
        }

        // Depurar metadados dos usuários
        if (process.env.NODE_ENV === 'development') {
          try {
            const userMetadata = await FacultyService.debugUserMetadata(facultyId);
            console.log('Metadados dos usuários:', userMetadata);
          } catch (metadataError) {
            console.error('Erro ao buscar metadados:', metadataError);
          }
        }
        
        // Carregar posts, tópicos e materiais
        loadPosts(facultyId, true);
        loadForumTopics(facultyId);
        loadMaterials(facultyId);
        loadExams(facultyId);
        
        // Marcar que os dados foram carregados
        dataLoadedRef.current = true;
      } catch (error) {
        console.error('Erro ao carregar detalhes do ambiente:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Configurar inscrição do Realtime para posts e comentários
    const setupRealtimeSubscriptions = async () => {
      // Limpar canais existentes antes de criar novos
      cleanupChannels();
      
      // Inscrever-se para atualizações de posts
      const postsChannel = supabase
        .channel('faculty-posts')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'faculty_posts',
            filter: `faculty_id=eq.${facultyId}`
          },
          (payload) => {
            console.log('Mudança em posts:', payload);
            
            // Atualizar apenas o post específico em vez de recarregar todos
            if (payload.eventType === 'UPDATE') {
              const updatedPost = payload.new;
              setPosts(prevPosts => 
                prevPosts.map(post => {
                  if (post.id === updatedPost.id) {
                    // Preservar dados do usuário e outros campos que podem não estar no payload
                    return {
                      ...post,
                      ...updatedPost
                    };
                  }
                  return post;
                })
              );
            } else if (payload.eventType === 'INSERT') {
              // Verificar se o post já existe no estado antes de adicioná-lo
              const newPostId = payload.new.id;
              
              setPosts(prevPosts => {
                // Verificar se o post já existe no estado
                if (prevPosts.some(post => post.id === newPostId)) {
                  console.log('Post já existe no estado, ignorando evento Realtime');
                  return prevPosts;
                }
                
                console.log('Buscando detalhes do novo post via Realtime');
                // Se o post não existe, buscar detalhes completos
                FacultyService.getFacultyPosts(facultyId, 1, 0, newPostId)
                .then(newPosts => {
                    if (newPosts && newPosts.length > 0) {
                      setPosts(currentPosts => {
                        // Verificar novamente se o post já foi adicionado
                        if (currentPosts.some(post => post.id === newPostId)) {
                          return currentPosts;
                        }
                        console.log('Adicionando novo post via Realtime:', newPosts[0]);
                        return [newPosts[0], ...currentPosts];
                      });
                    }
                  })
                  .catch(error => {
                    console.error('Erro ao buscar detalhes do novo post:', error);
                  });
                
                // Retornar o estado atual sem modificações
                return prevPosts;
                });
            } else if (payload.eventType === 'DELETE') {
              // Remover o post deletado
              setPosts(prevPosts => 
                prevPosts.filter(post => post.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();
      
      // Adicionar o canal à lista para limpeza posterior
      realtimeChannelsRef.current.push(postsChannel);
        
      // Inscrever-se para atualizações de comentários
      const commentsChannel = supabase
        .channel('faculty-comments')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'faculty_comments'
          },
          (payload: any) => {
            console.log('Mudança em comentários:', payload);
            
            // Atualizar contagem de comentários no post afetado
            if (payload.eventType === 'INSERT' && payload.new && payload.new.post_id) {
              const postId = payload.new.post_id;
              setPosts(prevPosts => 
                prevPosts.map(post => {
                  if (post.id === postId) {
                    return {
                      ...post,
                      comment_count: (post.comment_count || 0) + 1
                    };
                  }
                  return post;
                })
              );
            } else if (payload.eventType === 'DELETE' && payload.old && payload.old.post_id) {
              const postId = payload.old.post_id;
              setPosts(prevPosts => 
                prevPosts.map(post => {
                  if (post.id === postId && post.comment_count && post.comment_count > 0) {
                    return {
                      ...post,
                      comment_count: post.comment_count - 1
                    };
                  }
                  return post;
                })
              );
            }
          }
        )
        .subscribe();
      
      // Adicionar o canal à lista para limpeza posterior
      realtimeChannelsRef.current.push(commentsChannel);
        
      // Inscrever-se para atualizações de curtidas
      const likesChannel = supabase
        .channel('faculty-likes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'faculty_post_likes'
          },
          (payload: any) => {
            console.log('Mudança em curtidas:', payload);
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
              // Em vez de recarregar, podemos atualizar o estado local
              // Mas precisamos saber qual post foi afetado
              const postId = payload.new?.post_id || payload.old?.post_id;
              
              if (postId) {
                // Buscar apenas a contagem de curtidas atualizada para este post
                FacultyService.getPostLikesCount(postId)
                  .then((data) => {
                    setPosts(prevPosts => 
                      prevPosts.map(post => {
                        if (post.id === postId) {
                          return {
                            ...post,
                            likes_count: data.count,
                            user_liked: data.user_liked
                          };
                        }
                        return post;
                      })
                    );
                  });
              }
            }
          }
        )
        .subscribe();
        
      // Adicionar o canal à lista para limpeza posterior
      realtimeChannelsRef.current.push(likesChannel);
      };

    // Carregar dados e configurar inscrições
    loadFacultyDetails();
      setupRealtimeSubscriptions();
    
    // Limpar inscrições ao desmontar o componente
    return () => {
      cleanupChannels();
    };
  }, [params.id, user, router]);

  // Função para carregar posts
  const loadPosts = async (facultyId: number, reset: boolean = false) => {
    if (!isPageVisibleRef.current) return; // Não carregar se a página não estiver visível
    
    const page = reset ? 0 : postsPage;
    
    setIsLoadingPosts(true);
    try {
      const postsData = await FacultyService.getFacultyPosts(facultyId, POSTS_PER_PAGE, page * POSTS_PER_PAGE);
      
      if (reset) {
        setPosts(postsData);
      } else {
        setPosts(prevPosts => [...prevPosts, ...postsData]);
      }
      
      setHasMorePosts(postsData.length === POSTS_PER_PAGE);
      
      if (!reset) {
        setPostsPage(prevPage => prevPage + 1);
      }
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
      toast({
        title: "Erro ao carregar posts",
        description: "Não foi possível carregar os posts do ambiente.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // Função para carregar tópicos do fórum
  const loadForumTopics = async (facultyId: number, isResolved?: boolean) => {
    if (!isPageVisibleRef.current) return; // Não carregar se a página não estiver visível
    
    setIsLoadingTopics(true);
    try {
      const topics = await FacultyService.getForumTopics(facultyId, 20, 0, undefined, isResolved);
      setForumTopics(topics);
    } catch (error) {
      console.error('Erro ao carregar tópicos:', error);
      toast({
        title: "Erro ao carregar tópicos",
        description: "Não foi possível carregar os tópicos do fórum.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTopics(false);
    }
  };

  // Função para carregar materiais
  const loadMaterials = async (facultyId: number) => {
    if (!isPageVisibleRef.current) return; // Não carregar se a página não estiver visível
    
    setIsLoadingMaterials(true);
    try {
      const materialsData = await FacultyService.getFacultyMaterials(facultyId);
      setMaterials(materialsData);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      toast({
        title: "Erro ao carregar materiais",
        description: "Não foi possível carregar os materiais compartilhados.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  // Função para filtrar tópicos por status
  const handleForumTabChange = (status: 'all' | 'resolved' | 'unresolved') => {
    setForumTab(status);
    
    if (!faculty) return;
    
    let isResolved: boolean | undefined;
    if (status === 'resolved') {
      isResolved = true;
    } else if (status === 'unresolved') {
      isResolved = false;
    }
    
    loadForumTopics(faculty.id, isResolved);
  };

  const handleMembersUpdated = async () => {
    if (!faculty) return;
    
    try {
      const facultyMembers = await FacultyService.getFacultyMembers(faculty.id);
      setMembers(facultyMembers);
      
      // Atualizar também os detalhes da faculdade para obter o contador atualizado
      const facultyDetails = await FacultyService.getFacultyDetails(faculty.id);
      if (facultyDetails) {
        setFaculty(facultyDetails);
      }
    } catch (error) {
      console.error('Erro ao atualizar membros:', error);
    }
  };

  // Função para adicionar link ao conteúdo do post
  const handleAddLink = () => {
    if (!linkUrl.trim()) {
      toast({
        title: "URL vazia",
        description: "Por favor, insira uma URL válida.",
        variant: "destructive"
      });
      return;
    }
    
    // Validar se a URL é válida
    try {
      new URL(linkUrl);
    } catch (e) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida incluindo http:// ou https://",
        variant: "destructive"
      });
      return;
    }
    
    // Formatar o link para adicionar ao conteúdo
    const linkText = linkTitle.trim() ? `[${linkTitle}](${linkUrl})` : linkUrl;
    
    // Adicionar o link ao conteúdo atual
    setPostContent(prev => {
      if (prev.trim()) {
        return `${prev}\n\n${linkText}`;
      }
      return linkText;
    });
    
    // Limpar os campos e fechar o input de link
    setLinkUrl('');
    setLinkTitle('');
    setShowLinkInput(false);
    
    toast({
      title: "Link adicionado",
      description: "O link foi adicionado ao seu post.",
    });
  };

  // Função para cancelar a adição de link
  const handleCancelLink = () => {
    setLinkUrl('');
    setLinkTitle('');
    setShowLinkInput(false);
  };

  // Função para confirmar a exclusão da faculdade
  const handleConfirmDeleteFaculty = async () => {
    if (!faculty) return;
    
    setIsDeleting(true);
    try {
      const success = await FacultyService.deleteFaculty(faculty.id);
      
      if (success) {
        toast({
          title: "Ambiente excluído",
          description: "O ambiente foi excluído com sucesso.",
        });
        router.push('/minha-faculdade');
      } else {
        throw new Error('Falha ao excluir ambiente');
      }
    } catch (error) {
      console.error('Erro ao excluir ambiente:', error);
      toast({
        title: "Erro ao excluir ambiente",
        description: "Não foi possível excluir o ambiente. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmationOpen(false);
    }
  };

  // Renderização principal
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600">Carregando ambiente...</p>
      </div>
    );
  }

  if (!faculty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ambiente não encontrado</h2>
          <p className="text-gray-600 mb-6">O ambiente que você está procurando não existe ou você não tem permissão para acessá-lo.</p>
          <Button onClick={() => router.push('/minha-faculdade')}>
            Voltar para Meu Curso
          </Button>
        </div>
      </div>
    );
  }

  const handleShareCode = () => {
    navigator.clipboard.writeText(faculty.code);
    toast({
      title: "Código copiado",
      description: "Código do ambiente copiado para a área de transferência!",
    });
  };

  const openManageMembersModal = () => {
    setManageMembersModalOpen(true);
  };
  
  const openCreateTopicModal = () => {
    console.log('Abrindo modal de nova discussão');
    setCreateTopicModalOpen(true);
  };
  
  const openUploadMaterialModal = () => {
    setUploadMaterialModalOpen(true);
  };
  
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topicTitle.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Por favor, forneça um título para a discussão.",
        variant: "destructive"
      });
      return;
    }
    
    if (!topicContent.trim()) {
      toast({
        title: "Conteúdo obrigatório",
        description: "Por favor, descreva sua dúvida no conteúdo da discussão.",
        variant: "destructive"
      });
      return;
    }
    
    if (!faculty) return;
    
    setIsSubmittingTopic(true);
    try {
      // Chamar a API para criar um novo tópico
      const topicId = await FacultyService.createForumTopic(
        faculty.id,
        topicTitle,
        topicContent
      );
      
      if (topicId) {
        toast({
          title: "Tópico criado",
          description: "Seu tópico foi criado com sucesso!"
        });
        
        // Limpar o formulário e fechar o modal
        setTopicTitle('');
        setTopicContent('');
        setCreateTopicModalOpen(false);
        
        // Mudar para a aba de fórum e recarregar os tópicos
        setActiveTab('forum');
        loadForumTopics(faculty.id);
      } else {
        throw new Error('Erro ao criar tópico');
      }
    } catch (error) {
      console.error('Erro ao criar tópico:', error);
      toast({
        title: "Erro ao criar tópico",
        description: "Não foi possível criar o tópico. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingTopic(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!postContent.trim()) return;
    
    setIsSubmittingPost(true);
    try {
      // Usar o título se fornecido, ou gerar um automático baseado no conteúdo
      const title = postTitle.trim() || postContent.substring(0, 50) + (postContent.length > 50 ? '...' : '');
      
      // Processar o conteúdo para identificar links (opcional)
      // Isso pode ser útil se você quiser extrair links para metadados ou pré-visualização
      
      const postId = await FacultyService.createPost(
        faculty.id,
        title,
        postContent,
        'announcement'  // Use 'announcement' as the default type since 'post' is not a valid type in the database
      );
      
      if (postId) {
        // Limpar campos
        setPostContent('');
        setPostTitle('');
        
        // Buscar o post recém-criado e adicioná-lo ao estado
        try {
          const newPost = await FacultyService.getFacultyPosts(faculty.id, 1, 0, postId);
          if (newPost && newPost.length > 0) {
            // Adicionar o novo post ao início da lista
            setPosts(prevPosts => {
              // Verificar se o post já existe para evitar duplicação
              if (prevPosts.some(p => p.id === postId)) {
                return prevPosts;
              }
              return [newPost[0], ...prevPosts];
            });
          }
        } catch (fetchError) {
          console.error('Erro ao buscar o novo post:', fetchError);
        }
        
        toast({
          title: "Publicação criada",
          description: "Sua publicação foi criada com sucesso!",
        });
      } else {
        throw new Error('Erro ao criar publicação');
      }
    } catch (error) {
      console.error('Erro ao criar post:', error);
      toast({
        title: "Erro ao criar publicação",
        description: "Não foi possível criar sua publicação. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleLikePost = async (postId: number) => {
    try {
      // Encontrar o post atual
      const currentPost = posts.find(p => p.id === postId);
      if (!currentPost) return;
      
      // Atualizar o estado localmente primeiro (otimista)
      const optimisticLiked = !currentPost.user_liked;
      const optimisticCount = optimisticLiked 
        ? (currentPost.likes_count || 0) + 1 
        : Math.max((currentPost.likes_count || 0) - 1, 0);
        
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likes_count: optimisticCount,
              user_liked: optimisticLiked
            };
          }
          return post;
        })
      );
      
      // Fazer a chamada à API em segundo plano
      const liked = await FacultyService.togglePostLike(postId);
      
      // Se a resposta do servidor for diferente da nossa atualização otimista,
      // corrigir o estado com os dados reais
      if (liked !== null && liked !== optimisticLiked) {
        const realCount = liked 
          ? (currentPost.likes_count || 0) + 1 
          : Math.max((currentPost.likes_count || 0) - 1, 0);
          
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
                likes_count: realCount,
                user_liked: liked
            };
          }
          return post;
        })
      );
      }
    } catch (error) {
      console.error('Erro ao curtir/descurtir post:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua ação. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const openCreateEventModal = () => {
    setCreateEventModalOpen(true);
  };

  const handleEventCreated = () => {
    // Aqui você pode adicionar lógica adicional após a criação do evento
    toast({
      title: "Evento criado",
      description: "O evento foi adicionado ao calendário.",
    });
  };

  return (
    <div className={`container mx-auto ${isMobile ? 'px-2 py-4' : 'px-4 py-6'} overflow-x-hidden w-full box-border`}>
      {/* Cabeçalho */}
      <div className={`relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg p-0 ${isMobile ? 'mb-4' : 'mb-8'}`}>
        {/* Padrão de fundo */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Círculos decorativos */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-purple-500 opacity-20"></div>
        <div className="absolute -bottom-12 -left-12 w-60 h-60 rounded-full bg-indigo-500 opacity-20"></div>
        
        <div className="relative z-10">
          {/* Conteúdo superior */}
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-center ${isMobile ? 'p-4 pb-0' : 'p-6 pb-0'} max-w-full`}>
            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'} max-w-full`}>
              <div className={`bg-white ${isMobile ? 'p-2' : 'p-3'} rounded-xl shadow-md transform transition-transform hover:scale-105`}>
                <School className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-purple-600`} />
              </div>
          <div>
                <div className="flex items-center">
                  <h1 className={`${isMobile ? 'text-lg' : 'text-2xl md:text-3xl'} font-bold text-white`}>{faculty?.name}</h1>
                  {faculty?.is_public ? (
                    <Badge className={`${isMobile ? 'ml-1 text-xs' : 'ml-2'} bg-emerald-400/20 text-emerald-100 border-none`}>
                      Público
                    </Badge>
                  ) : (
                    <Badge className={`${isMobile ? 'ml-1 text-xs' : 'ml-2'} bg-amber-400/20 text-amber-100 border-none`}>
                      Privado
                    </Badge>
                  )}
                </div>
                <p className={`text-purple-100 flex items-center gap-1 ${isMobile ? 'text-xs flex-wrap' : ''}`}>
                  <span>{faculty?.institution}</span>
                  {faculty?.institution && faculty?.course && (
                    <span className={`inline-block ${isMobile ? 'w-1 h-1' : 'w-1.5 h-1.5'} rounded-full bg-purple-300/70`}></span>
                  )}
                  <span>{faculty?.course}</span>
                </p>
              </div>
        </div>
          <div className={`flex ${isMobile ? 'mt-3 w-full gap-2' : 'mt-4 md:mt-0 space-x-2'}`}>
            <Button 
                variant="secondary" 
              size="sm"
              onClick={handleShareCode}
                className={`bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm ${isMobile ? 'flex-1 text-xs' : ''}`}
            >
              <Share2 className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
              {isMobile ? 'Compartilhar' : 'Compartilhar'}
          </Button>
          
          {isAdmin && (
              <Button 
                  variant="secondary" 
                size="sm"
                onClick={openManageMembersModal}
                  className={`bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm ${isMobile ? 'flex-1 text-xs' : ''}`}
              >
                <Users className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                {isMobile ? 'Membros' : 'Gerenciar Membros'}
            </Button>
          )}
        </div>
      </div>
      
          {/* Descrição */}
          <div className={`${isMobile ? 'px-4 pt-3 pb-2' : 'px-6 pt-4 pb-2'}`}>
            <p className={`text-white/90 ${isMobile ? 'text-xs' : 'text-sm md:text-base'} line-clamp-2 hover:line-clamp-none transition-all duration-300 cursor-pointer`}>
              {faculty?.description || "Sem descrição disponível"}
            </p>
          </div>

          {/* Badges */}
          <div className={`${isMobile ? 'px-4 pt-2 pb-4' : 'px-6 pt-2 pb-6'} flex flex-wrap gap-2`}>
            <Badge className={`bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm transition-all duration-200 hover:scale-105 ${isMobile ? 'text-xs' : ''}`}>
            <Users className={`${isMobile ? 'h-2 w-2 mr-1' : 'h-3 w-3 mr-1'}`} />
              {faculty?.member_count || 0} {faculty?.member_count === 1 ? 'membro' : 'membros'}
                </Badge>
          
            {faculty?.semester && (
              <Badge className={`bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm transition-all duration-200 hover:scale-105 ${isMobile ? 'text-xs' : ''}`}>
              <School className={`${isMobile ? 'h-2 w-2 mr-1' : 'h-3 w-3 mr-1'}`} />
              {faculty.semester}
                </Badge>
          )}
          
            <Badge className={`bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm transition-all duration-200 hover:scale-105 ${isMobile ? 'text-xs' : ''}`}>
            <Calendar className={`${isMobile ? 'h-2 w-2 mr-1' : 'h-3 w-3 mr-1'}`} />
              {faculty ? `Criado em ${new Date(faculty.created_at).toLocaleDateString()}` : "Data desconhecida"}
                </Badge>
          </div>
        </div>
      </div>

      {/* Layout principal com conteúdo e barra lateral */}
      <div className={`flex flex-col ${isMobile ? 'gap-4' : 'md:flex-row gap-6'} overflow-x-hidden`}>
        {/* Conteúdo principal */}
        <div className={`w-full ${isMobile ? '' : 'md:w-2/3'} min-w-0`}>
          {/* Tabs de navegação */}
          <FacultyTabMenu activeTab={activeTab} onChange={(tab) => {
            setActiveTab(tab);
            // Reset pagination when switching to feed tab
            if (tab === 'feed' && faculty) {
              setPostsPage(0);
              setPosts([]);
              loadPosts(faculty.id, true);
            }
          }} />
            
            {/* Conteúdo do Feed */}
          {activeTab === 'feed' && (
            <div className={`${isMobile ? 'space-y-3' : 'space-y-4'} max-w-full`}>
              {/* Criar post */}
              <div className="rounded-lg overflow-hidden shadow-sm border border-gray-100 max-w-full">
                <div className={`bg-gradient-to-r from-purple-600 to-blue-600 ${isMobile ? 'px-4 py-3' : 'px-6 py-4'} text-white`}>
                  <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
                    <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold flex items-center`}>
                      <MessageSquare className={`${isMobile ? 'h-4 w-4 mr-2' : 'h-5 w-5 mr-2'} text-white`} />
                      Feed da Faculdade
                    </h2>
                    
                    <Badge className={`bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm ${isMobile ? 'text-xs self-start' : ''}`}>
                      {posts.length} {posts.length === 1 ? 'publicação' : 'publicações'}
                    </Badge>
                  </div>
                  
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/80 mt-1`}>
                    Compartilhe informações, materiais e novidades com os membros da faculdade.
                  </p>
                </div>
                
                <div className={`bg-white ${isMobile ? 'p-4' : 'p-6'} max-w-full`}>
                  <Card className={`border border-gray-100 shadow-sm hover:shadow-md transition-shadow ${isMobile ? 'mb-4' : 'mb-6'} max-w-full`}>
                <CardContent className={`${isMobile ? 'pt-4' : 'pt-6'}`}>
                  <form onSubmit={handleCreatePost}>
                    <div className={`flex ${isMobile ? 'gap-2' : 'gap-3'}`}>
                          <Avatar className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} border-2 border-purple-100`}>
                            <AvatarFallback className="bg-purple-50 text-purple-700">{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Input
                          placeholder="Título (opcional)"
                          value={postTitle}
                          onChange={(e) => setPostTitle(e.target.value)}
                              className={`${isMobile ? 'mb-2 text-sm' : 'mb-3'} border-gray-200 focus:border-purple-500 focus:ring-purple-500 max-w-full`}
                        />
                        <Input
                          placeholder="Compartilhe uma novidade, dúvida ou material..."
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                              className={`${isMobile ? 'mb-2 text-sm' : 'mb-3'} border-gray-200 focus:border-purple-500 focus:ring-purple-500 max-w-full`}
                        />
                        <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
                          <div className={`flex ${isMobile ? 'justify-start' : 'gap-2'}`}>
                            <Button 
                              type="button" 
                              size={isMobile ? "sm" : "sm"}
                              variant="outline"
                              onClick={() => setShowLinkInput(true)}
                                  className={`border-gray-200 hover:bg-purple-50 hover:text-purple-700 ${isMobile ? 'text-xs' : ''}`}
                            >
                              <FileText className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                              Link
                            </Button>
                    </div>
                          <Button 
                            type="submit" 
                            size={isMobile ? "sm" : "sm"}
                            disabled={!postContent.trim() || isSubmittingPost}
                                className={`bg-purple-600 hover:bg-purple-700 ${isMobile ? 'text-xs w-full' : ''}`}
                          >
                            {isSubmittingPost ? <Spinner size="sm" className="mr-2" /> : null}
                            Publicar
                          </Button>
                    </div>
                    </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
                  
                  {/* Feed de posts */}
                  {isLoadingPosts ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhum post encontrado</p>
                      <p className="text-sm text-muted-foreground mt-2">Seja o primeiro a compartilhar algo!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => (
                        <PostCommentSection 
                          key={post.id}
                          post={post}
                          onLike={() => handleLikePost(post.id)}
                        />
                      ))}
                      
                      {hasMorePosts && (
                        <div className="flex justify-center pt-4 pb-6">
                          <Button 
                            variant="outline" 
                            onClick={() => loadPosts(faculty?.id || 0)}
                            disabled={isLoadingPosts}
                            className="w-full max-w-xs"
                          >
                            {isLoadingPosts ? (
                              <Spinner size="sm" className="mr-2" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Carregar mais
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Modal para inserção de link */}
              {showLinkInput && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-lg shadow-lg max-w-[500px] w-full">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Adicionar Link</h2>
                        <button 
                          onClick={handleCancelLink}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                        </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label htmlFor="linkUrl" className="block text-sm font-medium">URL do Link</label>
                          <input
                            id="linkUrl"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="https://exemplo.com"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                          />
                          <p className="text-xs text-gray-500">Inclua http:// ou https:// no início da URL</p>
                      </div>
                      
                        <div className="space-y-2">
                          <label htmlFor="linkTitle" className="block text-sm font-medium">Título do Link (opcional)</label>
                          <input
                            id="linkTitle"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Título descritivo para o link"
                            value={linkTitle}
                            onChange={(e) => setLinkTitle(e.target.value)}
                          />
                        </div>
                        
                        <div className="pt-4 flex justify-end gap-2">
                      <Button 
                        variant="outline"
                            onClick={handleCancelLink}
                      >
                            Cancelar
                      </Button>
                          <Button 
                            onClick={handleAddLink}
                            disabled={!linkUrl.trim()}
                          >
                            Adicionar Link
                    </Button>
                    </div>
                  </div>
                    </div>
                  </div>
                </div>
              )}
                    </div>
              )}
            
            {/* Conteúdo do Fórum */}
          {activeTab === 'forum' && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden shadow-sm border border-gray-100">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2 text-white" />
                      Fórum de Discussão
                    </h2>
                    
                    <Button 
                      size="sm" 
                      onClick={openCreateTopicModal}
                      className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-none"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Discussão
                    </Button>
                  </div>
                  
                  <p className="text-sm text-white/80 mt-1">
                    Compartilhe dúvidas e discuta tópicos acadêmicos com outros membros.
                  </p>
                </div>
                
                <div className="bg-white p-6">
                  {selectedTopic ? (
                    <div>
                      {/* Detalhes do tópico selecionado */}
                      <Button 
                        variant="ghost" 
                        className="mb-4 -ml-2" 
                        onClick={handleBackToTopics}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para o fórum
                      </Button>
                      
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          {selectedTopic.is_resolved && (
                            <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Resolvido
                            </Badge>
                          )}
                          {selectedTopic.is_pinned && (
                            <Badge variant="secondary">Fixado</Badge>
                          )}
                          {selectedTopic.tags.map(tag => (
                            <Badge 
                              key={tag.id} 
                              style={{ backgroundColor: tag.color, color: 'white' }}
                              className="text-xs"
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                        <h2 className="text-2xl font-bold">{selectedTopic.title}</h2>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedTopic.user?.avatar_url} />
                            <AvatarFallback>
                              {selectedTopic.user?.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {selectedTopic.user?.name || 'Usuário'} • {formatDistanceToNow(new Date(selectedTopic.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        <div className="prose max-w-none mt-4">
                          <p className="whitespace-pre-wrap">{selectedTopic.content}</p>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-1 text-muted-foreground" />
                              <span className="text-muted-foreground">{selectedTopic.view_count} visualizações</span>
                            </div>
                            <div className="flex items-center">
                              <MessageSquare className="h-4 w-4 mr-1 text-muted-foreground" />
                              <span className="text-muted-foreground">{selectedTopic.replies_count} respostas</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={selectedTopic.user_vote === 1 ? "bg-blue-50 text-blue-600" : ""}
                              onClick={() => FacultyService.voteForumItem(selectedTopic.id, null, 1)}
                            >
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              {selectedTopic.votes_count > 0 ? selectedTopic.votes_count : ''}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={selectedTopic.user_vote === -1 ? "bg-red-50 text-red-600" : ""}
                              onClick={() => FacultyService.voteForumItem(selectedTopic.id, null, -1)}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Respostas do tópico */}
                      <div className="space-y-6 mt-8">
                        <h3 className="text-lg font-semibold">Respostas</h3>
                        
                        {isLoadingTopicReplies ? (
                          <div className="flex justify-center py-8">
                            <Spinner size="lg" />
                          </div>
                        ) : selectedTopicReplies.length === 0 ? (
                          <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-medium">Nenhuma resposta ainda</h3>
                            <p className="text-muted-foreground mt-2">
                              Seja o primeiro a responder esta discussão
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedTopicReplies.map(reply => (
                              <div 
                                key={reply.id} 
                                className={`border rounded-lg p-4 ${reply.is_solution ? 'bg-green-50 border-green-200' : ''}`}
                              >
                                <div className="flex justify-between">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={reply.user?.avatar_url} />
                                      <AvatarFallback>
                                        {reply.user?.name?.charAt(0) || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{reply.user?.name || 'Usuário'}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ptBR })}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {reply.is_solution && (
                                    <Badge variant="outline" className="bg-green-100 text-green-800">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Solução
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="mt-3 whitespace-pre-wrap">
                                  {reply.content}
                                </div>
                                
                                <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-100">
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className={reply.user_vote === 1 ? "text-blue-600" : ""}
                                      onClick={() => FacultyService.voteForumItem(null, reply.id, 1)}
                                    >
                                      <ThumbsUp className="h-4 w-4 mr-1" />
                                      {reply.votes_count || ''}
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className={reply.user_vote === -1 ? "text-red-600" : ""}
                                      onClick={() => FacultyService.voteForumItem(null, reply.id, -1)}
                                    >
                                      <ThumbsDown className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  
                                  {(isAdmin || selectedTopic.user_id === user?.id) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleMarkAsSolution(reply.id, !reply.is_solution)}
                                      className={reply.is_solution ? "bg-green-50 text-green-700" : ""}
                                    >
                                      {reply.is_solution ? (
                                        <>
                                          <CheckCircle2 className="h-4 w-4 mr-1" />
                                          Remover solução
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-4 w-4 mr-1" />
                                          Marcar como solução
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Formulário de resposta */}
                        <div className="mt-8 bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold mb-4">Sua resposta</h3>
                          <form onSubmit={handleSubmitReply}>
                            <Textarea
                              placeholder="Escreva sua resposta aqui..."
                              className="min-h-[150px] mb-3"
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                            />
                            <div className="flex justify-end">
                              <Button 
                                type="submit" 
                                disabled={isSubmittingReply || !replyContent.trim()}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {isSubmittingReply ? <Spinner size="sm" className="mr-2" /> : null}
                                Enviar resposta
                              </Button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Tabs para filtrar por status */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Button
                          variant={forumTab === 'all' ? 'default' : 'outline'}
                          onClick={() => handleForumTabChange('all')}
                          className="flex items-center"
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          Todos
                        </Button>
                        <Button
                          variant={forumTab === 'resolved' ? 'default' : 'outline'}
                          onClick={() => handleForumTabChange('resolved')}
                          className="flex items-center"
                        >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Resolvidos
                        </Button>
                        <Button
                          variant={forumTab === 'unresolved' ? 'default' : 'outline'}
                          onClick={() => handleForumTabChange('unresolved')}
                          className="flex items-center"
                        >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Não Resolvidos
                        </Button>
                      </div>
                      
                      {isLoadingTopics ? (
                        <div className="flex justify-center py-8">
                          <Spinner size="lg" />
                        </div>
                      ) : forumTopics.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Nenhuma discussão iniciada</h3>
                    <p className="text-muted-foreground mt-2">
                      Inicie uma discussão para tirar dúvidas com seus colegas
                    </p>
                          <Button 
                            className="mt-4 bg-blue-600 hover:bg-blue-700" 
                            onClick={openCreateTopicModal}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Discussão
                          </Button>
                  </div>
                      ) : (
                        <div className="space-y-3">
                          {forumTopics.map(topic => (
                            <div key={topic.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium">{topic.title}</h3>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <span>Por {topic.user?.name || 'Usuário'}</span>
                                    <span>•</span>
                                    <span>{new Date(topic.created_at).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    })}</span>
                                    <span>•</span>
                                    <span>{topic.replies_count} respostas</span>
                                  </div>
                                  {topic.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {topic.tags.map(tag => (
                                        <Badge 
                                          key={tag.id} 
                                          style={{ backgroundColor: tag.color, color: 'white' }}
                                          className="text-xs"
                                        >
                                          {tag.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    // Atualizar o estado diretamente para evitar esperar o useEffect
                                    setSelectedTopic(topic);
                                    loadTopicReplies(topic.id);
                                    // Atualizar a URL sem recarregar a página
                                    router.push(`/minha-faculdade/${faculty.id}?topic=${topic.id}`, { scroll: false });
                                  }}
                                >
                                  Ver
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
            
            {/* Conteúdo de Materiais */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden shadow-sm border border-gray-100">
                <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 text-white">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-white" />
                      Materiais de Estudo
                    </h2>
                    
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => loadMaterials(faculty.id)}
                    disabled={isLoadingMaterials}
                        className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-none"
                  >
                    {isLoadingMaterials ? <Spinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-2 hidden sm:inline">Atualizar</span>
                  </Button>
                      <Button 
                        size="sm" 
                        onClick={openUploadMaterialModal}
                        className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-none"
                      >
                      <Plus className="mr-2 h-4 w-4" />
                  Adicionar Material
                    </Button>
                  </div>
              </div>
                  
                  <p className="text-sm text-white/80 mt-1">
                    Compartilhe e acesse materiais de estudo para as disciplinas da faculdade.
                  </p>
                </div>
                
                <div className="bg-white p-6">
              {isLoadingMaterials ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                    </div>
                  ) : (
                <MaterialsList 
                  facultyId={faculty.id} 
                  isAdmin={isAdmin || isOwner}
                />
                  )}
                </div>
              </div>
            </div>
          )}
            
            {/* Conteúdo de Simulados */}
          {activeTab === 'exams' && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden shadow-sm border border-gray-100">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white">
                  <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold flex items-center">
                      <FileQuestion className="h-5 w-5 mr-2 text-white" />
                    Simulados Compartilhados
                  </h2>
                  
                    <Badge className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm">
                    {exams.length} {exams.length === 1 ? 'simulado' : 'simulados'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-white/80 mt-1">
                    Simulados compartilhados pelos membros da faculdade para prática e estudo.
                  </p>
                              </div>
                
                <div className="bg-white p-6">
                <ExamsList 
                  exams={exams}
                  isLoading={isLoadingExams}
                  onOpenExam={handleOpenExam}
                />
                    </div>
              </div>
            </div>
          )}
                
            {/* Conteúdo de Membros */}
          {activeTab === 'members' && (
            <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
              <div className="rounded-lg overflow-hidden shadow-sm border border-gray-100">
                <div className={`bg-gradient-to-r from-amber-500 to-orange-600 ${isMobile ? 'px-4 py-3' : 'px-6 py-4'} text-white`}>
              <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-center'}`}>
                    <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold flex items-center`}>
                      <Users className={`${isMobile ? 'h-4 w-4 mr-2' : 'h-5 w-5 mr-2'} text-white`} />
                  Membros
                    </h2>
                    
                {isAdmin && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={openManageMembersModal}
                        className={`bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-none ${isMobile ? 'text-xs self-start' : ''}`}
                      >
                    Gerenciar
                  </Button>
                )}
              </div>
                  
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/80 mt-1`}>
                    {faculty?.member_count || 0} {faculty?.member_count === 1 ? 'membro' : 'membros'} participando neste ambiente.
                  </p>
                </div>
                
                <div className={`bg-white ${isMobile ? 'p-4' : 'p-6'}`}>
              <div className={`${isMobile ? 'space-y-2' : 'space-y-3'}`}>
                {members.length > 0 ? (
                  members.slice(0, 5).map((member) => {
                    const userName = member.user?.name || member.user?.email?.split('@')[0] || 'Usuário';
                    const userInitial = userName.charAt(0).toUpperCase();
                    const isAdmin = member.role === 'admin';
                    
                    return (
                      <div key={member.user_id} className={`flex items-center justify-between ${isMobile ? 'p-2' : 'p-2'} rounded-md hover:bg-muted`}>
                        <div className="flex items-center">
                              <Avatar className={`${isMobile ? 'h-8 w-8 mr-2' : 'h-10 w-10 mr-3'} ${isAdmin ? 'ring-2 ring-amber-500 border-2 border-white' : ''}`}>
                            <AvatarImage src={member.user?.avatar_url} />
                                <AvatarFallback className={isAdmin ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-gray-100'}>
                              {userInitial}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                                <p className={`font-medium ${isMobile ? 'text-sm' : ''}`}>{userName}</p>
                            <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground capitalize`}>{member.role}</p>
                          </div>
                        </div>
                        {isAdmin && (
                              <Badge variant="secondary" className={`bg-amber-100 text-amber-800 hover:bg-amber-200 ${isMobile ? 'text-xs' : ''}`}>Admin</Badge>
                        )}
                      </div>
                    );
                  })
                ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">Nenhum membro encontrado</h3>
                  </div>
                )}
              </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      size="sm" 
                      onClick={openManageMembersModal}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Ver todos os membros ({faculty?.member_count || 0})
              </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
          
        {/* Barra lateral */}
        <div className={`w-full ${isMobile ? 'space-y-4' : 'md:w-1/3 space-y-6'} overflow-x-hidden min-w-0`}>
          {/* Card de eventos */}
          <Card className="max-w-full">
            <CardHeader className={`${isMobile ? 'pb-2' : 'pb-3'}`}>
              <div className="flex justify-between items-center">
              <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} flex items-center`}>
                  <Calendar className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} mr-2 text-blue-500`} />
                  Próximos Eventos
              </CardTitle>
                {isAdmin && (
                  <Button variant="ghost" size={isMobile ? "sm" : "sm"} onClick={openCreateEventModal}>
                    <Plus className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
                    {!isMobile && 'Novo'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className={isMobile ? 'px-3' : ''}>
              <div className={`${isMobile ? 'space-y-2' : 'space-y-3'}`}>
                {faculty ? (
                  <EventsList 
                    key={eventsKey}
                    facultyId={faculty.id} 
                    limit={3} 
                    showActions={isAdmin}
                    onEventUpdated={loadEvents}
                  />
                ) : (
                  <div className="flex justify-center py-4">
                    <Spinner size="sm" />
                </div>
                )}
              </div>
            </CardContent>
            <CardFooter className={`pt-0 ${isMobile ? 'px-3' : ''}`}>
              <Button 
                variant="ghost" 
                className="w-full" 
                size={isMobile ? "sm" : "sm"}
                onClick={() => router.push(`/minha-faculdade/${faculty?.id}/eventos`)}
              >
                Ver todos os eventos
              </Button>
            </CardFooter>
          </Card>

          {/* Configurações (apenas para administradores) */}
          {isAdmin && (
            <Card className="max-w-full">
              <CardHeader className={`${isMobile ? 'pb-2' : 'pb-3'}`}>
                <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} flex items-center`}>
                  <Settings className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} mr-2 text-blue-500`} />
                  Configurações
                </CardTitle>
              </CardHeader>
              <CardContent className={isMobile ? 'px-3' : ''}>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size={isMobile ? "sm" : "default"}>
                    <Settings className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <span className={isMobile ? 'text-sm' : ''}>
                      Editar informações
                    </span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    size={isMobile ? "sm" : "default"}
                    onClick={openManageMembersModal}
                  >
                    <Users className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                    <span className={isMobile ? 'text-sm' : ''}>
                      Gerenciar membros
                    </span>
                  </Button>
                  <Separator className="my-2" />
                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    size={isMobile ? "sm" : "default"}
                    onClick={() => setDeleteConfirmationOpen(true)}
                  >
                    <span className={isMobile ? 'text-sm' : ''}>
                      Excluir ambiente
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de gerenciamento de membros */}
      {faculty && user && (
        <ManageMembersModal
          isOpen={manageMembersModalOpen}
          onClose={() => {
            setManageMembersModalOpen(false);
            handleMembersUpdated();
          }}
          facultyId={faculty.id}
          currentUserId={user.id}
          isOwner={isOwner}
        />
      )}

      {/* Modal para criar nova discussão */}
      {createTopicModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className={`bg-white rounded-lg shadow-lg ${isMobile ? 'max-w-[95vw]' : 'max-w-[600px]'} w-full max-h-[90vh] overflow-y-auto`}>
            <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <div className={`flex justify-between items-center ${isMobile ? 'mb-3' : 'mb-4'}`}>
                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>Nova Discussão</h2>
                <button 
                  onClick={() => setCreateTopicModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "20" : "24"} height={isMobile ? "20" : "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              
              <div className={`text-sm text-gray-500 ${isMobile ? 'mb-3' : 'mb-4'}`}>
                Crie um novo tópico no fórum de dúvidas. Seja específico para facilitar as respostas.
              </div>
              
              <form onSubmit={handleCreateTopic} className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
                <div className="space-y-2">
                  <label htmlFor="title" className="block text-sm font-medium">Título</label>
                  <input
                    id="title"
                    className={`w-full ${isMobile ? 'px-2 py-2' : 'px-3 py-2'} border border-gray-300 rounded-md text-sm`}
                    placeholder="Digite um título claro e objetivo"
                    value={topicTitle}
                    onChange={(e) => setTopicTitle(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="content" className="block text-sm font-medium">Descrição da dúvida</label>
                  <textarea
                    id="content"
                    className={`w-full ${isMobile ? 'px-2 py-2 min-h-[120px]' : 'px-3 py-2 min-h-[150px]'} border border-gray-300 rounded-md text-sm`}
                    placeholder="Descreva sua dúvida com detalhes..."
                    value={topicContent}
                    onChange={(e) => setTopicContent(e.target.value)}
                  />
                </div>
                
                <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-end gap-2'} pt-4`}>
                  <button
                    type="button"
                    className={`${isMobile ? 'w-full order-2' : ''} px-4 py-2 border border-gray-300 rounded-md text-sm`}
                    onClick={() => setCreateTopicModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`${isMobile ? 'w-full order-1' : ''} px-4 py-2 bg-blue-600 text-white rounded-md text-sm`}
                    disabled={isSubmittingTopic || !topicTitle.trim() || !topicContent.trim()}
                  >
                    {isSubmittingTopic ? 'Publicando...' : 'Publicar Dúvida'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para upload de materiais */}
      <UploadMaterialModal 
        isOpen={uploadMaterialModalOpen}
        onClose={() => setUploadMaterialModalOpen(false)}
        facultyId={faculty?.id || 0}
        onMaterialUploaded={() => loadMaterials(faculty?.id || 0)}
      />

      {/* Modal de confirmação de exclusão */}
      {deleteConfirmationOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className={`bg-white rounded-lg shadow-lg ${isMobile ? 'max-w-[90vw]' : 'max-w-[400px]'} w-full ${isMobile ? 'p-4' : 'p-6'}`}>
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold ${isMobile ? 'mb-3' : 'mb-4'}`}>Confirmar Exclusão</h3>
            <p className={`text-sm text-gray-700 ${isMobile ? 'mb-4' : 'mb-6'}`}>
              Tem certeza de que deseja excluir o ambiente "{faculty?.name}"? Esta ação é irreversível.
            </p>
            <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-end gap-2'}`}>
              <Button 
                variant="outline" 
                onClick={() => setDeleteConfirmationOpen(false)} 
                disabled={isDeleting}
                size={isMobile ? "sm" : "default"}
                className={isMobile ? 'order-2' : ''}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmDeleteFaculty} 
                disabled={isDeleting}
                size={isMobile ? "sm" : "default"}
                className={isMobile ? 'order-1' : ''}
              >
                {isDeleting ? <Spinner size="sm" /> : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {faculty && (
        <CreateEventModal
          isOpen={createEventModalOpen}
          onClose={() => setCreateEventModalOpen(false)}
          facultyId={faculty.id}
          onEventCreated={handleEventCreated}
          isAdmin={isAdmin}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}