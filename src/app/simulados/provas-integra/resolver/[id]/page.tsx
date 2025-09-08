'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, CheckCircle, XCircle, ArrowLeft, ArrowRight, Flag, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CompleteExamsService, { CompleteExam, CompleteExamQuestion, CompleteExamOption, CompleteExamAttempt } from '@/services/complete-exams.service';
import { CompleteExamImageUploadService, CompleteExamQuestionImage } from '@/services/complete-exam-image-upload.service';
import { useAuth } from '@/contexts/AuthContext';

interface QuestionWithOptions extends CompleteExamQuestion {
  options: CompleteExamOption[];
}

interface ExamWithQuestions extends CompleteExam {
  questions: QuestionWithOptions[];
}

interface UserAnswer {
  questionId: number;
  selectedOptionKey: string;
  isMarkedForReview: boolean;
}

export default function ResolverProvaPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const examId = parseInt(params.id as string);

  const [exam, setExam] = useState<ExamWithQuestions | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, UserAnswer>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [questionImages, setQuestionImages] = useState<Record<number, CompleteExamQuestionImage[]>>({});

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadExam();
  }, [examId, user]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const loadQuestionImages = async (questions: QuestionWithOptions[]) => {
    try {
      const imagePromises = questions.map(async (question) => {
        if (question.id) {
          const images = await CompleteExamImageUploadService.getCompleteExamQuestionImages(question.id);
          return { questionId: question.id, images };
        }
        return { questionId: 0, images: [] };
      });

      const imageResults = await Promise.all(imagePromises);
      const imageMap: Record<number, CompleteExamQuestionImage[]> = {};
      
      imageResults.forEach(({ questionId, images }) => {
        if (questionId > 0) {
          imageMap[questionId] = images;
        }
      });

      setQuestionImages(imageMap);
    } catch (error) {
      console.error('Erro ao carregar imagens das questões:', error);
    }
  };

  const loadExam = async () => {
    try {
      setLoading(true);
      const examData = await CompleteExamsService.getCompleteExamWithQuestions(examId);
      
      if (!examData) {
        toast.error('Prova não encontrada');
        router.push('/simulados/provas-integra');
        return;
      }

      if (!examData.is_approved) {
        toast.error('Esta prova ainda não foi aprovada');
        router.push('/simulados/provas-integra');
        return;
      }

      setExam(examData);
      
      // Carregar imagens das questões
      await loadQuestionImages(examData.questions);
      
      // Iniciar tentativa
      const attemptId = await CompleteExamsService.startCompleteExamAttempt(examId);
      if (attemptId) {
        setAttemptId(attemptId);
        if (examData.time_limit) {
          setTimeRemaining(examData.time_limit * 60); // Converter minutos para segundos
        }
      }
    } catch (error) {
      console.error('Erro ao carregar prova:', error);
      toast.error('Erro ao carregar prova');
      router.push('/simulados/provas-integra');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: number, optionKey: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        selectedOptionKey: optionKey,
        isMarkedForReview: prev[questionId]?.isMarkedForReview || false
      }
    }));
  };

  const handleMarkForReview = (questionId: number) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        questionId,
        selectedOptionKey: prev[questionId]?.selectedOptionKey || '',
        isMarkedForReview: !prev[questionId]?.isMarkedForReview
      }
    }));
  };

  const handleSubmitExam = async () => {
    if (!attemptId || !exam) return;

    try {
      setIsSubmitting(true);
      
      // Preparar respostas para envio
      const answers = Object.values(userAnswers).filter(answer => answer.selectedOptionKey && answer.selectedOptionKey.trim() !== '');
      
      const success = await CompleteExamsService.submitCompleteExamAttempt(
        attemptId,
        answers.map(answer => ({
          question_id: answer.questionId,
          selected_option_key: answer.selectedOptionKey
        }))
      );

      if (success) {
        toast.success('Prova enviada com sucesso!');
        router.push(`/simulados/provas-integra/resultado/${attemptId}`);
      } else {
        toast.error('Erro ao enviar prova');
      }
    } catch (error) {
      console.error('Erro ao enviar prova:', error);
      toast.error('Erro ao enviar prova');
    } finally {
      setIsSubmitting(false);
      setShowConfirmSubmit(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.values(userAnswers).filter(answer => answer.selectedOptionKey).length;
  };

  const getMarkedForReviewCount = () => {
    return Object.values(userAnswers).filter(answer => answer.isMarkedForReview).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando prova...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Prova não encontrada</p>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const answeredCount = getAnsweredCount();
  const markedCount = getMarkedForReviewCount();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/simulados/provas-integra')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{exam.title}</h1>
                <p className="text-sm text-gray-500">
                  {exam.institution} {exam.year && `• ${exam.year}`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {timeRemaining !== null && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                  timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  <Clock className="h-4 w-4" />
                  <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                Questão {currentQuestionIndex + 1} de {exam.questions.length}
              </div>
              
              <button
                onClick={() => setShowConfirmSubmit(true)}
                disabled={isSubmitting}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enviando...' : 'Finalizar Prova'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Navegação das questões */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-medium text-gray-900 mb-4">Navegação</h3>
              
              {/* Estatísticas */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Respondidas:</span>
                  <span className="font-medium">{answeredCount}/{exam.questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Para revisar:</span>
                  <span className="font-medium">{markedCount}</span>
                </div>
              </div>
              
              {/* Grid de questões */}
              <div className="grid grid-cols-5 gap-2">
                {exam.questions.map((question, index) => {
                  const answer = userAnswers[question.id!];
                  const isAnswered = answer?.selectedOptionKey;
                  const isMarked = answer?.isMarkedForReview;
                  const isCurrent = index === currentQuestionIndex;
                  
                  return (
                    <button
                      key={question.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`
                        w-10 h-10 rounded-lg text-sm font-medium border-2 transition-all
                        ${
                          isCurrent
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : isAnswered
                            ? 'border-green-500 bg-green-500 text-white'
                            : isMarked
                            ? 'border-yellow-500 bg-yellow-500 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }
                      `}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              
              {/* Legenda */}
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-gray-600">Atual</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Respondida</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-gray-600">Para revisar</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                  <span className="text-gray-600">Não respondida</span>
                </div>
              </div>
            </div>
          </div>

          {/* Questão atual */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Cabeçalho da questão */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-medium">
                    Questão {currentQuestionIndex + 1}
                  </span>
                  <button
                    onClick={() => handleMarkForReview(currentQuestion.id!)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${
                      userAnswers[currentQuestion.id!]?.isMarkedForReview
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Flag className="h-4 w-4" />
                    <span className="text-sm">
                      {userAnswers[currentQuestion.id!]?.isMarkedForReview ? 'Marcada' : 'Marcar'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Enunciado */}
              <div className="mb-6">
                <div className="prose max-w-none">
                  <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                    {currentQuestion.statement}
                  </p>
                </div>
                
                {/* Imagens da questão */}
                {questionImages[currentQuestion.id!] && questionImages[currentQuestion.id!].length > 0 && (
                  <div className="mt-4 space-y-2">
                    {questionImages[currentQuestion.id!].map((image, index) => (
                      <img
                        key={index}
                        src={image.image_url}
                        alt={`Imagem da questão ${index + 1}`}
                        className="max-w-full h-auto rounded-lg border"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Alternativas */}
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = userAnswers[currentQuestion.id!]?.selectedOptionKey === option.option_key;
                  
                  return (
                    <label
                      key={option.id}
                      className={`
                        block p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={option.option_key}
                          checked={isSelected}
                          onChange={() => handleAnswerSelect(currentQuestion.id!, option.option_key)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {option.option_key.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                            {option.option_text}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Navegação */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Anterior</span>
                </button>
                
                <button
                  onClick={() => setCurrentQuestionIndex(Math.min(exam.questions.length - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === exam.questions.length - 1}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Próxima</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Finalizar Prova</h3>
            <p className="text-gray-600 mb-6">
              Você respondeu {answeredCount} de {exam.questions.length} questões.
              {markedCount > 0 && ` ${markedCount} questões estão marcadas para revisão.`}
              <br /><br />
              Tem certeza que deseja finalizar a prova? Esta ação não pode ser desfeita.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Enviando...' : 'Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}