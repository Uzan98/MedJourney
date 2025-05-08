"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, FileQuestion, BookOpen, Flag, Award } from 'lucide-react';
import { Question, QuestionsBankService } from '@/services/questions-bank.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline } from '@/lib/supabase';

export default function PraticarQuestoesPage() {
  const router = useRouter();
  
  // Estados para configuração da prática
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedQuestionsCount, setSelectedQuestionsCount] = useState(10);
  const [loading, setLoading] = useState(false);
  
  // Estados para a prática
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: string | boolean}>({});
  const [results, setResults] = useState<{[key: number]: boolean}>({});
  const [showResults, setShowResults] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Carregar disciplinas
  useEffect(() => {
    const loadDisciplines = async () => {
      try {
        const data = await DisciplinesRestService.getDisciplines(true);
        setDisciplines(data || []);
      } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
        toast.error('Erro ao carregar disciplinas');
      }
    };
    
    loadDisciplines();
  }, []);
  
  // Timer para contagem do tempo
  useEffect(() => {
    if (!isConfiguring && questions.length > 0 && !showResults) {
      const interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      
      setTimerInterval(interval);
      
      return () => clearInterval(interval);
    }
    
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [isConfiguring, questions, showResults]);
  
  // Iniciar a prática
  const startPractice = async () => {
    setLoading(true);
    
    try {
      // Verificar se as tabelas existem
      const tablesExist = await QuestionsBankService.checkTablesExist();
      
      let questionsData: Question[] = [];
      
      // Obter questões do banco de dados ou usar mock
      if (tablesExist) {
        questionsData = await QuestionsBankService.getUserQuestions();
        
        if (!questionsData || questionsData.length === 0) {
          // Usar dados mockados se não houver questões reais
          questionsData = QuestionsBankService.getMockQuestions();
        }
      } else {
        questionsData = QuestionsBankService.getMockQuestions();
      }
      
      // Filtrar questões
      let filteredQuestions = questionsData;
      
      // Filtrar por disciplina se selecionada
      if (selectedDiscipline) {
        filteredQuestions = filteredQuestions.filter(q => q.discipline_id === selectedDiscipline);
      }
      
      // Filtrar por dificuldade se não for "todas"
      if (selectedDifficulty !== 'all') {
        filteredQuestions = filteredQuestions.filter(q => {
          const normalizedDifficulty = q.difficulty?.toLowerCase();
          return normalizedDifficulty === selectedDifficulty || 
                 (normalizedDifficulty === 'média' && selectedDifficulty === 'media') ||
                 (normalizedDifficulty === 'media' && selectedDifficulty === 'média');
        });
      }
      
      // Embaralhar as questões
      const shuffledQuestions = [...filteredQuestions].sort(() => Math.random() - 0.5);
      
      // Limitar ao número selecionado
      const selectedQuestions = shuffledQuestions.slice(0, selectedQuestionsCount);
      
      if (selectedQuestions.length === 0) {
        toast.error('Nenhuma questão encontrada com os filtros selecionados');
        setLoading(false);
        return;
      }
      
      setQuestions(selectedQuestions);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setResults({});
      setShowResults(false);
      setTimeElapsed(0);
      setIsConfiguring(false);
    } catch (error) {
      console.error('Erro ao iniciar prática:', error);
      toast.error('Ocorreu um erro ao iniciar a prática');
    } finally {
      setLoading(false);
    }
  };
  
  // Navegar para a próxima questão
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishPractice();
    }
  };
  
  // Navegar para a questão anterior
  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  // Selecionar resposta
  const selectAnswer = (questionId: number | string, answerId: string | boolean) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerId
    }));
  };
  
  // Finalizar a prática e mostrar resultados
  const finishPractice = () => {
    // Parar o timer
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    // Calcular resultados
    const practiceResults: {[key: number]: boolean} = {};
    
    questions.forEach(question => {
      if (!question.id) return;
      
      const questionId = question.id;
      const selectedAnswer = selectedAnswers[questionId];
      
      if (selectedAnswer === undefined) {
        practiceResults[questionId] = false;
        return;
      }
      
      // Verificar se a resposta está correta
      if (question.question_type === 'multiple_choice') {
        const correctOptionId = question.answer_options?.find(opt => opt.is_correct)?.id;
        practiceResults[questionId] = selectedAnswer === correctOptionId;
      } else if (question.question_type === 'true_false') {
        practiceResults[questionId] = selectedAnswer.toString() === question.correct_answer;
      } else {
        // Para questões dissertativas, considerar como "pendente de avaliação"
        practiceResults[questionId] = false;
      }
    });
    
    setResults(practiceResults);
    setShowResults(true);
  };
  
  // Formatar o tempo decorrido
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Reiniciar a prática com novos filtros
  const restartPractice = () => {
    setIsConfiguring(true);
    setQuestions([]);
    setSelectedAnswers({});
    setResults({});
    setShowResults(false);
    setTimeElapsed(0);
  };
  
  // Renderizar a tela de configuração
  if (isConfiguring) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link 
          href="/banco-questoes" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          Voltar para o Banco de Questões
        </Link>
        
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="flex items-center mb-6">
            <BookOpen className="h-7 w-7 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Praticar Questões</h1>
          </div>
          
          <p className="text-gray-600 mb-8">
            Configure os parâmetros para iniciar sua sessão de prática
          </p>
          
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Seleção de disciplina */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disciplina</label>
              <select
                value={selectedDiscipline?.toString() || ''}
                onChange={(e) => setSelectedDiscipline(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas as disciplinas</option>
                {disciplines.map(discipline => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Seleção de dificuldade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dificuldade</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todas as dificuldades</option>
                <option value="baixa">Baixa</option>
                <option value="média">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            
            {/* Seleção de quantidade de questões */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Número de questões</label>
              <select
                value={selectedQuestionsCount}
                onChange={(e) => setSelectedQuestionsCount(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="5">5 questões</option>
                <option value="10">10 questões</option>
                <option value="15">15 questões</option>
                <option value="20">20 questões</option>
                <option value="30">30 questões</option>
              </select>
            </div>
            
            <div className="pt-4">
              <button
                onClick={startPractice}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Carregando...
                  </span>
                ) : (
                  <span>Iniciar Prática</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Renderizar tela de resultados
  if (showResults) {
    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(selectedAnswers).length;
    const correctAnswers = Object.values(results).filter(result => result).length;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="text-center mb-8">
            <div className="bg-blue-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="h-10 w-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Resultados da Prática</h1>
            <p className="text-gray-600">Veja como você se saiu nesta sessão</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="text-gray-500 text-sm font-medium mb-2">Pontuação</div>
              <div className="text-3xl font-bold text-blue-600">{score}%</div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="text-gray-500 text-sm font-medium mb-2">Corretas</div>
              <div className="text-3xl font-bold text-green-600">{correctAnswers} / {totalQuestions}</div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="text-gray-500 text-sm font-medium mb-2">Respondidas</div>
              <div className="text-3xl font-bold text-blue-600">{answeredQuestions} / {totalQuestions}</div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <div className="text-gray-500 text-sm font-medium mb-2">Tempo Total</div>
              <div className="text-3xl font-bold text-blue-600">{formatTime(timeElapsed)}</div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Detalhes por Questão</h2>
            <div className="space-y-4">
              {questions.map((question, index) => {
                if (!question.id) return null;
                
                const isCorrect = results[question.id];
                const hasAnswer = selectedAnswers[question.id] !== undefined;
                
                return (
                  <div 
                    key={question.id} 
                    className={`p-4 rounded-lg border flex items-start ${
                      isCorrect 
                        ? 'border-green-400 bg-green-50' 
                        : !hasAnswer 
                          ? 'border-yellow-400 bg-yellow-50'
                          : 'border-red-400 bg-red-50'
                    }`}
                  >
                    <div className="flex-shrink-0 mr-4">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center">
                        {isCorrect ? (
                          <CheckCircle className="h-7 w-7 text-green-500" />
                        ) : !hasAnswer ? (
                          <Flag className="h-7 w-7 text-yellow-500" />
                        ) : (
                          <XCircle className="h-7 w-7 text-red-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">
                        Questão {index + 1}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {question.content.replace(/<[^>]*>/g, '')}
                      </p>
                    </div>
                    
                    <Link 
                      href={`/banco-questoes/questao/${question.id}`} 
                      className="ml-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Ver
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={restartPractice}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Nova Prática
            </button>
            
            <Link 
              href="/banco-questoes" 
              className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-center"
            >
              Voltar ao Banco de Questões
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Renderizar questão atual
  const currentQuestion = questions[currentQuestionIndex];
  
  if (!currentQuestion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-8 flex flex-col items-center justify-center">
          <FileQuestion className="h-16 w-16 text-blue-600 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhuma questão disponível</h2>
          <p className="text-gray-600 mb-6">Não foi possível carregar questões para praticar</p>
          <button
            onClick={restartPractice}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-gray-100">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-semibold text-gray-800">
              Questão {currentQuestionIndex + 1} de {questions.length}
            </h2>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              <span>{formatTime(timeElapsed)}</span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={restartPractice}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Recomeçar
            </button>
            
            <button
              onClick={finishPractice}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Finalizar
            </button>
          </div>
        </div>
        
        {/* Conteúdo da questão */}
        <div className="mb-8">
          <div className="prose max-w-none mb-6">
            <div dangerouslySetInnerHTML={{ __html: currentQuestion.content }} />
          </div>
          
          {/* Opções de resposta */}
          <div className="space-y-3 mt-6">
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.answer_options && (
              currentQuestion.answer_options.map(option => (
                <div 
                  key={option.id || Math.random()} 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedAnswers[currentQuestion.id!] === option.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => currentQuestion.id && selectAnswer(currentQuestion.id, String(option.id || ''))}
                >
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                      selectedAnswers[currentQuestion.id!] === option.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {String.fromCharCode(65 + currentQuestion.answer_options!.indexOf(option))}
                    </div>
                    <div className="flex-1">
                      <div dangerouslySetInnerHTML={{ __html: option.text || '' }} />
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {currentQuestion.question_type === 'true_false' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedAnswers[currentQuestion.id!] === 'true'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => currentQuestion.id && selectAnswer(currentQuestion.id, 'true')}
                >
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                      selectedAnswers[currentQuestion.id!] === 'true'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      V
                    </div>
                    <div className="font-medium">Verdadeiro</div>
                  </div>
                </div>
                
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedAnswers[currentQuestion.id!] === 'false'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => currentQuestion.id && selectAnswer(currentQuestion.id, 'false')}
                >
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                      selectedAnswers[currentQuestion.id!] === 'false'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      F
                    </div>
                    <div className="font-medium">Falso</div>
                  </div>
                </div>
              </div>
            )}
            
            {currentQuestion.question_type === 'essay' && (
              <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
                <p className="text-gray-500 italic mb-2">Esta é uma questão dissertativa.</p>
                <p className="text-gray-700">
                  No modo de prática, as questões dissertativas não podem ser respondidas diretamente.
                  Você pode ver a resposta esperada após finalizar a sessão.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Navegação entre questões */}
        <div className="flex justify-between pt-4 border-t border-gray-100">
          <button 
            onClick={previousQuestion} 
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 flex items-center text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Anterior
          </button>
          
          <button 
            onClick={nextQuestion} 
            className="px-4 py-2 flex items-center text-blue-600"
          >
            {currentQuestionIndex === questions.length - 1 ? 'Finalizar' : 'Próxima'}
            {currentQuestionIndex !== questions.length - 1 && <ChevronRight className="h-5 w-5 ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
} 