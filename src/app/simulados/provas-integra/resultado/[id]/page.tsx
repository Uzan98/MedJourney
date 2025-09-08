'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Clock, Target, TrendingUp, BarChart3, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CompleteExamsService, { CompleteExamAttempt, CompleteExamQuestion, CompleteExamOption, CompleteExam } from '@/services/complete-exams.service';
import { useAuth } from '@/contexts/AuthContext';

interface QuestionWithOptions extends CompleteExamQuestion {
  options: CompleteExamOption[];
}

interface ExamWithQuestions extends CompleteExam {
  questions: QuestionWithOptions[];
}

interface AttemptWithDetails extends CompleteExamAttempt {
  exam: ExamWithQuestions;
  user_answers: {
    question_id: number;
    selected_option_key: string;
    is_correct: boolean;
    question: QuestionWithOptions;
  }[];
}

export default function ResultadoProvaPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const attemptId = parseInt(params.id as string);

  const [attempt, setAttempt] = useState<AttemptWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadAttemptResult();
  }, [attemptId, user]);

  const loadAttemptResult = async () => {
    try {
      setLoading(true);
      const attemptData = await CompleteExamsService.getCompleteExamAttemptResult(attemptId);
      
      if (!attemptData) {
        toast.error('Resultado não encontrado');
        router.push('/simulados/provas-integra');
        return;
      }

      // Verificar se o usuário tem permissão para ver este resultado
      if (attemptData.user_id !== user.id) {
        toast.error('Você não tem permissão para ver este resultado');
        router.push('/simulados/provas-integra');
        return;
      }

      setAttempt(attemptData);
    } catch (error) {
      console.error('Erro ao carregar resultado:', error);
      toast.error('Erro ao carregar resultado');
      router.push('/simulados/provas-integra');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!attempt) return { correct: 0, total: 0, percentage: 0, timeSpent: 0 };

    const correct = attempt.user_answers.filter(answer => answer.is_correct).length;
    const total = attempt.exam.questions.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    // Calcular tempo gasto
    const startTime = new Date(attempt.started_at).getTime();
    const endTime = new Date(attempt.completed_at || attempt.started_at).getTime();
    const timeSpent = Math.round((endTime - startTime) / 1000 / 60); // em minutos

    return { correct, total, percentage, timeSpent };
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBg = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100';
    if (percentage >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando resultado...</p>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Resultado não encontrado</p>
        </div>
      </div>
    );
  }

  const stats = calculateStats();
  const currentQuestion = showReview ? attempt.exam.questions[currentQuestionIndex] : null;
  const currentAnswer = showReview ? attempt.user_answers.find(a => a.question_id === currentQuestion?.id) : null;

  // Verificar se currentQuestion tem options definido
  const safeCurrentQuestion = currentQuestion && currentQuestion.options ? currentQuestion : null;

  if (showReview && currentQuestion && !safeCurrentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro: Questão sem opções disponíveis</p>
          <button
            onClick={() => setShowReview(false)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Voltar ao Resultado
          </button>
        </div>
      </div>
    );
  }

  if (showReview && safeCurrentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header da revisão */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowReview(false)}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Voltar ao Resultado
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Revisão da Prova</h1>
                  <p className="text-sm text-gray-500">{attempt.exam.title}</p>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                Questão {currentQuestionIndex + 1} de {attempt.exam.questions.length}
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
                
                {/* Grid de questões */}
                <div className="grid grid-cols-5 gap-2">
                  {attempt.exam.questions.map((question, index) => {
                    const answer = attempt.user_answers.find(a => a.question_id === question.id);
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
                              : answer?.is_correct
                              ? 'border-green-500 bg-green-500 text-white'
                              : answer
                              ? 'border-red-500 bg-red-500 text-white'
                              : 'border-gray-300 bg-gray-100 text-gray-500'
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
                    <span className="text-gray-600">Correta</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                    <span className="text-gray-600">Incorreta</span>
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
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-medium">
                    Questão {currentQuestionIndex + 1}
                  </span>
                  
                  {currentAnswer && (
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                      currentAnswer.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {currentAnswer.is_correct ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">
                        {currentAnswer.is_correct ? 'Correta' : 'Incorreta'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Enunciado */}
                <div className="mb-6">
                  <div className="prose max-w-none">
                    <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                      {safeCurrentQuestion?.statement}
                    </p>
                  </div>
                  
                  {/* Imagem da questão */}
                  {safeCurrentQuestion?.image_url && (
                    <div className="mt-4">
                      <img
                        src={safeCurrentQuestion.image_url}
                        alt="Imagem da questão"
                        className="max-w-full h-auto rounded-lg border"
                      />
                    </div>
                  )}
                </div>

                {/* Alternativas */}
                <div className="space-y-3">
                  {safeCurrentQuestion?.options?.map((option) => {
                    const isSelected = currentAnswer?.selected_option_key === option.option_key;
                    const isCorrect = option.is_correct;
                    
                    let optionClass = 'block p-4 rounded-lg border-2';
                    
                    if (isCorrect) {
                      optionClass += ' border-green-500 bg-green-50';
                    } else if (isSelected && !isCorrect) {
                      optionClass += ' border-red-500 bg-red-50';
                    } else {
                      optionClass += ' border-gray-200 bg-gray-50';
                    }
                    
                    return (
                      <div key={option.id} className={optionClass}>
                        <div className="flex items-start space-x-3">
                          <div className="flex items-center space-x-2">
                            {isCorrect && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                            {isSelected && !isCorrect && (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <span className="font-medium text-gray-900">
                              {option.option_key.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-700 whitespace-pre-wrap">
                              {option.option_text}
                            </p>
                          </div>
                        </div>
                      </div>
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
                    onClick={() => setCurrentQuestionIndex(Math.min(attempt.exam.questions.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === attempt.exam.questions.length - 1}
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
      </div>
    );
  }

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
                <h1 className="text-lg font-semibold text-gray-900">Resultado da Prova</h1>
                <p className="text-sm text-gray-500">{attempt.exam.title}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Resumo do resultado */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Pontuação */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${getPerformanceBg(stats.percentage)}`}>
                <Target className={`h-6 w-6 ${getPerformanceColor(stats.percentage)}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pontuação</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(stats.percentage)}`}>
                  {stats.percentage}%
                </p>
              </div>
            </div>
          </div>

          {/* Acertos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Acertos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.correct}/{stats.total}
                </p>
              </div>
            </div>
          </div>

          {/* Tempo */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tempo Gasto</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.timeSpent}min
                </p>
              </div>
            </div>
          </div>

          {/* Data */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Realizada em</p>
                <p className="text-sm font-bold text-gray-900">
                  {formatDate(attempt.started_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detalhes da prova */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informações da prova */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Prova</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Instituição:</span>
                <span className="font-medium text-gray-900">{attempt.exam.institution}</span>
              </div>
              {attempt.exam.year && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Ano:</span>
                  <span className="font-medium text-gray-900">{attempt.exam.year}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo:</span>
                <span className="font-medium text-gray-900">
                  {attempt.exam.exam_type === 'residencia' ? 'Residência Médica' :
                   attempt.exam.exam_type === 'concurso' ? 'Concurso' :
                   attempt.exam.exam_type === 'enem' ? 'ENEM' :
                   attempt.exam.exam_type === 'vestibular' ? 'Vestibular' : attempt.exam.exam_type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total de Questões:</span>
                <span className="font-medium text-gray-900">{stats.total}</span>
              </div>
              {attempt.exam.time_limit && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tempo Limite:</span>
                  <span className="font-medium text-gray-900">{attempt.exam.time_limit} minutos</span>
                </div>
              )}
            </div>
          </div>

          {/* Análise de desempenho */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Análise de Desempenho</h3>
            <div className="space-y-4">
              {/* Barra de progresso */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Aproveitamento</span>
                  <span className={`font-medium ${getPerformanceColor(stats.percentage)}`}>
                    {stats.percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      stats.percentage >= 80 ? 'bg-green-500' :
                      stats.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${stats.percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Feedback */}
              <div className={`p-4 rounded-lg ${
                stats.percentage >= 80 ? 'bg-green-50 border border-green-200' :
                stats.percentage >= 60 ? 'bg-yellow-50 border border-yellow-200' :
                'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm font-medium ${
                  stats.percentage >= 80 ? 'text-green-800' :
                  stats.percentage >= 60 ? 'text-yellow-800' : 'text-red-800'
                }`}>
                  {stats.percentage >= 80 ? 'Excelente desempenho!' :
                   stats.percentage >= 60 ? 'Bom desempenho!' : 'Continue estudando!'}
                </p>
                <p className={`text-xs mt-1 ${
                  stats.percentage >= 80 ? 'text-green-600' :
                  stats.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stats.percentage >= 80 ? 'Você demonstrou excelente domínio do conteúdo.' :
                   stats.percentage >= 60 ? 'Você está no caminho certo, continue praticando.' :
                   'Revise os conteúdos e pratique mais questões.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => setShowReview(true)}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Eye className="h-5 w-5" />
            <span>Revisar Questões</span>
          </button>
          
          <button
            onClick={() => router.push('/simulados/provas-integra')}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <TrendingUp className="h-5 w-5" />
            <span>Fazer Outra Prova</span>
          </button>
        </div>
      </div>
    </div>
  );
}