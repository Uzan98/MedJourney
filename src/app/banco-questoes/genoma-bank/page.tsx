"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionsBankService, Question } from '@/services/questions-bank.service';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  FileText, 
  ChevronDown,
  RefreshCw,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  Globe,
  BookOpen,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import QuestionCard from '@/components/banco-questoes/QuestionCard';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ImportQuestionsFromExcel } from '@/components/banco-questoes/ImportQuestionsFromExcel';

export default function GenomaBankPage() {
  const { user } = useAuth();
  
  // Estados para gerenciar questões e filtros
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Estados para filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'discipline' | 'difficulty' | 'type'>('all');
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [questionsPerPage, setQuestionsPerPage] = useState(10);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Estado para modal de importação de Excel
  const [showImportModal, setShowImportModal] = useState(false);
  
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
    // Não carregamos questões automaticamente, apenas os limites de assinatura
    refreshLimits();
  }, []);
  
  // Recarregar questões quando os filtros mudarem ou a página atual mudar
  useEffect(() => {
    // Só carrega questões se o usuário já tiver feito uma pesquisa
    if (hasSearched) {
      loadQuestions();
    }
  }, [
    searchTerm,
    filterType,
    selectedDifficulties,
    selectedTypes,
    sortOrder,
    currentPage,
    questionsPerPage,
    hasSearched
  ]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      
      // Calcular offset para paginação
      const offset = (currentPage - 1) * questionsPerPage;
      
      // Preparar filtros
      const filters: {
        disciplineId?: number;
        subjectId?: number;
        difficulty?: string;
        questionType?: string;
        searchTerm?: string;
        disciplineName?: string;
      } = {};
      
      // Aplicar filtro de pesquisa com base no tipo de filtro selecionado
      if (searchTerm) {
        if (filterType === 'discipline') {
          filters.disciplineName = searchTerm;
        } else {
          filters.searchTerm = searchTerm;
        }
      }
      
      // Aplicar filtros de dificuldade e tipo
      if (selectedDifficulties.length === 1) {
        filters.difficulty = selectedDifficulties[0];
      }
      
      if (selectedTypes.length === 1) {
        filters.questionType = selectedTypes[0];
      }
      
      // Buscar questões públicas
      const publicQuestions = await QuestionsBankService.getPublicQuestions(
        questionsPerPage,
        offset,
        filters
      );
      
      // Contar total de questões para paginação
      const total = await QuestionsBankService.countPublicQuestions(filters);
      
      setQuestions(publicQuestions);
      setTotalQuestions(total);
      setTotalPages(Math.ceil(total / questionsPerPage));
      setHasSearched(true);
    } catch (error) {
      console.error('Erro ao carregar questões:', error);
      toast.error('Erro ao carregar questões');
    } finally {
      setLoading(false);
    }
  };
  
  // Função para iniciar a pesquisa
  const handleSearch = () => {
    setCurrentPage(1); // Voltar para a primeira página ao fazer uma nova pesquisa
    loadQuestions();
  };
  
  // Função para alternar ordenação
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
    // Não recarrega automaticamente, usuário precisa clicar em pesquisar
  };
  
  // Função para limpar todos os filtros
  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setSelectedDifficulties([]);
    setSelectedTypes([]);
    // Não recarrega automaticamente, usuário precisa clicar em pesquisar
  };
  
  // Função para alternar dificuldade selecionada
  const toggleDifficulty = (difficulty: string) => {
    if (selectedDifficulties.includes(difficulty)) {
      setSelectedDifficulties(selectedDifficulties.filter(d => d !== difficulty));
    } else {
      setSelectedDifficulties([difficulty]);
    }
    // Não recarrega automaticamente, usuário precisa clicar em pesquisar
  };
  
  // Função para alternar tipo selecionado
  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([type]);
    }
    // Não recarrega automaticamente, usuário precisa clicar em pesquisar
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

  // Função para lidar com questões adicionadas ao banco pessoal
  const handleQuestionAdded = (questionId: number) => {
    // Você pode implementar alguma lógica aqui se necessário
    // Por exemplo, mostrar feedback adicional ou atualizar a UI
    toast.success('Questão adicionada ao seu banco com sucesso!');
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
            className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-purple-500 focus:border-purple-500"
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
                : 'text-purple-600 hover:bg-purple-50'
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
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-700 hover:bg-purple-50'
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
                : 'text-purple-600 hover:bg-purple-50'
            }`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        
        <div className="text-sm text-gray-700">
          Página {currentPage} de {totalPages} ({totalQuestions} questões)
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-8 mb-8 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-white mb-6 md:mb-0">
            <h1 className="text-3xl font-bold flex items-center">
              <Globe className="h-8 w-8 mr-3" />
              Genoma Bank
            </h1>
            <p className="mt-2 text-blue-100 max-w-xl">
              Explore questões compartilhadas pela comunidade. Use a barra de pesquisa ou os filtros para encontrar questões de diversas disciplinas e assuntos.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="bg-purple-500/30 px-4 py-2 rounded-lg flex items-center text-sm backdrop-blur-sm">
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span>{hasSearched ? `${totalQuestions} questões encontradas` : 'Pesquise para ver questões'}</span>
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
              <span className="font-semibold">Importar para Genoma</span>
            </button>
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="pl-12 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleSearch}
                className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center"
              >
                <Search className="h-5 w-5 mr-2" />
                <span>Pesquisar</span>
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center transition-colors"
              >
                <Filter className="h-5 w-5 mr-2 text-purple-600" />
                <span className="text-gray-700">Filtros</span>
                <ChevronDown className={`ml-2 h-4 w-4 text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              <button
                onClick={toggleSortOrder}
                className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                title={sortOrder === 'newest' ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
              >
                {sortOrder === 'newest' ? (
                  <SortDesc className="h-5 w-5 text-purple-600" />
                ) : (
                  <SortAsc className="h-5 w-5 text-purple-600" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Filtros expandidos */}
        {showFilters && (
          <div className="p-5 bg-gray-50 border-t border-gray-200">
            {/* Opções de tipo de filtro */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de pesquisa:</label>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg flex items-center ${
                    filterType === 'all' 
                      ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {filterType === 'all' && <Check className="h-4 w-4 mr-2" />}
                  Geral
                </button>
                
                <button
                  onClick={() => setFilterType('discipline')}
                  className={`px-4 py-2 rounded-lg flex items-center ${
                    filterType === 'discipline' 
                      ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {filterType === 'discipline' && <Check className="h-4 w-4 mr-2" />}
                  Disciplina
                </button>
              </div>
              
              {filterType === 'discipline' && (
                <div className="mt-2 text-sm text-gray-600">
                  Digite o nome da disciplina no campo de pesquisa acima
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Filtro de dificuldade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Dificuldade:</label>
                <div className="space-y-2">
                  {['baixa', 'média', 'alta'].map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => toggleDifficulty(difficulty)}
                      className={`w-full px-4 py-3 rounded-lg flex items-center justify-between ${
                        selectedDifficulties.includes(difficulty)
                          ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="capitalize">{difficulty === 'média' ? 'Média' : difficulty}</span>
                      {selectedDifficulties.includes(difficulty) && <Check className="h-5 w-5" />}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Filtro de tipo de questão */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de questão:</label>
                <div className="space-y-2">
                  {[
                    { value: 'multiple_choice', label: 'Múltipla Escolha' },
                    { value: 'true_false', label: 'Verdadeiro/Falso' },
                    { value: 'essay', label: 'Dissertativa' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => toggleType(type.value)}
                      className={`w-full px-4 py-3 rounded-lg flex items-center justify-between ${
                        selectedTypes.includes(type.value)
                          ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{type.label}</span>
                      {selectedTypes.includes(type.value) && <Check className="h-5 w-5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-5">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium mr-2"
              >
                Limpar filtros
              </button>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center"
              >
                <Search className="h-4 w-4 mr-1.5" />
                Pesquisar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de questões */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-md">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-purple-500 border-t-transparent mb-3"></div>
            <p className="text-gray-600 font-medium">Carregando questões...</p>
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-md">
            <div className="bg-purple-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto">
              <Search className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="mt-6 text-xl font-medium text-gray-900">Pesquise no Genoma Bank</h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              Digite termos de pesquisa ou use os filtros para encontrar questões compartilhadas pela comunidade.
            </p>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-md">
            <div className="bg-purple-100 h-24 w-24 rounded-full flex items-center justify-center mx-auto">
              <FileText className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="mt-6 text-xl font-medium text-gray-900">Nenhuma questão encontrada</h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              {searchTerm || selectedDifficulties.length > 0 || selectedTypes.length > 0
                ? 'Tente ajustar os filtros para encontrar questões.'
                : 'Ainda não há questões compartilhadas no Genoma Bank.'}
            </p>
          </div>
        ) : (
          <div>
            <div className="p-4 bg-purple-50 rounded-xl mb-4 flex flex-col sm:flex-row justify-between items-center">
              <p className="text-purple-700 font-medium mb-2 sm:mb-0">
                <span className="font-bold">{totalQuestions}</span> questões encontradas
                {totalQuestions > questionsPerPage && (
                  <span className="ml-2 text-sm">
                    (mostrando {Math.min(questionsPerPage, questions.length)} nesta página)
                  </span>
                )}
              </p>
              <div className="text-sm text-purple-600 flex flex-wrap gap-2">
                {filterType === 'discipline' && searchTerm && (
                  <span className="px-3 py-1 bg-purple-100 rounded-full flex items-center">
                    <span className="font-medium mr-1">Disciplina:</span> {searchTerm}
                  </span>
                )}
                
                {selectedDifficulties.map(difficulty => (
                  <span key={difficulty} className="px-3 py-1 bg-purple-100 rounded-full">
                    Dificuldade: {difficulty === 'média' ? 'Média' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </span>
                ))}
                
                {selectedTypes.map(type => (
                  <span key={type} className="px-3 py-1 bg-purple-100 rounded-full">
                    Tipo: {
                      type === 'multiple_choice' ? 'Múltipla Escolha' : 
                      type === 'true_false' ? 'Verdadeiro/Falso' : 'Dissertativa'
                    }
                  </span>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  disciplineName={question.discipline_name || "Disciplina não especificada"}
                  onAccess={handleQuestionAccess}
                  onQuestionAdded={handleQuestionAdded}
                  isGenomeBank={true}
                />
              ))}
            </div>
            
            {/* Componente de paginação */}
            <Pagination />
          </div>
        )}
      </div>

      {/* Modal de importação de Excel */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <FileSpreadsheet className="h-5 w-5 mr-2 text-green-600" />
                  Importar Questões para o Genoma Bank
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
              <p className="mb-4 text-sm text-gray-600">
                Todas as questões importadas aqui serão automaticamente adicionadas ao Genoma Bank (públicas).
              </p>
              <ImportQuestionsFromExcel
                onImportComplete={() => {
                  setShowImportModal(false);
                  if (hasSearched) {
                    loadQuestions();
                  }
                }}
                className="mt-2"
                defaultIsPublic={true}
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