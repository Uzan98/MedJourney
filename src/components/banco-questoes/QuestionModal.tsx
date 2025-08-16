import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Check, Globe } from 'lucide-react';
import { Question, AnswerOption } from '@/services/questions-bank.service';
import { toast } from 'react-hot-toast';
import { Discipline, Subject } from '@/lib/supabase';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import dynamic from 'next/dynamic';

// Importar ReactQuill dinamicamente para evitar problemas de SSR
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';
import '@/styles/quill-custom.css';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (questionData: Question, answerOptions: AnswerOption[]) => Promise<boolean>;
  initialData?: Question;
  title?: string;
}

export default function QuestionModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  title = 'Adicionar Questão'
}: QuestionModalProps) {
  // Estados para os campos do formulário
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');
  const [disciplineId, setDisciplineId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<'baixa' | 'média' | 'alta'>('média');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'essay'>('multiple_choice');
  const [answerOptions, setAnswerOptions] = useState<AnswerOption[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  
  // Estados para disciplinas e assuntos
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Estado de loading
  const [isSaving, setIsSaving] = useState(false);
  
  // Chave única para persistência baseada no ID da questão
  const storageKey = `question-modal-${initialData?.id || 'new'}`;
  
  // Funções para gerenciar persistência no sessionStorage
  const saveToStorage = useCallback((data: any) => {
    try {
      const storageData = {
        ...data,
        timestamp: Date.now()
      };
      console.log('💾 Salvando no sessionStorage:', storageKey, storageData);
      sessionStorage.setItem(storageKey, JSON.stringify(storageData));
    } catch (error) {
      console.warn('❌ Erro ao salvar no sessionStorage:', error);
    }
  }, [storageKey]);
  
  const loadFromStorage = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      console.log('📂 Tentando carregar do sessionStorage:', storageKey, stored ? 'dados encontrados' : 'nenhum dado');
      
      if (stored) {
        const data = JSON.parse(stored);
        // Verificar se os dados não são muito antigos (1 hora)
        const timeDiff = Date.now() - data.timestamp;
        console.log('⏰ Idade dos dados:', timeDiff, 'ms');
        
        if (timeDiff < 60 * 60 * 1000) {
          console.log('✅ Dados válidos, retornando:', data);
          return data;
        } else {
          console.log('⚠️ Dados muito antigos, removendo');
          sessionStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.warn('❌ Erro ao carregar do sessionStorage:', error);
    }
    return null;
  }, [storageKey]);
  
  const clearStorage = useCallback(() => {
    try {
      console.log('🗑️ Limpando sessionStorage:', storageKey);
      sessionStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('❌ Erro ao limpar sessionStorage:', error);
    }
  }, [storageKey]);
  
  // Carregar dados iniciais se for edição
  useEffect(() => {
    if (!isOpen) return; // Só executar quando o modal estiver aberto
    
    if (initialData) {
      setContent(initialData.content || '');
      setExplanation(initialData.explanation || '');
      setDisciplineId(initialData.discipline_id || null);
      setSubjectId(initialData.subject_id || null);
      setDifficulty(initialData.difficulty || 'média');
      setQuestionType(initialData.question_type || 'multiple_choice');
      setTags(initialData.tags || []);
      setIsPublic(initialData.is_public || false);
      
      // Para questões de V/F e dissertativa
      setCorrectAnswer(initialData.correct_answer || '');
      
      // Para questões de múltipla escolha
      if (initialData.answer_options && initialData.answer_options.length > 0) {
        setAnswerOptions(initialData.answer_options);
      }
      
      // Carregar assuntos se uma disciplina estiver selecionada
      if (initialData.discipline_id) {
        loadSubjects(initialData.discipline_id);
      }
    } else {
      // Tentar recuperar dados salvos do sessionStorage
      const savedData = loadFromStorage();
      if (savedData) {
        console.log('📂 Carregando dados do sessionStorage:', savedData);
        console.log('📝 Content recuperado:', savedData.content, 'Length:', savedData.content?.length || 0);
        setContent(savedData.content || '');
        setExplanation(savedData.explanation || '');
        setDisciplineId(savedData.disciplineId || null);
        setSubjectId(savedData.subjectId || null);
        setDifficulty(savedData.difficulty || 'média');
        setQuestionType(savedData.questionType || 'multiple_choice');
        setAnswerOptions(savedData.answerOptions || []);
        setCorrectAnswer(savedData.correctAnswer || '');
        setTags(savedData.tags || []);
        setIsPublic(savedData.isPublic || false);
        
        // Carregar assuntos se uma disciplina estiver selecionada
        if (savedData.disciplineId) {
          loadSubjects(savedData.disciplineId);
        }
      } else {
        resetForm();
      }
    }
    
    // Carregar disciplinas
    loadDisciplines();
  }, [initialData, isOpen]); // Removido loadFromStorage das dependências
  
  // Salvar automaticamente o estado do formulário no sessionStorage
  useEffect(() => {
    if (isOpen && !initialData) { // Só salvar para novas questões
      const formData = {
        content,
        explanation,
        disciplineId,
        subjectId,
        difficulty,
        questionType,
        answerOptions,
        correctAnswer,
        tags,
        isPublic
      };
      
      // Sempre salvar os dados, mesmo se estiverem vazios
      console.log('💾 Salvando dados no sessionStorage (incluindo content):', {
        content: content,
        contentLength: content.length,
        ...formData
      });
      saveToStorage(formData);
    }
  }, [content, explanation, disciplineId, subjectId, difficulty, questionType, answerOptions, correctAnswer, tags, isPublic, isOpen, initialData, saveToStorage]);
   
   // Detectar mudança de visibilidade da página para recuperar dados perdidos
   useEffect(() => {
     const handleVisibilityChange = () => {
       console.log('Visibilidade mudou:', document.hidden ? 'oculta' : 'visível');
       
       if (!document.hidden && isOpen && !initialData) {
         // Verificar se o estado atual está vazio e tentar recuperar dados mais recentes
         const isEmpty = !content.trim() && !explanation.trim() && answerOptions.length === 0 && tags.length === 0;
         console.log('Estado atual está vazio:', isEmpty);
         
         if (isEmpty) {
           const savedData = loadFromStorage();
           console.log('Dados salvos encontrados:', savedData);
           
           if (savedData && savedData.timestamp) {
             // Aumentar o tempo para 5 minutos para teste
             const timeDiff = Date.now() - savedData.timestamp;
             console.log('Diferença de tempo:', timeDiff, 'ms');
             
             if (timeDiff < 300000) { // 5 minutos
               console.log('🔄 Recuperando dados do sessionStorage na mudança de visibilidade');
               console.log('📝 Content a ser recuperado:', savedData.content, 'Length:', savedData.content?.length || 0);
               setContent(savedData.content || '');
               setExplanation(savedData.explanation || '');
               setDisciplineId(savedData.disciplineId || null);
               setSubjectId(savedData.subjectId || null);
               setDifficulty(savedData.difficulty || 'média');
               setQuestionType(savedData.questionType || 'multiple_choice');
               setAnswerOptions(savedData.answerOptions || []);
               setCorrectAnswer(savedData.correctAnswer || '');
               setTags(savedData.tags || []);
               setIsPublic(savedData.isPublic || false);
               
               if (savedData.disciplineId) {
                 loadSubjects(savedData.disciplineId);
               }
               
               toast.success('Conteúdo recuperado automaticamente!');
             } else {
               console.log('Dados muito antigos, não recuperando');
             }
           }
         }
       }
     };
     
     document.addEventListener('visibilitychange', handleVisibilityChange);
     
     return () => {
       document.removeEventListener('visibilitychange', handleVisibilityChange);
     };
   }, [isOpen, initialData]); // Removido dependências que causam re-renders
  
  // Função para resetar o formulário
  const resetForm = () => {
    setContent('');
    setExplanation('');
    setDisciplineId(null);
    setSubjectId(null);
    setDifficulty('média');
    setQuestionType('multiple_choice');
    setAnswerOptions([]);
    setCorrectAnswer('');
    setTagInput('');
    setTags([]);
    setIsPublic(false);
    clearStorage();
  };


  
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
  
  // Função para adicionar uma nova opção de resposta
  const addAnswerOption = () => {
    const newOption: AnswerOption = {
      id: `temp-${Date.now()}`, // ID temporário
      question_id: initialData?.id || 0,
      text: '',
      is_correct: false
    };
    
    setAnswerOptions([...answerOptions, newOption]);
  };
  
  // Função para remover uma opção de resposta
  const removeAnswerOption = (id: number | string) => {
    setAnswerOptions(answerOptions.filter(option => option.id !== id));
  };
  
  // Função para atualizar uma opção de resposta
  const updateAnswerOption = (id: number | string, text: string) => {
    setAnswerOptions(
      answerOptions.map(option =>
        option.id === id ? { ...option, text } : option
      )
    );
  };
  
  // Função para definir a opção correta
  const setCorrectOption = (id: number | string) => {
    setAnswerOptions(
      answerOptions.map(option => ({
        ...option,
        is_correct: option.id === id
      }))
    );
  };
  
  // Função para adicionar uma tag
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  // Função para remover uma tag
  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // Função para lidar com a tecla Enter no campo de tag
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };
  
  // Função para lidar com a alteração de disciplina
  const handleDisciplineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : null;
    setDisciplineId(value);
    setSubjectId(null); // Resetar o assunto ao mudar a disciplina
    
    if (value) {
      loadSubjects(value);
    } else {
      setSubjects([]);
    }
  };
  
  // Função para salvar a questão
  const handleSave = async () => {
    // Validar campos obrigatórios
    if (!content.trim()) {
      toast.error('O conteúdo da questão é obrigatório');
      return;
    }
    
    if (questionType === 'multiple_choice' && answerOptions.length < 2) {
      toast.error('Adicione pelo menos duas opções de resposta');
      return;
    }
    
    if (questionType === 'multiple_choice' && !answerOptions.some(opt => opt.is_correct)) {
      toast.error('Selecione pelo menos uma opção correta');
      return;
    }
    
    if (questionType === 'true_false' && !['true', 'false'].includes(correctAnswer)) {
      toast.error('Selecione Verdadeiro ou Falso como resposta correta');
      return;
    }
    
    if (questionType === 'essay' && !correctAnswer.trim()) {
      toast.error('Informe uma resposta esperada para a questão dissertativa');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Preparar dados da questão
      const questionData: Question = {
        ...(initialData?.id ? { id: initialData.id } : {}),
        content: content.trim(),
        explanation: explanation.trim() || undefined,
        discipline_id: disciplineId || undefined,
        subject_id: subjectId || undefined,
        difficulty,
        question_type: questionType,
        tags: tags.length > 0 ? tags : undefined,
        is_public: isPublic,
      };
      
      // Adicionar resposta correta para V/F e dissertativa
      if (questionType === 'true_false' || questionType === 'essay') {
        questionData.correct_answer = correctAnswer;
      }
      
      // Opções de resposta só são relevantes para múltipla escolha
      let optionsToSave: AnswerOption[] = [];
      if (questionType === 'multiple_choice') {
        optionsToSave = answerOptions.map(option => ({
          ...option,
          question_id: initialData?.id || 0 // Será substituído pelo backend
        }));
      }
      
      const success = await onSave(questionData, optionsToSave);
      
      if (success) {
        toast.success(initialData ? 'Questão atualizada com sucesso' : 'Questão criada com sucesso');
        clearStorage(); // Limpar dados salvos após sucesso
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error('Erro ao salvar questão:', error);
      toast.error('Ocorreu um erro ao salvar a questão');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Se o modal não estiver aberto, não renderizar nada
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content with scroll */}
        <div className="overflow-y-auto p-6 max-h-[calc(90vh-120px)]">
          <form>
            {/* Conteúdo da Questão */}
            <div className="mb-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Conteúdo da Questão <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500">
                <ReactQuill
                  value={content}
                  onChange={setContent}
                  placeholder="Digite o conteúdo da questão aqui..."
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                      [{ 'font': [] }],
                      [{ 'size': ['small', false, 'large', 'huge'] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'script': 'sub'}, { 'script': 'super' }],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'indent': '-1'}, { 'indent': '+1' }],
                      [{ 'direction': 'rtl' }],
                      [{ 'align': [] }],
                      ['blockquote', 'code-block'],
                      ['link', 'image', 'video'],
                      ['clean']
                    ]
                  }}
                  formats={[
                    'header', 'font', 'size',
                    'bold', 'italic', 'underline', 'strike',
                    'color', 'background',
                    'script',
                    'list', 'bullet', 'indent',
                    'direction', 'align',
                    'blockquote', 'code-block',
                    'link', 'image', 'video'
                  ]}
                  style={{ minHeight: '120px' }}
                />
              </div>
            </div>
            
            {/* Tipo de Questão */}
            <div className="mb-6">
              <label htmlFor="questionType" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Questão
              </label>
              <select
                id="questionType"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="multiple_choice">Múltipla Escolha</option>
                <option value="true_false">Verdadeiro/Falso</option>
                <option value="essay">Dissertativa</option>
              </select>
            </div>
            
            {/* Opções para Múltipla Escolha */}
            {questionType === 'multiple_choice' && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Opções de Resposta <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addAnswerOption}
                    className="inline-flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Opção
                  </button>
                </div>
                
                <div className="space-y-3">
                  {answerOptions.length === 0 ? (
                    <div className="text-center py-3 bg-gray-50 rounded-md text-gray-500">
                      Adicione opções de resposta para a questão
                    </div>
                  ) : (
                    answerOptions.map((option, index) => (
                      <div key={String(option.id)} className="flex items-center">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => setCorrectOption(option.id!)}
                              className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${
                                option.is_correct
                                  ? 'bg-green-500 text-white'
                                  : 'border border-gray-300 text-transparent'
                              }`}
                            >
                              {option.is_correct && <Check className="h-3 w-3" />}
                            </button>
                            <input
                              value={option.text}
                              onChange={(e) => updateAnswerOption(option.id!, e.target.value)}
                              placeholder={`Opção ${index + 1}`}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAnswerOption(option.id!)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {/* Opções para Verdadeiro/Falso */}
            {questionType === 'true_false' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resposta Correta <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="true"
                      checked={correctAnswer === 'true'}
                      onChange={() => setCorrectAnswer('true')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">Verdadeiro</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="false"
                      checked={correctAnswer === 'false'}
                      onChange={() => setCorrectAnswer('false')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">Falso</span>
                  </label>
                </div>
              </div>
            )}
            
            {/* Resposta Esperada para Dissertativa */}
            {questionType === 'essay' && (
              <div className="mb-6">
                <label htmlFor="correctAnswer" className="block text-sm font-medium text-gray-700 mb-1">
                  Resposta Esperada <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="correctAnswer"
                  rows={3}
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite a resposta esperada aqui..."
                />
              </div>
            )}
            
            {/* Explicação */}
            <div className="mb-6">
              <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-1">
                Explicação
              </label>
              <div className="border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500">
                <ReactQuill
                  value={explanation}
                  onChange={setExplanation}
                  placeholder="Explicação opcional sobre a resposta correta..."
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                      [{ 'font': [] }],
                      [{ 'size': ['small', false, 'large', 'huge'] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'color': [] }, { 'background': [] }],
                      [{ 'script': 'sub'}, { 'script': 'super' }],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'indent': '-1'}, { 'indent': '+1' }],
                      [{ 'direction': 'rtl' }],
                      [{ 'align': [] }],
                      ['blockquote', 'code-block'],
                      ['link', 'image', 'video'],
                      ['clean']
                    ]
                  }}
                  formats={[
                    'header', 'font', 'size',
                    'bold', 'italic', 'underline', 'strike',
                    'color', 'background',
                    'script',
                    'list', 'bullet', 'indent',
                    'direction', 'align',
                    'blockquote', 'code-block',
                    'link', 'image', 'video'
                  ]}
                  style={{ minHeight: '100px' }}
                />
              </div>
            </div>
            
            {/* Grid de Seleções */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Disciplina */}
              <div>
                <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 mb-1">
                  Disciplina
                </label>
                <select
                  id="discipline"
                  value={disciplineId || ''}
                  onChange={handleDisciplineChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma disciplina</option>
                  {disciplines.map(discipline => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Assunto */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Assunto
                </label>
                <select
                  id="subject"
                  value={subjectId || ''}
                  onChange={(e) => setSubjectId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              
              {/* Dificuldade */}
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  Dificuldade
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="baixa">Baixa</option>
                  <option value="média">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>
            
            {/* Checkbox para tornar a questão pública */}
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                />
                <span className="ml-2 flex items-center text-gray-700">
                  <Globe className="h-4 w-4 mr-1.5 text-blue-500" />
                  Adicionar ao Genoma Bank (compartilhar esta questão publicamente)
                </span>
              </label>
              {isPublic && (
                <p className="mt-1 text-sm text-gray-500 pl-6">
                  Esta questão será visível para todos os usuários no Genoma Bank.
                </p>
              )}
            </div>
            
            {/* Tags */}
            <div className="mb-6">
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex">
                <input
                  id="tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Adicione tags para categorizar a questão..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Adicionar
                </button>
              </div>
              
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>
        
        {/* Footer */}
         <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`px-4 py-2 rounded-md text-white ${
                isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : initialData ? 'Atualizar' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
