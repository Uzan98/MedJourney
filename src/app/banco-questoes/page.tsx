"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionsBankService, Question } from '@/services/questions-bank.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline, Subject } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Plus, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  FileText, 
  Book, 
  Tag,
  ChevronDown,
  RefreshCw,
  SortAsc,
  SortDesc
} from 'lucide-react';
import Link from 'next/link';

export default function BancoQuestoesPage() {
  const { user } = useAuth();
  
  // Estados para gerenciar questões e filtros
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Estados para filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);
  
  // Filtrar questões quando os filtros mudarem
  useEffect(() => {
    filterQuestions();
  }, [
    questions,
    searchTerm,
    selectedDiscipline,
    selectedSubject,
    selectedDifficulty,
    selectedType,
    sortOrder
  ]);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar questões reais do banco de dados em vez de usar dados mockados
      const questionsData = await QuestionsBankService.getUserQuestions();
      
      // Se não houver questões reais, podemos usar mockadas para demonstração
      if (questionsData && questionsData.length > 0) {
        setQuestions(questionsData);
        console.log('Carregou questões reais:', questionsData.length);
      } else {
        // Para desenvolvimento, usamos dados de exemplo
        console.log('Nenhuma questão encontrada, usando dados mock para demo');
        const mockData = QuestionsBankService.getMockQuestions();
        setQuestions(mockData);
      }
      
      // Carregar disciplinas
      const disciplinesData = await DisciplinesRestService.getDisciplines(true);
      setDisciplines(disciplinesData || []);
      
      // Carregar assuntos se uma disciplina estiver selecionada
      if (selectedDiscipline && disciplinesData) {
        loadSubjects(selectedDiscipline);
      }
      
      toast.success('Banco de questões carregado');
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar assuntos de uma disciplina
  const loadSubjects = async (disciplineId: number) => {
    try {
      const subjectsData = await DisciplinesRestService.getSubjects(disciplineId);
      setSubjects(subjectsData || []);
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error);
    }
  };
  
  const filterQuestions = () => {
    let filtered = [...questions];
    
    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.content.toLowerCase().includes(term) || 
        q.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    // Filtrar por disciplina
    if (selectedDiscipline) {
      filtered = filtered.filter(q => q.discipline_id === selectedDiscipline);
    }
    
    // Filtrar por assunto
    if (selectedSubject) {
      filtered = filtered.filter(q => q.subject_id === selectedSubject);
    }
    
    // Filtrar por dificuldade
    if (selectedDifficulty) {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    }
    
    // Filtrar por tipo de questão
    if (selectedType) {
      filtered = filtered.filter(q => q.question_type === selectedType);
    }
    
    // Ordenar por data
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredQuestions(filtered);
  };
  
  // Função para alternar ordenação
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };
  
  // Função para lidar com mudança de disciplina
  const handleDisciplineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const disciplineId = value ? parseInt(value) : null;
    
    setSelectedDiscipline(disciplineId);
    setSelectedSubject(null); // Resetar assunto selecionado
    
    if (disciplineId) {
      loadSubjects(disciplineId);
    } else {
      setSubjects([]);
    }
  };
  
  // Função para limpar todos os filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDiscipline(null);
    setSelectedSubject(null);
    setSelectedDifficulty(null);
    setSelectedType(null);
    setSubjects([]);
  };
  
  // Função para excluir questão
  const handleDeleteQuestion = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta questão?')) {
      try {
        // Em um ambiente de produção, chamaríamos o serviço
        // const success = await QuestionsBankService.deleteQuestion(id);
        
        // Para desenvolvimento, simulamos o sucesso
        const success = true;
        
        if (success) {
          setQuestions(questions.filter(q => q.id !== id));
          toast.success('Questão excluída com sucesso');
        } else {
          toast.error('Não foi possível excluir a questão');
        }
      } catch (error) {
        console.error('Erro ao excluir questão:', error);
        toast.error('Ocorreu um erro ao excluir a questão');
      }
    }
  };
  
  // Função para formatar a data
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return '';
    }
  };
  
  // Função para obter o nome da disciplina pelo ID
  const getDisciplineName = (id?: number) => {
    if (!id) return 'Sem disciplina';
    const discipline = disciplines.find(d => d.id === id);
    return discipline ? discipline.name : 'Disciplina não encontrada';
  };
  
  // Função para obter a cor da dificuldade
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'baixa':
        return 'bg-green-100 text-green-800';
      case 'média':
        return 'bg-yellow-100 text-yellow-800';
      case 'alta':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Função para obter o label do tipo de questão
  const getQuestionTypeLabel = (type?: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Múltipla Escolha';
      case 'true_false':
        return 'Verdadeiro/Falso';
      case 'essay':
        return 'Dissertativa';
      default:
        return 'Outro';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-blue-600" />
            Banco de Questões
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie suas questões para estudos e simulados
          </p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <Link href="/banco-questoes/nova-questao" 
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-5 w-5 mr-2" />
            Nova Questão
          </Link>
        </div>
      </div>

      {/* Filtros e barra de pesquisa */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar questões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            <button
              onClick={toggleSortOrder}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              title={sortOrder === 'newest' ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
            >
              {sortOrder === 'newest' ? (
                <SortDesc className="h-5 w-5 text-gray-500" />
              ) : (
                <SortAsc className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            <button
              onClick={loadData}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              title="Atualizar"
            >
              <RefreshCw className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* Filtros expandidos */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                <select
                  value={selectedDiscipline?.toString() || ''}
                  onChange={handleDisciplineChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todas as disciplinas</option>
                  {disciplines.map(discipline => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                <select
                  value={selectedSubject?.toString() || ''}
                  onChange={(e) => setSelectedSubject(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedDiscipline || subjects.length === 0}
                >
                  <option value="">Todos os assuntos</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.title || subject.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
                <select
                  value={selectedDifficulty || ''}
                  onChange={(e) => setSelectedDifficulty(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todas as dificuldades</option>
                  <option value="baixa">Baixa</option>
                  <option value="média">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Questão</label>
                <select
                  value={selectedType || ''}
                  onChange={(e) => setSelectedType(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos os tipos</option>
                  <option value="multiple_choice">Múltipla Escolha</option>
                  <option value="true_false">Verdadeiro/Falso</option>
                  <option value="essay">Dissertativa</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de questões */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhuma questão encontrada</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm || selectedDiscipline || selectedSubject || selectedDifficulty || selectedType
                ? 'Tente ajustar os filtros para encontrar questões.'
                : 'Comece adicionando sua primeira questão ao banco.'}
            </p>
            <Link 
              href="/banco-questoes/nova-questao"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nova Questão
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Questão
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Disciplina
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dificuldade
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuestions.map((question) => (
                    <tr key={question.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 line-clamp-2">{question.content}</div>
                        {question.tags && question.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {question.tags.map((tag, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {getQuestionTypeLabel(question.question_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {getDisciplineName(question.discipline_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(question.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/banco-questoes/questao/${question.id}`}
                            className="text-blue-600 hover:text-blue-900 p-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver</span>
                          </Link>
                          <Link
                            href={`/banco-questoes/questao/${question.id}/editar`}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Link>
                          <button
                            onClick={() => question.id && handleDeleteQuestion(question.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 