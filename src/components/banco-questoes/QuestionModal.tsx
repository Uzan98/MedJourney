import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Question, AnswerOption, QuestionsBankService } from '@/services/questions-bank.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline, Subject } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { 
  X,
  Plus,
  Trash,
  Check,
  BookOpen,
  FileText,
  Tag,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  question: Question | null;
  disciplines: Discipline[];
  isViewMode?: boolean;
}

const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  question,
  disciplines,
  isViewMode = false
}) => {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Estados para os campos da questão
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');
  const [disciplineId, setDisciplineId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'baixa' | 'média' | 'alta'>('média');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'essay'>('multiple_choice');
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  // Carregar assuntos quando a disciplina mudar
  useEffect(() => {
    if (disciplineId) {
      loadSubjects(parseInt(disciplineId));
    }
  }, [disciplineId]);
  
  // Inicializar o formulário quando a questão mudar
  useEffect(() => {
    if (question) {
      setContent(question.content || '');
      setExplanation(question.explanation || '');
      setDisciplineId(question.discipline_id?.toString() || '');
      setSubjectId(question.subject_id?.toString() || '');
      setDifficulty(question.difficulty || 'média');
      setQuestionType(question.question_type || 'multiple_choice');
      setAnswerOptions(question.answer_options || []);
      setCorrectAnswer(question.correct_answer || '');
      setTags(question.tags || []);
      
      // Carregar assuntos se houver uma disciplina selecionada
      if (question.discipline_id) {
        loadSubjects(question.discipline_id);
      }
    } else {
      // Valores padrão para nova questão
      resetForm();
    }
  }, [question]);
  
  // Função para resetar o formulário
  const resetForm = () => {
    setContent('');
    setExplanation('');
    setDisciplineId('');
    setSubjectId('');
    setDifficulty('média');
    setQuestionType('multiple_choice');
    setAnswerOptions([
      { id: uuidv4(), text: '', is_correct: false },
      { id: uuidv4(), text: '', is_correct: false },
      { id: uuidv4(), text: '', is_correct: false },
      { id: uuidv4(), text: '', is_correct: false }
    ]);
    setCorrectAnswer('');
    setTagInput('');
    setTags([]);
  };
  
  // Função para carregar assuntos
  const loadSubjects = async (disciplineId: number) => {
    try {
      const subjectsData = await DisciplinesRestService.getSubjects(disciplineId);
      setSubjects(subjectsData || []);
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error);
      toast.error('Não foi possível carregar os assuntos');
    }
  };
  
  // Função para adicionar opção de resposta
  const addAnswerOption = () => {
    setAnswerOptions([
      ...answerOptions,
      { id: uuidv4(), text: '', is_correct: false }
    ]);
  };
  
  // Função para remover opção de resposta
  const removeAnswerOption = (id: string) => {
    setAnswerOptions(answerOptions.filter(option => option.id !== id));
  };
  
  // Função para atualizar opção de resposta
  const updateAnswerOption = (id: string, text: string, is_correct: boolean) => {
    setAnswerOptions(answerOptions.map(option => 
      option.id === id ? { ...option, text, is_correct } : option
    ));
  };
  
  // Função para marcar opção como correta (múltipla escolha)
  const setCorrectOption = (id: string) => {
    setAnswerOptions(answerOptions.map(option => ({
      ...option,
      is_correct: option.id === id
    })));
  };
  
  // Função para adicionar tag
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  // Função para remover tag
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // Função para salvar a questão
  const handleSave = async () => {
    // Validação dos campos
    if (!content.trim()) {
      toast.error('O conteúdo da questão é obrigatório');
      return;
    }
    
    if (!disciplineId) {
      toast.error('Selecione uma disciplina');
      return;
    }
    
    if (questionType === 'multiple_choice') {
      const validOptions = answerOptions.filter(option => option.text.trim() !== '');
      if (validOptions.length < 2) {
        toast.error('Adicione pelo menos duas opções de resposta');
        return;
      }
      
      const hasCorrectOption = answerOptions.some(option => option.is_correct);
      if (!hasCorrectOption) {
        toast.error('Selecione a opção correta');
        return;
      }
    } else if (questionType === 'true_false') {
      if (!correctAnswer) {
        toast.error('Selecione a resposta correta');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      // Obter o ID do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Usuário não autenticado');
        setLoading(false);
        return;
      }
      
      // Preparar dados da questão
      const questionData: Omit<Question, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        discipline_id: disciplineId ? parseInt(disciplineId) : undefined,
        subject_id: subjectId ? parseInt(subjectId) : undefined,
        content,
        explanation,
        difficulty,
        question_type: questionType,
        tags
      };
      
      // Adicionar dados específicos para cada tipo de questão
      if (questionType === 'multiple_choice') {
        questionData.answer_options = answerOptions.filter(option => option.text.trim() !== '');
      } else if (questionType === 'true_false') {
        questionData.correct_answer = correctAnswer;
      } else if (questionType === 'essay') {
        questionData.correct_answer = correctAnswer;
      }
      
      let result: Question | null;
      
      if (question && question.id) {
        // Atualizar questão existente
        result = await QuestionsBankService.updateQuestion(question.id, questionData);
        if (result) {
          toast.success('Questão atualizada com sucesso');
        }
      } else {
        // Criar nova questão
        result = await QuestionsBankService.createQuestion(questionData);
        if (result) {
          toast.success('Questão criada com sucesso');
        }
      }
      
      if (result) {
        onSave();
      } else {
        toast.error('Ocorreu um erro ao salvar a questão');
      }
    } catch (error) {
      console.error('Erro ao salvar questão:', error);
      toast.error('Ocorreu um erro ao salvar a questão');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={isViewMode ? onClose : undefined}></div>
        
        {/* Modal */}
        <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              {isViewMode ? 'Visualizar Questão' : question ? 'Editar Questão' : 'Nova Questão'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Body */}
          <div className="mt-4">
            <div className="space-y-4">
              {/* Conteúdo da questão */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  Conteúdo da questão <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isViewMode}
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite o enunciado da questão..."
                ></textarea>
              </div>
              
              {/* Disciplina e assunto */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="discipline" className="block text-sm font-medium text-gray-700">
                    Disciplina <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1">
                    <select
                      id="discipline"
                      value={disciplineId}
                      onChange={(e) => setDisciplineId(e.target.value)}
                      disabled={isViewMode}
                      className="block w-full py-2 pl-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecione uma disciplina</option>
                      {disciplines.map(discipline => (
                        <option key={discipline.id} value={discipline.id}>
                          {discipline.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <BookOpen className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                    Assunto
                  </label>
                  <div className="relative mt-1">
                    <select
                      id="subject"
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      disabled={isViewMode || !disciplineId || subjects.length === 0}
                      className="block w-full py-2 pl-3 pr-10 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecione um assunto</option>
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.title || subject.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tipo de questão e dificuldade */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="questionType" className="block text-sm font-medium text-gray-700">
                    Tipo de questão <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="questionType"
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as any)}
                    disabled={isViewMode}
                    className="block w-full py-2 pl-3 pr-10 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="multiple_choice">Múltipla Escolha</option>
                    <option value="true_false">Verdadeiro/Falso</option>
                    <option value="essay">Dissertativa</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                    Dificuldade <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    disabled={isViewMode}
                    className="block w-full py-2 pl-3 pr-10 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="média">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>
              
              {/* Opções de resposta para múltipla escolha */}
              {questionType === 'multiple_choice' && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Opções de resposta <span className="text-red-500">*</span>
                    </label>
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={addAnswerOption}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar opção
                      </button>
                    )}
                  </div>
                  
                  <div className="mt-2 space-y-2">
                    {answerOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`option-${option.id}`}
                          checked={option.is_correct}
                          onChange={() => setCorrectOption(option.id)}
                          disabled={isViewMode}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateAnswerOption(option.id, e.target.value, option.is_correct)}
                          disabled={isViewMode}
                          className="flex-grow block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Digite a opção de resposta..."
                        />
                        {!isViewMode && (
                          <button
                            type="button"
                            onClick={() => removeAnswerOption(option.id)}
                            className="p-2 text-red-500 hover:text-red-700"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Opção para verdadeiro/falso */}
              {questionType === 'true_false' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Resposta correta <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center mt-2 space-x-6">
                    <div className="flex items-center">
                      <input
                        id="true-option"
                        type="radio"
                        value="verdadeiro"
                        checked={correctAnswer === 'verdadeiro'}
                        onChange={() => setCorrectAnswer('verdadeiro')}
                        disabled={isViewMode}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="true-option" className="ml-2 text-sm font-medium text-gray-700">
                        Verdadeiro
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="false-option"
                        type="radio"
                        value="falso"
                        checked={correctAnswer === 'falso'}
                        onChange={() => setCorrectAnswer('falso')}
                        disabled={isViewMode}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <label htmlFor="false-option" className="ml-2 text-sm font-medium text-gray-700">
                        Falso
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Resposta para dissertativa */}
              {questionType === 'essay' && (
                <div>
                  <label htmlFor="essay-answer" className="block text-sm font-medium text-gray-700">
                    Resposta esperada
                  </label>
                  <textarea
                    id="essay-answer"
                    rows={3}
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    disabled={isViewMode}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Digite a resposta esperada (opcional)..."
                  ></textarea>
                </div>
              )}
              
              {/* Explicação */}
              <div>
                <label htmlFor="explanation" className="block text-sm font-medium text-gray-700">
                  Explicação
                </label>
                <textarea
                  id="explanation"
                  rows={3}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  disabled={isViewMode}
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite uma explicação para esta questão (opcional)..."
                ></textarea>
              </div>
              
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tags
                </label>
                {!isViewMode && (
                  <div className="flex mt-1">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-grow block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Adicionar tag..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-r-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-sm font-medium bg-blue-100 rounded-full text-blue-800"
                    >
                      {tag}
                      {!isViewMode && (
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="flex-shrink-0 ml-1 text-blue-500 hover:text-blue-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-sm text-gray-500">Nenhuma tag adicionada</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 mr-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isViewMode ? 'Fechar' : 'Cancelar'}
            </button>
            
            {!isViewMode && (
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? (
                  <>
                    <svg className="w-5 h-5 mr-2 -ml-1 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2 -ml-1" />
                    Salvar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionModal; 