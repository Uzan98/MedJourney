'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaArrowRight, FaFlag, FaClock, FaCheckCircle, FaCut, FaBrain, FaTimes, FaEye } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Exam, ExamQuestion, ExamAttempt, ExamAnswer, ExamsService } from '@/services/exams.service';
import { QuestionsBankService } from '@/services/questions-bank.service';
import { ImageUploadService, QuestionImage } from '@/services/image-upload.service';
import Loading from '@/components/Loading';
import ConfirmationModal from '@/components/ConfirmationModal';
import { AIExplanationModal } from '@/components/ai/AIExplanationModal';


export default function IniciarSimuladoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { hasReachedLimit, showUpgradeModal, refreshLimits, subscriptionLimits } = useSubscription();
  const examId = parseInt(params.id);
  
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ExamAnswer>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [questionImages, setQuestionImages] = useState<Record<number, QuestionImage[]>>({});
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; description?: string } | null>(null);
  const [examMode, setExamMode] = useState<'normal' | 'exercise'>('normal');
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [showAIExplanationModal, setShowAIExplanationModal] = useState(false);
  const [selectedQuestionForAI, setSelectedQuestionForAI] = useState<any>(null);
  const [showExamModeModal, setShowExamModeModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'normal' | 'exercise'>('normal');
  
  // Inicialização
  useEffect(() => {
    loadExamData();
  }, [examId]);
  
  // Timer (apenas no modo normal)
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || examMode === 'exercise') return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining, examMode]);
  
  // Verifique se o tempo acabou (apenas no modo normal)
  useEffect(() => {
    if (timeRemaining === 0 && examMode !== 'exercise') {
      toast.error('O tempo acabou! Suas respostas serão enviadas automaticamente.');
      handleFinishExam();
    }
  }, [timeRemaining, examMode]);
  
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
      
      // Definir o tempo restante, se houver um limite (apenas no modo normal)
      if (examData.time_limit && examMode !== 'exercise') {
        setTimeRemaining(examData.time_limit * 60); // Converter minutos para segundos
      }
      
      // Carregar questões do simulado
      const examQuestions = await ExamsService.getExamQuestions(examId, true);
      
      // Verificar se há questões
      if (examQuestions.length === 0) {
        toast.error('Este simulado não possui questões');
        router.push('/simulados');
        return;
      }
      
      // Se deve embaralhar, randomizar a ordem
      let questionsToShow = [...examQuestions];
      if (examData.shuffle_questions) {
        questionsToShow = questionsToShow.sort(() => Math.random() - 0.5);
      }
      
      setQuestions(questionsToShow);
      
      // Carregar imagens das questões do banco de questões
      console.log('🔍 Iniciando carregamento de imagens para', questionsToShow.length, 'questões');
      const imagesObj: Record<number, QuestionImage[]> = {};
      for (const questionData of questionsToShow) {
        console.log('🔍 Dados da questão:', questionData.question);
        if (questionData.question?.id && questionData.question.images) {
          console.log('📸 Processando imagens para questão ID:', questionData.question.id);
          console.log('📸 Estrutura das imagens:', questionData.question.images);
          const questionImages = questionData.question.images;
          if (Array.isArray(questionImages) && questionImages.length > 0) {
            console.log('✅ Imagens encontradas para questão', questionData.question.id, ':', questionImages.length, 'imagens');
            // Converter formato das imagens para o formato esperado
            const formattedImages: QuestionImage[] = questionImages.map((img, index) => {
              console.log('🖼️ Processando imagem:', img);
              return {
                id: img.id ? img.id.toString() : `${questionData.question.id}-${index}`,
                questionId: questionData.question.id.toString(),
                imageUrl: img.url || img.image_url,
                position: img.position || index,
                description: img.description,
                createdAt: img.created_at || new Date().toISOString()
              };
            });
            imagesObj[questionData.question.id] = formattedImages;
            console.log('💾 Adicionando', formattedImages.length, 'imagens para questão', questionData.question.id);
            console.log('💾 Imagens formatadas:', formattedImages);
          }
        }
      }
      console.log('🎯 Mapa final de imagens:', imagesObj);
      setQuestionImages(imagesObj);
      
      // Inicializar objeto de respostas
      const answersObj: Record<number, ExamAnswer> = {};
      questionsToShow.forEach(q => {
        answersObj[q.question_id] = {
          attempt_id: 0, // Será definido quando o usuário iniciar o simulado
          question_id: q.question_id,
          selected_option_id: null,
          answer_text: null,
          true_false_answer: null,
          is_correct: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });
      
      setAnswers(answersObj);
    } catch (error) {
      console.error('Erro ao carregar dados do simulado:', error);
      toast.error('Ocorreu um erro ao carregar o simulado');
      router.push('/simulados');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenExamModeModal = () => {
    setShowExamModeModal(true);
  };

  const startExam = async (mode?: 'normal' | 'exercise') => {
    if (starting) return;
    
    // Definir o modo se fornecido
    if (mode) {
      setExamMode(mode);
      // Se for modo de exercício, remover o cronômetro
      if (mode === 'exercise') {
        setTimeRemaining(null);
      } else if (exam?.time_limit) {
        // Se for modo normal e há limite de tempo, definir o cronômetro
        setTimeRemaining(exam.time_limit * 60);
      }
    }
    
    // Fechar o modal
    setShowExamModeModal(false);
    
    // Verificar limite de tentativas de simulados
    if (hasReachedLimit('exam_attempts_per_week')) {
      showUpgradeModal(undefined, 'Você atingiu o limite de tentativas de simulados por semana');
      return;
    }
    
    if (hasReachedLimit('exam_attempts_per_month')) {
      showUpgradeModal(undefined, 'Você atingiu o limite de tentativas de simulados por mês');
      return;
    }
    
    setStarting(true);
    try {
      // Criar uma nova tentativa no banco de dados
      const newAttemptId = await ExamsService.startExamAttempt(examId);
      
      if (!newAttemptId) {
        throw new Error('Não foi possível iniciar o simulado');
      }
      
      setAttemptId(newAttemptId);
      
      // Atualizar o ID da tentativa em todas as respostas
      const updatedAnswers = { ...answers };
      Object.keys(updatedAnswers).forEach(questionId => {
        updatedAnswers[parseInt(questionId)].attempt_id = newAttemptId;
      });
      
      setAnswers(updatedAnswers);
      
      // Atualizar limites de assinatura após iniciar o simulado
      await refreshLimits();
      
      toast.success('Simulado iniciado! Boa sorte!');
    } catch (error) {
      console.error('Erro ao iniciar simulado:', error);
      toast.error('Ocorreu um erro ao iniciar o simulado');
      router.push('/simulados');
    } finally {
      setStarting(false);
    }
  };
  
  const handleAnswerChange = async (questionId: number, answer: Partial<ExamAnswer>) => {
    if (!attemptId) return;
    
    try {
      // Preparar resposta atualizada
      const updatedAnswers = { ...answers };
      updatedAnswers[questionId] = {
        ...updatedAnswers[questionId],
        ...answer
      };
      
      // Verificar se a resposta está correta ANTES de atualizar o estado
      const currentQuestion = questions.find(q => q.question_id === questionId)?.question;
      
      if (currentQuestion) {
        let isCorrect = false;
        
        // Verificar correção baseada no tipo de questão
        console.log('handleAnswerChange - Verificando resposta:', {
          questionId,
          questionType: currentQuestion.question_type,
          answer,
          correctAnswer: currentQuestion.correct_answer
        });
        
        if (currentQuestion.question_type === 'multiple_choice') {
          if (answer.selected_option_id) {
            // Obter opções de resposta
            const options = await QuestionsBankService.getAnswerOptions(questionId);
            // Encontrar a opção selecionada (verificando tanto number quanto string)
            const selectedOption = options.find(opt => 
              opt.id === answer.selected_option_id || 
              opt.id === Number(answer.selected_option_id) ||
              String(opt.id) === String(answer.selected_option_id)
            );
            isCorrect = !!selectedOption?.is_correct;
            console.log('Multiple Choice Check:', {
              selectedOptionId: answer.selected_option_id,
              selectedOptionType: typeof answer.selected_option_id,
              selectedOption,
              isCorrect,
              allOptions: options,
              optionIds: options.map(opt => ({ id: opt.id, type: typeof opt.id, is_correct: opt.is_correct }))
            });
          }
        } else if (currentQuestion.question_type === 'true_false') {
          isCorrect = answer.true_false_answer === currentQuestion.correct_answer;
          console.log('True/False Check:', {
            userAnswer: answer.true_false_answer,
            correctAnswer: currentQuestion.correct_answer,
            isCorrect
          });
        } else if (currentQuestion.question_type === 'essay') {
          // Questões dissertativas não têm correção automática
          isCorrect = false;
        }
        
        // Atualizar se a resposta está correta
        updatedAnswers[questionId].is_correct = isCorrect;
        
        console.log('handleAnswerChange - Final result:', {
          questionId,
          isCorrect,
          updatedAnswer: updatedAnswers[questionId],
          allAnswers: updatedAnswers
        });
        
        // Atualizar o estado com o valor is_correct calculado
        setAnswers(updatedAnswers);
        
        // Salvar a resposta no banco de dados
        await ExamsService.saveExamAnswer(updatedAnswers[questionId]);
      } else {
        // Se não encontrou a questão, apenas atualiza o estado sem verificar correção
        setAnswers(updatedAnswers);
        await ExamsService.saveExamAnswer(updatedAnswers[questionId]);
      }
    } catch (error) {
      console.error('Erro ao salvar resposta:', error);
      toast.error('Não foi possível salvar sua resposta');
    }
  };
  
  const handleAnswerMultipleChoice = (questionId: number, optionId: number) => {
    handleAnswerChange(questionId, { selected_option_id: optionId });
    if (examMode === 'exercise') {
      setAnsweredQuestions(prev => new Set(prev).add(questionId));
    }
  };
  
  const handleAnswerTrueFalse = (questionId: number, value: boolean) => {
    handleAnswerChange(questionId, { true_false_answer: value });
    if (examMode === 'exercise') {
      setAnsweredQuestions(prev => new Set(prev).add(questionId));
    }
  };
  
  const handleAnswerEssay = (questionId: number, text: string) => {
    handleAnswerChange(questionId, { answer_text: text });
    if (examMode === 'exercise') {
      setAnsweredQuestions(prev => new Set(prev).add(questionId));
    }
  };
  
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      // Resetar feedback ao mudar de questão
      setShowAnswerFeedback(false);
    }
  };
  
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Resetar feedback ao mudar de questão
      setShowAnswerFeedback(false);
    }
  };
  
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
      // Resetar feedback ao mudar de questão
      setShowAnswerFeedback(false);
    }
  };

  const handleOpenAIExplanation = (questionData: any) => {
    // Verificar se o usuário tem acesso ao recurso Pro
    if (hasReachedLimit('ai_explanations_per_month')) {
      showUpgradeModal('pro', 'Explicações com IA estão disponíveis apenas para assinantes dos planos Pro e Pro+.');
      return;
    }
    
    setSelectedQuestionForAI(questionData);
    setShowAIExplanationModal(true);
  };
  
  const handleFinishExam = async () => {
    if (!attemptId || submitting) return;
    
    setSubmitting(true);
    try {
      const result = await ExamsService.finishExamAttempt(attemptId);
      
      if (result) {
        toast.success('Simulado concluído com sucesso!');
        // Redirecionar para a página de resultados
        router.push(`/simulados/resultado/${attemptId}`);
      } else {
        throw new Error('Não foi possível finalizar o simulado');
      }
    } catch (error) {
      console.error('Erro ao finalizar simulado:', error);
      toast.error('Ocorreu um erro ao finalizar o simulado');
    } finally {
      setSubmitting(false);
      setShowConfirmFinish(false);
    }
  };
  
  const isQuestionAnswered = (questionId: number): boolean => {
    const answer = answers[questionId];
    if (!answer) return false;
    
    const currentQuestion = questions.find(q => q.question_id === questionId)?.question;
    if (!currentQuestion) return false;
    
    if (currentQuestion.question_type === 'multiple_choice') {
      return answer.selected_option_id !== undefined && answer.selected_option_id !== null;
    } else if (currentQuestion.question_type === 'true_false') {
      return answer.true_false_answer !== undefined && answer.true_false_answer !== null;
    } else if (currentQuestion.question_type === 'essay') {
      return !!answer.answer_text;
    }
    
    return false;
  };
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };
  
  // Renderização da questão atual
  const renderCurrentQuestion = () => {
    if (questions.length === 0 || currentQuestionIndex >= questions.length) {
      return <div>Nenhuma questão disponível</div>;
    }
    
    const questionData = questions[currentQuestionIndex];
    const question = questionData.question;
    
    if (!question) {
      return <div>Erro ao carregar a questão</div>;
    }
    
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Questão {currentQuestionIndex + 1} de {questions.length}
            </h2>
            {exam?.time_limit && timeRemaining !== null && examMode !== 'exercise' && (
              <div className={`flex items-center ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-700'}`}>
                <FaClock className="mr-1" />
                <span className="font-medium">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
          
          {/* Informações da questão (instituição e ano) */}
          {(question.institution_name || question.exam_year) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {question.institution_name && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {question.institution_name}
                </span>
              )}
              {question.exam_year && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  {question.exam_year}
                </span>
              )}
            </div>
          )}
          
          <div 
            className="quill-content text-gray-700 mb-6 text-lg" 
            dangerouslySetInnerHTML={{ __html: question.content || '' }}
          />
          
          {/* Exibir imagens da questão, se houver */}
          {questionImages[question.id as number] && questionImages[question.id as number].length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questionImages[question.id as number].map((image, index) => (
                  <div key={image.id} className="relative">
                    <img 
                      src={image.imageUrl} 
                      alt={image.description || `Imagem da questão ${index + 1}`}
                      className="w-full h-auto rounded-lg shadow-md border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ maxHeight: '400px', objectFit: 'contain' }}
                      onClick={() => setFullscreenImage({ url: image.imageUrl, description: image.description })}
                    />
                    {image.description && (
                      <p className="text-sm text-gray-600 mt-2 text-center italic">
                        {image.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Renderizar opções baseadas no tipo de questão */}
          {question.question_type === 'multiple_choice' && (
            <MultipleChoiceQuestion 
              questionId={question.id as number} 
              selectedOptionId={answers[question.id as number]?.selected_option_id} 
              onSelect={handleAnswerMultipleChoice}
              disabled={examMode === 'exercise' && answeredQuestions.has(question.id as number) && showAnswerFeedback}
            />
          )}
          
          {question.question_type === 'true_false' && (
            <TrueFalseQuestion 
              questionId={question.id as number}
              selectedValue={answers[question.id as number]?.true_false_answer}
              onSelect={handleAnswerTrueFalse}
              disabled={examMode === 'exercise' && answeredQuestions.has(question.id as number) && showAnswerFeedback}
            />
          )}
          
          {question.question_type === 'essay' && (
            <EssayQuestion 
              questionId={question.id as number}
              value={answers[question.id as number]?.answer_text || ''}
              onChange={handleAnswerEssay}
              disabled={examMode === 'exercise' && answeredQuestions.has(question.id as number) && showAnswerFeedback}
            />
          )}
          
          {/* Botão para ver resposta no modo lista de exercícios */}
          {examMode === 'exercise' && answers[question.id as number] && !showAnswerFeedback && (
            <div className="mt-6">
              <button
                onClick={() => setShowAnswerFeedback(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <FaCheckCircle className="text-sm" />
                Ver Resposta
              </button>
            </div>
          )}
          
          {/* Componente de feedback para modo lista de exercícios */}
          {examMode === 'exercise' && showAnswerFeedback && (
            <AnswerFeedback 
              question={question}
              userAnswer={(() => {
                // Verificar qual propriedade contém o ID da questão
                const questionId = question.question_id || question.id || question.question?.id;
                const userAnswer = answers[questionId];
                console.log('Passing userAnswer to AnswerFeedback:', {
                  questionId,
                  questionObject: question,
                  userAnswer,
                  allAnswers: answers,
                  hasAnswer: !!userAnswer
                });
                return userAnswer;
              })()}
              onHide={() => setShowAnswerFeedback(false)}
              onOpenAIExplanation={handleOpenAIExplanation}
            />
          )}
        </div>
      </div>
    );
  };
  
  // Tela de carregamento
  if (loading) {
    return <Loading message="Carregando simulado..." />;
  }
  
  // Tela inicial do simulado
  if (!attemptId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center mb-8">
            <Link 
              href="/simulados" 
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
              aria-label="Voltar"
            >
              <FaArrowLeft className="text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">{exam?.title}</h1>
          </div>
          
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Instruções</h2>
                <p className="text-gray-700 mb-4">{exam?.description || 'Responda todas as questões do simulado.'}</p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">Informações do Simulado</h3>
                  <ul className="space-y-2 text-blue-700">
                    <li className="flex items-center">
                      <span className="font-medium mr-2">Número de questões:</span> {questions.length}
                    </li>
                    <li className="flex items-center">
                      <span className="font-medium mr-2">Tempo limite:</span> {exam?.time_limit ? `${exam.time_limit} minutos` : 'Sem limite de tempo'}
                    </li>
                    <li className="flex items-center">
                      <span className="font-medium mr-2">Ordem das questões:</span> {exam?.shuffle_questions ? 'Aleatória' : 'Fixa'}
                    </li>
                    <li className="flex items-center">
                      <span className="font-medium mr-2">Feedback:</span> {exam?.show_answers ? 'Mostra respostas corretas após finalizar' : 'Apenas pontuação'}
                    </li>
                  </ul>
                </div>
                
                {/* Call to action para escolher modo */}
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">Pronto para começar?</h3>
                  <p className="text-gray-600 mb-4 text-center">
                    Escolha como deseja estudar:
                  </p>
                  
                  {!showExamModeModal ? (
                    <div className="text-center">
                      <button
                        onClick={handleOpenExamModeModal}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <FaBrain className="mr-2" />
                        Escolher Modo de Estudo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Informações do simulado */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">{exam?.title || 'Simulado'}</h4>
                          <button
                            onClick={() => setShowExamModeModal(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <FaTimes />
                          </button>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <FaCheckCircle className="text-blue-500" />
                            <span>{questions.length} questões</span>
                          </div>
                          {exam?.time_limit && (
                            <div className="flex items-center gap-1">
                              <FaClock className="text-orange-500" />
                              <span>{exam.time_limit} minutos</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Opções de modo */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {/* Modo Normal */}
                         <div 
                           onClick={() => setSelectedMode('normal')}
                           className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                             selectedMode === 'normal' 
                               ? 'border-blue-500 bg-blue-50' 
                               : 'border-blue-200 hover:border-blue-400'
                           }`}
                         >
                           <div className="flex items-start gap-3">
                             <div className="flex-shrink-0 mt-1">
                               <div className={`w-4 h-4 rounded-full border-2 ${
                                 selectedMode === 'normal'
                                   ? 'border-blue-500 bg-blue-500'
                                   : 'border-blue-300 bg-white'
                               }`}></div>
                             </div>
                             <div className="flex-1">
                               <div className="flex items-center gap-2 mb-2">
                                 <FaClock className="text-blue-500" />
                                 <h5 className="font-semibold text-gray-800">Modo Simulado</h5>
                               </div>
                               <p className="text-sm text-gray-600 mb-3">
                                 Simule uma prova real com tempo cronometrado e feedback apenas no final.
                               </p>
                               <div className="flex flex-wrap gap-2">
                                 <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Cronômetro ativo</span>
                                 <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Feedback no final</span>
                               </div>
                             </div>
                           </div>
                         </div>
 
                         {/* Modo Exercício */}
                         <div 
                           onClick={() => setSelectedMode('exercise')}
                           className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                             selectedMode === 'exercise' 
                               ? 'border-green-500 bg-green-50' 
                               : 'border-gray-200 hover:border-green-400'
                           }`}
                         >
                           <div className="flex items-start gap-3">
                             <div className="flex-shrink-0 mt-1">
                               <div className={`w-4 h-4 rounded-full border-2 ${
                                 selectedMode === 'exercise'
                                   ? 'border-green-500 bg-green-500'
                                   : 'border-gray-300 bg-white'
                               }`}></div>
                             </div>
                             <div className="flex-1">
                               <div className="flex items-center gap-2 mb-2">
                                 <FaEye className="text-green-500" />
                                 <h5 className="font-semibold text-gray-800">Modo Exercício</h5>
                               </div>
                               <p className="text-sm text-gray-600 mb-3">
                                 Estude com feedback imediato após cada questão para aprender durante a prática.
                               </p>
                               <div className="flex flex-wrap gap-2">
                                 <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Sem cronômetro</span>
                                 <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Feedback imediato</span>
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>

                      {/* Botão de ação */}
                        <div className="flex justify-center pt-4">
                          <button
                            onClick={() => startExam(selectedMode)}
                            className={`px-8 py-3 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                              selectedMode === 'normal'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {selectedMode === 'normal' ? <FaClock /> : <FaEye />}
                              Iniciar {selectedMode === 'normal' ? 'Simulado' : 'Exercício'}
                            </div>
                          </button>
                        </div>
                    </div>
                  )}
                </div>
              </div>
              

            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Interface do simulado em andamento
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{exam?.title}</h1>
          <button
            onClick={() => setShowConfirmFinish(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg"
          >
            <FaCheckCircle className="mr-2" /> Finalizar Simulado
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar com índice de questões */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-md overflow-hidden sticky top-6">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="font-medium text-gray-700">Questões</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, index) => {
                    const isAnswered = isQuestionAnswered(q.question_id);
                    const isCurrent = currentQuestionIndex === index;
                    
                    return (
                      <button
                        key={q.question_id}
                        onClick={() => goToQuestion(index)}
                        className={`h-10 w-10 flex items-center justify-center rounded-lg font-medium transition-colors duration-200 ${
                          isCurrent
                            ? 'bg-blue-600 text-white'
                            : isAnswered
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-green-100 rounded-full mr-1"></div>
                    <span>Respondida</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-blue-600 rounded-full mr-1"></div>
                    <span>Atual</span>
                  </div>
                </div>
                
                {exam?.time_limit && timeRemaining !== null && examMode !== 'exercise' && (
                  <div className={`mt-6 p-3 rounded-lg ${timeRemaining < 300 ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
                    <div className="flex items-center justify-center">
                      <FaClock className="mr-2" />
                      <span className="font-medium">{formatTime(timeRemaining)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Conteúdo principal */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {renderCurrentQuestion()}
            
            <div className="flex justify-between">
              <button
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className={`inline-flex items-center px-4 py-2 border rounded-lg ${
                  currentQuestionIndex === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FaArrowLeft className="mr-2" /> Anterior
              </button>
              
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={goToNextQuestion}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Próxima <FaArrowRight className="ml-2" />
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirmFinish(true)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <FaCheckCircle className="mr-2" /> Finalizar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de confirmação */}
      {showConfirmFinish && (
        <ConfirmationModal
          title="Finalizar Simulado"
          message={`Tem certeza que deseja finalizar o simulado? ${
            Object.values(answers).some(a => !isQuestionAnswered(a.question_id))
              ? 'Existem questões não respondidas.'
              : 'Todas as questões foram respondidas.'
          }`}
          confirmText="Finalizar"
          cancelText="Continuar respondendo"
          onConfirm={handleFinishExam}
          onClose={() => setShowConfirmFinish(false)}
          isOpen={showConfirmFinish}
        />
      )}

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

      {/* Modal de Explicação com IA */}
      <AIExplanationModal
        isOpen={showAIExplanationModal}
        onClose={() => setShowAIExplanationModal(false)}
        questionData={selectedQuestionForAI}
      />


    </div>
  );
}

// Componente para questões de múltipla escolha
function MultipleChoiceQuestion({ 
  questionId, 
  selectedOptionId,
  onSelect,
  disabled = false
}: { 
  questionId: number, 
  selectedOptionId?: number | null, 
  onSelect: (questionId: number, optionId: number) => void,
  disabled?: boolean
}) {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Novo estado para controlar alternativas riscadas
  const [strikeThroughOptions, setStrikeThroughOptions] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadOptions();
  }, [questionId]);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const optionsData = await QuestionsBankService.getAnswerOptions(questionId);
      if (optionsData) {
        setOptions(optionsData);
      }
    } catch (error) {
      console.error('Erro ao carregar opções:', error);
    } finally {
      setLoading(false);
    }
  };

  // Nova função para alternar o estado riscado de uma opção
  const toggleStrikeThrough = (optionId: number, e: React.MouseEvent) => {
    // Previne a propagação para não selecionar a alternativa ao clicar na tesoura
    e.stopPropagation();
    
    const newStrikeThroughOptions = new Set(strikeThroughOptions);
    if (strikeThroughOptions.has(optionId)) {
      newStrikeThroughOptions.delete(optionId);
    } else {
      newStrikeThroughOptions.add(optionId);
    }
    
    setStrikeThroughOptions(newStrikeThroughOptions);
  };

  // Removemos o event listener de contextmenu pois não é mais necessário
  
  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-4 multiple-choice-container">
      {options.map((option) => {
        const isSelected = selectedOptionId === option.id;
        const isStrikeThrough = strikeThroughOptions.has(option.id);
        
        return (
          <div 
            key={option.id}
            className={`p-4 border rounded-lg transition-all ${
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-md'
            } ${
              isSelected 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200'
            } ${isStrikeThrough ? 'relative' : ''}`}
            onClick={() => !disabled && onSelect(questionId, option.id)}
          >
            <div className="flex items-start">
              <div className={`w-6 h-6 rounded-full border flex-shrink-0 flex items-center justify-center ${
                isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
              }`}>
                {isSelected && (
                  <div className="w-3 h-3 rounded-full bg-white"></div>
                )}
              </div>
              <div 
                className={`quill-content ml-3 flex-grow ${isStrikeThrough ? 'line-through text-gray-400' : 'text-gray-700'}`}
                dangerouslySetInnerHTML={{ __html: option.text }}
              />
              
              {/* Botão de tesoura para riscar alternativa */}
              <button 
                onClick={(e) => toggleStrikeThrough(option.id, e)}
                className={`ml-2 p-1.5 rounded-full transition-colors ${
                  isStrikeThrough 
                    ? 'bg-red-100 text-red-500 hover:bg-red-200' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={isStrikeThrough ? "Desfazer risco" : "Riscar alternativa"}
                aria-label={isStrikeThrough ? "Desfazer risco" : "Riscar alternativa"}
              >
                <FaCut size={14} />
              </button>
            </div>
          </div>
        );
      })}
      
      {/* Dica de uso */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 flex items-center space-x-2 mt-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p>
          <strong>Dica:</strong> Clique no ícone <FaCut className="inline text-gray-500" size={12} /> para riscar alternativas que você deseja eliminar.
        </p>
      </div>
    </div>
  );
}

// Componente para questões de verdadeiro/falso
function TrueFalseQuestion({ 
  questionId, 
  selectedValue,
  onSelect,
  disabled = false
}: { 
  questionId: number, 
  selectedValue?: boolean | null, 
  onSelect: (questionId: number, value: boolean) => void,
  disabled?: boolean
}) {
  return (
    <div className="space-y-3">
      <div 
        onClick={() => !disabled && onSelect(questionId, true)}
        className={`p-4 border rounded-lg transition-colors duration-200 ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'
        } ${
          selectedValue === true 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200'
        }`}
      >
        <div className="flex items-center">
          <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
            selectedValue === true ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
          }`}>
            {selectedValue === true && (
              <div className="w-2 h-2 rounded-full bg-white"></div>
            )}
          </div>
          <span className="ml-3 font-medium">Verdadeiro</span>
        </div>
      </div>
      
      <div 
        onClick={() => !disabled && onSelect(questionId, false)}
        className={`p-4 border rounded-lg transition-colors duration-200 ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'
        } ${
          selectedValue === false 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200'
        }`}
      >
        <div className="flex items-center">
          <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
            selectedValue === false ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
          }`}>
            {selectedValue === false && (
              <div className="w-2 h-2 rounded-full bg-white"></div>
            )}
          </div>
          <span className="ml-3 font-medium">Falso</span>
        </div>
      </div>
    </div>
  );
}

// Componente para questões dissertativas
function EssayQuestion({ 
  questionId, 
  value,
  onChange,
  disabled = false
}: { 
  questionId: number, 
  value: string, 
  onChange: (questionId: number, text: string) => void,
  disabled?: boolean
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => !disabled && onChange(questionId, e.target.value)}
        placeholder="Digite sua resposta..."
        rows={6}
        disabled={disabled}
        className={`w-full p-4 border rounded-lg resize-y ${
          disabled 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
            : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        }`}
      />
    </div>
  );
}

// Componente de feedback para exibir resposta correta e explicação
function AnswerFeedback({ 
  question, 
  userAnswer,
  onHide,
  onOpenAIExplanation
}: { 
  question: any, 
  userAnswer?: ExamAnswer,
  onHide?: () => void,
  onOpenAIExplanation?: (questionData: any) => void
}) {
  // Verificar qual propriedade contém o ID da questão
  const questionId = question.question_id || question.id || question.question?.id;
  
  // Se não há resposta do usuário, criar uma resposta vazia para evitar erros
  const effectiveUserAnswer = userAnswer || {
    question_id: questionId,
    attempt_id: 0,
    is_correct: false
  } as ExamAnswer;
  const getCorrectAnswer = () => {
    if (question.question_type === 'multiple_choice') {
      // Verificar tanto question.options quanto question.answer_options
      const options = question.options || question.answer_options;
      console.log('AnswerFeedback: Looking for correct answer in options:', options);
      return options?.find((option: any) => option.is_correct);
    } else if (question.question_type === 'true_false') {
      return question.correct_answer;
    }
    return null;
  };

  const isUserAnswerCorrect = () => {
    if (!effectiveUserAnswer) {
      console.log('AnswerFeedback: No effective user answer found');
      return false;
    }

    // Se não há resposta original do usuário, retornar false
    if (!userAnswer) {
      return false;
    }

    // Verificar a resposta baseada no tipo de questão
    if (question.question_type === 'multiple_choice') {
      const selectedOptionId = effectiveUserAnswer.selected_option_id;
      const options = question.question?.answer_options || question.answer_options || [];
      const selectedOption = options.find((opt: any) => opt.id === selectedOptionId);
      
      console.log('AnswerFeedback: Multiple choice verification:', {
        selectedOptionId,
        options,
        selectedOption,
        isCorrect: selectedOption?.is_correct
      });
      
      return selectedOption?.is_correct === true;
    }
    
    if (question.question_type === 'true_false') {
      const userTrueFalseAnswer = effectiveUserAnswer.true_false_answer;
      const correctAnswer = question.question?.correct_answer || question.correct_answer;
      
      console.log('AnswerFeedback: True/False verification:', {
        userAnswer: userTrueFalseAnswer,
        correctAnswer,
        isCorrect: userTrueFalseAnswer === correctAnswer
      });
      
      return userTrueFalseAnswer === correctAnswer;
    }
    
    // Para questões dissertativas, não há verificação automática
    if (question.question_type === 'essay') {
      return false;
    }
    
    // Fallback para o campo is_correct
    return effectiveUserAnswer.is_correct === true;
  };

  const correctAnswer = getCorrectAnswer();
  const isCorrect = isUserAnswerCorrect();

  return (
    <div className={`mt-6 p-4 rounded-lg border-2 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center mb-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${!userAnswer ? 'bg-gray-500' : isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
          {!userAnswer ? (
            <span className="text-white text-sm font-bold">📝</span>
          ) : isCorrect ? (
            <FaCheckCircle className="text-white text-sm" />
          ) : (
            <span className="text-white text-sm font-bold">✗</span>
          )}
        </div>
        <h3 className={`font-semibold ${!userAnswer ? 'text-gray-800' : isCorrect ? 'text-green-800' : 'text-red-800'}`}>
          {!userAnswer ? 'Selecione uma resposta para ver o feedback' : isCorrect ? 'Resposta Correta!' : 'Resposta Incorreta'}
        </h3>
      </div>
      
      {/* Mostrar resposta correta */}
      {question.question_type === 'multiple_choice' && correctAnswer && (
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700 mb-1">Resposta correta:</p>
          <div className="bg-white p-3 rounded border border-green-300">
            <span className="font-medium text-green-700">
              {String.fromCharCode(65 + (question.options || question.answer_options || []).findIndex((opt: any) => opt.id === correctAnswer.id))}
            </span>
            <span className="ml-2 text-gray-800">{correctAnswer.content}</span>
          </div>
        </div>
      )}
      
      {question.question_type === 'true_false' && (
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700 mb-1">Resposta correta:</p>
          <div className="bg-white p-3 rounded border border-green-300">
            <span className="font-medium text-green-700">
              {question.correct_answer ? 'Verdadeiro' : 'Falso'}
            </span>
          </div>
        </div>
      )}
      
      {/* Mostrar explicação se disponível */}
      {question.explanation && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Explicação:</p>
          <div 
            className="bg-white p-3 rounded border border-gray-300 text-gray-700 text-sm"
            dangerouslySetInnerHTML={{ __html: question.explanation }}
          />
        </div>
      )}
      
      {/* Botão para gerar explicação com IA quando não há explicação */}
      {!question.explanation && onOpenAIExplanation && (
        <div className="mb-4">
          <button
            onClick={() => onOpenAIExplanation(question)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <FaBrain className="text-sm" />
            Gerar explicação com IA
          </button>
        </div>
      )}

    </div>
  );
}