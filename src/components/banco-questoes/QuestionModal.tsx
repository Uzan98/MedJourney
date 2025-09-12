import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Check, Globe, Upload, Image as ImageIcon } from 'lucide-react';
import { Question, AnswerOption, QuestionImage } from '@/services/questions-bank.service';
import { QuestionImageUploadService } from '@/services/question-image-upload.service';
import { toast } from 'react-hot-toast';
import { Discipline, Subject } from '@/lib/supabase';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import dynamic from 'next/dynamic';

// Importar ReactQuill dinamicamente para evitar problemas de SSR
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';
import '@/styles/quill-custom.css';
import '@/styles/quill-mobile.css';

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
  
  // Estados para imagens
  const [images, setImages] = useState<QuestionImage[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; description?: string } | null>(null);
  
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
      setImages(initialData.images || []);
      
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
        setImages(savedData.images || []);
        
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
        isPublic,
        images
      };
      
      // Sempre salvar os dados, mesmo se estiverem vazios
      console.log('💾 Salvando dados no sessionStorage (incluindo content):', {
        content: content,
        contentLength: content.length,
        ...formData
      });
      saveToStorage(formData);
    }
  }, [content, explanation, disciplineId, subjectId, difficulty, questionType, answerOptions, correctAnswer, tags, isPublic, images, isOpen, initialData, saveToStorage]);
   
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
    setImages([]);
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
  
  // Funções para gerenciar imagens
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploadingImage(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        const validation = QuestionImageUploadService.validateImage(file);
        if (!validation.isValid) {
          toast.error(`Erro no arquivo ${file.name}: ${validation.errors.join(', ')}`);
          return null;
        }
        
        // Para questões novas, usar um ID temporário
        const questionId = initialData?.id || 0;
        const position = images.length + index + 1;
        
        if (questionId > 0) {
          // Questão existente - fazer upload completo
          const result = await QuestionImageUploadService.uploadAndSaveImage(
            file,
            questionId,
            position
          );
          
          if (result.success && result.imageData) {
            return result.imageData;
          } else {
            toast.error(`Erro ao fazer upload de ${file.name}: ${result.error}`);
            return null;
          }
        } else {
          // Questão nova - apenas preparar dados temporários
          const tempImage: QuestionImage = {
            id: Date.now() + index, // ID temporário
            question_id: 0,
            image_url: URL.createObjectURL(file), // URL temporária para preview
            image_name: file.name,
            image_size: file.size,
            mime_type: file.type,
            position,
            description: '',
            uploaded_by: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _tempFile: file // Guardar arquivo para upload posterior
          };
          return tempImage;
        }
      });
      
      const results = await Promise.all(uploadPromises);
      const validImages = results.filter(img => img !== null) as QuestionImage[];
      
      if (validImages.length > 0) {
        setImages(prev => [...prev, ...validImages]);
        toast.success(`${validImages.length} imagem(ns) adicionada(s) com sucesso!`);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro interno no upload de imagens');
    } finally {
      setIsUploadingImage(false);
      // Limpar input
      event.target.value = '';
    }
  };
  
  const removeImage = async (imageId: number) => {
    const imageToRemove = images.find(img => img.id === imageId);
    if (!imageToRemove) return;
    
    try {
      // Se a imagem já foi salva no servidor, remover do Supabase
      if (imageToRemove.question_id > 0 && !imageToRemove._tempFile) {
        const result = await QuestionImageUploadService.deleteImage(imageId);
        if (!result.success) {
          toast.error(`Erro ao remover imagem: ${result.error}`);
          return;
        }
      } else if (imageToRemove._tempFile) {
        // Revogar URL temporária para liberar memória
        URL.revokeObjectURL(imageToRemove.image_url);
      }
      
      setImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Imagem removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      toast.error('Erro interno ao remover imagem');
    }
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
        images: images.filter(img => !img._tempFile) // Apenas imagens já salvas
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
        // Se for uma questão nova e houver imagens temporárias, fazer upload
        if (!initialData?.id && images.some(img => img._tempFile)) {
          const tempImages = images.filter(img => img._tempFile);
          for (const tempImage of tempImages) {
            try {
              await QuestionImageUploadService.uploadAndSaveImage(
                tempImage._tempFile!,
                questionData.id!, // ID da questão recém-criada
                tempImage.position
              );
            } catch (error) {
              console.error('Erro ao fazer upload de imagem temporária:', error);
              toast.error(`Erro ao fazer upload da imagem ${tempImage.image_name}`);
            }
          }
        }
        
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 pb-20 sm:pb-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[75vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 truncate pr-2">
            <span className="hidden sm:inline">{title}</span>
            <span className="sm:hidden">Nova Questão</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors p-1 touch-manipulation"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>
        
        {/* Content with scroll */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 min-h-0">
          <form>
            {/* Conteúdo da Questão */}
            <div className="mb-4 sm:mb-6">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Conteúdo da Questão <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500">
                <ReactQuill
                  value={content}
                  onChange={setContent}
                  placeholder="Digite o conteúdo da questão aqui..."
                  modules={{
                    toolbar: {
                      container: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'align': [] }],
                        ['link'],
                        ['clean']
                      ],
                      handlers: {}
                    }
                  }}
                  formats={[
                    'header',
                    'bold', 'italic', 'underline',
                    'list', 'bullet',
                    'align',
                    'link'
                  ]}
                  style={{ minHeight: '150px' }}
                  className="mobile-quill"
                />
              </div>
            </div>
            
            {/* Tipo de Questão */}
            <div className="mb-4 sm:mb-6">
              <label htmlFor="questionType" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Questão
              </label>
              <select
                id="questionType"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as any)}
                className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm touch-manipulation"
              >
                <option value="multiple_choice">Múltipla Escolha</option>
                <option value="true_false">Verdadeiro/Falso</option>
                <option value="essay">Dissertativa</option>
              </select>
            </div>
            
            {/* Opções para Múltipla Escolha */}
            {questionType === 'multiple_choice' && (
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Opções de Resposta <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addAnswerOption}
                    className="inline-flex items-center justify-center px-4 py-2.5 sm:px-3 sm:py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors touch-manipulation"
                  >
                    <Plus className="h-4 w-4 mr-2 sm:mr-1" /> Adicionar Opção
                  </button>
                </div>
                
                <div className="space-y-3">
                  {answerOptions.length === 0 ? (
                    <div className="text-center py-4 bg-gray-50 rounded-lg text-gray-500">
                      Adicione opções de resposta para a questão
                    </div>
                  ) : (
                    answerOptions.map((option, index) => (
                      <div key={String(option.id)} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => setCorrectOption(option.id!)}
                            className={`w-6 h-6 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 touch-manipulation ${
                              option.is_correct
                                ? 'bg-green-500 text-white'
                                : 'border border-gray-300 text-transparent hover:border-gray-400'
                            }`}
                          >
                            {option.is_correct && <Check className="h-3 w-3" />}
                          </button>
                          <div className="flex-1">
                            <input
                              value={option.text}
                              onChange={(e) => updateAnswerOption(option.id!, e.target.value)}
                              placeholder={`Opção ${String.fromCharCode(65 + index)}`}
                              className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAnswerOption(option.id!)}
                            className="text-red-500 hover:text-red-700 p-1 touch-manipulation flex-shrink-0"
                          >
                            <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {/* Opções para Verdadeiro/Falso */}
            {questionType === 'true_false' && (
              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Resposta Correta <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="radio"
                      value="true"
                      checked={correctAnswer === 'true'}
                      onChange={() => setCorrectAnswer('true')}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 mr-3 touch-manipulation"
                    />
                    <span className="text-base sm:text-sm font-medium text-gray-700">Verdadeiro</span>
                  </label>
                  <label className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="radio"
                      value="false"
                      checked={correctAnswer === 'false'}
                      onChange={() => setCorrectAnswer('false')}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 mr-3 touch-manipulation"
                    />
                    <span className="text-base sm:text-sm font-medium text-gray-700">Falso</span>
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
            <div className="mb-4 sm:mb-6">
              <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-2">
                Explicação
              </label>
              <div className="border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500">
                <ReactQuill
                  value={explanation}
                  onChange={setExplanation}
                  placeholder="Explicação opcional sobre a resposta correta..."
                  modules={{
                    toolbar: {
                      container: [
                        [{ 'header': [1, 2, false] }],
                        ['bold', 'italic'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link'],
                        ['clean']
                      ],
                      handlers: {}
                    }
                  }}
                  formats={[
                    'header',
                    'bold', 'italic',
                    'list', 'bullet',
                    'link'
                  ]}
                  style={{ minHeight: '120px' }}
                  className="mobile-quill"
                />
              </div>
            </div>
            
            {/* Seção de Upload de Imagens */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagens <span className="text-gray-500 text-sm">(opcional)</span>
              </label>
              
              {/* Área de Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Clique para adicionar imagens
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        PNG, JPG, WEBP até 5MB cada
                      </span>
                    </label>
                    <input
                      id="image-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploadingImage}
                    />
                  </div>
                  {isUploadingImage && (
                    <div className="mt-2">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        <Upload className="animate-spin h-3 w-3 mr-1" />
                        Fazendo upload...
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Preview das Imagens */}
              {images.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Imagens adicionadas ({images.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((image) => (
                      <div key={image.id} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                          <img
                            src={image.image_url}
                            alt={image.image_name || 'Imagem da questão'}
                            className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setFullscreenImage({ url: image.image_url, description: image.image_name })}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          title="Remover imagem"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="mt-1 text-xs text-gray-500 truncate">
                          {image.image_name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Grid de Seleções */}
            <div className="space-y-4 sm:grid sm:grid-cols-1 md:grid-cols-3 sm:gap-4 sm:space-y-0 mb-4 sm:mb-6">
              {/* Disciplina */}
              <div>
                <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 mb-2">
                  Disciplina <span className="text-red-500">*</span>
                </label>
                <select
                  id="discipline"
                  value={disciplineId || ''}
                  onChange={handleDisciplineChange}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm touch-manipulation"
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
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Assunto <span className="text-red-500">*</span>
                </label>
                <select
                  id="subject"
                  value={subjectId || ''}
                  onChange={(e) => setSubjectId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm touch-manipulation disabled:bg-gray-100 disabled:text-gray-500"
                  disabled={!disciplineId || subjects.length === 0}
                >
                  <option value="">
                    {!disciplineId ? 'Selecione uma disciplina primeiro' : 'Selecione um assunto'}
                  </option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.title || subject.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Dificuldade */}
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
                  Dificuldade <span className="text-red-500">*</span>
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm touch-manipulation"
                >
                  <option value="baixa">Baixa</option>
                  <option value="média">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
            </div>
            
            {/* Checkbox para tornar a questão pública */}
            <div className="mb-4 sm:mb-6">
              <label className="flex items-start cursor-pointer p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded mt-0.5 touch-manipulation flex-shrink-0"
                />
                <div className="ml-3">
                  <span className="flex items-center text-gray-700 font-medium">
                    <Globe className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="text-base sm:text-sm">Adicionar ao Genoma Bank</span>
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    Compartilhar esta questão publicamente para outros usuários
                  </p>
                </div>
              </label>
              {isPublic && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-green-600" />
                    Esta questão será visível para todos os usuários no Genoma Bank.
                  </p>
                </div>
              )}
            </div>
            
            {/* Tags */}
            <div className="mb-4 sm:mb-6">
              <label htmlFor="tags" className="block text-base sm:text-sm font-medium text-gray-700 mb-2">
                Tags <span className="text-gray-500 text-sm">(opcional)</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                <input
                  id="tags"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="flex-1 px-3 py-3 sm:py-2 border border-gray-300 rounded-md sm:rounded-l-md sm:rounded-r-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm touch-manipulation"
                  placeholder="Ex: anatomia, cardiologia..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-md sm:rounded-l-none sm:rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium touch-manipulation transition-colors"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Adicionar
                </button>
              </div>
              
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-2 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-600 hover:text-blue-800 touch-manipulation p-1 rounded-full hover:bg-blue-200 transition-colors"
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
        <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-3 sm:justify-end sm:space-x-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium touch-manipulation"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`w-full sm:w-auto px-4 py-3 sm:py-2 rounded-md text-white font-medium touch-manipulation ${
              isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : initialData ? 'Atualizar Questão' : 'Salvar Questão'}
          </button>
        </div>
      </div>

      {/* Modal de imagem em tela cheia */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img 
              src={fullscreenImage.url}
              alt={fullscreenImage.description || 'Imagem em tela cheia'}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {fullscreenImage.description && (
              <div className="absolute bottom-4 left-4 right-4 text-white bg-black bg-opacity-50 rounded p-2 text-center">
                {fullscreenImage.description}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
