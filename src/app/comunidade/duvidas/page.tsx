'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FacultyService } from '@/services/faculty.service';
import { ForumTopic, ForumTag } from '@/types/faculty';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/Spinner';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  ThumbsUp, 
  Eye, 
  Tag, 
  CheckCircle2, 
  Filter, 
  SortAsc, 
  SortDesc,
  Clock,
  TrendingUp
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreateTopicModal } from '@/components/comunidade/CreateTopicModal';

export default function ForumPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [tags, setTags] = useState<ForumTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [facultyId, setFacultyId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [isCreateTopicModalOpen, setIsCreateTopicModalOpen] = useState(false);
  
  // Carregar a faculdade ativa do usuário
  useEffect(() => {
    const loadUserFaculty = async () => {
      if (!user) return;
      
      try {
        const faculties = await FacultyService.getUserFaculties(user.id);
        console.log('Faculdades do usuário:', faculties);
        
        if (faculties.length > 0) {
          // Por enquanto, usamos a primeira faculdade do usuário
          setFacultyId(faculties[0].id);
          console.log('Faculty ID definido:', faculties[0].id);
        } else {
          toast({
            title: "Nenhuma faculdade encontrada",
            description: "Você precisa participar de uma faculdade para acessar o fórum.",
            variant: "destructive"
          });
          router.push('/minha-faculdade');
        }
      } catch (error) {
        console.error('Erro ao carregar faculdades do usuário:', error);
        toast({
          title: "Erro ao carregar faculdades",
          description: "Não foi possível carregar suas faculdades. Tente novamente mais tarde.",
          variant: "destructive"
        });
      }
    };
    
    loadUserFaculty();
  }, [user, router]);
  
  // Carregar tópicos e tags quando a faculdade for selecionada
  useEffect(() => {
    if (!facultyId) return;
    
    const loadTopicsAndTags = async () => {
      setIsLoading(true);
      try {
        // Carregar tópicos
        const isResolved = activeTab === 'resolved' ? true : 
                          activeTab === 'unresolved' ? false : 
                          undefined;
        
        const forumTopics = await FacultyService.getForumTopics(
          facultyId,
          20,
          0,
          selectedTag,
          isResolved,
          searchTerm || undefined
        );
        setTopics(forumTopics);
        console.log('Tópicos carregados:', forumTopics);
        
        // Carregar tags
        const forumTags = await FacultyService.getForumTags(facultyId);
        setTags(forumTags);
        console.log('Tags carregadas:', forumTags);
      } catch (error) {
        console.error('Erro ao carregar dados do fórum:', error);
        toast({
          title: "Erro ao carregar fórum",
          description: "Não foi possível carregar os tópicos do fórum. Tente novamente mais tarde.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTopicsAndTags();
  }, [facultyId, activeTab, selectedTag, searchTerm]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // A pesquisa é acionada automaticamente pelo useEffect quando searchTerm muda
  };
  
  const handleTagClick = (tagId: number) => {
    setSelectedTag(selectedTag === tagId ? null : tagId);
  };
  
  const handleCreateTopic = async (title: string, content: string, selectedTags: number[]) => {
    if (!facultyId) return;
    
    try {
      const topicId = await FacultyService.createForumTopic(
        facultyId,
        title,
        content,
        selectedTags.length > 0 ? selectedTags : undefined
      );
      
      if (topicId) {
        toast({
          title: "Tópico criado",
          description: "Seu tópico foi criado com sucesso!",
        });
        
        // Redirecionar para o tópico criado
        router.push(`/comunidade/duvidas/${topicId}`);
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
    }
  };
  
  const handleTopicClick = (topicId: number) => {
    router.push(`/comunidade/duvidas/${topicId}`);
  };
  
  const handleOpenModal = () => {
    console.log('Tentando abrir modal. facultyId:', facultyId);
    setIsCreateTopicModalOpen(true);
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        {/* Coluna principal */}
        <div className="w-full md:w-2/3">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Fórum de Dúvidas</h1>
            <Button onClick={handleOpenModal}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Dúvida
            </Button>
          </div>
      
          {/* Barra de pesquisa */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
          <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                  placeholder="Pesquisar no fórum..."
                  className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
              <Button type="submit">Buscar</Button>
        </div>
          </form>
          
          {/* Tabs para filtrar por status */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="all">Todos os Tópicos</TabsTrigger>
              <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
              <TabsTrigger value="unresolved">Não Resolvidos</TabsTrigger>
          </TabsList>
        </Tabs>
        
          {/* Lista de tópicos */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
          </div>
          ) : topics.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Nenhum tópico encontrado</h3>
                <p className="text-muted-foreground mt-2">
                  {searchTerm || selectedTag
                    ? "Tente ajustar seus filtros de pesquisa"
                    : "Seja o primeiro a criar um tópico no fórum!"}
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => setIsCreateTopicModalOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Dúvida
                </Button>
              </CardContent>
            </Card>
          ) : (
          <div className="space-y-4">
              {topics.map(topic => (
                <Card 
                  key={topic.id} 
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${topic.is_pinned ? 'border-blue-500' : ''}`}
                  onClick={() => handleTopicClick(topic.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between">
                      <div className="flex-1">
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
                        <h3 className="text-lg font-medium mb-1">{topic.title}</h3>
                        <p className="text-muted-foreground line-clamp-2">{topic.content}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={topic.user?.avatar_url} />
                          <AvatarFallback>
                            {topic.user?.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          {topic.user?.name || 'Usuário'} • {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center text-muted-foreground">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          <span className="text-sm">{topic.votes_count}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          <span className="text-sm">{topic.replies_count}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Eye className="h-4 w-4 mr-1" />
                          <span className="text-sm">{topic.view_count}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
                    )}
                  </div>
                  
        {/* Barra lateral */}
        <div className="w-full md:w-1/3 space-y-6">
          {/* Card de tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Tag className="h-5 w-5 mr-2 text-blue-500" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge 
                    key={tag.id} 
                    style={{ 
                      backgroundColor: selectedTag === tag.id ? tag.color : tag.color + '20', 
                      color: selectedTag === tag.id ? 'white' : tag.color,
                      borderColor: tag.color
                    }}
                    variant={selectedTag === tag.id ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleTagClick(tag.id)}
                  >
                    {tag.name}
                    {tag.topic_count && (
                      <span className="ml-1 text-xs">({tag.topic_count})</span>
                    )}
                  </Badge>
                ))}
                
                {tags.length === 0 && (
                  <p className="text-muted-foreground text-sm">Nenhuma tag disponível</p>
                    )}
                  </div>
            </CardContent>
          </Card>
          
          {/* Card de estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total de tópicos</span>
                  <span className="font-medium">{topics.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tópicos resolvidos</span>
                  <span className="font-medium">
                    {topics.filter(t => t.is_resolved).length}
                  </span>
                    </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Taxa de resolução</span>
                  <span className="font-medium">
                    {topics.length > 0 
                      ? Math.round((topics.filter(t => t.is_resolved).length / topics.length) * 100) 
                      : 0}%
                  </span>
                    </div>
                  </div>
            </CardContent>
          </Card>
          
          {/* Card de ajuda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como usar o fórum</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium">Pesquise antes de perguntar</h4>
                  <p className="text-muted-foreground">
                    Verifique se sua dúvida já foi respondida anteriormente.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Seja específico</h4>
                  <p className="text-muted-foreground">
                    Descreva sua dúvida com detalhes para facilitar as respostas.
                  </p>
          </div>
                <div>
                  <h4 className="font-medium">Use as tags</h4>
                  <p className="text-muted-foreground">
                    Categorize sua dúvida para que seja encontrada facilmente.
                  </p>
            </div>
                <div>
                  <h4 className="font-medium">Marque como resolvido</h4>
                  <p className="text-muted-foreground">
                    Quando sua dúvida for solucionada, marque a melhor resposta.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
      </div>
      
      {/* Modal para criar novo tópico */}
      {facultyId && (
        <CreateTopicModal
          isOpen={isCreateTopicModalOpen}
          onClose={() => setIsCreateTopicModalOpen(false)}
          onCreateTopic={handleCreateTopic}
          facultyId={facultyId}
          availableTags={tags}
        />
      )}
    </div>
  );
} 