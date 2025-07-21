'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import toast from 'react-hot-toast';
import { 
  FaArrowLeft, FaCheck, FaPlus, FaSort, FaTimes, 
  FaGripLines, FaTrash, FaSearch, FaFilter 
} from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { Exam, ExamQuestion, ExamsService } from '@/services/exams.service';
import { Question, QuestionsBankService } from '@/services/questions-bank.service';
import Loading from '@/components/Loading';
import Pill from '@/components/Pill';
import Modal from '@/components/Modal';

export default function EditarQuestoesPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const examId = parseInt(params.id);
  
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [exam, setExam] = useState<Exam | null>(null);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [showAddQuestionsModal, setShowAddQuestionsModal] = useState(false);
  
  // Estado para o modal de adicionar questões
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingQuestions, setAddingQuestions] = useState(false);
  
  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [disciplineFilter, setDisciplineFilter] = useState<number | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  
  useEffect(() => {
    loadExamData();
  }, [examId]);
  
  const loadExamData = async () => {
    setLoading(true);
    try {
      // Carregar dados do simulado
      const examData = await ExamsService.getExamById(examId);
      if (!examData) {
        toast.error('Simulado não encontrado');
        router.push('/simulados');
        return;
      }
      
      setExam(examData);
      
      // Carregar questões do simulado
      const questions = await ExamsService.getExamQuestions(examId, true);
      setExamQuestions(questions);
    } catch (error) {
      console.error('Erro ao carregar dados do simulado:', error);
      toast.error('Ocorreu um erro ao carregar o simulado');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenAddQuestions = async () => {
    try {
      // Carregar questões disponíveis (que não estão no simulado ainda)
      const allQuestions = await QuestionsBankService.getUserQuestions();
      
      // Filtrar para remover questões que já estão no simulado
      const currentQuestionIds = examQuestions.map(q => q.question_id);
      const availableQs = allQuestions.filter(q => !currentQuestionIds.includes(q.id as number));
      
      setAvailableQuestions(availableQs);
      setFilteredQuestions(availableQs);
      setSelectedQuestions([]);
      setSearchQuery('');
      setShowAddQuestionsModal(true);
    } catch (error) {
      console.error('Erro ao carregar questões disponíveis:', error);
      toast.error('Ocorreu um erro ao carregar as questões disponíveis');
    }
  };
  
  const filterQuestions = () => {
    let filtered = availableQuestions;
    
    // Aplicar filtro de busca textual
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        q => q.content?.toLowerCase().includes(query)
      );
    }
    
    // Aplicar filtro de disciplina
    if (disciplineFilter) {
      filtered = filtered.filter(q => q.discipline_id === disciplineFilter);
    }
    
    // Aplicar filtro de dificuldade
    if (difficultyFilter) {
      filtered = filtered.filter(q => q.difficulty === difficultyFilter);
    }
    
    // Aplicar filtro de tipo
    if (typeFilter) {
      filtered = filtered.filter(q => q.question_type === typeFilter);
    }
    
    setFilteredQuestions(filtered);
  };
  
  useEffect(() => {
    filterQuestions();
  }, [searchQuery, disciplineFilter, difficultyFilter, typeFilter]);
  
  const toggleQuestionSelection = (questionId: number) => {
    if (selectedQuestions.includes(questionId)) {
      setSelectedQuestions(selectedQuestions.filter(id => id !== questionId));
    } else {
      setSelectedQuestions([...selectedQuestions, questionId]);
    }
  };
  
  const selectAllFilteredQuestions = () => {
    const allFilteredIds = filteredQuestions.map(q => q.id as number);
    setSelectedQuestions(allFilteredIds);
  };
  
  const unselectAllQuestions = () => {
    setSelectedQuestions([]);
  };
  
  const handleAddSelectedQuestions = async () => {
    if (selectedQuestions.length === 0) {
      toast.error('Selecione pelo menos uma questão para adicionar');
      return;
    }
    
    setAddingQuestions(true);
    try {
      // Para cada questão selecionada, adicionar ao simulado
      for (const questionId of selectedQuestions) {
        await ExamsService.addQuestionToExam(examId, questionId);
      }
      
      toast.success(`${selectedQuestions.length} questões adicionadas ao simulado`);
      setShowAddQuestionsModal(false);
      
      // Recarregar as questões do simulado
      loadExamData();
    } catch (error) {
      console.error('Erro ao adicionar questões:', error);
      toast.error('Ocorreu um erro ao adicionar as questões');
    } finally {
      setAddingQuestions(false);
    }
  };
  
  const handleRemoveQuestion = async (questionId: number) => {
    try {
      const success = await ExamsService.removeQuestionFromExam(examId, questionId);
      
      if (success) {
        toast.success('Questão removida do simulado');
        
        // Atualizar o estado removendo a questão
        setExamQuestions(examQuestions.filter(q => q.question_id !== questionId));
      } else {
        toast.error('Erro ao remover questão');
      }
    } catch (error) {
      console.error('Erro ao remover questão:', error);
      toast.error('Ocorreu um erro ao remover a questão');
    }
  };
  
  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    
    // Se não tiver um destino ou for colocado na mesma posição
    if (!destination || (destination.index === source.index)) {
      return;
    }
    
    // Reordenar o array de questões
    const reorderedQuestions = Array.from(examQuestions);
    const [movedItem] = reorderedQuestions.splice(source.index, 1);
    reorderedQuestions.splice(destination.index, 0, movedItem);
    
    // Atualizar o estado
    setExamQuestions(reorderedQuestions);
    
    // Salvar a nova ordem no servidor
    handleSaveOrder(reorderedQuestions);
  };
  
  const handleSaveOrder = async (reordered: ExamQuestion[]) => {
    setSavingOrder(true);
    try {
      // Criar array de IDs na nova ordem
      const questionIds = reordered.map(q => q.question_id);
      
      // Chamar a API para salvar a ordem
      const success = await ExamsService.reorderExamQuestions(examId, questionIds);
      
      if (success) {
        toast.success('Ordem das questões atualizada');
      } else {
        toast.error('Erro ao salvar a ordem das questões');
        // Em caso de erro, recarregar os dados
        loadExamData();
      }
    } catch (error) {
      console.error('Erro ao salvar a ordem das questões:', error);
      toast.error('Ocorreu um erro ao salvar a ordem');
      loadExamData();
    } finally {
      setSavingOrder(false);
    }
  };
  
  const getQuestionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      multiple_choice: 'Múltipla Escolha',
      true_false: 'Verdadeiro/Falso',
      essay: 'Dissertativa'
    };
    return types[type] || type;
  };
  
  const getDifficultyLabel = (difficulty: string) => {
    const levels: Record<string, { label: string, color: string }> = {
      baixa: { label: 'Baixa', color: 'bg-green-100 text-green-800' },
      média: { label: 'Média', color: 'bg-yellow-100 text-yellow-800' },
      alta: { label: 'Alta', color: 'bg-red-100 text-red-800' }
    };
    return levels[difficulty] || { label: difficulty, color: 'bg-gray-100 text-gray-800' };
  };
  
  if (loading) {
    return <Loading message="Carregando questões do simulado..." />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div className="flex items-center mb-4 md:mb-0">
            <Link 
              href={`/simulados/${examId}/editar`} 
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
              aria-label="Voltar"
            >
              <FaArrowLeft className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{exam?.title}</h1>
              <p className="text-gray-600">Gerenciar Questões</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleOpenAddQuestions}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              <FaPlus className="mr-2" /> Adicionar Questões
            </button>
            <Link
              href={`/simulados/${examId}`}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
            >
              <FaCheck className="mr-2" /> Concluir
            </Link>
          </div>
        </div>
        
        {/* Questions List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Questões do Simulado ({examQuestions.length})
              </h2>
              {examQuestions.length > 1 && (
                <div className="flex items-center text-sm text-gray-500">
                  <FaSort className="mr-1" /> 
                  <span>Arraste para reordenar as questões</span>
                </div>
              )}
            </div>
            
            {examQuestions.length > 0 ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="questions">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {examQuestions.map((item, index) => {
                        const questionData = item.question;
                        if (!questionData) return null;
                        
                        const difficultyInfo = getDifficultyLabel(questionData.difficulty || 'média');
                        
                        return (
                          <Draggable 
                            key={item.question_id.toString()} 
                            draggableId={item.question_id.toString()} 
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden"
                              >
                                <div className="p-4">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center mb-3">
                                        <div 
                                          {...provided.dragHandleProps}
                                          className="mr-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded cursor-move"
                                        >
                                          <FaGripLines />
                                        </div>
                                        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs font-medium mr-2">
                                          #{index + 1}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyInfo.color}`}>
                                          {difficultyInfo.label}
                                        </span>
                                        <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                          {getQuestionTypeLabel(questionData.question_type || 'multiple_choice')}
                                        </span>
                                      </div>
                                      <div 
                                        className="text-gray-700 mb-3" 
                                        dangerouslySetInnerHTML={{ __html: questionData.content || '' }}
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleRemoveQuestion(item.question_id)}
                                      className="ml-2 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                                      aria-label="Remover questão"
                                    >
                                      <FaTrash />
                                    </button>
                                  </div>
                                  
                                  {questionData.tags && questionData.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {questionData.tags.map((tag, tagIndex) => (
                                        <Pill key={tagIndex} text={tag} color="bg-gray-100 text-gray-700" />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <div className="text-center py-12">
                <div className="bg-blue-100 inline-block p-4 rounded-full mb-4">
                  <FaPlus className="text-blue-500 text-3xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhuma questão adicionada</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Este simulado ainda não possui questões. Adicione questões para que os usuários possam realizar o simulado.
                </p>
                <button
                  onClick={handleOpenAddQuestions}
                  className="inline-flex items-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                >
                  <FaPlus className="mr-2" /> Adicionar Questões
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer Navigation */}
        <div className="flex justify-between">
          <Link
            href={`/simulados/${examId}/editar`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
          >
            <FaArrowLeft className="mr-2" /> Voltar
          </Link>
          <Link
            href={`/simulados/${examId}`}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md"
          >
            <FaCheck className="mr-2" /> Concluir
          </Link>
        </div>
      </div>
      
      {/* Modal para adicionar questões */}
      {showAddQuestionsModal && (
        <Modal
          title="Adicionar Questões ao Simulado"
          isOpen={showAddQuestionsModal}
          onClose={() => setShowAddQuestionsModal(false)}
          size="xl"
        >
          <div className="py-2">
            {/* Search and Filters */}
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar questões..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="ml-3 p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  <FaFilter />
                </button>
              </div>
              
              {showFilters && (
                <div className="bg-gray-50 p-3 rounded-lg mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Disciplina
                    </label>
                    <select
                      value={disciplineFilter || ''}
                      onChange={(e) => setDisciplineFilter(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Todas as disciplinas</option>
                      {/* Opções de disciplina seriam carregadas dinamicamente */}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dificuldade
                    </label>
                    <select
                      value={difficultyFilter || ''}
                      onChange={(e) => setDifficultyFilter(e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Todas as dificuldades</option>
                      <option value="baixa">Baixa</option>
                      <option value="média">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Questão
                    </label>
                    <select
                      value={typeFilter || ''}
                      onChange={(e) => setTypeFilter(e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Todos os tipos</option>
                      <option value="multiple_choice">Múltipla Escolha</option>
                      <option value="true_false">Verdadeiro/Falso</option>
                      <option value="essay">Dissertativa</option>
                    </select>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-gray-700">
                    {filteredQuestions.length} questões encontradas
                  </span>
                </div>
                <div className="space-x-4">
                  <button
                    onClick={selectAllFilteredQuestions}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Selecionar todas
                  </button>
                  <button
                    onClick={unselectAllQuestions}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Limpar seleção
                  </button>
                </div>
              </div>
            </div>
            
            {/* Questions List */}
            <div className="max-h-96 overflow-y-auto mb-6">
              {filteredQuestions.length > 0 ? (
                <div className="space-y-3">
                  {filteredQuestions.map((question) => {
                    const isSelected = selectedQuestions.includes(question.id as number);
                    const difficultyInfo = getDifficultyLabel(question.difficulty || 'média');
                    
                    return (
                      <div 
                        key={question.id} 
                        className={`border rounded-lg overflow-hidden transition-colors duration-200 ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => toggleQuestionSelection(question.id as number)}
                      >
                        <div className="p-4 cursor-pointer">
                          <div className="flex items-start">
                            <div className={`w-5 h-5 rounded-md border flex-shrink-0 mt-1 mr-3 flex items-center justify-center ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}>
                              {isSelected && <FaCheck className="text-white text-xs" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyInfo.color}`}>
                                  {difficultyInfo.label}
                                </span>
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                  {getQuestionTypeLabel(question.question_type || 'multiple_choice')}
                                </span>
                              </div>
                              <div 
                                className="text-gray-700" 
                                dangerouslySetInnerHTML={{ __html: question.content || '' }}
                              />
                              
                              {question.tags && question.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {question.tags.map((tag, tagIndex) => (
                                    <Pill key={tagIndex} text={tag} color="bg-gray-100 text-gray-700" />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <FaSearch className="mx-auto text-gray-400 text-2xl mb-2" />
                  <p className="text-gray-600">
                    Nenhuma questão encontrada. Tente ajustar os filtros ou criar novas questões.
                  </p>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowAddQuestionsModal(false)}
                className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md mr-4 hover:bg-gray-50"
              >
                <FaTimes className="inline mr-1" /> Cancelar
              </button>
              <button
                onClick={handleAddSelectedQuestions}
                disabled={selectedQuestions.length === 0 || addingQuestions}
                className={`inline-flex items-center px-4 py-2 ${
                  selectedQuestions.length === 0 || addingQuestions
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-medium rounded-md`}
              >
                <FaPlus className="mr-2" /> 
                {addingQuestions
                  ? 'Adicionando...'
                  : `Adicionar ${selectedQuestions.length} ${selectedQuestions.length === 1 ? 'Questão' : 'Questões'}`
                }
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
} 