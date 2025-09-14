'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Filter, BookOpen, FileText, Target, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Discipline {
  id: number;
  name: string;
  description?: string;
}

interface Subject {
  id: number;
  name: string;
  title?: string;
  discipline_id: number;
}

interface Topic {
  id: number;
  name: string;
  subject_id: number;
}

interface Question {
  id: number;
  title: string;
  content: string;
  topic_id: number;
  difficulty?: string;
  created_at: string;
}

interface SearchResult {
  type: 'discipline' | 'subject' | 'topic';
  id: number;
  name: string;
  discipline?: Discipline;
  subject?: Subject;
  topic?: Topic;
  hierarchy: {
    discipline: Discipline;
    subject?: Subject;
    topic?: Topic;
  };
}

interface TreeNode {
  id: string;
  name: string;
  type: 'discipline' | 'subject' | 'topic';
  children: TreeNode[];
  expanded: boolean;
  matched: boolean;
}

const SYSTEM_USER_ID = 'e6c41b94-f25c-4ef4-b723-c4a2d480cf43';

export default function GenomedBankPage() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  
  // Estados para busca hierárquica
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  
  const [loading, setLoading] = useState({
    disciplines: false,
    subjects: false,
    topics: false,
    questions: false
  });
  
  const [error, setError] = useState<string | null>(null);

  // Carregar disciplinas ao montar o componente
  useEffect(() => {
    loadDisciplines();
  }, []);

  // Carregar assuntos quando disciplina for selecionada
  useEffect(() => {
    if (selectedDiscipline) {
      loadSubjects(parseInt(selectedDiscipline));
      setSelectedSubject('');
      setSelectedTopic('');
      setSubjects([]);
      setTopics([]);
      setQuestions([]);
    }
  }, [selectedDiscipline]);

  // Carregar tópicos quando assunto for selecionado
  useEffect(() => {
    if (selectedSubject) {
      loadTopics(parseInt(selectedSubject));
      setSelectedTopic('');
      setTopics([]);
      setQuestions([]);
    }
  }, [selectedSubject]);

  // Carregar questões quando tópico for selecionado
  useEffect(() => {
    if (selectedTopic) {
      loadQuestions(parseInt(selectedTopic));
    }
  }, [selectedTopic]);

  const loadDisciplines = async () => {
    try {
      setLoading(prev => ({ ...prev, disciplines: true }));
      setError(null);
      
      const { data, error } = await supabase
        .from('disciplines')
        .select('id, name, description')
        .eq('user_id', SYSTEM_USER_ID)
        .in('id', [123, 124, 125, 126, 127])
        .order('name');

      if (error) throw error;
      
      setDisciplines(data || []);
    } catch (err) {
      console.error('Erro ao carregar disciplinas:', err);
      setError('Erro ao carregar disciplinas');
    } finally {
      setLoading(prev => ({ ...prev, disciplines: false }));
    }
  };

  const loadSubjects = async (disciplineId: number) => {
    try {
      setLoading(prev => ({ ...prev, subjects: true }));
      setError(null);
      
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, title, discipline_id')
        .eq('discipline_id', disciplineId)
        .order('name');

      if (error) throw error;
      
      setSubjects(data || []);
    } catch (err) {
      console.error('Erro ao carregar assuntos:', err);
      setError('Erro ao carregar assuntos');
    } finally {
      setLoading(prev => ({ ...prev, subjects: false }));
    }
  };

  const loadTopics = async (subjectId: number) => {
    try {
      setLoading(prev => ({ ...prev, topics: true }));
      setError(null);
      
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, subject_id')
        .eq('subject_id', subjectId)
        .order('name');

      if (error) throw error;
      
      setTopics(data || []);
    } catch (err) {
      console.error('Erro ao carregar tópicos:', err);
      setError('Erro ao carregar tópicos');
    } finally {
      setLoading(prev => ({ ...prev, topics: false }));
    }
  };

  const loadQuestions = async (topicId: number) => {
    try {
      setLoading(prev => ({ ...prev, questions: true }));
      setError(null);
      
      // Por enquanto, vamos simular questões já que a tabela questions pode não existir ainda
      // Quando a tabela existir, descomente o código abaixo:
      /*
      const { data, error } = await supabase
        .from('questions')
        .select('id, title, content, topic_id, difficulty, created_at')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setQuestions(data || []);
      */
      
      // Simulação temporária de questões
      const mockQuestions: Question[] = [
        {
          id: 1,
          title: `Questão sobre ${topics.find(t => t.id === topicId)?.name || 'tópico selecionado'}`,
          content: 'Esta é uma questão de exemplo sobre o tópico selecionado. O conteúdo completo da questão seria exibido aqui.',
          topic_id: topicId,
          difficulty: 'Médio',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          title: `Questão avançada de ${topics.find(t => t.id === topicId)?.name || 'tópico selecionado'}`,
          content: 'Esta é outra questão de exemplo com maior complexidade sobre o mesmo tópico.',
          topic_id: topicId,
          difficulty: 'Difícil',
          created_at: new Date().toISOString()
        }
      ];
      
      setQuestions(mockQuestions);
    } catch (err) {
      console.error('Erro ao carregar questões:', err);
      setError('Erro ao carregar questões');
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  // Função de busca hierárquica
  const performHierarchicalSearch = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setTreeData([]);
      setShowSearchResults(false);
      return;
    }

    // Verificar se o termo tem pelo menos 2 caracteres para evitar buscas muito amplas
    if (term.length < 2) {
      setSearchResults([]);
      setTreeData([]);
      return;
    }

    try {
      setError(null);

      const searchTerm = `%${term.toLowerCase()}%`;
      const results: SearchResult[] = [];

      // Buscar em disciplinas
      const { data: disciplineMatches } = await supabase
        .from('disciplines')
        .select('id, name, description')
        .eq('user_id', SYSTEM_USER_ID)
        .in('id', [123, 124, 125, 126, 127])
        .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);

      // Buscar em assuntos
      const { data: subjectMatches } = await supabase
        .from('subjects')
        .select(`
          id, name, title, discipline_id,
          disciplines!inner(id, name, description)
        `)
        .or(`name.ilike.${searchTerm},title.ilike.${searchTerm}`)
        .in('disciplines.id', [123, 124, 125, 126, 127]);

      // Buscar em tópicos
      const { data: topicMatches } = await supabase
        .from('topics')
        .select(`
          id, name, subject_id,
          subjects!inner(id, name, title, discipline_id,
            disciplines!inner(id, name, description)
          )
        `)
        .ilike('name', searchTerm)
        .in('subjects.disciplines.id', [123, 124, 125, 126, 127]);

      // Processar resultados de disciplinas
      disciplineMatches?.forEach(discipline => {
        results.push({
          type: 'discipline',
          id: discipline.id,
          name: discipline.name,
          discipline,
          hierarchy: { discipline }
        });
      });

      // Processar resultados de assuntos
      subjectMatches?.forEach(subject => {
        results.push({
          type: 'subject',
          id: subject.id,
          name: subject.title || subject.name,
          subject,
          discipline: subject.disciplines,
          hierarchy: {
            discipline: subject.disciplines,
            subject
          }
        });
      });

      // Processar resultados de tópicos
      topicMatches?.forEach(topic => {
        results.push({
          type: 'topic',
          id: topic.id,
          name: topic.name,
          topic,
          subject: topic.subjects,
          discipline: topic.subjects.disciplines,
          hierarchy: {
            discipline: topic.subjects.disciplines,
            subject: topic.subjects,
            topic
          }
        });
      });

      setSearchResults(results);
      buildTreeFromResults(results, term);
      setShowSearchResults(true);

    } catch (err) {
      console.error('Erro na busca hierárquica:', err);
      setError('Erro ao realizar busca');
      setSearchResults([]);
      setTreeData([]);
    }
  };

  // Construir árvore hierárquica dos resultados
  const buildTreeFromResults = (results: SearchResult[], searchTerm: string) => {
    const treeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    results.forEach(result => {
      const { hierarchy } = result;
      const disciplineId = `discipline-${hierarchy.discipline.id}`;
      const subjectId = hierarchy.subject ? `subject-${hierarchy.subject.id}` : null;
      const topicId = hierarchy.topic ? `topic-${hierarchy.topic.id}` : null;

      // Criar nó da disciplina
      if (!treeMap.has(disciplineId)) {
        const disciplineNode: TreeNode = {
          id: disciplineId,
          name: hierarchy.discipline.name,
          type: 'discipline',
          children: [],
          expanded: true,
          matched: hierarchy.discipline.name.toLowerCase().includes(searchTerm.toLowerCase())
        };
        treeMap.set(disciplineId, disciplineNode);
        rootNodes.push(disciplineNode);
      }

      const disciplineNode = treeMap.get(disciplineId)!;

      // Criar nó do assunto se existir
      if (hierarchy.subject && subjectId) {
        if (!treeMap.has(subjectId)) {
          const subjectNode: TreeNode = {
            id: subjectId,
            name: hierarchy.subject.title || hierarchy.subject.name,
            type: 'subject',
            children: [],
            expanded: true,
            matched: (hierarchy.subject.title || hierarchy.subject.name).toLowerCase().includes(searchTerm.toLowerCase())
          };
          treeMap.set(subjectId, subjectNode);
          disciplineNode.children.push(subjectNode);
        }

        const subjectNode = treeMap.get(subjectId)!;

        // Criar nó do tópico se existir
        if (hierarchy.topic && topicId) {
          if (!treeMap.has(topicId)) {
            const topicNode: TreeNode = {
              id: topicId,
              name: hierarchy.topic.name,
              type: 'topic',
              children: [],
              expanded: false,
              matched: hierarchy.topic.name.toLowerCase().includes(searchTerm.toLowerCase())
            };
            treeMap.set(topicId, topicNode);
            subjectNode.children.push(topicNode);
          }
        }
      }
    });

    setTreeData(rootNodes);
  };

  // Toggle expansão de nó da árvore
  const toggleTreeNode = (nodeId: string) => {
    const updateNode = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, expanded: !node.expanded };
        }
        return { ...node, children: updateNode(node.children) };
      });
    };
    setTreeData(updateNode(treeData));
  };

  const handleNodeClick = async (node: TreeNode) => {
    // Se for um assunto, carrega os tópicos relacionados
    if (node.type === 'subject') {
      try {
        const subjectId = parseInt(node.id.replace('subject-', ''));
        const { data: topics, error } = await supabase
          .from('topics')
          .select('id, name, subject_id')
          .eq('subject_id', subjectId);

        if (error) throw error;

        // Atualiza a árvore para incluir os tópicos como filhos do assunto
        setTreeData(prevData => {
          const updateNodeWithTopics = (nodes: TreeNode[]): TreeNode[] => {
            return nodes.map(treeNode => {
              if (treeNode.id === node.id && treeNode.type === 'subject') {
                const topicNodes: TreeNode[] = (topics || []).map(topic => ({
                  id: `topic-${topic.id}`,
                  name: topic.name,
                  type: 'topic' as const,
                  expanded: false,
                  children: [],
                  matched: false
                }));
                return {
                  ...treeNode,
                  children: topicNodes,
                  expanded: true
                };
              }
              if (treeNode.children) {
                return {
                  ...treeNode,
                  children: updateNodeWithTopics(treeNode.children)
                };
              }
              return treeNode;
            });
          };
          return updateNodeWithTopics(prevData);
        });
      } catch (error) {
        console.error('Erro ao carregar tópicos:', error);
      }
    } else {
      // Para outros tipos de nó, apenas alterna a expansão
      toggleTreeNode(node.id);
    }
  };

  // Debounce para busca com delay otimizado
  useEffect(() => {
    // Mostrar loading imediatamente quando o usuário digita
    if (searchTerm.trim().length >= 2) {
      setIsSearching(true);
      setHasSearched(false);
    } else {
      setIsSearching(false);
      setHasSearched(false);
    }

    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        performHierarchicalSearch(searchTerm.trim())
          .finally(() => {
            setIsSearching(false);
            setHasSearched(true);
          });
      } else {
        setSearchResults([]);
        setTreeData([]);
        setIsSearching(false);
        setHasSearched(false);
      }
    }, 800); // Aumentado para 800ms para reduzir ainda mais as consultas

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const clearFilters = () => {
    setSelectedDiscipline('');
    setSelectedSubject('');
    setSelectedTopic('');
    setSubjects([]);
    setTopics([]);
    setQuestions([]);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'fácil':
        return 'bg-gradient-to-r from-green-400 to-green-500 text-white font-medium shadow-sm';
      case 'médio':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-medium shadow-sm';
      case 'difícil':
        return 'bg-gradient-to-r from-red-400 to-red-500 text-white font-medium shadow-sm';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white font-medium shadow-sm';
    }
  };

  // Componente TreeView para exibir a hierarquia
  const TreeView = ({ nodes, onToggle }: { nodes: TreeNode[]; onToggle: (nodeId: string) => void }) => {
    const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children.length > 0;
    const paddingLeft = level * 20;
    const isClickable = node.type === 'subject' || hasChildren;
    
    const getNodeIcon = () => {
      switch (node.type) {
        case 'discipline':
          return <div className="bg-blue-100 p-1.5 rounded-full"><BookOpen className="h-4 w-4 text-blue-600" /></div>;
        case 'subject':
          return <div className="bg-green-100 p-1.5 rounded-full"><FileText className="h-4 w-4 text-green-600" /></div>;
        case 'topic':
          return <div className="bg-purple-100 p-1.5 rounded-full"><Target className="h-4 w-4 text-purple-600" /></div>;
        default:
          return null;
      }
    };

    const handleClick = () => {
      if (node.type === 'subject') {
        handleNodeClick(node);
      } else if (hasChildren) {
        onToggle(node.id);
      }
    };

    return (
      <div key={node.id} className="space-y-1.5">
        <div 
          className={`flex items-center space-x-3 p-2.5 rounded-lg transition-all duration-200 ${
            isClickable ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default'
          } ${
            node.matched ? 'bg-blue-50 border-l-4 border-blue-400 shadow-sm' : ''
          }`}
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
          onClick={handleClick}
        >
          {hasChildren && (
            <button className="flex-shrink-0 hover:bg-blue-100 p-1 rounded-full transition-colors duration-150">
              {node.expanded ? (
                <ChevronDown className="h-4 w-4 text-blue-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-blue-600" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          
          {getNodeIcon()}
          
          <span className={`text-sm ${
            node.matched ? 'font-semibold text-blue-800' : 'text-gray-700'
          } ${
            node.type === 'subject' ? 'text-green-700 hover:text-green-800' : ''
          } transition-all duration-200`}>
            {node.name}
          </span>
          
          <Badge variant="outline" className="text-xs bg-white/80 shadow-sm">
            {node.type === 'discipline' ? 'Disciplina' : 
             node.type === 'subject' ? 'Assunto' : 'Tópico'}
          </Badge>
          
          {node.type === 'subject' && (
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full ml-auto">
              Clique para ver tópicos
            </span>
          )}
        </div>
        
        {hasChildren && node.expanded && (
          <div className="animate-fadeIn">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

    return (
      <div className="space-y-1">
        {nodes.map(node => renderNode(node))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Genomed Bank</h1>
          <p className="text-gray-600 mt-2">Banco de questões de medicina com filtros avançados</p>
        </div>
        <div className="flex items-center space-x-2">
          <BookOpen className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      {/* Busca Hierárquica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Busca Hierárquica</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Digite uma palavra-chave para buscar em disciplinas, assuntos ou tópicos... (mín. 2 caracteres)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            
            {isSearching && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Buscando...</span>
              </div>
            )}
            
            {searchTerm && (
              <div className="mt-4">
                {searchTerm.length < 2 ? (
                  <div className="text-sm text-gray-400 text-center py-4">
                    Digite pelo menos 2 caracteres para buscar
                  </div>
                ) : isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                      <span className="text-sm text-gray-600 font-medium">Buscando resultados...</span>
                    </div>
                  </div>
                ) : treeData.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700">Resultados encontrados ({searchResults.length}):</h4>
                    <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                      <TreeView nodes={treeData} onToggle={toggleTreeNode} />
                    </div>
                  </div>
                ) : hasSearched ? (
                  <div className="text-center py-8">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="text-sm text-gray-500">
                        Nenhum resultado encontrado para <span className="font-medium">"{searchTerm}"</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Tente usar termos diferentes ou verifique a ortografia
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Disciplinas */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Disciplina</label>
              <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {disciplines.map((discipline) => (
                    <SelectItem key={discipline.id} value={discipline.id.toString()}>
                      {discipline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loading.disciplines && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Carregando disciplinas...</span>
                </div>
              )}
            </div>

            {/* Assuntos */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Assunto</label>
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
                disabled={!selectedDiscipline || loading.subjects}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um assunto" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.title || subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loading.subjects && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Carregando assuntos...</span>
                </div>
              )}
            </div>

            {/* Tópicos */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tópico</label>
              <Select 
                value={selectedTopic} 
                onValueChange={setSelectedTopic}
                disabled={!selectedSubject || loading.topics}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tópico" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id.toString()}>
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loading.topics && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Carregando tópicos...</span>
                </div>
              )}
            </div>
          </div>

          {/* Botão para limpar filtros */}
          {(selectedDiscipline || selectedSubject || selectedTopic) && (
            <div className="mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mensagem de erro */}
      {error && (
        <Card className="border-0 shadow-lg overflow-hidden transition-all duration-200 animate-scaleIn">
          <div className="bg-gradient-to-r from-red-500 to-red-600 h-2" />
          <CardContent className="pt-6 bg-red-50">
            <div className="flex items-start space-x-3">
              <div className="bg-red-100 p-2 rounded-full mt-0.5 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-red-800 mb-1">Erro</h4>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas */}
      {(disciplines.length > 0 || subjects.length > 0 || topics.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="overflow-hidden border-0 shadow-lg transition-all duration-200 hover:shadow-xl animate-slideUp">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2" />
            <CardContent className="pt-6 px-4 sm:px-6">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-2 sm:p-3 rounded-full animate-pulse">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600">{disciplines.length}</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Disciplinas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-0 shadow-lg transition-all duration-200 hover:shadow-xl animate-slideUp" style={{animationDelay: '0.1s'}}>
            <div className="bg-gradient-to-r from-green-500 to-green-600 h-2" />
            <CardContent className="pt-6 px-4 sm:px-6">
              <div className="flex items-center space-x-4">
                <div className="bg-green-100 p-2 sm:p-3 rounded-full animate-pulse">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">{subjects.length}</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Assuntos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-0 shadow-lg transition-all duration-200 hover:shadow-xl animate-slideUp" style={{animationDelay: '0.2s'}}>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2" />
            <CardContent className="pt-6 px-4 sm:px-6">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-2 sm:p-3 rounded-full animate-pulse">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600">{topics.length}</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Tópicos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-0 shadow-lg transition-all duration-200 hover:shadow-xl animate-slideUp" style={{animationDelay: '0.3s'}}>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-2" />
            <CardContent className="pt-6 px-4 sm:px-6">
              <div className="flex items-center space-x-4">
                <div className="bg-orange-100 p-2 sm:p-3 rounded-full animate-pulse">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-orange-600">{questions.length}</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Questões</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de questões */}
      {questions.length > 0 && (
        <Card className="border-0 shadow-lg overflow-hidden animate-fadeIn">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2" />
          <CardHeader className="bg-blue-50 border-b border-blue-100 px-4 sm:px-6">
            <CardTitle className="text-blue-800 flex items-center gap-2 text-base sm:text-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              Questões Encontradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {questions.map((question, index) => (
                <Card 
                  key={question.id} 
                  className="border-0 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden animate-slideUp" 
                  style={{animationDelay: `${Math.min(index * 0.1, 1)}s`}}
                >
                  <div className="bg-gradient-to-r from-blue-400 to-blue-500 h-1" />
                  <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base sm:text-lg mb-2 text-blue-900">{question.title}</h3>
                        <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed">{question.content}</p>
                        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                          {question.difficulty && (
                            <Badge className={`${getDifficultyColor(question.difficulty)} px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm rounded-full`}>
                              {question.difficulty}
                            </Badge>
                          )}
                          <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            {new Date(question.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {loading.questions && (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="relative mb-3">
                  <div className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin"></div>
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
                <span className="text-blue-700 font-medium">Carregando questões...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando nenhuma questão for encontrada */}
      {selectedTopic && questions.length === 0 && !loading.questions && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="p-8">
            <div className="text-center py-8 max-w-md mx-auto">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <FileText className="h-10 w-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">Nenhuma questão encontrada</h3>
              <p className="text-gray-600 leading-relaxed">Não há questões disponíveis para o tópico selecionado. Tente selecionar outro tópico ou disciplina.</p>
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-600 hover:text-blue-700 transition-all duration-300 px-6 py-2 rounded-full shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                    <path d="M3 21v-5h5"/>
                  </svg>
                  <span>Limpar filtros e tentar novamente</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem inicial */}
      {!selectedDiscipline && disciplines.length > 0 && (
        <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-b from-white to-blue-50">
          <CardContent className="p-8">
            <div className="text-center py-8 max-w-lg mx-auto">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg transform transition-transform hover:scale-105 duration-300">
                <BookOpen className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Bem-vindo ao Genomed Bank</h3>
              <p className="text-gray-700 leading-relaxed mb-6">Escolha uma disciplina, assunto e tópico nos filtros acima para visualizar as questões disponíveis. Você também pode usar a busca hierárquica para encontrar conteúdos específicos.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="flex items-center space-x-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <Filter className="h-5 w-5 text-blue-500" />
                  <span className="text-blue-700 font-medium">Use os filtros</span>
                </div>
                <div className="flex items-center space-x-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                  <Search className="h-5 w-5 text-indigo-500" />
                  <span className="text-indigo-700 font-medium">Ou faça uma busca</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}