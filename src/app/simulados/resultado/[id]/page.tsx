'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaHome, FaRedoAlt, FaCheck, FaTimes, FaClock, FaFileAlt, FaChartPie, FaTrophy } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { Exam, ExamQuestion, ExamAttempt, ExamAnswer, ExamsService } from '@/services/exams.service';
import { QuestionsBankService } from '@/services/questions-bank.service';
import Loading from '@/components/Loading';
import Pill from '@/components/Pill';
import DisciplinePerformanceChart, { DisciplinePerformance } from '@/components/DisciplinePerformanceChart';

export default function ResultadoSimulado({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const attemptId = parseInt(params.id);
  
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, ExamAnswer>>({});
  const [questionDetails, setQuestionDetails] = useState<Record<number, any>>({});
  const [disciplinePerformance, setDisciplinePerformance] = useState<DisciplinePerformance[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<DisciplinePerformance[]>([]);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [loadingSubjectPerformance, setLoadingSubjectPerformance] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<any[]>([]);
  const [feedbackByDiscipline, setFeedbackByDiscipline] = useState<any[]>([]);
  const [feedbackBySubject, setFeedbackBySubject] = useState<any[]>([]);
  const [detailedAnalysis, setDetailedAnalysis] = useState<any>(null);
  
  useEffect(() => {
    loadResultData();
  }, [attemptId]);
  
  const loadResultData = async () => {
    setLoading(true);
    try {
      // Carregar dados da tentativa
      const attemptData = await ExamsService.getAttemptById(attemptId);
      if (!attemptData) {
        toast.error('Tentativa não encontrada');
        router.push('/simulados/meus-resultados');
        return;
      }
      
      setAttempt(attemptData);
      
      // Carregar dados do simulado
      const examData = attemptData.exam || await ExamsService.getExamById(attemptData.exam_id);
      if (!examData) {
        toast.error('Simulado não encontrado');
        router.push('/simulados/meus-resultados');
        return;
      }
      
      setExam(examData);
      
      // Carregar questões do simulado
      const questions = await ExamsService.getExamQuestions(examData.id as number, true);
      setExamQuestions(questions);
      
      // Carregar respostas dadas pelo usuário
      const answersData = await ExamsService.getExamAnswers(attemptId);
      
      // Transformar em objeto indexado pelo ID da questão
      const answersMap: Record<number, ExamAnswer> = {};
      answersData.forEach(answer => {
        answersMap[answer.question_id] = answer;
      });
      
      setAnswers(answersMap);
      
      // Carregar detalhes de cada questão (opções, respostas corretas)
      const details: Record<number, any> = {};
      
      for (const question of questions) {
        const questionId = question.question_id;
        const questionType = question.question?.question_type;
        
        if (questionType === 'multiple_choice') {
          // Carregar opções para questões de múltipla escolha
          const options = await QuestionsBankService.getAnswerOptions(questionId);
          details[questionId] = { options };
        }
      }
      
      setQuestionDetails(details);
      
      // Carregar desempenho por disciplina
      loadDisciplinePerformance(attemptId);
      
      // Carregar desempenho por assunto
      loadSubjectPerformance(attemptId);
      
    } catch (error) {
      console.error('Erro ao carregar resultados:', error);
      toast.error('Ocorreu um erro ao carregar os resultados');
      router.push('/simulados/meus-resultados');
    } finally {
      setLoading(false);
    }
  };
  
  const loadDisciplinePerformance = async (attemptId: number) => {
    setLoadingPerformance(true);
    try {
      const performanceData = await ExamsService.getAttemptPerformanceByDiscipline(attemptId);
      setDisciplinePerformance(performanceData);
    } catch (error) {
      console.error('Erro ao carregar desempenho por disciplina:', error);
      toast.error('Não foi possível carregar o desempenho por disciplina');
    } finally {
      setLoadingPerformance(false);
    }
  };
  
  const loadSubjectPerformance = async (attemptId: number) => {
    setLoadingSubjectPerformance(true);
    try {
      const performanceData = await ExamsService.getAttemptPerformanceBySubject(attemptId);
      setSubjectPerformance(performanceData);
    } catch (error) {
      console.error('Erro ao carregar desempenho por assunto:', error);
      toast.error('Não foi possível carregar o desempenho por assunto');
    } finally {
      setLoadingSubjectPerformance(false);
    }
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data indisponível';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const formatDuration = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 'Duração indisponível';
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const durationMs = end - start;
    
    // Converter para minutos e segundos
    const minutes = Math.floor(durationMs / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (minutes < 60) {
      return `${minutes} min ${seconds} seg`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}min ${seconds}s`;
    }
  };
  
  const getQuestionTypeLabel = (type?: string) => {
    if (!type) return 'Desconhecido';
    
    const types: Record<string, string> = {
      multiple_choice: 'Múltipla Escolha',
      true_false: 'Verdadeiro/Falso',
      essay: 'Dissertativa'
    };
    return types[type] || type;
  };
  
  const renderQuestion = (question: ExamQuestion, index: number) => {
    if (!question.question) return null;
    
    const questionId = question.question_id;
    const questionData = question.question;
    const answer = answers[questionId];
    const isCorrect = answer?.is_correct;
    const isEssay = questionData.question_type === 'essay';
    
    // Para questões dissertativas, não há resposta correta automatizada
    const displayStatus = isEssay ? 'neutral' : (isCorrect ? 'correct' : 'incorrect');
    
    return (
      <div key={questionId} className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="border-b bg-gray-50 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            Questão {index + 1}
          </h3>
          <div className="flex items-center">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium mr-2">
              {getQuestionTypeLabel(questionData.question_type)}
            </span>
            
            {displayStatus === 'correct' && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                <FaCheck className="mr-1" /> Correta
              </span>
            )}
            
            {displayStatus === 'incorrect' && (
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                <FaTimes className="mr-1" /> Incorreta
              </span>
            )}
            
            {displayStatus === 'neutral' && (
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
                Dissertativa
              </span>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {/* Enunciado */}
          <div 
            className="quill-content text-gray-700 mb-6 text-lg" 
            dangerouslySetInnerHTML={{ __html: questionData.content || '' }}
          />
          
          {/* Opções/Resposta do Usuário */}
          {questionData.question_type === 'multiple_choice' && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">Alternativas:</h4>
              <div className="space-y-2">
                {questionDetails[questionId]?.options.map((option: any) => {
                  const isSelected = answer?.selected_option_id === option.id;
                  const optionClass = exam?.show_answers
                    ? (option.is_correct
                      ? 'border-green-500 bg-green-50'
                      : isSelected
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200')
                    : (isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200');
                  
                  return (
                    <div 
                      key={option.id}
                      className={`p-3 border rounded-lg ${optionClass}`}
                    >
                      <div className="flex items-start">
                        <div className={`w-5 h-5 mt-0.5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                          isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div 
                          className="quill-content ml-3 text-gray-700" 
                          dangerouslySetInnerHTML={{ __html: option.text }}
                        />
                        
                        {exam?.show_answers && option.is_correct && (
                          <FaCheck className="ml-auto text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {questionData.question_type === 'true_false' && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">Sua resposta:</h4>
              <div className="space-y-2">
                {['true', 'false'].map((value) => {
                  const boolValue = value === 'true';
                  const isSelected = answer?.true_false_answer === boolValue;
                  const isCorrect = (questionData.correct_answer === value);
                  
                  const optionClass = exam?.show_answers
                    ? (boolValue === isCorrect
                      ? 'border-green-500 bg-green-50'
                      : isSelected
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200')
                    : (isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200');
                  
                  return (
                    <div 
                      key={value}
                      className={`p-3 border rounded-lg ${optionClass}`}
                    >
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                          isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </div>
                        <span className="ml-3 font-medium">
                          {boolValue ? 'Verdadeiro' : 'Falso'}
                        </span>
                        
                        {exam?.show_answers && boolValue === isCorrect && (
                          <FaCheck className="ml-auto text-green-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {questionData.question_type === 'essay' && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-2">Sua resposta:</h4>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                {answer?.answer_text ? (
                  <p className="text-gray-700 whitespace-pre-wrap">{answer.answer_text}</p>
                ) : (
                  <p className="text-gray-500 italic">Sem resposta</p>
                )}
              </div>
            </div>
          )}
          
          {/* Explicação (se disponível e se o simulado permite mostrar respostas) */}
          {exam?.show_answers && questionData.explanation && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-700 mb-2">Explicação:</h4>
              <div 
                className="text-gray-600 bg-yellow-50 p-4 rounded-lg"
                dangerouslySetInnerHTML={{ __html: questionData.explanation }}
              />
            </div>
          )}
        </div>
      </div>
    );
  };
  
  if (loading) {
    return <Loading message="Carregando resultados..." />;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div className="flex items-center mb-4 md:mb-0">
            <Link 
              href="/simulados/meus-resultados" 
              className="mr-4 p-2 rounded-full hover:bg-gray-100"
              aria-label="Voltar"
            >
              <FaArrowLeft className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Resultado do Simulado</h1>
              <p className="text-gray-600">{exam?.title}</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/simulados"
              className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              <FaHome className="mr-2" /> Voltar aos Simulados
            </Link>
            <Link
              href={`/simulados/${attempt?.exam_id}/iniciar`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              <FaRedoAlt className="mr-2" /> Refazer Simulado
            </Link>
          </div>
        </div>
        
        {/* Resumo do Desempenho */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
            <h2 className="text-xl font-bold text-white">Resumo do Resultado</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Pontuação */}
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <FaTrophy className="text-blue-600 text-xl" />
                  </div>
                </div>
                <h3 className="text-gray-600 font-medium mb-1">Pontuação</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {attempt?.score !== undefined ? Math.round(attempt.score) : '--'}%
                </p>
              </div>
              
              {/* Acertos */}
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="bg-green-100 p-3 rounded-full">
                    <FaCheck className="text-green-600 text-xl" />
                  </div>
                </div>
                <h3 className="text-gray-600 font-medium mb-1">Acertos</h3>
                <p className="text-3xl font-bold text-green-600">
                  {attempt?.correct_answers || 0}/{attempt?.total_questions || 0}
                </p>
              </div>
              
              {/* Tempo Total */}
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <FaClock className="text-purple-600 text-xl" />
                  </div>
                </div>
                <h3 className="text-gray-600 font-medium mb-1">Tempo Total</h3>
                <p className="text-xl font-bold text-purple-600">
                  {formatDuration(attempt?.started_at, attempt?.completed_at)}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 font-medium mr-2">Início:</span>
                  <span className="text-gray-700">{formatDate(attempt?.started_at)}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 font-medium mr-2">Conclusão:</span>
                  <span className="text-gray-700">{formatDate(attempt?.completed_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Desempenho por Disciplina */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5">
            <h2 className="text-xl font-bold text-white flex items-center">
              <FaChartPie className="mr-2" />
              Desempenho por Disciplina
            </h2>
          </div>
          
          <div className="p-6">
            {loadingPerformance ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
              </div>
            ) : disciplinePerformance.length > 0 ? (
              <DisciplinePerformanceChart data={disciplinePerformance} height={350} />
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500">
                  Não há dados suficientes para mostrar o desempenho por disciplina.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Desempenho por Assunto */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-500 to-teal-600 px-6 py-5">
            <h2 className="text-xl font-bold text-white flex items-center">
              <FaChartPie className="mr-2" />
              Desempenho por Assunto
            </h2>
          </div>
          
          <div className="p-6">
            {loadingSubjectPerformance ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mb-4"></div>
              </div>
            ) : subjectPerformance.length > 0 ? (
              <DisciplinePerformanceChart data={subjectPerformance} height={350} />
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500">
                  Não há dados suficientes para mostrar o desempenho por assunto.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Revisão de Questões */}
        <h2 className="text-xl font-bold text-gray-800 mb-4">Revisão das Questões</h2>
        
        {examQuestions.length > 0 ? (
          <div className="space-y-6">
            {examQuestions.map((question, index) => renderQuestion(question, index))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="bg-blue-100 inline-block p-4 rounded-full mb-4">
              <FaFileAlt className="text-blue-500 text-3xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhuma questão disponível</h3>
            <p className="text-gray-600 mb-6">
              Não foi possível obter as questões deste simulado para revisão.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}