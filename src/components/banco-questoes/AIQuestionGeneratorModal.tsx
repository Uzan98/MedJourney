import React, { useState, useEffect } from 'react';
import { X, Wand2, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AIQuestionGeneratorParams, AIQuestionGeneratorService } from '@/services/ai-question-generator.service';
import { Question, AnswerOption, QuestionsBankService } from '@/services/questions-bank.service';
import { Discipline, Subject } from '@/lib/supabase';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import QuestionModal from './QuestionModal';

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
  
  // Estados para disciplinas e assuntos
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Estados para controle do fluxo
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestion, setGeneratedQuestion] = useState<Question | null>(null);
  const [generatedOptions, setGeneratedOptions] = useState<AnswerOption[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  
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
          subject_id: subjectId || undefined
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Wand2 className="h-5 w-5 mr-2 text-purple-500" />
            Gerar Questão com IA
          </h3>
          <button 
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Corpo do modal */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <p className="text-gray-600 mb-6">
            Selecione os parâmetros para gerar uma questão usando inteligência artificial. A questão será criada com base nas informações fornecidas.
          </p>
          
          <div className="space-y-4">
            {/* Disciplina */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disciplina
              </label>
              <select
                value={disciplineId || ''}
                onChange={handleDisciplineChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assunto
              </label>
              <select
                value={subjectId || ''}
                onChange={handleSubjectChange}
                disabled={!disciplineId}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dificuldade
              </label>
              <div className="flex space-x-4">
                {['baixa', 'média', 'alta'].map((level) => (
                  <label key={level} className="flex items-center">
                    <input
                      type="radio"
                      name="difficulty"
                      value={level}
                      checked={difficulty === level}
                      onChange={() => setDifficulty(level as 'baixa' | 'média' | 'alta')}
                      className="mr-2"
                    />
                    <span className="text-gray-700 capitalize">{level}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Tipo de questão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de questão
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="questionType"
                    value="multiple_choice"
                    checked={questionType === 'multiple_choice'}
                    onChange={() => setQuestionType('multiple_choice')}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Múltipla escolha</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="questionType"
                    value="true_false"
                    checked={questionType === 'true_false'}
                    onChange={() => setQuestionType('true_false')}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Verdadeiro/Falso</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="questionType"
                    value="essay"
                    checked={questionType === 'essay'}
                    onChange={() => setQuestionType('essay')}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Dissertativa</span>
                </label>
              </div>
            </div>
            
            {/* Contexto adicional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contexto adicional (opcional)
              </label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Forneça detalhes específicos ou tópicos para a questão..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              />
            </div>
          </div>
        </div>
        
        {/* Rodapé com botões */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button 
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 mr-2"
          >
            Cancelar
          </button>
          <button 
            onClick={handleGenerateQuestion}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-md text-white flex items-center ${
              isGenerating ? 'bg-purple-400' : 'bg-purple-600 hover:bg-purple-700'
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