"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionsBankService, Question, AnswerOption } from '@/services/questions-bank.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline, Subject } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Save, 
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle,
  X
} from 'lucide-react';

export default function EditarQuestaoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = params;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Estados do formulário
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');
  const [disciplineId, setDisciplineId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<'baixa' | 'média' | 'alta'>('média');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'essay'>('multiple_choice');
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  
  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Carregar dados da questão do banco de dados
        const questionData = await QuestionsBankService.getQuestionById(parseInt(id));
        
        if (!questionData) {
          toast.error('Questão não encontrada');
          router.push('/banco-questoes');
          return;
        }
        
        setQuestion(questionData);
        
        // Preencher o formulário com os dados da questão
        setContent(questionData.content || '');
        setExplanation(questionData.explanation || '');
        setDisciplineId(questionData.discipline_id || null);
        setDifficulty(questionData.difficulty || 'média');
        setQuestionType(questionData.question_type || 'multiple_choice');
        setTags(questionData.tags || []);
        
        if (questionData.question_type === 'true_false' || questionData.question_type === 'essay') {
          setCorrectAnswer(questionData.correct_answer || '');
        }
        
        // Carregar opções de resposta para questões de múltipla escolha
        if (questionData.question_type === 'multiple_choice') {
          const options = await QuestionsBankService.getAnswerOptions(parseInt(id));
          setAnswerOptions(options);
        }
        
        // Carregar disciplinas
        const disciplinesData = await DisciplinesRestService.getDisciplines(true);
        setDisciplines(disciplinesData || []);
        
        // Carregar assuntos se uma disciplina estiver selecionada
        if (questionData.discipline_id) {
          await loadSubjects(questionData.discipline_id);
          setSubjectId(questionData.subject_id || null);
        }
        
        toast.success('Questão carregada para edição');
      } catch (error) {
        console.error('Erro ao carregar questão:', error);
        toast.error('Erro ao carregar dados da questão');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, router]);
  
  // Carregar assuntos quando a disciplina mudar
  useEffect(() => {
    if (disciplineId) {
      loadSubjects(disciplineId);
    } else {
      setSubjects([]);
      setSubjectId(null);
    }
  }, [disciplineId]);
  
  // Função para carregar assuntos
  const loadSubjects = async (disciplineId: number) => {
    try {
      const subjectsData = await DisciplinesRestService.getSubjects(disciplineId);
      setSubjects(subjectsData || []);
    } catch (error) {
      console.error('Erro ao carregar assuntos:', error);
    }
  };
  
  // Adicionar opção de resposta
  const addAnswerOption = () => {
    setAnswerOptions([
      ...answerOptions,
      { question_id: parseInt(id), text: '', is_correct: false }
    ]);
  };
  
  // Remover opção de resposta
  const removeAnswerOption = (index: number) => {
    if (answerOptions.length > 2) {
      setAnswerOptions(answerOptions.filter((_, i) => i !== index));
    } else {
      toast.error('A questão deve ter pelo menos 2 opções');
    }
  };
  
  // Atualizar opção de resposta
  const updateAnswerOption = (index: number, text: string) => {
    setAnswerOptions(answerOptions.map((option, i) => 
      i === index ? { ...option, text } : option
    ));
  };
  
  // Definir opção correta
  const setCorrectOption = (index: number) => {
    setAnswerOptions(answerOptions.map((option, i) => ({
      ...option,
      is_correct: i === index
    })));
  };
  
  // Adicionar tag
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  // Remover tag
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // Salvar alterações
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos
    if (!content.trim()) {
      toast.error('O conteúdo da questão é obrigatório');
      return;
    }
    
    if (!disciplineId) {
      toast.error('Selecione uma disciplina');
      return;
    }
    
    if (questionType === 'multiple_choice') {
      // Verificar se há pelo menos uma opção correta
      const hasCorrectOption = answerOptions.some(option => option.is_correct);
      if (!hasCorrectOption) {
        toast.error('Selecione pelo menos uma opção correta');
        return;
      }
      
      // Verificar se todas as opções têm texto
      const emptyOptions = answerOptions.some(option => !option.text.trim());
      if (emptyOptions) {
        toast.error('Todas as opções devem ter um texto');
        return;
      }
    }
    
    if (questionType === 'true_false' && !correctAnswer) {
      toast.error('Selecione se a afirmação é verdadeira ou falsa');
      return;
    }
    
    setSaving(true);
    
    try {
      // Montar objeto com dados atualizados
      const updatedQuestion: Question = {
        ...question,
        content,
        explanation,
        discipline_id: disciplineId ? disciplineId : undefined,
        subject_id: subjectId ? subjectId : undefined,
        difficulty,
        question_type: questionType,
        tags,
      };
      
      if (questionType === 'true_false' || questionType === 'essay') {
        updatedQuestion.correct_answer = correctAnswer;
      }
      
      // Atualizar a questão no banco de dados
      const success = await QuestionsBankService.updateQuestion(parseInt(id), updatedQuestion, answerOptions);
      
      if (success) {
        toast.success('Questão atualizada com sucesso');
        router.push(`/banco-questoes/questao/${id}`);
      } else {
        toast.error('Erro ao atualizar questão');
      }
    } catch (error) {
      console.error('Erro ao atualizar questão:', error);
      toast.error('Ocorreu um erro ao salvar as alterações');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-md">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-500 border-t-transparent mb-3"></div>
          <p className="text-gray-600 font-medium">Carregando questão...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href={`/banco-questoes/questao/${id}`}
          className="text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar para Detalhes da Questão
        </Link>
      </div>
      
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Questão</h1>
        
        <form onSubmit={handleSave}>
          <div className="space-y-6">
            {/* Tipo de questão */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Questão <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  onClick={() => setQuestionType('multiple_choice')}
                  className={`p-4 border rounded-xl cursor-pointer ${
                    questionType === 'multiple_choice'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="question_type"
                    checked={questionType === 'multiple_choice'}
                    onChange={() => setQuestionType('multiple_choice')}
                    className="mr-2"
                  />
                  <span>Múltipla Escolha</span>
                </div>
                
                <div 
                  onClick={() => setQuestionType('true_false')}
                  className={`p-4 border rounded-xl cursor-pointer ${
                    questionType === 'true_false'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="question_type"
                    checked={questionType === 'true_false'}
                    onChange={() => setQuestionType('true_false')}
                    className="mr-2"
                  />
                  <span>Verdadeiro/Falso</span>
                </div>
                
                <div 
                  onClick={() => setQuestionType('essay')}
                  className={`p-4 border rounded-xl cursor-pointer ${
                    questionType === 'essay'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="question_type"
                    checked={questionType === 'essay'}
                    onChange={() => setQuestionType('essay')}
                    className="mr-2"
                  />
                  <span>Dissertativa</span>
                </div>
              </div>
            </div>
            
            {/* Conteúdo da questão */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Conteúdo da Questão <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite o enunciado da questão..."
                required
              ></textarea>
            </div>
            
            {/* Opções para múltipla escolha */}
            {questionType === 'multiple_choice' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Opções de Resposta <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addAnswerOption}
                    className="text-sm flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar opção
                  </button>
                </div>
                
                <div className="space-y-3">
                  {answerOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setCorrectOption(index)}
                        className={`p-2 rounded-md ${
                          option.is_correct 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateAnswerOption(index, e.target.value)}
                        className="flex-grow px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Opção ${index + 1}`}
                      />
                      
                      {answerOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeAnswerOption(index)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Opções para verdadeiro/falso */}
            {questionType === 'true_false' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resposta Correta <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-4">
                  <div 
                    onClick={() => setCorrectAnswer('true')}
                    className={`px-4 py-3 border rounded-xl cursor-pointer flex items-center ${
                      correctAnswer === 'true'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="true_false"
                      checked={correctAnswer === 'true'}
                      onChange={() => setCorrectAnswer('true')}
                      className="mr-2"
                    />
                    <span>Verdadeiro</span>
                  </div>
                  
                  <div 
                    onClick={() => setCorrectAnswer('false')}
                    className={`px-4 py-3 border rounded-xl cursor-pointer flex items-center ${
                      correctAnswer === 'false'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="true_false"
                      checked={correctAnswer === 'false'}
                      onChange={() => setCorrectAnswer('false')}
                      className="mr-2"
                    />
                    <span>Falso</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Resposta esperada para dissertativa */}
            {questionType === 'essay' && (
              <div>
                <label htmlFor="correctAnswer" className="block text-sm font-medium text-gray-700 mb-2">
                  Resposta Esperada
                </label>
                <textarea
                  id="correctAnswer"
                  rows={3}
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite uma resposta modelo para esta questão dissertativa..."
                ></textarea>
              </div>
            )}
            
            {/* Disciplina e Assunto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 mb-2">
                  Disciplina <span className="text-red-500">*</span>
                </label>
                <select
                  id="discipline"
                  value={disciplineId?.toString() || ''}
                  onChange={(e) => setDisciplineId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Selecione uma disciplina</option>
                  {disciplines.map(discipline => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Assunto
                </label>
                <select
                  id="subject"
                  value={subjectId?.toString() || ''}
                  onChange={(e) => setSubjectId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!disciplineId || subjects.length === 0}
                >
                  <option value="">Selecione um assunto</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.title || subject.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Dificuldade */}
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
                Dificuldade <span className="text-red-500">*</span>
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'baixa' | 'média' | 'alta')}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="baixa">Baixa</option>
                <option value="média">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            
            {/* Explicação */}
            <div>
              <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-2">
                Explicação
              </label>
              <textarea
                id="explanation"
                rows={3}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Explique a resposta correta..."
              ></textarea>
            </div>
            
            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-grow px-4 py-3 border border-gray-200 rounded-l-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite uma tag e pressione Enter"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-3 bg-blue-600 text-white rounded-r-xl hover:bg-blue-700"
                >
                  Adicionar
                </button>
              </div>
              
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <div key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center">
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Botões de ação */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
            <Link
              href={`/banco-questoes/questao/${id}`}
              className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 mr-3"
            >
              Cancelar
            </Link>
            
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 