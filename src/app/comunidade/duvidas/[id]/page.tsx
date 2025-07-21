'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FacultyService } from '@/services/faculty.service';
import { ForumTopic, ForumReply } from '@/types/faculty';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/Spinner';
import { 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown,
  ArrowLeft, 
  CheckCircle2,
  Clock,
  Eye
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

export default function TopicDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRepliesLoading, setIsRepliesLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userVote, setUserVote] = useState<number | undefined>(undefined);
  const [facultyId, setFacultyId] = useState<number | null>(null);
  
  const topicId = parseInt(params.id);
  
  // Carregar dados do tópico
  useEffect(() => {
    const loadTopic = async () => {
      if (isNaN(topicId)) {
        router.push('/comunidade/duvidas');
        return;
      }
      
      setIsLoading(true);
      try {
        // Primeiro, precisamos descobrir a qual faculdade este tópico pertence
        const { data, error } = await supabase
          .from('faculty_forum_topics')
          .select('faculty_id')
          .eq('id', topicId)
          .single();
        
        if (error || !data) {
          toast({
            title: "Tópico não encontrado",
            description: "O tópico que você está procurando não existe ou foi removido.",
            variant: "destructive"
          });
          router.push('/comunidade/duvidas');
          return;
        }
        
        setFacultyId(data.faculty_id);
        
        // Agora podemos buscar os dados completos do tópico
        const topics = await FacultyService.getForumTopics(
          data.faculty_id,
          1,
          0,
          undefined,
          undefined,
          undefined
        );
        
        const foundTopic = topics.find(t => t.id === topicId);
        if (foundTopic) {
          setTopic(foundTopic);
          
          // Incrementar a contagem de visualizações
          await FacultyService.incrementTopicViewCount(topicId);
        } else {
          toast({
            title: "Tópico não encontrado",
            description: "O tópico que você está procurando não existe ou foi removido.",
            variant: "destructive"
          });
          router.push('/comunidade/duvidas');
        }
      } catch (error) {
        console.error('Erro ao carregar tópico:', error);
        toast({
          title: "Erro ao carregar tópico",
          description: "Não foi possível carregar os detalhes do tópico. Tente novamente mais tarde.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTopic();
  }, [topicId, router]);
  
  // Carregar respostas do tópico
  useEffect(() => {
    const loadReplies = async () => {
      if (isNaN(topicId)) return;
      
      setIsRepliesLoading(true);
      try {
        const forumReplies = await FacultyService.getForumReplies(topicId);
        setReplies(forumReplies);
      } catch (error) {
        console.error('Erro ao carregar respostas:', error);
        toast({
          title: "Erro ao carregar respostas",
          description: "Não foi possível carregar as respostas deste tópico. Tente novamente mais tarde.",
          variant: "destructive"
        });
      } finally {
        setIsRepliesLoading(false);
      }
    };
    
    loadReplies();
  }, [topicId]);
  
  // Configurar Realtime para atualizações de respostas
  useEffect(() => {
    if (!facultyId) return;
    
    const repliesChannel = supabase
      .channel('forum-replies-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'faculty_forum_replies',
          filter: `topic_id=eq.${topicId}`
        },
        (payload: any) => {
          // Recarregar as respostas quando houver mudanças
          FacultyService.getForumReplies(topicId).then(setReplies);
        }
      )
      .subscribe();
    
    const votesChannel = supabase
      .channel('forum-votes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'faculty_forum_votes'
        },
        (payload: any) => {
          // Recarregar o tópico e respostas para atualizar contagens de votos
          if (facultyId) {
            FacultyService.getForumTopics(facultyId, 1, 0, undefined, undefined, undefined)
              .then(topics => {
                const updatedTopic = topics.find(t => t.id === topicId);
                if (updatedTopic) setTopic(updatedTopic);
              });
            
            FacultyService.getForumReplies(topicId).then(setReplies);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(repliesChannel);
      supabase.removeChannel(votesChannel);
    };
  }, [topicId, facultyId, supabase]);
  
  // Enviar uma nova resposta
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyContent.trim()) {
      toast({
        title: "Conteúdo vazio",
        description: "Por favor, escreva uma resposta antes de enviar.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const replyId = await FacultyService.createForumReply(topicId, replyContent);
      
      if (replyId) {
        toast({
          title: "Resposta enviada",
          description: "Sua resposta foi publicada com sucesso!",
        });
        setReplyContent('');
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
      setIsSubmitting(false);
    }
  };
  
  // Votar em um tópico
  const handleVoteTopic = async (voteType: number) => {
    if (!topic) return;
    
    try {
      const success = await FacultyService.voteForumItem(topic.id, null, voteType);
      
      if (success) {
        // O voto foi registrado ou removido, a atualização virá pelo Realtime
        setUserVote(voteType);
      }
    } catch (error) {
      console.error('Erro ao votar no tópico:', error);
      toast({
        title: "Erro ao registrar voto",
        description: "Não foi possível registrar seu voto. Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };
  
  // Votar em uma resposta
  const handleVoteReply = async (replyId: number, voteType: number) => {
    try {
      const success = await FacultyService.voteForumItem(null, replyId, voteType);
      
      if (success) {
        // O voto foi registrado ou removido, a atualização virá pelo Realtime
      }
    } catch (error) {
      console.error('Erro ao votar na resposta:', error);
      toast({
        title: "Erro ao registrar voto",
        description: "Não foi possível registrar seu voto. Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };
  
  // Marcar uma resposta como solução
  const handleMarkAsSolution = async (replyId: number, isSolution: boolean) => {
    try {
      const success = await FacultyService.markReplyAsSolution(replyId, isSolution);
      
      if (success) {
        toast({
          title: isSolution ? "Resposta marcada como solução" : "Marcação de solução removida",
          description: isSolution 
            ? "Esta resposta foi marcada como solução para o tópico." 
            : "A marcação de solução foi removida desta resposta.",
        });
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
  
  const isTopicAuthor = user && topic?.user_id === user.id;
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!topic) {
    return (
      <div className="container mx-auto py-12">
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-medium">Tópico não encontrado</h3>
            <p className="text-muted-foreground mt-2">
              O tópico que você está procurando não existe ou foi removido.
            </p>
            <Button 
              className="mt-4" 
              onClick={() => router.push('/comunidade/duvidas')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o fórum
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={() => router.push('/comunidade/duvidas')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para o fórum
      </Button>
      
      {/* Tópico principal */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-2">
            {topic.is_resolved && (
              <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Resolvido
              </Badge>
            )}
            {topic.is_pinned && (
              <Badge variant="secondary">Fixado</Badge>
            )}
            {topic.tags.map(tag => (
              <Badge 
                key={tag.id} 
                style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                variant="outline"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl font-bold">{topic.title}</h1>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Avatar className="h-6 w-6">
              <AvatarImage src={topic.user?.avatar_url} />
              <AvatarFallback>
                {topic.user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <span>
              {topic.user?.name || 'Usuário'} • {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{topic.content}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1 text-muted-foreground" />
              <span className="text-muted-foreground">{topic.view_count} visualizações</span>
            </div>
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-1 text-muted-foreground" />
              <span className="text-muted-foreground">{topic.replies_count} respostas</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className={userVote === 1 ? "bg-blue-50 text-blue-600" : ""}
              onClick={() => handleVoteTopic(1)}
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              {topic.votes_count > 0 ? topic.votes_count : ''}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className={userVote === -1 ? "bg-red-50 text-red-600" : ""}
              onClick={() => handleVoteTopic(-1)}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Contador de respostas */}
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-semibold">
          {topic.replies_count} {topic.replies_count === 1 ? 'Resposta' : 'Respostas'}
        </h2>
      </div>
      
      {/* Lista de respostas */}
      {isRepliesLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : replies.length === 0 ? (
        <Card className="text-center py-8 mb-6">
          <CardContent>
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Nenhuma resposta ainda</h3>
            <p className="text-muted-foreground mt-2">
              Seja o primeiro a responder este tópico!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 mb-6">
          {replies.map(reply => (
            <Card key={reply.id} className={reply.is_solution ? "border-green-500" : ""}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={reply.user?.avatar_url} />
                      <AvatarFallback>
                        {reply.user?.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{reply.user?.name || 'Usuário'}</div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  
                  {reply.is_solution && (
                    <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Solução
                    </Badge>
                  )}
                </div>
                
                <div className="prose max-w-none mb-4">
                  <p className="whitespace-pre-wrap">{reply.content}</p>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={reply.user_vote === 1 ? "text-blue-600" : ""}
                      onClick={() => handleVoteReply(reply.id, 1)}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {reply.votes_count > 0 ? reply.votes_count : ''}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={reply.user_vote === -1 ? "text-red-600" : ""}
                      onClick={() => handleVoteReply(reply.id, -1)}
                    >
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {isTopicAuthor && (
                    <Button 
                      variant={reply.is_solution ? "outline" : "ghost"}
                      size="sm"
                      onClick={() => handleMarkAsSolution(reply.id, !reply.is_solution)}
                      className={reply.is_solution ? "border-green-500 text-green-600" : ""}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      {reply.is_solution ? "Remover solução" : "Marcar como solução"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Formulário para responder */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Sua resposta</h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitReply}>
            <Textarea
              placeholder="Escreva sua resposta aqui..."
              className="min-h-[120px] mb-4"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              disabled={isSubmitting}
            />
            <Button 
              type="submit" 
              disabled={isSubmitting || !replyContent.trim()}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2" size="sm" />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Responder
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 