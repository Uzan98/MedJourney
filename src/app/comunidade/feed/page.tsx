'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Users, 
  Filter, 
  RefreshCw, 
  PlusCircle,
  ThumbsUp, 
  MessageCircle,
  Award,
  Clock,
  FileText,
  MoreHorizontal,
  ChevronDown,
  BookOpen,
  Send,
  Heart,
  Settings,
  Mail,
  Newspaper,
  Layout,
  Image,
  MapPin,
  Globe,
  Music,
  Mountain,
  Utensils,
  Smile,
  Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityFeedService } from '@/services/community-feed.service';
import { Post, PostType, ReactionType } from '@/types/community';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function CommunityFeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'recents' | 'friends' | 'popular'>('recents');
  const [showFilters, setShowFilters] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  
  // Carregar posts iniciais
  useEffect(() => {
    loadPosts();
  }, [activeTab]);
  
  // Função para carregar posts com base nos filtros atuais
  const loadPosts = async () => {
    setLoading(true);
    try {
      // Aplicar filtros com base na aba ativa
      let filters = undefined;
      
      if (activeTab === 'friends') {
        // Filtrar posts de amigos (simulado)
        filters = { user_id: ['456', '789'] }; // IDs simulados de amigos
      } else if (activeTab === 'popular') {
        // Lógica para posts populares seria implementada aqui
      }
      
      // Buscar posts do serviço
      const fetchedPosts = await CommunityFeedService.getPosts(filters);
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
      toast.error('Não foi possível carregar o feed');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para atualizar o feed
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPosts();
      toast.success('Feed atualizado');
    } catch (error) {
      console.error('Erro ao atualizar feed:', error);
      toast.error('Erro ao atualizar feed');
    } finally {
      setRefreshing(false);
    }
  };
  
  // Função para criar um novo post
  const handleCreatePost = async () => {
    if (!newPostContent.trim() || isCreatingPost || !user) return;
    
    setIsCreatingPost(true);
    try {
      const newPost = {
        user_id: user.id,
        username: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        avatar_url: user.user_metadata?.avatar_url,
        content: newPostContent.trim(),
        type: PostType.GENERAL,
        visibility: 'public' as const
      };
      
      const createdPost = await CommunityFeedService.createPost(newPost);
      
      if (createdPost) {
        toast.success('Post criado com sucesso!');
        setNewPostContent('');
        setPosts([createdPost, ...posts]);
      } else {
        toast.error('Não foi possível criar o post');
      }
    } catch (error) {
      console.error('Erro ao criar post:', error);
      toast.error('Erro ao criar post');
    } finally {
      setIsCreatingPost(false);
    }
  };
  
  // Função para reagir a um post
  const handleReaction = async (postId: string, reactionType: ReactionType) => {
    if (!user) {
      toast.error('Você precisa estar logado para reagir a posts');
      return;
    }
    
    try {
      const success = await CommunityFeedService.toggleReaction(postId, user.id, reactionType);
      
      if (success) {
        // Atualizar o estado local para refletir a reação
        setPosts(currentPosts => 
          currentPosts.map(post => {
            if (post.id === postId) {
              // Simular a alternância da reação (incrementar/decrementar)
              const updatedReactions = { ...post.reactions_count };
              updatedReactions[reactionType] = updatedReactions[reactionType] + 1;
              
              return {
                ...post,
                reactions_count: updatedReactions
              };
            }
            return post;
          })
        );
      }
    } catch (error) {
      console.error('Erro ao reagir ao post:', error);
    }
  };
  
  // Função para renderizar o tipo de post com ícone apropriado
  const renderPostTypeIcon = (type: PostType) => {
    switch (type) {
      case PostType.ACHIEVEMENT:
        return <Award className="h-4 w-4 text-purple-500" />;
      case PostType.EXAM_RESULT:
        return <FileText className="h-4 w-4 text-green-500" />;
      case PostType.STUDY_MILESTONE:
        return <Clock className="h-4 w-4 text-blue-500" />;
      case PostType.NOTE:
        return <BookOpen className="h-4 w-4 text-amber-500" />;
      default:
        return null;
    }
  };
  
  // Função para formatar a data de criação do post
  const formatPostDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };
  
  // Dados simulados para stories
  const stories = [
    { id: '1', username: 'Anatoly P.', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=200' },
    { id: '2', username: 'Lola Earns', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=200' }
  ];
  
  // Dados simulados para sugestões de amigos
  const suggestions = [
    { id: '1', username: 'Nick Shelburne', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nick' },
    { id: '2', username: 'Brittni Lando', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Brittni' },
    { id: '3', username: 'Ivan Shevchenko', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ivan' }
  ];
  
  // Dados simulados para recomendações
  const recommendations = [
    { id: '1', title: 'UI/UX', icon: <Layout className="h-5 w-5" /> },
    { id: '2', title: 'Music', icon: <Music className="h-5 w-5" /> },
    { id: '3', title: 'Hiking', icon: <Mountain className="h-5 w-5" /> },
    { id: '4', title: 'Cooking', icon: <Utensils className="h-5 w-5" /> }
  ];
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar esquerdo */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-6">
              <div className="flex flex-col items-center mb-6">
                <Avatar className="h-16 w-16 mb-3">
                  <AvatarImage src={user?.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"} />
                  <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <h3 className="font-bold text-gray-800">{user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'}</h3>
                <p className="text-xs text-gray-500">@{user?.email?.split('@')[0].toLowerCase() || 'usuario'}</p>
              </div>
              
              <nav className="space-y-1">
                <Link href="/comunidade/feed" className="flex items-center space-x-3 p-2.5 rounded-lg bg-blue-50 text-blue-700 font-medium">
                  <Newspaper className="h-5 w-5" />
                  <span>Feed</span>
                </Link>
                
                <Link href="#" className="flex items-center space-x-3 p-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                  <Mail className="h-5 w-5" />
                  <span>Mensagens</span>
                  <span className="ml-auto bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">6</span>
                </Link>
                
                <Link href="#" className="flex items-center space-x-3 p-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                  <Users className="h-5 w-5" />
                  <span>Amigos</span>
                </Link>
                
                <Link href="#" className="flex items-center space-x-3 p-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                  <Image className="h-5 w-5" />
                  <span>Mídia</span>
                </Link>
                
                <Link href="#" className="flex items-center space-x-3 p-2.5 rounded-lg text-gray-700 hover:bg-gray-50">
                  <Settings className="h-5 w-5" />
                  <span>Configurações</span>
                </Link>
              </nav>
              
              <div className="mt-8 pt-6 border-t border-gray-100">
                <button className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Criar Post
                </button>
              </div>
            </div>
          </div>
          
          {/* Conteúdo principal */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold text-gray-800">Feed</h1>
                
                <div className="flex gap-2">
                  <Tabs 
                    defaultValue="recents" 
                    className="w-auto"
                    onValueChange={(value) => setActiveTab(value as 'recents' | 'friends' | 'popular')}
                  >
                    <TabsList className="grid grid-cols-3 h-9">
                      <TabsTrigger value="recents" className="px-3 text-xs">Recentes</TabsTrigger>
                      <TabsTrigger value="friends" className="px-3 text-xs">Amigos</TabsTrigger>
                      <TabsTrigger value="popular" className="px-3 text-xs">Popular</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>
              
              {/* Área de criação de post */}
              <div className="flex items-start gap-3 mb-6 pt-2 border-t border-gray-100">
                <Avatar>
                  <AvatarImage src={user?.user_metadata?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"} />
                  <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Input
                    placeholder="Compartilhe algo..."
                    className="bg-gray-50 border-0 focus-visible:ring-blue-500"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                  />
                  
                  <div className="flex mt-3 gap-2">
                    <Button variant="outline" size="sm" className="text-xs">
                      <Image className="h-3.5 w-3.5 mr-1.5" />
                      Imagem
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                      <MapPin className="h-3.5 w-3.5 mr-1.5" />
                      Localização
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Globe className="h-3.5 w-3.5 mr-1.5" />
                      Público
                    </Button>
                    <Button 
                      className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      size="sm"
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim() || isCreatingPost}
                    >
                      {isCreatingPost ? 'Enviando...' : 'Enviar'}
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Lista de posts */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-600">Carregando posts...</p>
                </div>
              ) : posts.length > 0 ? (
                <div className="space-y-6">
                  {posts.map((post) => (
                    <div key={post.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
                      {/* Cabeçalho do post */}
                      <div className="p-4 flex items-start justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarImage src={post.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.username}`} />
                            <AvatarFallback>{post.username.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-800">{post.username}</p>
                            <p className="text-xs text-gray-500">{formatPostDate(post.created_at)}</p>
                          </div>
                        </div>
                        
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Conteúdo do post */}
                      <div className="px-4 pb-3">
                        <p className="text-gray-800 whitespace-pre-line">{post.content}</p>
                      </div>
                      
                      {/* Metadados específicos por tipo de post */}
                      {post.type === PostType.EXAM_RESULT && post.metadata && (
                        <div className="mx-4 my-3 p-3 bg-green-50 rounded-lg border border-green-100">
                          <p className="font-medium text-green-800">{post.metadata.exam_title}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm text-green-700">
                              Pontuação: <span className="font-bold">{post.metadata.score}%</span>
                            </span>
                            <span className="text-sm text-green-700">
                              {post.metadata.correct_answers}/{post.metadata.total_questions} questões
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Imagens (simuladas para alguns posts) */}
                      {post.id === '1' && (
                        <div className="grid grid-cols-3 gap-1">
                          <img 
                            src="https://images.unsplash.com/photo-1527004013197-933c4bb611b3?q=80&w=300" 
                            alt="Imagem do post"
                            className="w-full h-48 object-cover"
                          />
                          <img 
                            src="https://images.unsplash.com/photo-1546514355-7fdc90ccbd03?q=80&w=300" 
                            alt="Imagem do post"
                            className="w-full h-48 object-cover"
                          />
                          <img 
                            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=300" 
                            alt="Imagem do post"
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Contador de reações e comentários */}
                      <div className="px-4 py-2 border-t border-gray-100 flex justify-between text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="flex -space-x-1 mr-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs">
                              <Heart className="h-3 w-3" />
                            </span>
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 text-white text-xs">
                              <Smile className="h-3 w-3" />
                            </span>
                          </div>
                          <span>{Object.entries(post.reactions_count).reduce((sum, [_, count]) => sum + count, 0)}</span>
                        </div>
                        
                        <div>
                          {post.comments_count > 0 && (
                            <span>{post.comments_count} comentários</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Botões de ação */}
                      <div className="px-4 py-2 border-t border-gray-100 grid grid-cols-3 gap-1">
                        <Button 
                          variant="ghost" 
                          className="flex items-center justify-center py-1.5"
                          onClick={() => handleReaction(post.id, ReactionType.LIKE)}
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Curtir
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          className="flex items-center justify-center py-1.5"
                          onClick={() => router.push(`/comunidade/feed/post/${post.id}`)}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Comentar
                        </Button>
                        
                        <div className="relative">
                          <Button 
                            variant="ghost" 
                            className="flex items-center justify-center py-1.5 w-full"
                          >
                            <Smile className="h-4 w-4 mr-2" />
                            Reagir
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum post encontrado</h3>
                  <p className="text-gray-600 mb-4">
                    {activeTab === 'friends' 
                      ? 'Não há posts dos seus amigos. Adicione mais amigos para ver o conteúdo deles.'
                      : activeTab === 'popular'
                        ? 'Não há posts populares disponíveis no momento.'
                        : 'Não há posts disponíveis no momento. Seja o primeiro a compartilhar algo!'}
                  </p>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Criar Post
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar direito */}
          <div className="hidden lg:block lg:col-span-3">
            {/* Stories */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-800">Stories</h2>
                <Button variant="ghost" size="sm" className="h-8 text-xs">Ver todos</Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {stories.map(story => (
                  <div key={story.id} className="relative cursor-pointer group">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden">
                      <img 
                        src={story.image} 
                        alt={story.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                      <p className="text-white text-xs font-medium truncate">{story.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Sugestões */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <h2 className="font-bold text-gray-800 mb-4">Sugestões</h2>
              
              <div className="space-y-3">
                {suggestions.map(suggestion => (
                  <div key={suggestion.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={suggestion.avatar} />
                        <AvatarFallback>{suggestion.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{suggestion.username}</span>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      Seguir
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 text-center">
                <Button variant="link" size="sm" className="text-xs text-gray-500">
                  Ver todos
                </Button>
              </div>
            </div>
            
            {/* Recomendações */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-bold text-gray-800 mb-4">Recomendações</h2>
              
              <div className="grid grid-cols-2 gap-3">
                {recommendations.map(recommendation => (
                  <div 
                    key={recommendation.id} 
                    className="aspect-square rounded-xl flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-2">
                      {recommendation.icon}
                    </div>
                    <span className="text-sm font-medium">{recommendation.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 