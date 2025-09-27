"use client";

import { useState } from 'react';
import { Question, Discipline, Subject } from '@/lib/supabase';
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
  FileSpreadsheet,
  X,
  Menu,
  ChevronUp
} from 'lucide-react';
import Link from 'next/link';
import QuestionCard from './QuestionCard';
import AIQuestionGeneratorModal from './AIQuestionGeneratorModal';
import { ImportQuestionsFromExcel } from './ImportQuestionsFromExcel';

interface MobileBancoQuestoesProps {
  questions: Question[];
  filteredQuestions: Question[];
  paginatedQuestions: Question[];
  loading: boolean;
  disciplines: Discipline[];
  subjects: Subject[];
  totalQuestionCount: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchById: string;
  setSearchById: (id: string) => void;
  selectedDiscipline: number | null;
  setSelectedDiscipline: (id: number | null) => void;
  selectedSubject: number | null;
  setSelectedSubject: (id: number | null) => void;
  selectedDifficulty: string | null;
  setSelectedDifficulty: (difficulty: string | null) => void;
  selectedType: string | null;
  setSelectedType: (type: string | null) => void;
  showFromGenomaOnly: boolean;
  setShowFromGenomaOnly: (show: boolean) => void;
  sortOrder: 'newest' | 'oldest';
  toggleSortOrder: () => void;
  loadData: () => void;
  handleDeleteQuestion: (id: number) => void;
  getDisciplineName: (id: number) => string;
  handleQuestionAccess: () => boolean;
  handleQuestionCreated: () => void;
  currentPage: number;
  totalPages: number;
  changePage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
}

export default function MobileBancoQuestoes({
  questions,
  filteredQuestions,
  paginatedQuestions,
  loading,
  disciplines,
  subjects,
  totalQuestionCount,
  searchTerm,
  setSearchTerm,
  searchById,
  setSearchById,
  selectedDiscipline,
  setSelectedDiscipline,
  selectedSubject,
  setSelectedSubject,
  selectedDifficulty,
  setSelectedDifficulty,
  selectedType,
  setSelectedType,
  showFromGenomaOnly,
  setShowFromGenomaOnly,
  sortOrder,
  toggleSortOrder,
  loadData,
  handleDeleteQuestion,
  getDisciplineName,
  handleQuestionAccess,
  handleQuestionCreated,
  currentPage,
  totalPages,
  changePage,
  nextPage,
  prevPage
}: MobileBancoQuestoesProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showBottomMenu, setShowBottomMenu] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const MobilePagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <button
          onClick={prevPage}
          disabled={currentPage === 1}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${
            currentPage === 1
              ? 'text-gray-400 bg-gray-100'
              : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
          }`}
        >
          Anterior
        </button>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {currentPage} de {totalPages}
          </span>
        </div>
        
        <button
          onClick={nextPage}
          disabled={currentPage === totalPages}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${
            currentPage === totalPages
              ? 'text-gray-400 bg-gray-100'
              : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
          }`}
        >
          Próxima
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Mobile */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-white">
            <FileText className="h-6 w-6 mr-2" />
            <h1 className="text-xl font-bold">Banco de Questões</h1>
          </div>
          <button
            onClick={() => setShowBottomMenu(!showBottomMenu)}
            className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Plus className={`h-5 w-5 transition-transform duration-300 ${showBottomMenu ? 'rotate-45' : ''}`} />
          </button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-blue-500/30 px-3 py-2 rounded-lg backdrop-blur-sm">
            <div className="text-xs text-blue-100">Total</div>
            <div className="text-sm font-semibold text-white">{totalQuestionCount}</div>
          </div>
          <div className="bg-blue-500/30 px-3 py-2 rounded-lg backdrop-blur-sm">
            <div className="text-xs text-blue-100">Filtradas</div>
            <div className="text-sm font-semibold text-white">{filteredQuestions.length}</div>
          </div>
          <div className="bg-blue-500/30 px-3 py-2 rounded-lg backdrop-blur-sm">
            <div className="text-xs text-blue-100">Disciplinas</div>
            <div className="text-sm font-semibold text-white">{disciplines.length}</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar questões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full border-0 rounded-xl bg-white/90 backdrop-blur-sm focus:ring-2 focus:ring-white focus:bg-white transition-all text-gray-900 placeholder-gray-500"
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por ID da questão..."
              value={searchById}
              onChange={(e) => setSearchById(e.target.value)}
              className="pl-10 pr-4 py-3 w-full border-0 rounded-xl bg-white/90 backdrop-blur-sm focus:ring-2 focus:ring-white focus:bg-white transition-all text-gray-900 placeholder-gray-500"
            />
          </div>
        </div>
      </div>



      {/* Filters Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="h-4 w-4 mr-2 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Filtros</span>
            <ChevronDown className={`ml-2 h-4 w-4 text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleSortOrder}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title={sortOrder === 'newest' ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
            >
              {sortOrder === 'newest' ? (
                <SortDesc className="h-4 w-4 text-blue-600" />
              ) : (
                <SortAsc className="h-4 w-4 text-blue-600" />
              )}
            </button>
            
            <button
              onClick={loadData}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4 text-blue-600" />
            </button>
          </div>
        </div>
        
        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Disciplina</label>
              <select
                value={selectedDiscipline?.toString() || ''}
                onChange={handleDisciplineChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Assunto</label>
              <select
                value={selectedSubject?.toString() || ''}
                onChange={(e) => setSelectedSubject(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dificuldade</label>
                <select
                  value={selectedDifficulty || ''}
                  onChange={(e) => setSelectedDifficulty(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Todas</option>
                  <option value="facil">Fácil</option>
                  <option value="medio">Médio</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={selectedType || ''}
                  onChange={(e) => setSelectedType(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="multipla_escolha">Múltipla Escolha</option>
                  <option value="verdadeiro_falso">Verdadeiro/Falso</option>
                  <option value="dissertativa">Dissertativa</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="genoma-only"
                checked={showFromGenomaOnly}
                onChange={(e) => setShowFromGenomaOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="genoma-only" className="ml-2 text-sm text-gray-700">
                Apenas questões do Genoma
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-t-blue-600 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando questões...</p>
            </div>
          </div>
        ) : paginatedQuestions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma questão encontrada</h3>
            <p className="text-gray-600 mb-6">Tente ajustar os filtros ou criar uma nova questão.</p>
            <Link 
              href="/banco-questoes/nova-questao"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Questão
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
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
        )}
      </div>

      {/* Mobile Pagination */}
      <MobilePagination />
      
      {/* Floating Action Menu */}
        <div className="fixed bottom-20 right-6 z-[60]">
        {/* Menu Options */}
        <div className={`absolute bottom-16 right-0 space-y-3 transition-all duration-300 transform ${
          showBottomMenu ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}>
          {/* Criar com IA */}
          <div className="flex items-center space-x-3">
            <div className="bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap">
              Criar com IA
            </div>
            <button
              onClick={() => {
                setShowAIModal(true);
                setShowBottomMenu(false);
              }}
              className="w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <Wand2 className="h-6 w-6" />
            </button>
          </div>
          
          {/* Importar Excel */}
          <div className="flex items-center space-x-3">
            <div className="bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap">
              Importar Excel
            </div>
            <button
              onClick={() => {
                setShowImportModal(true);
                setShowBottomMenu(false);
              }}
              className="w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <FileSpreadsheet className="h-6 w-6" />
            </button>
          </div>
          
          {/* Nova Questão */}
          <div className="flex items-center space-x-3">
            <div className="bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap">
              Nova Questão
            </div>
            <Link 
              href="/banco-questoes/nova-questao"
              className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
              onClick={() => setShowBottomMenu(false)}
            >
              <FileText className="h-6 w-6" />
            </Link>
          </div>
        </div>
        
        {/* Main FAB Button */}
        <button
          onClick={() => setShowBottomMenu(!showBottomMenu)}
          className={`w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
            showBottomMenu ? 'rotate-45' : ''
          }`}
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>
      
      {/* Overlay when menu is open */}
       {showBottomMenu && (
         <div 
           className="fixed inset-0 bg-black bg-opacity-25 z-[55]"
           onClick={() => setShowBottomMenu(false)}
         />
       )}

      {/* Modal de geração de questão com IA */}
      <AIQuestionGeneratorModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onQuestionCreated={() => {
          handleQuestionCreated();
          setShowAIModal(false);
        }}
      />

      {/* Modal de importação de Excel */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 pb-20 sm:pb-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[75vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <FileSpreadsheet className="h-5 w-5 mr-2 text-green-600" />
                  Importar Questões do Excel
                </h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 flex-1 min-h-0 overflow-y-auto">
              <ImportQuestionsFromExcel
                onImportComplete={() => {
                  setShowImportModal(false);
                  handleQuestionCreated();
                }}
              />
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end flex-shrink-0">
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