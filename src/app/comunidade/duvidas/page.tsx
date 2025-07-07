'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  HelpCircle, 
  Search, 
  Filter, 
  PlusCircle, 
  MessageCircle,
  CheckCircle,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { MinhaFaculService } from '@/services/community-feed.service';
import { Post, PostType } from '@/types/community';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DuvidasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unsolved' | 'solved'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    loadQuestions();
  }, [activeTab]);
  
  const loadQuestions = async () => {
    setLoading(true);
    try {
      let fetchedQuestions;
      
      if (activeTab === 'solved') {
        fetchedQuestions = await MinhaFaculService.getQuestions(undefined, true);
      } else if (activeTab === 'unsolved') {
        fetchedQuestions = await MinhaFaculService.getQuestions(undefined, false);
      } else {
        fetchedQuestions = await MinhaFaculService.getQuestions();
      }
      
      setQuestions(fetchedQuestions);
    } catch (error) {
      console.error('Erro ao carregar dúvidas:', error);
      toast.error('Não foi possível carregar as dúvidas');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      loadQuestions();
      return;
    }
    
    setLoading(true);
    MinhaFaculService.getQuestions()
      .then(allQuestions => {
        const filtered = allQuestions.filter(question => 
          question.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
          question.metadata?.question_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          question.metadata?.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setQuestions(filtered);
        setLoading(false);
      })
      .catch(error => {
        console.error('Erro na busca:', error);
        toast.error('Erro ao realizar busca');
        setLoading(false);
      });
  };
  
  const handleCreateQuestion = () => {
    router.push('/comunidade/duvidas/nova');
  };
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <HelpCircle className="h-6 w-6 mr-2 text-purple-600" />
          Fórum de Dúvidas
        </h1>
        <Button 
          className="bg-purple-600 hover:bg-purple-700 text-white"
          onClick={handleCreateQuestion}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Dúvida
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Buscar dúvidas..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={handleSearch}
          >
            Buscar
          </Button>
          <Button variant="ghost" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        <Tabs 
          defaultValue="all" 
          className="w-full"
          onValueChange={(value) => setActiveTab(value as 'all' | 'unsolved' | 'solved')}
        >
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unsolved">Não resolvidas</TabsTrigger>
            <TabsTrigger value="solved">Resolvidas</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-gray-600">Carregando dúvidas...</p>
          </div>
        ) : questions.length > 0 ? (
          <div className="space-y-4">
            {questions.map((question) => (
              <Link 
                key={question.id} 
                href={`/comunidade/duvidas/${question.id}`} 
                className="block"
              >
                <div className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium text-lg text-gray-800">
                      {question.metadata?.question_title}
                    </h3>
                    {question.metadata?.is_solved ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolvida
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                        Não resolvida
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {question.content}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {question.metadata?.subject_name && (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                        {question.metadata.subject_name}
                      </span>
                    )}
                    {question.metadata?.topic && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {question.metadata.topic}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={question.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${question.username}`} />
                        <AvatarFallback>{question.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-gray-600">{question.username}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-500">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      <span>{question.metadata?.answer_count || question.comments_count} respostas</span>
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="h-8 w-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma dúvida encontrada</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Nenhuma dúvida corresponde à sua busca. Tente outros termos.'
                : activeTab === 'solved'
                  ? 'Não há dúvidas resolvidas no momento.'
                  : activeTab === 'unsolved'
                    ? 'Não há dúvidas não resolvidas no momento.'
                    : 'Não há dúvidas disponíveis no momento. Seja o primeiro a fazer uma pergunta!'}
            </p>
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleCreateQuestion}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Nova Dúvida
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 