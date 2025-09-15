'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Filter, BookOpen, FileText, Target, Search, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ExamsService } from '@/services/exams.service';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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
  content: string;
  topic_id: number;
  difficulty?: string;
  created_at: string;
  explanation?: string;
  question_type?: string;
  correct_answer?: string;
  exam_year?: number;
  institution_name?: string;
  institution_acronym?: string;
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
  questionCount?: number;
}

const SYSTEM_USER_ID = 'e6c41b94-f25c-4ef4-b723-c4a2d480cf43';

export default function GenomedBankPage() {
  const router = useRouter();
  
  // Estados principais
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Estados de seleção
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  
  // Estados de loading
  const [loading, setLoading] = useState({
    disciplines: false,
    subjects: false,
    topics: false,
    questions: false
  });
  
  // Estados de busca
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Estados auxiliares
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionCounts, setQuestionCounts] = useState<{
    disciplines: Record<number, number>;
    subjects: Record<number, number>;
    topics: Record<number, number>;
  }>({
    disciplines: {},
    subjects: {},
    topics: {}
  });

  // Obter usuário atual
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Carregar disciplinas no início
  useEffect(() => {
    loadDisciplines();
  }, []);

  // Carregar disciplinas
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
      
      // Carregar contadores de questões para disciplinas
      if (data) {
        const counts: Record<number, number> = {};
        for (const discipline of data) {
          counts[discipline.id] = await getQuestionCount('discipline', discipline.id);
        }
        setQuestionCounts(prev => ({ ...prev, disciplines: counts }));
      }
    } catch (err) {
      console.error('Erro ao carregar disciplinas:', err);
      setError('Erro ao carregar disciplinas');
    } finally {
      setLoading(prev => ({ ...prev, disciplines: false }));
    }
  };

  // Carregar assuntos quando disciplina é selecionada
  useEffect(() => {
    if (selectedDiscipline) {
      loadSubjects(parseInt(selectedDiscipline));
      setSelectedSubject('');
      setSelectedTopic('');
      setTopics([]);
      setQuestions([]);
    } else {
      setSubjects([]);
      setSelectedSubject('');
      setSelectedTopic('');
      setTopics([]);
      setQuestions([]);
    }
  }, [selectedDiscipline]);

  // Carregar assuntos
  const loadSubjects = async (disciplineId: number) => {
    try {
      setLoading(prev => ({ ...prev, subjects: true }));
      
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, title, discipline_id')
        .eq('discipline_id', disciplineId)
        .order('name');

      if (error) throw error;
      
      setSubjects(data || []);
      
      // Carregar contadores de questões para assuntos
      if (data) {
        const counts: Record<number, number> = {};
        for (const subject of data) {
          counts[subject.id] = await getQuestionCount('subject', subject.id);
        }
        setQuestionCounts(prev => ({ ...prev, subjects: counts }));
      }
    } catch (err) {
      console.error('Erro ao carregar assuntos:', err);
      setError('Erro ao carregar assuntos');
    } finally {
      setLoading(prev => ({ ...prev, subjects: false }));
    }
  };

  // Carregar tópicos quando assunto é selecionado
  useEffect(() => {
    if (selectedSubject) {
      loadTopics(parseInt(selectedSubject));
      setSelectedTopic('');
      setQuestions([]);
    } else {
      setTopics([]);
      setSelectedTopic('');
      setQuestions([]);
    }
  }, [selectedSubject]);

  // Carregar tópicos
  const loadTopics = async (subjectId: number) => {
    try {
      setLoading(prev => ({ ...prev, topics: true }));
      
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, subject_id')
        .eq('subject_id', subjectId)
        .order('name');

      if (error) throw error;
      
      setTopics(data || []);
      
      // Carregar contadores de questões para tópicos
      if (data) {
        const counts: Record<number, number> = {};
        for (const topic of data) {
          counts[topic.id] = await getQuestionCount('topic', topic.id);
        }
        setQuestionCounts(prev => ({ ...prev, topics: counts }));
      }
    } catch (err) {
      console.error('Erro ao carregar tópicos:', err);
      setError('Erro ao carregar tópicos');
    } finally {
      setLoading(prev => ({ ...prev, topics: false }));
    }
  };

  // Carregar questões quando tópico é selecionado
  useEffect(() => {
    if (selectedTopic) {
      loadQuestions(parseInt(selectedTopic));
    } else {
      setQuestions([]);
    }
  }, [selectedTopic]);

  // Carregar questões
  const loadQuestions = async (topicId: number) => {
    try {
      setLoading(prev => ({ ...prev, questions: true }));
      
      const { data, error } = await supabase
        .from('questions')
        .select(`
          id, 
          content, 
          topic_id, 
          difficulty, 
          created_at, 
          explanation, 
          question_type, 
          correct_answer, 
          exam_year,
          exam_institutions!inner(
            name,
            acronym
          )
        `)
        .eq('topic_id', topicId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match interface
      const transformedData = data?.map(question => ({
        ...question,
        institution_name: question.exam_institutions?.name,
        institution_acronym: question.exam_institutions?.acronym
      })) || [];
      
      setQuestions(transformedData);
    } catch (err) {
      console.error('Erro ao carregar questões:', err);
      setError('Erro ao carregar questões');
    } finally {
      setLoading(prev => ({ ...prev, questions: false }));
    }
  };

  // Função para contar questões
  const getQuestionCount = async (type: 'discipline' | 'subject' | 'topic', id: number): Promise<number> => {
    try {
      let query = supabase.from('questions').select('*', { count: 'exact', head: true });
      
      if (type === 'discipline') {
        // Primeiro buscar os subjects da disciplina
        const { data: subjects } = await supabase
          .from('subjects')
          .select('id')
          .eq('discipline_id', id);
        
        if (!subjects || subjects.length === 0) return 0;
        
        // Depois buscar os topics desses subjects
        const { data: topics } = await supabase
          .from('topics')
          .select('id')
          .in('subject_id', subjects.map(s => s.id));
        
        if (!topics || topics.length === 0) return 0;
        
        // Finalmente contar as questões desses topics
        query = query.in('topic_id', topics.map(t => t.id));
      } else if (type === 'subject') {
        // Buscar os topics do subject
        const { data: topics } = await supabase
          .from('topics')
          .select('id')
          .eq('subject_id', id);
        
        if (!topics || topics.length === 0) return 0;
        
        query = query.in('topic_id', topics.map(t => t.id));
      } else {
        query = query.eq('topic_id', id);
      }
      
      const { count, error } = await query;
      
      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error(`Erro ao contar questões para ${type}:`, err);
      return 0;
    }
  };

  // Sistema de busca hierárquica
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (searchTerm.length >= 2) {
        performHierarchicalSearch(searchTerm);
      } else {
        setSearchResults([]);
        setTreeData([]);
        setHasSearched(false);
      }
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm]);

  const performHierarchicalSearch = async (term: string) => {
    try {
      setIsSearching(true);
      setHasSearched(false);
      
      const searchPattern = `%${term.toLowerCase()}%`;
      
      // Buscar em disciplinas
      const { data: disciplineMatches } = await supabase
        .from('disciplines')
        .select('id, name, description')
        .eq('user_id', SYSTEM_USER_ID)
        .or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`);
      
      // Buscar em assuntos
      const { data: subjectMatches } = await supabase
        .from('subjects')
        .select(`
          id, name, title, discipline_id,
          disciplines!inner(id, name, description)
        `)
        .or(`name.ilike.${searchPattern},title.ilike.${searchPattern}`)
        .eq('disciplines.user_id', SYSTEM_USER_ID);
      
      // Buscar em tópicos
      const { data: topicMatches } = await supabase
        .from('topics')
        .select(`
          id, name, subject_id,
          subjects!inner(id, name, title, discipline_id,
            disciplines!inner(id, name, description)
          )
        `)
        .ilike('name', searchPattern)
        .eq('subjects.disciplines.user_id', SYSTEM_USER_ID);
      
      const results: SearchResult[] = [];
      
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
          hierarchy: {
            discipline: topic.subjects.disciplines,
            subject: topic.subjects,
            topic
          }
        });
      });
      
      setSearchResults(results);
      setHasSearched(true);
      
      if (results.length > 0) {
        await buildTreeFromResults(results, term);
      } else {
        setTreeData([]);
      }
    } catch (err) {
      console.error('Erro na busca hierárquica:', err);
      setSearchResults([]);
      setTreeData([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Construir árvore hierárquica dos resultados
  const buildTreeFromResults = async (results: SearchResult[], searchTerm: string) => {
    const treeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    results.forEach(result => {
      const { hierarchy } = result;
      
      // Criar nó da disciplina
      const disciplineKey = `discipline-${hierarchy.discipline.id}`;
      if (!treeMap.has(disciplineKey)) {
        const disciplineNode: TreeNode = {
          id: disciplineKey,
          name: hierarchy.discipline.name,
          type: 'discipline',
          children: [],
          expanded: true,
          matched: result.type === 'discipline'
        };
        treeMap.set(disciplineKey, disciplineNode);
        rootNodes.push(disciplineNode);
      }
      
      const disciplineNode = treeMap.get(disciplineKey)!;
      
      // Criar nó do assunto se existir
      if (hierarchy.subject) {
        const subjectKey = `subject-${hierarchy.subject.id}`;
        if (!treeMap.has(subjectKey)) {
          const subjectNode: TreeNode = {
            id: subjectKey,
            name: hierarchy.subject.title || hierarchy.subject.name,
            type: 'subject',
            children: [],
            expanded: true,
            matched: result.type === 'subject'
          };
          treeMap.set(subjectKey, subjectNode);
          disciplineNode.children.push(subjectNode);
        }
        
        const subjectNode = treeMap.get(subjectKey)!;
        
        // Criar nó do tópico se existir
        if (hierarchy.topic) {
          const topicKey = `topic-${hierarchy.topic.id}`;
          if (!treeMap.has(topicKey)) {
            const topicNode: TreeNode = {
              id: topicKey,
              name: hierarchy.topic.name,
              type: 'topic',
              children: [],
              expanded: false,
              matched: result.type === 'topic'
            };
            treeMap.set(topicKey, topicNode);
            subjectNode.children.push(topicNode);
          }
        }
      }
    });

    // Calcular contagens de questões para cada nó
    const updateCounts = async (nodes: TreeNode[]) => {
      for (const node of nodes) {
        const nodeId = parseInt(node.id.split('-')[1]);
        node.questionCount = await getQuestionCount(node.type, nodeId);
        
        if (node.children.length > 0) {
          await updateCounts(node.children);
        }
      }
    };

    await updateCounts(rootNodes);
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
    const nodeId = parseInt(node.id.split('-')[1]);
    
    if (node.type === 'discipline') {
      setSelectedDiscipline(nodeId.toString());
      setSelectedSubject('');
      setSelectedTopic('');
    } else if (node.type === 'subject') {
      // Encontrar a disciplina pai
      const findParentDiscipline = (nodes: TreeNode[], targetNode: TreeNode): TreeNode | null => {
        for (const n of nodes) {
          if (n.children.includes(targetNode)) {
            return n;
          }
          const found = findParentDiscipline(n.children, targetNode);
          if (found) return found;
        }
        return null;
      };
      
      const parentDiscipline = findParentDiscipline(treeData, node);
      if (parentDiscipline) {
        const disciplineId = parseInt(parentDiscipline.id.split('-')[1]);
        setSelectedDiscipline(disciplineId.toString());
        setSelectedSubject(nodeId.toString());
        setSelectedTopic('');
      }
    } else if (node.type === 'topic') {
      // Encontrar assunto e disciplina pais
      const findParents = (nodes: TreeNode[], targetNode: TreeNode): { subject: TreeNode | null, discipline: TreeNode | null } => {
        for (const n of nodes) {
          if (n.children.includes(targetNode)) {
            return { subject: n, discipline: findParentDiscipline(nodes, n) };
          }
          for (const child of n.children) {
            if (child.children.includes(targetNode)) {
              return { subject: child, discipline: n };
            }
          }
        }
        return { subject: null, discipline: null };
      };
      
      const { subject, discipline } = findParents(treeData, node);
      if (subject && discipline) {
        const disciplineId = parseInt(discipline.id.split('-')[1]);
        const subjectId = parseInt(subject.id.split('-')[1]);
        setSelectedDiscipline(disciplineId.toString());
        setSelectedSubject(subjectId.toString());
        setSelectedTopic(nodeId.toString());
      }
    }
  };

  // Funções de seleção de questões
  const toggleQuestionSelection = (questionId: number) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const selectAllQuestions = () => {
    setSelectedQuestions(new Set(questions.map(q => q.id)));
  };

  const deselectAllQuestions = () => {
    setSelectedQuestions(new Set());
  };

  const createExamFromSelectedQuestions = async () => {
    if (selectedQuestions.size === 0) {
      toast.error('Selecione pelo menos uma questão');
      return;
    }

    try {
      const selectedQuestionsArray = Array.from(selectedQuestions);
      const examData = {
        title: `Simulado - ${new Date().toLocaleDateString('pt-BR')}`,
        description: `Simulado criado com ${selectedQuestionsArray.length} questões selecionadas`,
        duration: selectedQuestionsArray.length * 2, // 2 minutos por questão
        total_questions: selectedQuestionsArray.length,
        user_id: currentUserId
      };

      const examId = await ExamsService.addExam(examData);
      
      await ExamsService.addQuestionsToExam(examId, selectedQuestionsArray);
      
      toast.success('Simulado criado com sucesso!');
      router.push(`/simulados/${examId}`);
    } catch (error) {
      console.error('Erro ao criar simulado:', error);
      toast.error('Erro ao criar simulado');
    }
  };

  const clearFilters = useCallback(() => {
    startTransition(() => {
      setSelectedDiscipline('');
      setSelectedSubject('');
      setSelectedTopic('');
      setSubjects([]);
      setTopics([]);
      setQuestions([]);
      setSelectedQuestions(new Set());
      setSearchTerm('');
      setSearchResults([]);
      setTreeData([]);
      setHasSearched(false);
    });
  }, []);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'fácil':
      case 'facil':
        return 'bg-green-100 text-green-800';
      case 'médio':
      case 'medio':
        return 'bg-yellow-100 text-yellow-800';
      case 'difícil':
      case 'dificil':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const TreeView = ({ nodes, onToggle }: { nodes: TreeNode[]; onToggle: (nodeId: string) => void }) => {
    return (
      <div className="space-y-1">
        {nodes.map((node) => (
          <div key={node.id} className="">
            <div 
              className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                node.matched ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleNodeClick(node)}
            >
              {node.children.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(node.id);
                  }}
                  className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
                >
                  {node.expanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              
              {node.children.length === 0 && (
                <div className="w-6 h-6 flex-shrink-0" />
              )}
              
              <div className="flex items-center space-x-2 flex-1">
                {node.type === 'discipline' && <BookOpen className="h-4 w-4 text-blue-500" />}
                {node.type === 'subject' && <FileText className="h-4 w-4 text-green-500" />}
                {node.type === 'topic' && <Target className="h-4 w-4 text-orange-500" />}
                
                <span className={`text-sm ${node.matched ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
                  {node.name}
                </span>
                
                {node.questionCount !== undefined && (
                  <Badge variant="secondary" className="ml-auto">
                    {node.questionCount}
                  </Badge>
                )}
              </div>
            </div>
            
            {node.expanded && node.children.length > 0 && (
              <div className="ml-6 mt-1">
                <TreeView nodes={node.children} onToggle={onToggle} />
              </div>
            )}
          </div>
        ))}
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
            {/* Disciplina */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Disciplina</label>
              <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {disciplines.map((discipline) => (
                    <SelectItem key={discipline.id} value={discipline.id.toString()}>
                      <div className="flex justify-between items-center w-full">
                        <span>{discipline.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {questionCounts.disciplines[discipline.id] || 0}
                        </Badge>
                      </div>
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

            {/* Assunto */}
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
                      <div className="flex justify-between items-center w-full">
                        <span>{subject.title || subject.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {questionCounts.subjects[subject.id] || 0}
                        </Badge>
                      </div>
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

            {/* Tópico */}
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
                      <div className="flex justify-between items-center w-full">
                        <span>{topic.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {questionCounts.topics[topic.id] || 0}
                        </Badge>
                      </div>
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

          {/* Botão Limpar Filtros */}
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {(selectedDiscipline || selectedSubject || selectedTopic) && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedDiscipline ? disciplines.find(d => d.id.toString() === selectedDiscipline)?.name : '-'}
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Disciplina</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {selectedSubject ? subjects.find(s => s.id.toString() === selectedSubject)?.title || subjects.find(s => s.id.toString() === selectedSubject)?.name : '-'}
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Assunto</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {questions.length}
                </div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Questões</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Questões */}
      {questions.length > 0 && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2" />
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Questões Encontradas ({questions.length})
              </CardTitle>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">
                  {selectedQuestions.size} selecionada{selectedQuestions.size !== 1 ? 's' : ''}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectedQuestions.size === questions.length ? deselectAllQuestions : selectAllQuestions}
                  className="text-xs"
                >
                  {selectedQuestions.size === questions.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </Button>
                {selectedQuestions.size > 0 && (
                  <Button
                    size="sm"
                    onClick={createExamFromSelectedQuestions}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Criar Simulado
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {questions.map((question) => (
                <Card key={question.id} className="border-0 shadow-md hover:shadow-lg transition-all duration-200">
                  <div className={`bg-gradient-to-r h-1 transition-all duration-200 ${
                    selectedQuestions.has(question.id) 
                      ? 'from-green-400 to-green-500' 
                      : 'from-blue-400 to-blue-500'
                  }`} />
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 pt-1">
                        <Checkbox
                          checked={selectedQuestions.has(question.id)}
                          onCheckedChange={() => toggleQuestionSelection(question.id)}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold text-lg mb-2 transition-colors duration-200 ${
                          selectedQuestions.has(question.id) ? 'text-green-900' : 'text-blue-900'
                        }`}>
                          <p className="text-gray-700 mb-4 leading-relaxed">{question.content}</p>
                        </div>
                        <div className="flex items-center flex-wrap gap-3">
                          {question.difficulty && (
                            <Badge className={`${getDifficultyColor(question.difficulty)} px-3 py-1 text-sm rounded-full`}>
                              {question.difficulty}
                            </Badge>
                          )}
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {new Date(question.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          {question.institution_name && (
                            <Badge variant="outline" className="px-3 py-1 text-sm rounded-full border-blue-200 text-blue-700">
                              {question.institution_acronym || question.institution_name}
                            </Badge>
                          )}
                          {question.exam_year && (
                            <Badge variant="outline" className="px-3 py-1 text-sm rounded-full border-purple-200 text-purple-700">
                              {question.exam_year}
                            </Badge>
                          )}
                          {selectedQuestions.has(question.id) && (
                            <Badge className="bg-green-100 text-green-700 px-2 py-0.5 text-xs rounded-full">
                              ✓ Selecionada
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {loading.questions && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-4">
                  <div className="h-16 w-16 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin shadow-lg"></div>
                  <FileText className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <span className="text-blue-700 font-semibold text-lg">Carregando questões...</span>
                  <p className="text-gray-600 text-sm">Aguarde enquanto organizamos o conteúdo para você</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há questões */}
      {selectedTopic && questions.length === 0 && !loading.questions && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="p-8">
            <div className="text-center py-8 max-w-md mx-auto">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <FileText className="h-10 w-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Nenhuma questão encontrada</h3>
              <p className="text-gray-600 leading-relaxed">Não há questões disponíveis para o tópico selecionado. Tente selecionar outro tópico ou disciplina.</p>
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="mt-6"
              >
                Limpar filtros e tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem de boas-vindas */}
      {!selectedDiscipline && disciplines.length > 0 && (
        <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-b from-white to-blue-50">
          <CardContent className="p-8">
            <div className="text-center py-8 max-w-lg mx-auto">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <BookOpen className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Bem-vindo ao Genomed Bank</h3>
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

      {/* Mensagem de erro */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0"></div>
              <span className="font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}