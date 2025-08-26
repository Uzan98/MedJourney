import React, { useState, useEffect } from 'react';
import { X, Wand2, Loader2, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AIQuestionGeneratorParams, AIQuestionGeneratorService } from '@/services/ai-question-generator.service';
import { Question, AnswerOption, QuestionsBankService } from '@/services/questions-bank.service';
import { Discipline, Subject } from '@/lib/supabase';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import QuestionModal from './QuestionModal';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface AIQuestionGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionCreated: () => void;
}

export default function AIQuestionGeneratorModal({
  isOpen,
  onClose,
  onQuestionCreated
}: AIQuestionGeneratorModalProps) {
  // Estados para os campos do formulário
  const [disciplineId, setDisciplineId] = useState<number | null>(null);
  const [disciplineName, setDisciplineName] = useState<string>('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [subjectName, setSubjectName] = useState<string>('');
  const [difficulty, setDifficulty] = useState<'baixa' | 'média' | 'alta'>('média');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'essay'>('multiple_choice');
  const [additionalContext, setAdditionalContext] = useState<string>('');
  const [isPublic, setIsPublic] = useState<boolean>(false);
  
  // Estados para disciplinas e assuntos
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Estados para controle do fluxo
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestion, setGeneratedQuestion] = useState<Question | null>(null);
  const [generatedOptions, setGeneratedOptions] = useState<AnswerOption[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  
  const { hasReachedLimit, refreshLimits, isProOrHigher, showUpgradeModal } = useSubscription();
  const limiteAtingido = hasReachedLimit('questions_per_day');
  const hasAIAccess = isProOrHigher();

  useEffect(() => {
    if (limiteAtingido && isOpen) {
      toast.error('Você atingiu o limite diário de questões!');
    }
    if (!hasAIAccess && isOpen) {
      toast.error('Geração de questões por IA é exclusiva para planos Pro e Pro+!');
    }
  }, [limiteAtingido, hasAIAccess, isOpen]);
  
  // Carregar disciplinas ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadDisciplines();
    }
  }, [isOpen]);
  
  // Carregar disciplinas
  const loadDisciplines = async () => {
    try {
      const data = await DisciplinesRestService.getDisciplines(true);
      if (data && data.length > 0) {
        setDisciplines(data);
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast.error('Erro ao carregar disciplinas');
    }
  };
  
  // Carregar assuntos com base na disciplina selecionada
  const loadSubjects = async (disciplineId: number) => {
    try {
      const data = await DisciplinesRestService.getSubjects(disciplineId);
      if (data && data.length > 0) {
        setSubjects(data);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error);
      toast.error('Erro ao carregar assuntos');
      setSubjects([]);
    }
  };
  
  // Função para lidar com a alteração de disciplina
  const handleDisciplineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : null;
    setDisciplineId(value);
    setSubjectId(null); // Resetar o assunto ao mudar a disciplina
    
    if (value) {
      const selected = disciplines.find(d => d.id === value);
      setDisciplineName(selected?.name || '');
      loadSubjects(value);
    } else {
      setDisciplineName('');
      setSubjects([]);
    }
  };
  
  // Função para lidar com a alteração de assunto
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : null;
    setSubjectId(value);
    
    if (value) {
      const selected = subjects.find(s => s.id === value);
      setSubjectName(selected?.name || '');
    } else {
      setSubjectName('');
    }
  };
  
  // Função para gerar questão com IA
  const handleGenerateQuestion = async () => {
    if (!hasAIAccess) {
      showUpgradeModal('PRO', 'geração de questões por IA');
      return;
    }
    
    if (limiteAtingido) {
      toast.error('Você atingiu o limite diário de questões!');
      onClose();
      return;
    }
    setIsGenerating(true);
    
    try {
      const params: AIQuestionGeneratorParams = {
        discipline: disciplineName,
        subject: subjectName,
        difficulty,
        questionType,
        additionalContext: additionalContext.trim() || undefined
      };
      
      const result = await AIQuestionGeneratorService.generateQuestion(params);
      
      if (result) {
        // Adicionar IDs de disciplina e assunto ao objeto de questão
        const questionWithIds: Question = {
          ...result.question,
          discipline_id: disciplineId || undefined,
          subject_id: subjectId || undefined,
          is_public: isPublic
        };
        
        // Para questões de múltipla escolha, adicionar as opções de resposta
        if (result.answerOptions) {
          questionWithIds.answer_options = result.answerOptions;
        }
        
        setGeneratedQuestion(questionWithIds);
        setGeneratedOptions(result.answerOptions || []);
        
        setShowQuestionModal(true);
        toast.success('Questão gerada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao gerar questão:', error);
      toast.error('Ocorreu um erro ao gerar a questão. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Função para salvar a questão gerada
  const handleSaveQuestion = async (questionData: Question, answerOptions: AnswerOption[]): Promise<boolean> => {
    try {
      // Usar o serviço para salvar a questão
      const result = await QuestionsBankService.createQuestion(questionData, answerOptions);
      
      if (result) {
        await refreshLimits(); // Atualiza os limites imediatamente após adicionar
        toast.success('Questão adicionada com sucesso!');
        onQuestionCreated();
        setShowQuestionModal(false);
        onClose();
        return true;
      } else {
        toast.error('Erro ao salvar questão.');
        return false;
      }
    } catch (error) {
      console.error('Erro ao salvar questão:', error);
      toast.error('Ocorreu um erro ao salvar a questão.');
      return false;
    }
  };
  
  // Resetar o estado ao fechar o modal
  const handleClose = () => {
    setGeneratedQuestion(null);
    setGeneratedOptions([]);
    setShowQuestionModal(false);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4 pb-20 sm:pb-4 pt-4 sm:pt-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[75vh] sm:max-h-[85vh] my-2 sm:my-8 flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center">
            <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-500" />
            <span className="hidden sm:inline">Gerar Questão com IA</span>
            <span className="sm:hidden">Gerar com IA</span>
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 sm:p-1 rounded-full hover:bg-gray-100 touch-manipulation"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Corpo do modal */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {!hasAIAccess && (
            <div className="mb-4 p-3 sm:p-4 bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 mr-2" />
                <h4 className="font-semibold text-purple-800 text-sm sm:text-base">Recurso Premium</h4>
              </div>
              <p className="text-purple-700 text-xs sm:text-sm mb-3">
                A geração de questões por IA é exclusiva para usuários dos planos Pro e Pro+.
              </p>
              <button
                onClick={() => showUpgradeModal('PRO', 'geração de questões por IA')}
                className="px-3 py-2 sm:px-4 bg-purple-600 text-white text-xs sm:text-sm rounded-md hover:bg-purple-700 transition-colors touch-manipulation"
              >
                Ver Planos
              </button>
            </div>
          )}
          
          {limiteAtingido && hasAIAccess && (
            <div className="mb-4 p-3 bg-amber-100 border-l-4 border-amber-500 text-amber-800 rounded">
              Você atingiu o limite diário de questões. Faça upgrade para continuar criando questões!
            </div>
          )}
          <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
            Selecione os parâmetros para gerar uma questão usando inteligência artificial.
          </p>
          
          <div className="space-y-3 sm:space-y-4">
            {/* Disciplina */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Disciplina
              </label>
              <select
                value={disciplineId || ''}
                onChange={handleDisciplineChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
              >
                <option value="">Selecione uma disciplina</option>
                {disciplines.map((discipline) => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Assunto */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Assunto
              </label>
              <select
                value={subjectId || ''}
                onChange={handleSubjectChange}
                disabled={!disciplineId}
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 touch-manipulation"
              >
                <option value="">Selecione um assunto</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {!disciplineId && (
                <p className="text-xs text-gray-500 mt-1">Selecione uma disciplina primeiro</p>
              )}
            </div>
            
            {/* Dificuldade */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Dificuldade
              </label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                {['baixa', 'média', 'alta'].map((level) => (
                  <label key={level} className="flex items-center touch-manipulation">
                    <input
                      type="radio"
                      name="difficulty"
                      value={level}
                      checked={difficulty === level}
                      onChange={() => setDifficulty(level as 'baixa' | 'média' | 'alta')}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700 capitalize">{level}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Tipo de questão */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Tipo de questão
              </label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <label className="flex items-center touch-manipulation">
                  <input
                    type="radio"
                    name="questionType"
                    value="multiple_choice"
                    checked={questionType === 'multiple_choice'}
                    onChange={() => setQuestionType('multiple_choice')}
                    className="mr-2 h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Múltipla escolha</span>
                </label>
                <label className="flex items-center touch-manipulation">
                  <input
                    type="radio"
                    name="questionType"
                    value="true_false"
                    checked={questionType === 'true_false'}
                    onChange={() => setQuestionType('true_false')}
                    className="mr-2 h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Verdadeiro/Falso</span>
                </label>
                <label className="flex items-center touch-manipulation">
                  <input
                    type="radio"
                    name="questionType"
                    value="essay"
                    checked={questionType === 'essay'}
                    onChange={() => setQuestionType('essay')}
                    className="mr-2 h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">Dissertativa</span>
                </label>
              </div>
            </div>
            
            {/* Checkbox para tornar a questão pública */}
            <div>
              <label className="flex items-start touch-manipulation">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 mt-0.5 text-purple-600 focus:ring-purple-500 rounded"
                />
                <span className="ml-2 flex items-start text-xs sm:text-sm text-gray-700">
                  <Globe className="h-4 w-4 mr-1.5 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>Adicionar ao Genoma Bank (compartilhar esta questão publicamente)</span>
                </span>
              </label>
              {isPublic && (
                <p className="mt-1 text-xs sm:text-sm text-gray-500 pl-6">
                  Esta questão será visível para todos os usuários no Genoma Bank.
                </p>
              )}
            </div>
            
            {/* Contexto adicional */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Contexto adicional (opcional)
              </label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Forneça detalhes específicos ou tópicos para a questão..."
                className="w-full border border-gray-300 rounded-md px-3 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] touch-manipulation"
                rows={3}
              />
            </div>
          </div>
        </div>
        
        {/* Rodapé com botões */}
        <div className="p-3 sm:p-4 border-t bg-gray-50 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
          <button 
            onClick={handleClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors touch-manipulation"
          >
            Cancelar
          </button>
          <button 
            onClick={handleGenerateQuestion}
            disabled={isGenerating || limiteAtingido || !hasAIAccess}
            className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm rounded-md text-white flex items-center justify-center transition-colors touch-manipulation ${
              isGenerating || limiteAtingido || !hasAIAccess ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Gerar Questão
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Modal de visualização/edição da questão gerada */}
      {showQuestionModal && generatedQuestion && (
        <QuestionModal
          isOpen={showQuestionModal}
          onClose={() => setShowQuestionModal(false)}
          onSave={handleSaveQuestion}
          title="Revisar e Salvar Questão Gerada"
          initialData={generatedQuestion}
        />
      )}
    </div>
  );
}
