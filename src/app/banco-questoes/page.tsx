"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionsBankService, Question } from '@/services/questions-bank.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline, Subject } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  Filter, 
  FileText, 
  ChevronDown,
  RefreshCw,
  SortAsc,
  SortDesc,
  Wand2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import QuestionCard from '@/components/banco-questoes/QuestionCard';
import AIQuestionGeneratorModal from '@/components/banco-questoes/AIQuestionGeneratorModal';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ImportQuestionsFromExcel } from '@/components/banco-questoes/ImportQuestionsFromExcel';

export default function BancoQuestoesPage() {
  const { user } = useAuth();
  
  // Estados para gerenciar questões e filtros
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [totalQuestionCount, setTotalQuestionCount] = useState<number>(0);
  
  // Estados para filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showFromGenomaOnly, setShowFromGenomaOnly] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage, setQuestionsPerPage] = useState(10);
  const [paginatedQuestions, setPaginatedQuestions] = useState<Question[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  
  // Estado para modal de geração de questão com IA
  const [showAIModal, setShowAIModal] = useState(false);
  
  // Estado para modal de importação de Excel
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Estados para exclusão
  const [deleting, setDeleting] = useState<number | null>(null);
  
  const { subscriptionLimits, hasReachedLimit, showUpgradeModal, refreshLimits } = useSubscription();
  
  // Atualizar limites ao montar a página
  useEffect(() => {
    refreshLimits();
  }, []);

  // Check if user has reached their daily questions limit
  const hasReachedQuestionsLimit = hasReachedLimit('questions_per_day');
  
  // Function to handle accessing a question when limit is reached
  const handleQuestionAccess = () => {
    if (hasReachedQuestionsLimit) {
      showUpgradeModal(undefined, 'questões diárias');
      return false;
    }
    return true;
  };
  
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
    showFromGenomaOnly,
    sortOrder
  ]);
  
  // Atualizar questões paginadas quando as questões filtradas ou a página atual mudar
  useEffect(() => {
    paginateQuestions();
  }, [filteredQuestions, currentPage, questionsPerPage]);

  // Função para paginar as questões
  const paginateQuestions = () => {
    const indexOfLastQuestion = currentPage * questionsPerPage;
    const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
    const currentQuestions = filteredQuestions.slice(indexOfFirstQuestion, indexOfLastQuestion);
    
    setPaginatedQuestions(currentQuestions);
    setTotalPages(Math.ceil(filteredQuestions.length / questionsPerPage));
  };
  
  // Função para mudar de página
  const changePage = (pageNumber: number) => {
    // Garantir que o número da página esteja dentro dos limites
    const page = Math.max(1, Math.min(pageNumber, totalPages));
    setCurrentPage(page);
    
    // Rolar para o topo da página quando mudar de página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Função para ir para a próxima página
  const nextPage = () => {
    if (currentPage < totalPages) {
      changePage(currentPage + 1);
    }
  };
  
  // Função para ir para a página anterior
  const prevPage = () => {
    if (currentPage > 1) {
      changePage(currentPage - 1);
    }
  };
  
  // Função para mudar o número de questões por página
  const handleQuestionsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setQuestionsPerPage(Number(e.target.value));
    setCurrentPage(1); // Voltar para a primeira página ao mudar o número de itens por página
  };
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Verificar se as tabelas existem
      const tablesExist = await QuestionsBankService.checkTablesExist();

      // Buscar questões reais do banco de dados ou usar dados mockados para demonstração
      if (tablesExist) {
        const questionsData = await QuestionsBankService.getUserQuestions();
        
        // Obter o total de questões do usuário (sem paginação)
        const totalCount = await QuestionsBankService.countUserQuestions();
        setTotalQuestionCount(totalCount);
        
        if (questionsData && questionsData.length > 0) {
          setQuestions(questionsData);
          console.log('Carregou questões reais:', questionsData.length);
        } else {
          // Para desenvolvimento, usamos dados de exemplo se não houver questões reais
          console.log('Nenhuma questão encontrada, usando dados mock para demo');
          const mockData = QuestionsBankService.getMockQuestions();
          setQuestions(mockData);
          setTotalQuestionCount(mockData.length);
        }
      } else {
        console.log('Tabelas não encontradas, usando dados mock para demo');
        const mockData = QuestionsBankService.getMockQuestions();
        setQuestions(mockData);
        setTotalQuestionCount(mockData.length);
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
      
      // Carregar dados mockados em caso de erro
      const mockData = QuestionsBankService.getMockQuestions();
      setQuestions(mockData);
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
      setSubjects([]);
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
      // Normalizar a dificuldade para lidar com 'média' e 'media'
      filtered = filtered.filter(q => {
        const qDiff = q.difficulty?.toLowerCase();
        const filterDiff = selectedDifficulty.toLowerCase();
        
        return qDiff === filterDiff ||
              (qDiff === 'média' && filterDiff === 'media') ||
              (qDiff === 'media' && filterDiff === 'média');
      });
    }
    
    // Filtrar por tipo de questão
    if (selectedType) {
      filtered = filtered.filter(q => q.question_type === selectedType);
    }
    
    // Filtrar apenas questões do Genoma Bank
    if (showFromGenomaOnly) {
      filtered = filtered.filter(q => q.from_genoma_bank === true);
    }
    
    // Ordenar por data
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredQuestions(filtered);
    // Resetar para a primeira página quando os filtros mudarem
    setCurrentPage(1);
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
    setShowFromGenomaOnly(false);
    setSubjects([]);
  };
  
  // Função para atualizar os dados após criar uma nova questão
  const handleQuestionCreated = async () => {
    await loadData();
  };

  // Função para excluir uma questão
  const handleDeleteQuestion = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta questão?')) {
      return;
    }
    
    setDeleting(id);
    try {
      const success = await QuestionsBankService.deleteQuestion(id);
      if (success) {
        toast.success('Questão excluída com sucesso');
        
        // Atualizar a lista de questões
        setQuestions(questions.filter(q => q.id !== id));
        
        // Atualizar o contador total
        setTotalQuestionCount(prevCount => Math.max(0, prevCount - 1));
      } else {
        toast.error('Erro ao excluir questão');
      }
    } catch (error) {
      console.error('Erro ao excluir questão:', error);
      toast.error('Ocorreu um erro ao excluir a questão');
    } finally {
      setDeleting(null);
    }
  };
  
  // Função para obter o nome da disciplina pelo ID
  const getDisciplineName = (id?: number) => {
    if (!id) return 'Sem disciplina';
    const discipline = disciplines.find(d => d.id === id);
    return discipline ? discipline.name : 'Disciplina não encontrada';
  };

  // Componente de paginação
  const Pagination = () => {
    // Se não houver páginas ou apenas uma página, não mostrar paginação
    if (totalPages <= 1) return null;
    
    // Função para gerar array com números de páginas a serem mostradas
    const getPageNumbers = () => {
      const pageNumbers: (number | string)[] = [];
      
      // Sempre mostrar a primeira página
      pageNumbers.push(1);
      
      // Adicionar elipse se necessário
      if (currentPage > 3) {
        pageNumbers.push('...');
      }
      
      // Adicionar páginas ao redor da página atual
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (i > 1 && i < totalPages) {
          pageNumbers.push(i);
        }
      }
      
      // Adicionar elipse se necessário
      if (currentPage < totalPages - 2) {
        pageNumbers.push('...');
      }
      
      // Sempre mostrar a última página se houver mais de uma página
      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
      
      return pageNumbers;
    };
    
    return (
      <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center">
          <span className="text-sm text-gray-700 mr-2">Mostrar</span>
          <select
            value={questionsPerPage}
            onChange={handleQuestionsPerPageChange}
            className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-700 ml-2">por página</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className={`p-2 rounded-md ${
              currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          {getPageNumbers().map((pageNumber, index) => (
            <div key={index}>
              {typeof pageNumber === 'number' ? (
                <button
                  onClick={() => changePage(pageNumber)}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === pageNumber
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  {pageNumber}
                </button>
              ) : (
                <span className="px-2 text-gray-500">{pageNumber}</span>
              )}
            </div>
          ))}
          
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-md ${
              currentPage === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        
        <div className="text-sm text-gray-700">
          Página {currentPage} de {totalPages} ({filteredQuestions.length} questões)
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 mb-8 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-white mb-6 md:mb-0">
            <h1 className="text-3xl font-bold flex items-center">
              <FileText className="h-8 w-8 mr-3" />
              Banco de Questões
            </h1>
            <p className="mt-2 text-blue-100 max-w-xl">
              Organize e gerencie suas questões para estudos. Crie, edite e pratique para aprimorar seu conhecimento médico.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="bg-blue-500/30 px-4 py-2 rounded-lg flex items-center text-sm backdrop-blur-sm">
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span>{totalQuestionCount} questões no total</span>
              </div>
              <div className="bg-blue-500/30 px-4 py-2 rounded-lg flex items-center text-sm backdrop-blur-sm">
                <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
                <span>{filteredQuestions.length} questões filtradas</span>
              </div>
              <div className="bg-blue-500/30 px-4 py-2 rounded-lg flex items-center text-sm backdrop-blur-sm">
                <div className="h-2 w-2 bg-purple-400 rounded-full mr-2"></div>
                <span>{disciplines.length} disciplinas</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="group flex items-center px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-md hover:shadow-xl"
            >
              <div className="bg-green-500 p-2 rounded-lg mr-3 group-hover:bg-green-400 transition-colors">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <span className="font-semibold">Importar Excel</span>
            </button>
            
            <button
              onClick={() => setShowAIModal(true)}
              className="group flex items-center px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-md hover:shadow-xl"
            >
              <div className="bg-purple-500 p-2 rounded-lg mr-3 group-hover:bg-purple-400 transition-colors">
                <Wand2 className="h-5 w-5" />
              </div>
              <span className="font-semibold">Criar com IA</span>
            </button>
            
            <Link href="/banco-questoes/nova-questao" 
                  className="group flex items-center px-6 py-3 bg-white text-blue-700 rounded-xl hover:bg-blue-50 transition-all shadow-md hover:shadow-xl">
              <div className="bg-blue-100 p-2 rounded-lg mr-3 group-hover:bg-blue-200 transition-colors">
                <Plus className="h-5 w-5" />
              </div>
              <span className="font-semibold">Nova Questão</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Filtros e barra de pesquisa */}
      <div className="bg-white rounded-xl shadow-md mb-8 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar questões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center transition-colors"
              >
                <Filter className="h-5 w-5 mr-2 text-blue-600" />
                <span className="text-gray-700">Filtros</span>
                <ChevronDown className={`ml-2 h-4 w-4 text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              <button
                onClick={toggleSortOrder}
                className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                title={sortOrder === 'newest' ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
              >
                {sortOrder === 'newest' ? (
                  <SortDesc className="h-5 w-5 text-blue-600" />
                ) : (
                  <SortAsc className="h-5 w-5 text-blue-600" />
                )}
              </button>
              
              <button
                onClick={loadData}
                className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                title="Atualizar"
              >
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Filtros expandidos */}
        {showFilters && (
          <div className="p-5 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Disciplina</label>
                <select
                  value={selectedDiscipline?.toString() || ''}
                  onChange={handleDisciplineChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Assunto</label>
                <select
                  value={selectedSubject?.toString() || ''}
                  onChange={(e) => setSelectedSubject(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Dificuldade</label>
                <select
                  value={selectedDifficulty || ''}
                  onChange={(e) => setSelectedDifficulty(e.target.value || null)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todas as dificuldades</option>
                  <option value="baixa">Baixa</option>
                  <option value="média">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Questão</label>
                <select
                  value={selectedType || ''}
                  onChange={(e) => setSelectedType(e.target.value || null)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos os tipos</option>
                  <option value="multiple_choice">Múltipla Escolha</option>
                  <option value="true_false">Verdadeiro/Falso</option>
                  <option value="essay">Dissertativa</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex items-center">
              <input
                type="checkbox"
                id="fromGenomaOnly"
                checked={showFromGenomaOnly}
                onChange={(e) => setShowFromGenomaOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="fromGenomaOnly" className="ml-2 block text-sm text-gray-700">
                Mostrar apenas questões adicionadas do Genoma Bank
              </label>
            </div>
            
            <div className="flex justify-end mt-5">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
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
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-md">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-500 border-t-transparent mb-3"></div>
            <p className="text-gray-600 font-medium">Carregando questões...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-md">
            <div className="bg-blue-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto">
              <FileText className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="mt-6 text-xl font-medium text-gray-900">Nenhuma questão encontrada</h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              {searchTerm || selectedDiscipline || selectedSubject || selectedDifficulty || selectedType
                ? 'Tente ajustar os filtros para encontrar questões.'
                : 'Comece adicionando sua primeira questão ao banco.'}
            </p>
            <Link 
              href="/banco-questoes/nova-questao"
              className="mt-6 inline-flex items-center px-5 py-3 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nova Questão
            </Link>
          </div>
        ) : (
          <div>
            <div className="p-4 bg-blue-50 rounded-xl mb-4 flex flex-col sm:flex-row justify-between items-center">
              <p className="text-blue-700 font-medium mb-2 sm:mb-0">
                <span className="font-bold">{filteredQuestions.length}</span> questões encontradas
                {filteredQuestions.length > questionsPerPage && (
                  <span className="ml-2 text-sm">
                    (mostrando {paginatedQuestions.length} nesta página)
                  </span>
                )}
              </p>
              <div className="text-sm text-blue-600">
                {selectedDiscipline && <span className="px-3 py-1 bg-blue-100 rounded-full mr-2">Disciplina filtrada</span>}
                {selectedSubject && <span className="px-3 py-1 bg-blue-100 rounded-full mr-2">Assunto filtrado</span>}
                {selectedDifficulty && <span className="px-3 py-1 bg-blue-100 rounded-full mr-2">Dificuldade: {selectedDifficulty}</span>}
                {selectedType && (
                  <span className="px-3 py-1 bg-blue-100 rounded-full mr-2">
                    Tipo: {selectedType === 'multiple_choice' ? 'Múltipla Escolha' : 
                           selectedType === 'true_false' ? 'Verdadeiro/Falso' : 'Dissertativa'}
                  </span>
                )}
                {showFromGenomaOnly && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
                    Apenas do Genoma Bank
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {paginatedQuestions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  onDelete={handleDeleteQuestion}
                  disciplineName={getDisciplineName(question.discipline_id)}
                  onAccess={handleQuestionAccess}
                />
              ))}
            </div>
            
            {/* Componente de paginação */}
            <Pagination />
          </div>
        )}
      </div>

      {/* Modal de geração de questão com IA */}
      <AIQuestionGeneratorModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onQuestionCreated={handleQuestionCreated}
      />

      {/* Modal de importação de Excel */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <FileSpreadsheet className="h-5 w-5 mr-2 text-green-600" />
                  Importar Questões do Excel
                </h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <ImportQuestionsFromExcel
                onImportComplete={() => {
                  setShowImportModal(false);
                  loadData();
                }}
              />
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
