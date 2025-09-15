'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Filter, BookOpen, FileText, Target, Search, ChevronDown, ChevronRight, Plus, Sparkles, Zap, Star } from 'lucide-react';
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
      const transformedData = (data || []).map((question: any) => {
        const institutions = question.exam_institutions as { name?: string; acronym?: string }[] | { name?: string; acronym?: string } | undefined;
        const firstInstitution = Array.isArray(institutions) ? institutions[0] : institutions;
        return {
          ...question,
          institution_name: firstInstitution?.name,
          institution_acronym: firstInstitution?.acronym,
        } as Question;
      });
      
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
      subjectMatches?.forEach((subject: any) => {
        const disciplineFromSubject = Array.isArray(subject.disciplines) ? subject.disciplines[0] : subject.disciplines;
        results.push({
          type: 'subject',
          id: subject.id,
          name: subject.title || subject.name,
          subject,
          hierarchy: {
            discipline: disciplineFromSubject,
            subject,
          },
        });
      });
      
      // Processar resultados de tópicos
      topicMatches?.forEach((topic: any) => {
        const subjectFromTopic = Array.isArray(topic.subjects) ? topic.subjects[0] : topic.subjects;
        const disciplineFromTopic = subjectFromTopic ? (Array.isArray(subjectFromTopic.disciplines) ? subjectFromTopic.disciplines[0] : subjectFromTopic.disciplines) : undefined;
        results.push({
          type: 'topic',
          id: topic.id,
          name: topic.name,
          topic,
          hierarchy: {
            discipline: disciplineFromTopic,
            subject: subjectFromTopic,
            topic,
          },
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
    const validIds = questions
      .filter(q => q.id && typeof q.id === 'number' && !isNaN(q.id))
      .map(q => q.id);
    setSelectedQuestions(new Set(validIds));
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
        time_limit: selectedQuestionsArray.length * 2, // 2 minutos por questão
        user_id: currentUserId
      };

      const examId = await ExamsService.addExam(examData);
      
      if (!examId || typeof examId !== 'number' || isNaN(examId)) {
        throw new Error('Falha ao criar simulado - ID inválido');
      }
      
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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white tracking-tight">
                  Genomed Bank
                </h1>
              </div>
              <p className="text-white/90 text-lg font-medium max-w-2xl">
                Explore nosso banco de questões médicas com tecnologia avançada e interface intuitiva
              </p>
              <div className="flex items-center space-x-6 text-white/80">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span className="text-sm font-medium">Busca Inteligente</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span className="text-sm font-medium">Filtros Avançados</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span className="text-sm font-medium">Conteúdo Atualizado</span>
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block">
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-white/20 to-white/5 rounded-3xl backdrop-blur-sm flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-yellow-800" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Busca Hierárquica */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600"></div>
          <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl">
                <Search className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-700 bg-clip-text text-transparent">
                Busca Inteligente
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-cyan-500" />
                  <Input
                    type="text"
                    placeholder="🔍 Digite para buscar disciplinas, assuntos ou tópicos... (mín. 2 caracteres)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-12 h-14 text-lg border-0 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg focus:ring-2 focus:ring-cyan-400 focus:bg-white transition-all duration-300 placeholder:text-gray-400"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="relative">
                        <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
                        <div className="absolute inset-0 h-5 w-5 border-2 border-cyan-200 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  )}
                </div>
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
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600"></div>
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <CardTitle className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
                Filtros Avançados
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Disciplina */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-emerald-700 flex items-center space-x-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Disciplina</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                  <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
                    <SelectTrigger className="relative bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-lg h-12 focus:ring-2 focus:ring-emerald-400 transition-all duration-300">
                      <SelectValue placeholder="🎯 Selecione uma disciplina" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-xl">
                      {disciplines.map((discipline) => (
                        <SelectItem key={discipline.id} value={discipline.id.toString()} className="hover:bg-emerald-50 focus:bg-emerald-50 rounded-lg m-1">
                          <div className="flex justify-between items-center w-full">
                            <span className="font-medium text-gray-700">{discipline.name}</span>
                            <Badge className="ml-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                              {questionCounts.disciplines[discipline.id] || 0}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {loading.disciplines && (
                  <div className="flex items-center space-x-2 text-sm text-emerald-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Carregando disciplinas...</span>
                  </div>
                )}
              </div>

              {/* Assunto */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-blue-700 flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Assunto</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                  <Select 
                    value={selectedSubject} 
                    onValueChange={setSelectedSubject}
                    disabled={!selectedDiscipline || loading.subjects}
                  >
                    <SelectTrigger className="relative bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-lg h-12 focus:ring-2 focus:ring-blue-400 transition-all duration-300 disabled:opacity-50">
                      <SelectValue placeholder="📚 Selecione um assunto" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-xl">
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()} className="hover:bg-blue-50 focus:bg-blue-50 rounded-lg m-1">
                          <div className="flex justify-between items-center w-full">
                            <span className="font-medium text-gray-700">{subject.title || subject.name}</span>
                            <Badge className="ml-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                              {questionCounts.subjects[subject.id] || 0}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {loading.subjects && (
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Carregando assuntos...</span>
                  </div>
                )}
              </div>

              {/* Tópico */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-purple-700 flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Tópico</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                  <Select 
                    value={selectedTopic} 
                    onValueChange={setSelectedTopic}
                    disabled={!selectedSubject || loading.topics}
                  >
                    <SelectTrigger className="relative bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-lg h-12 focus:ring-2 focus:ring-purple-400 transition-all duration-300 disabled:opacity-50">
                      <SelectValue placeholder="🎯 Selecione um tópico" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-xl">
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id.toString()} className="hover:bg-purple-50 focus:bg-purple-50 rounded-lg m-1">
                          <div className="flex justify-between items-center w-full">
                            <span className="font-medium text-gray-700">{topic.name}</span>
                            <Badge className="ml-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                              {questionCounts.topics[topic.id] || 0}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {loading.topics && (
                  <div className="flex items-center space-x-2 text-sm text-purple-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Carregando tópicos...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Botão Limpar Filtros */}
            <div className="mt-6 flex justify-end">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="relative bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-lg px-6 py-2 hover:bg-gray-50 focus:ring-2 focus:ring-gray-400 transition-all duration-300 font-medium"
                >
                  ✨ Limpar Filtros
                </Button>
              </div>
            </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {(selectedDiscipline || selectedSubject || selectedTopic) && (
        <Card className="mb-8 bg-gradient-to-br from-white via-emerald-50/30 to-blue-50/30 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="pt-8 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {selectedDiscipline ? disciplines.find(d => d.id.toString() === selectedDiscipline)?.name : '-'}
                  </div>
                  <p className="text-sm font-medium text-gray-600 mt-2 flex items-center justify-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <span>Disciplina</span>
                  </p>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {selectedSubject ? subjects.find(s => s.id.toString() === selectedSubject)?.title || subjects.find(s => s.id.toString() === selectedSubject)?.name : '-'}
                  </div>
                  <p className="text-sm font-medium text-gray-600 mt-2 flex items-center justify-center space-x-1">
                    <FileText className="h-4 w-4" />
                    <span>Assunto</span>
                  </p>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {questions.length}
                  </div>
                  <p className="text-sm font-medium text-gray-600 mt-2 flex items-center justify-center space-x-1">
                    <Sparkles className="h-4 w-4" />
                    <span>Questões</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Questões */}
      {questions.length > 0 && (
        <Card className="border-0 shadow-2xl overflow-hidden bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-3" />
          <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-b border-indigo-100/50 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-indigo-800 flex items-center gap-3 text-xl">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold">
                  Questões Encontradas ({questions.length})
                </span>
              </CardTitle>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium text-indigo-700">
                    {selectedQuestions.size} selecionada{selectedQuestions.size !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectedQuestions.size === questions.length ? deselectAllQuestions : selectAllQuestions}
                    className="relative bg-white/90 backdrop-blur-sm border-0 rounded-xl shadow-lg px-4 py-2 hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-400 transition-all duration-300 font-medium text-indigo-700"
                  >
                    {selectedQuestions.size === questions.length ? '❌ Desmarcar Todas' : '✅ Selecionar Todas'}
                  </Button>
                </div>
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
            <div className="space-y-6">
              {questions.map((question) => (
                <div key={question.id} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 via-purple-400/20 to-pink-400/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <Card className={`relative border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/20 backdrop-blur-sm ${
                    selectedQuestions.has(question.id) ? 'ring-2 ring-emerald-400 shadow-emerald-200/50' : ''
                  }`}>
                    <div className={`bg-gradient-to-r h-2 rounded-t-2xl transition-all duration-300 ${
                      selectedQuestions.has(question.id) 
                        ? 'from-emerald-400 via-teal-500 to-green-500' 
                        : 'from-indigo-400 via-purple-500 to-pink-500'
                    }`} />
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 pt-1">
                          <div className="relative">
                            <div className={`absolute inset-0 rounded-lg blur transition-all duration-300 ${
                              question.id && selectedQuestions.has(question.id) 
                                ? 'bg-emerald-400 opacity-30' 
                                : 'bg-indigo-400 opacity-20'
                            }`}></div>
                            <Checkbox
                              checked={question.id ? selectedQuestions.has(question.id) : false}
                              onCheckedChange={() => {
                                if (question.id && typeof question.id === 'number' && !isNaN(question.id)) {
                                  toggleQuestionSelection(question.id);
                                }
                              }}
                              className={`relative h-5 w-5 transition-all duration-300 ${
                                question.id && selectedQuestions.has(question.id)
                                  ? 'data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600'
                                  : 'data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600'
                              }`}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className={`mb-4 transition-colors duration-300`}>
                            <p className="text-gray-800 leading-relaxed font-medium text-base">{question.content}</p>
                          </div>
                          <div className="flex items-center flex-wrap gap-3">
                            {question.difficulty && (
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-full blur opacity-20"></div>
                                <Badge className={`relative ${getDifficultyColor(question.difficulty)} px-4 py-1.5 text-sm rounded-full font-medium shadow-lg`}>
                                  ⚡ {question.difficulty}
                                </Badge>
                              </div>
                            )}
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full blur opacity-20"></div>
                              <span className="relative text-sm text-gray-600 flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg font-medium">
                                <FileText className="h-4 w-4" />
                                {new Date(question.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            {question.institution_name && (
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full blur opacity-20"></div>
                                <Badge className="relative bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1.5 text-sm rounded-full font-medium shadow-lg">
                                  🏛️ {question.institution_acronym || question.institution_name}
                                </Badge>
                              </div>
                            )}
                            {question.exam_year && (
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full blur opacity-20"></div>
                                <Badge className="relative bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-1.5 text-sm rounded-full font-medium shadow-lg">
                                  📅 {question.exam_year}
                                </Badge>
                              </div>
                            )}
                            {selectedQuestions.has(question.id) && (
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full blur opacity-30"></div>
                                <Badge className="relative bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1 text-xs rounded-full font-medium shadow-lg animate-pulse">
                                  ✨ Selecionada
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {loading.questions && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full blur opacity-30 animate-pulse"></div>
                  <div className="relative h-20 w-20 rounded-full border-4 border-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-spin shadow-2xl">
                    <div className="absolute inset-1 bg-white rounded-full"></div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Sparkles className="h-8 w-8 text-indigo-600 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold text-xl">Carregando questões...</span>
                  <p className="text-gray-600 text-base font-medium">✨ Aguarde enquanto organizamos o conteúdo para você</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há questões */}
      {selectedTopic && questions.length === 0 && !loading.questions && (
        <Card className="border-0 shadow-2xl overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100 backdrop-blur-sm">
          <CardContent className="p-10">
            <div className="text-center py-10 max-w-lg mx-auto">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full blur opacity-50"></div>
                <div className="relative bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl border border-gray-200">
                  <FileText className="h-12 w-12 text-gray-500" />
                </div>
                <div className="absolute -top-2 -right-8 h-8 w-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold text-white">!</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent mb-4">Nenhuma questão encontrada</h3>
              <p className="text-gray-600 leading-relaxed text-lg font-medium mb-8">📚 Não há questões disponíveis para o tópico selecionado. Tente selecionar outro tópico ou disciplina.</p>
              <Button 
                onClick={clearFilters}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                ✨ Limpar filtros e tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem de boas-vindas */}
      {!selectedDiscipline && disciplines.length > 0 && (
        <Card className="border-0 shadow-2xl overflow-hidden bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 backdrop-blur-sm">
          <CardContent className="p-12">
            <div className="text-center py-12 max-w-2xl mx-auto">
              <div className="relative mb-10">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-28 h-28 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <BookOpen className="h-14 w-14 text-white" />
                </div>
                <div className="absolute -top-3 -right-3 h-10 w-10 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg animate-bounce">
                  <Star className="h-5 w-5 text-white" />
                </div>
              </div>
              <h3 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">Bem-vindo ao Genomed Bank</h3>
              <p className="text-gray-700 leading-relaxed text-xl font-medium mb-10">🚀 Escolha uma disciplina, assunto e tópico nos filtros acima para visualizar as questões disponíveis. Você também pode usar a busca hierárquica para encontrar conteúdos específicos.</p>
              <div className="flex flex-wrap justify-center gap-6">
                <div className="flex items-center space-x-3 bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                  <Filter className="h-6 w-6 text-indigo-600" />
                  <span className="text-indigo-700 font-semibold text-lg">Use os filtros</span>
                </div>
                <div className="flex items-center space-x-3 bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                  <Search className="h-6 w-6 text-purple-600" />
                  <span className="text-purple-700 font-semibold text-lg">Ou faça uma busca</span>
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
  </div>
  );
}