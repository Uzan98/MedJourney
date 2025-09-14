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
        return 'bg-green-100 text-green-800';
      case 'médio':
        return 'bg-yellow-100 text-yellow-800';
      case 'difícil':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
            return <BookOpen className="h-4 w-4 text-blue-600" />;
          case 'subject':
            return <FileText className="h-4 w-4 text-green-600" />;
          case 'topic':
            return <Target className="h-4 w-4 text-orange-600" />;
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
        <div key={node.id} className="space-y-1">
          <div 
            className={`flex items-center space-x-2 p-2 rounded transition-colors ${
              isClickable ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'
            } ${
              node.matched ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
            }`}
            style={{ paddingLeft: `${paddingLeft + 8}px` }}
            onClick={handleClick}
          >
            {hasChildren && (
              <button className="flex-shrink-0">
                {node.expanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-4" />}
            
            {getNodeIcon()}
            
            <span className={`text-sm ${
              node.matched ? 'font-semibold text-gray-900' : 'text-gray-700'
            } ${
              node.type === 'subject' ? 'text-green-600 hover:text-green-700' : ''
            }`}>
              {node.name}
            </span>
            
            <Badge variant="outline" className="text-xs">
              {node.type === 'discipline' ? 'Disciplina' : 
               node.type === 'subject' ? 'Assunto' : 'Tópico'}
            </Badge>
            
            {node.type === 'subject' && (
              <span className="text-xs text-gray-500 ml-auto">
                Clique para ver tópicos
              </span>
            )}
          </div>
          
          {hasChildren && node.expanded && (
            <div>
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
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas */}
      {(disciplines.length > 0 || subjects.length > 0 || topics.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{disciplines.length}</p>
                  <p className="text-sm text-gray-600">Disciplinas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{subjects.length}</p>
                  <p className="text-sm text-gray-600">Assuntos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{topics.length}</p>
                  <p className="text-sm text-gray-600">Tópicos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{questions.length}</p>
                  <p className="text-sm text-gray-600">Questões</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de questões */}
      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Questões Encontradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((question) => (
                <Card key={question.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{question.title}</h3>
                        <p className="text-gray-600 mb-3">{question.content}</p>
                        <div className="flex items-center space-x-2">
                          {question.difficulty && (
                            <Badge className={getDifficultyColor(question.difficulty)}>
                              {question.difficulty}
                            </Badge>
                          )}
                          <span className="text-sm text-gray-500">
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
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando questões...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando nenhuma questão for encontrada */}
      {selectedTopic && questions.length === 0 && !loading.questions && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma questão encontrada</h3>
              <p className="text-gray-600">Não há questões disponíveis para o tópico selecionado.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem inicial */}
      {!selectedDiscipline && disciplines.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Selecione os filtros</h3>
              <p className="text-gray-600">Escolha uma disciplina, assunto e tópico para visualizar as questões disponíveis.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}