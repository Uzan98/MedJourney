'use client';

import { useState, useEffect } from 'react';
import { FacultyService } from '@/services/faculty.service';
import { FacultyComment, FacultyPost } from '@/types/faculty';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/Spinner';
import { MessageSquare, ThumbsUp, Send, Calendar, Clock, MoreHorizontal } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Função auxiliar para renderizar links no conteúdo
function renderContentWithLinks(content: string): React.ReactNode {
  // Regex para encontrar links no formato [texto](url) ou URLs simples
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  
  // Primeiro, substituir links no formato Markdown
  let parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  // Processar links no formato [texto](url)
  const contentWithMarkdownLinks = content.replace(markdownLinkRegex, (match, text, url) => {
    return `__LINK_START__${text}__LINK_MID__${url}__LINK_END__`;
  });
  
  // Processar URLs simples
  const processedContent = contentWithMarkdownLinks.replace(urlRegex, (url) => {
    // Verificar se a URL já está dentro de um link Markdown
    if (url.includes('__LINK_MID__')) return url;
    return `__URL_START__${url}__URL_END__`;
  });
  
  // Dividir o conteúdo pelos marcadores
  const segments = processedContent.split(/__LINK_START__|__URL_START__|__LINK_MID__|__LINK_END__|__URL_END__/);
  const types = processedContent.match(/__LINK_START__|__URL_START__|__LINK_MID__|__LINK_END__|__URL_END__/g) || [];
  
  let result: React.ReactNode[] = [];
  let currentLinkText = '';
  let currentLinkUrl = '';
  let inLink = false;
  let inUrl = false;
  
  segments.forEach((segment, i) => {
    if (i === 0 && segment) {
      result.push(segment);
      return;
    }
    
    const type = types[i - 1];
    
    if (type === '__LINK_START__') {
      currentLinkText = segment;
      inLink = true;
    } else if (type === '__LINK_MID__') {
      currentLinkUrl = segment;
    } else if (type === '__LINK_END__') {
      result.push(
        <a 
          key={`link-${i}`} 
          href={currentLinkUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-purple-600 hover:underline font-medium"
        >
          {currentLinkText}
        </a>
      );
      inLink = false;
      
      if (segment) result.push(segment);
    } else if (type === '__URL_START__') {
      currentLinkUrl = segment;
      inUrl = true;
    } else if (type === '__URL_END__') {
      result.push(
        <a 
          key={`url-${i}`} 
          href={currentLinkUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-purple-600 hover:underline break-all font-medium"
        >
          {currentLinkUrl}
        </a>
      );
      inUrl = false;
      
      if (segment) result.push(segment);
    } else if (segment) {
      result.push(segment);
    }
  });
  
  return result;
}

interface PostCommentSectionProps {
  post: FacultyPost;
  onLike?: () => void;
}

export function PostCommentSection({ post, onLike }: PostCommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<FacultyComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comment_count || 0);

  // Carregar comentários quando o usuário clicar para exibi-los
  useEffect(() => {
    if (showComments) {
      loadComments();
    }
  }, [showComments]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const fetchedComments = await FacultyService.getPostComments(post.id);
      setComments(fetchedComments);
      setCommentsCount(fetchedComments.length);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      toast({
        title: "Erro ao carregar comentários",
        description: "Não foi possível carregar os comentários deste post.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    // Salvar o comentário atual para uso na atualização otimista
    const commentContent = newComment;
    
    // Limpar o campo de comentário imediatamente para feedback visual
    setNewComment('');
    
    // Criar um ID temporário para o comentário
    const tempId = `temp-${Date.now()}`;
    
    // Adicionar o comentário localmente primeiro (otimista)
    if (user) {
      const optimisticComment: FacultyComment = {
        id: tempId as unknown as number, // Será substituído pelo ID real
        post_id: post.id,
        user_id: user.id,
        content: commentContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url || ''
        }
      };
      
      // Adicionar à lista de comentários
      setComments(prev => [...prev, optimisticComment]);
      setCommentsCount(prev => prev + 1);
    }
    
    setIsSubmitting(true);
    try {
      const commentId = await FacultyService.createComment(post.id, commentContent);
      
      if (commentId) {
        // Substituir o comentário temporário pelo real
        if (user) {
          setComments(prev => 
            prev.map(comment => {
              if (comment.id === tempId as unknown as number) {
                return {
                  ...comment,
                  id: commentId
                };
              }
              return comment;
            })
          );
        } else {
          // Se não temos os dados do usuário, recarregar todos os comentários
          loadComments();
        }
        
        toast({
          title: "Comentário adicionado",
          description: "Seu comentário foi adicionado com sucesso.",
        });
      } else {
        // Se falhou, remover o comentário otimista
        setComments(prev => prev.filter(comment => comment.id !== tempId as unknown as number));
        setCommentsCount(prev => prev - 1);
        
        throw new Error('Erro ao adicionar comentário');
      }
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast({
        title: "Erro ao adicionar comentário",
        description: "Não foi possível adicionar seu comentário. Tente novamente mais tarde.",
        variant: "destructive"
      });
      
      // Restaurar o texto do comentário no campo de entrada
      setNewComment(commentContent);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleComments = () => {
    setShowComments(!showComments);
  };

  // Formatação da data
  const formattedDate = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  // Determinar o tipo de post para exibição visual
  const postType = post.type || 'post';
  const postTypeColor = {
    announcement: 'bg-amber-50 border-amber-200 text-amber-700',
    question: 'bg-blue-50 border-blue-200 text-blue-700',
    material: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    post: 'bg-purple-50 border-purple-200 text-purple-700'
  }[postType] || 'bg-gray-50 border-gray-200 text-gray-700';
  
  const postTypeLabel = {
    announcement: 'Publicação',
    question: 'Pergunta',
    material: 'Material',
    post: 'Publicação'
  }[postType] || 'Publicação';

  return (
    <Card className="shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Indicador de tipo de post */}
      <div className={`w-full h-1 ${postTypeColor.split(' ')[0]}`}></div>
      
      <CardContent className="pt-6">
        {/* Cabeçalho do post */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-purple-100 ring-2 ring-white shadow-sm">
              <AvatarImage src={post.user?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-indigo-600 text-white font-medium">
                {post.user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-800">{post.user?.name || 'Usuário'}</p>
                <Badge variant="outline" className={`text-xs ${postTypeColor}`}>
                  {postTypeLabel}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Conteúdo do post */}
        <div className="mb-6">
          {post.title && post.title !== post.content && (
            <h3 className="text-lg font-semibold mb-3 text-gray-900">{post.title}</h3>
          )}
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {renderContentWithLinks(post.content)}
          </div>
        </div>
        
        <Separator className="my-4" />
        
        {/* Ações do post */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLike}
              className={`flex items-center gap-1.5 rounded-full px-3 ${post.user_liked ? 'text-purple-600 bg-purple-50' : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'}`}
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="font-medium">{post.likes_count || 0}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleComments}
              className="flex items-center gap-1.5 rounded-full px-3 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">{commentsCount}</span>
            </Button>
          </div>
          
          <div className="text-xs text-gray-500">
            {commentsCount > 0 && !showComments && (
              <Button 
                variant="link" 
                size="sm" 
                onClick={toggleComments}
                className="text-xs text-purple-600 p-0 h-auto"
              >
                Ver comentários
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      
      {showComments && (
        <CardFooter className="pt-0 pb-4 px-6">
          {/* Seção de comentários */}
          <div className="w-full space-y-4 pt-2">
            <Separator />
            
            {/* Lista de comentários */}
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-2">
                Nenhum comentário ainda. Seja o primeiro a comentar!
              </p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={comment.user?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs">
                        {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm text-gray-800">
                            {comment.user?.name || 'Usuário'}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                        </div>
                        <div className="text-sm mt-1 text-gray-700">
                          {renderContentWithLinks(comment.content)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Formulário para adicionar comentário */}
            <form onSubmit={handleSubmitComment} className="flex items-center gap-2 mt-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-purple-400 to-indigo-600 text-white text-xs">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center gap-2">
                <Input
                  placeholder="Adicione um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 border-gray-200 focus:border-purple-500 rounded-full bg-gray-50 pl-4"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={!newComment.trim() || isSubmitting}
                  className="rounded-full bg-purple-600 hover:bg-purple-700"
                >
                  {isSubmitting ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </div>
        </CardFooter>
      )}
    </Card>
  );
} 