"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Discipline, Subject } from '@/lib/supabase';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { StudyStreakService, StudyStreak } from '@/lib/study-streak-service';
import { StudySessionService } from '@/services/study-sessions.service';
import { QuestionsBankService, Question } from '@/services/questions-bank.service';
import { ExamsService, Exam, ExamAttempt } from '@/services/exams.service';
import { StudyRoomService, StudyRoom } from '@/services/study-room.service';
import { setupMockStudyRooms } from '@/mocks/study-rooms-mock';
import SimuladosPerformanceChart from '@/components/dashboard/SimuladosPerformanceChart';
import {
  BookOpen,
  Clock,
  Calendar,
  BookMarked,
  BarChart3,
  TrendingUp,
  Award,
  Flame,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  BarChart2,
  User,
  Menu,
  Home,
  BookText,
  GraduationCap,
  Brain,
  History,
  Search,
  Plus,
  FileQuestion,
  ClipboardList,
  Users,
  LucideHelpCircle,
  FileText,
  RefreshCw,
  CheckCircle2,
  Timer,
  Trophy,
  TimerOff,
  Hourglass,
  ArrowUpRight,
  PenSquare,
  Zap
} from 'lucide-react';
import { usePWA } from './PWAProvider';
import InstallPWAButton from './InstallPWAButton';

// Interface para dados de estudo por disciplina
interface StudyByDiscipline {
  name: string;
  minutes: number;
  sessionsCount: number;
  color: string;
}

const MobileDashboard = () => {
  const { isInstallable, isInstalled } = usePWA();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studyByDiscipline, setStudyByDiscipline] = useState<StudyByDiscipline[]>([]);
  const [stats, setStats] = useState({
    totalDisciplines: 0,
    totalSubjects: 0,
    subjectsByDifficulty: { baixa: 0, média: 0, alta: 0 },
    subjectsByImportance: { baixa: 0, média: 0, alta: 0 },
    studyHours: 0
  });
  const [studyStreak, setStudyStreak] = useState<StudyStreak>({
    currentStreak: 0,
    longestStreak: 0,
    totalDaysStudied: 0,
    weekDays: []
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [activeChart, setActiveChart] = useState('dificuldade');
  const [recentQuestions, setRecentQuestions] = useState<Question[]>([]);
  const [questionStats, setQuestionStats] = useState({
    total: 0,
    answered: 0,
    categories: { multiple_choice: 0, true_false: 0, essay: 0 }
  });
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  // Simulados states
  const [myExams, setMyExams] = useState<Exam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [examStats, setExamStats] = useState({
    total: 0,
    completed: 0,
    averageScore: 0,
    bestScore: 0
  });
  const [loadingExams, setLoadingExams] = useState(false);
  
  // Comunidade states
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>([]);
  const [communityStats, setCommunityStats] = useState({
    total_time: 0,
    sessions: 0
  });
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  // Carregar dados do dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Registrar login diário do usuário
        await StudyStreakService.recordDailyLogin();
        
        // Carregar disciplinas
        const disciplinesData = await DisciplinesRestService.getDisciplines(true);
        setDisciplines(disciplinesData || []);
        
        // Variáveis para estatísticas
        let allSubjects: Subject[] = [];
        let totalHours = 0;
        
        // Verificar se existem disciplinas
        if (disciplinesData && disciplinesData.length > 0) {
          // Carregar assuntos de cada disciplina
          for (const discipline of disciplinesData) {
            try {
              const disciplineSubjects = await DisciplinesRestService.getSubjects(discipline.id);
              if (disciplineSubjects) {
                allSubjects = [...allSubjects, ...disciplineSubjects];
                
                // Calcular horas estimadas
                disciplineSubjects.forEach((subject: Subject) => {
                  totalHours += subject.estimated_hours || 0;
                });
              }
            } catch (error) {
              console.error(`Erro ao carregar assuntos da disciplina ${discipline.id}:`, error);
            }
          }
        }
        
        // Atualizar estado com os assuntos
        setSubjects(allSubjects);
        
        // Calcular contagens por dificuldade e importância
        const subjectsByDifficulty = {
          baixa: allSubjects.filter(s => s.difficulty === 'baixa').length,
          média: allSubjects.filter(s => s.difficulty === 'média').length,
          alta: allSubjects.filter(s => s.difficulty === 'alta').length
        };
        
        const subjectsByImportance = {
          baixa: allSubjects.filter(s => s.importance === 'baixa').length,
          média: allSubjects.filter(s => s.importance === 'média').length,
          alta: allSubjects.filter(s => s.importance === 'alta').length
        };
        
        // Atualizar estatísticas
        setStats({
          totalDisciplines: disciplinesData?.length || 0,
          totalSubjects: allSubjects.length,
          subjectsByDifficulty,
          subjectsByImportance,
          studyHours: totalHours
        });

        // Carregar sessões de estudo completadas
        const completedSessions = await StudySessionService.getUserSessions(true);
        const completedSessionsOnly = completedSessions.filter(session => session.completed);
        
        // Agrupar sessões por disciplina
        const sessionsGroupedByDiscipline = new Map<number, { name: string, minutes: number, count: number }>();
        
        // Inicializar o Map para todas as disciplinas
        disciplinesData.forEach(discipline => {
          sessionsGroupedByDiscipline.set(discipline.id, { 
            name: discipline.name,
            minutes: 0,
            count: 0
          });
        });
        
        // Somar minutos e contagem de sessões por disciplina
        completedSessionsOnly.forEach(session => {
          if (session.discipline_id) {
            const current = sessionsGroupedByDiscipline.get(session.discipline_id);
            if (current) {
              sessionsGroupedByDiscipline.set(session.discipline_id, {
                ...current,
                minutes: current.minutes + (session.actual_duration_minutes || session.duration_minutes),
                count: current.count + 1
              });
            }
          }
        });
        
        // Converter Map para array e ordenar por minutos (decrescente)
        const studyByDisciplineArray = Array.from(sessionsGroupedByDiscipline.values())
          .filter(item => item.minutes > 0)
          .map((item, index) => ({
            name: item.name,
            minutes: item.minutes,
            sessionsCount: item.count,
            color: `hsl(${index * 25}, 70%, 50%)`
          }))
          .sort((a, b) => b.minutes - a.minutes)
          .slice(0, 5); // Limitar a 5 disciplinas
        
        setStudyByDiscipline(studyByDisciplineArray);
        
        // Carregar dados de sequência de estudos do usuário
        const streakData = await StudyStreakService.getStudyStreak();
        if (streakData) {
          setStudyStreak(streakData);
        }
        
        // Se o usuário está na tab de banco de questões, carregar esses dados
        if (activeTab === 'questions') {
        loadQuestionBankData();
        }
        
        // Se o usuário está na tab de simulados, carregar esses dados
        if (activeTab === 'exams') {
          loadExamsData();
        }
        
        // Se o usuário está na tab de comunidade, carregar esses dados
        if (activeTab === 'community') {
          loadCommunityData();
        }
        
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        toast.error('Erro ao carregar alguns dados');
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [activeTab]);

  // Carregar dados do banco de questões
  const loadQuestionBankData = async () => {
    try {
      setLoadingQuestions(true);
      
      // Verificar se as tabelas existem
      const tablesExist = await QuestionsBankService.checkTablesExist();
      
      let questions: Question[] = [];
      
      // Carregar questões reais do Supabase
      if (tablesExist) {
        const questionsData = await QuestionsBankService.getUserQuestions();
        
        if (questionsData && questionsData.length > 0) {
          questions = questionsData;
          console.log('Carregou questões reais:', questionsData.length);
        } else {
          // Fallback para dados mockados se não houver questões reais
          console.log('Nenhuma questão encontrada, usando dados mock para demo');
          questions = QuestionsBankService.getMockQuestions();
        }
      } else {
        console.log('Tabelas não encontradas, usando dados mock para demo');
        questions = QuestionsBankService.getMockQuestions();
      }
      
      // Ordenar por data de criação (mais recentes primeiro)
      questions.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      // Usar apenas as 5 mais recentes para o dashboard
      setRecentQuestions(questions.slice(0, 5));
      
      // Calcular estatísticas
      const total = questions.length;
      // Em um app real, você teria uma tabela/campo para registrar questões respondidas
      // Por enquanto, simulamos que cerca de 70% das questões foram respondidas
      const answered = Math.floor(total * 0.7);
      
      // Contar por tipo de questão
      const multipleChoice = questions.filter(q => q.question_type === 'multiple_choice').length;
      const trueFalse = questions.filter(q => q.question_type === 'true_false').length;
      const essay = questions.filter(q => q.question_type === 'essay').length;
      
      setQuestionStats({
        total,
        answered,
        categories: { 
          multiple_choice: multipleChoice, 
          true_false: trueFalse, 
          essay: essay 
        }
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados do banco de questões:', error);
      toast.error('Erro ao carregar dados do banco de questões');
      
      // Usar dados mockados em caso de erro
      const mockQuestions = QuestionsBankService.getMockQuestions();
      setRecentQuestions(mockQuestions.slice(0, 5));
      
      setQuestionStats({
        total: mockQuestions.length,
        answered: Math.floor(mockQuestions.length * 0.7),
        categories: { 
          multiple_choice: mockQuestions.filter(q => q.question_type === 'multiple_choice').length, 
          true_false: mockQuestions.filter(q => q.question_type === 'true_false').length, 
          essay: mockQuestions.filter(q => q.question_type === 'essay').length
        }
      });
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Formatando a pontuação como porcentagem
  const formatScore = (score?: number) => {
    if (score === undefined || score === null) return '-';
    return `${score}%`;
  };

  // Formatando o tempo para exibição
  const formatTime = (minutes?: number | null) => {
    if (!minutes) return 'Sem limite';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  };

  // Função para formatar tempo de estudo em horas e minutos
  const formatStudyTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} segundos`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minutos`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
      if (remainingMinutes === 0) {
        return `${hours} horas`;
      }
      return `${hours}h ${remainingMinutes}min`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (remainingHours === 0) {
      return `${days} dias`;
    }
    return `${days}d ${remainingHours}h`;
  };

  // Carregar dados de simulados
  const loadExamsData = async () => {
    try {
      setLoadingExams(true);
      
      // Carregar simulados do usuário
      const userExams = await ExamsService.getUserExams();
      setMyExams(userExams || []);
      
      // Carregar tentativas do usuário
      const userAttempts = await ExamsService.getUserAttempts();
      setAttempts(userAttempts || []);
      
      // Calcular estatísticas
      if (userAttempts && userAttempts.length > 0) {
        const completedAttempts = userAttempts.filter(a => a.completed_at);
        const totalScore = completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
        const avgScore = completedAttempts.length > 0 ? Math.round(totalScore / completedAttempts.length) : 0;
        const bestScore = completedAttempts.length > 0 ? 
          Math.max(...completedAttempts.map(a => a.score || 0)) : 0;
        
        setExamStats({
          total: userExams.length,
          completed: completedAttempts.length,
          averageScore: avgScore,
          bestScore: bestScore
        });
      } else {
        setExamStats({
          total: userExams.length,
          completed: 0,
          averageScore: 0,
          bestScore: 0
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados de simulados:', error);
      toast.error('Erro ao carregar dados de simulados');
    } finally {
      setLoadingExams(false);
    }
  };

  // Carregar dados da comunidade
  const loadCommunityData = async () => {
    try {
      setLoadingCommunity(true);
      
      // Configurar salas mockadas se necessário
      await setupMockStudyRooms();
      
      // Carregar salas de estudo
      const rooms = await StudyRoomService.getStudyRooms();
      setStudyRooms(rooms || []);
      
      // Carregar estatísticas do usuário
      const stats = await StudyRoomService.getUserStats();
      setCommunityStats(stats);
      
    } catch (error) {
      console.error('Erro ao carregar dados da comunidade:', error);
      toast.error('Erro ao carregar dados da comunidade');
    } finally {
      setLoadingCommunity(false);
    }
  };

  // Monitorar mudanças na tab ativa
  useEffect(() => {
    if (activeTab === 'questions') {
      loadQuestionBankData();
    } else if (activeTab === 'exams') {
      loadExamsData();
    } else if (activeTab === 'community') {
      loadCommunityData();
    }
  }, [activeTab]);

  // Renderizar gráfico de barras simplificado para tempo de estudo por disciplina
  const renderStudyByDisciplineChart = () => {
    if (studyByDiscipline.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">Nenhuma sessão de estudo registrada</p>
        </div>
      );
    }

    // Encontrar o valor máximo para escalar corretamente o gráfico
    const maxMinutes = Math.max(...studyByDiscipline.map(d => d.minutes));
    
    return (
      <div className="space-y-4">
        {studyByDiscipline.map((discipline, index) => {
          // Converter minutos em horas e minutos formatados
          const hours = Math.floor(discipline.minutes / 60);
          const mins = discipline.minutes % 60;
          const timeDisplay = hours > 0 
            ? `${hours}h ${mins}min` 
            : `${mins}min`;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium truncate max-w-[180px]">{discipline.name}</span>
                <span>{timeDisplay}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="h-2 rounded-full"
                  style={{ 
                    width: `${(discipline.minutes / maxMinutes) * 100}%`,
                    backgroundColor: discipline.color
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">{discipline.sessionsCount} sessões</p>
            </div>
          );
        })}
      </div>
    );
  };

  // Renderizar conteúdo com base na tab ativa
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4 px-1">
            {/* Cards de estatísticas com design moderno */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3.5 text-white shadow-md">
                <div className="bg-white/20 w-10 h-10 rounded-lg flex items-center justify-center mb-2 shadow-inner">
                  <BookOpen className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium opacity-90">Disciplinas</p>
                <p className="text-xl font-bold mt-1">{stats.totalDisciplines}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3.5 text-white shadow-md">
                <div className="bg-white/20 w-10 h-10 rounded-lg flex items-center justify-center mb-2 shadow-inner">
                  <BookMarked className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium opacity-90">Assuntos</p>
                <p className="text-xl font-bold mt-1">{stats.totalSubjects}</p>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-3.5 text-white shadow-md">
                <div className="bg-white/20 w-10 h-10 rounded-lg flex items-center justify-center mb-2 shadow-inner">
                  <Clock className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium opacity-90">Horas Estudadas</p>
                <p className="text-xl font-bold mt-1">{stats.studyHours}</p>
              </div>
              
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-3.5 text-white shadow-md">
                <div className="bg-white/20 w-10 h-10 rounded-lg flex items-center justify-center mb-2 shadow-inner">
                  <Award className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium opacity-90">Alta Importância</p>
                <p className="text-xl font-bold mt-1">{stats.subjectsByImportance.alta}</p>
              </div>
            </div>
            
            {/* Sequência de estudos */}
            <div className="bg-white rounded-xl p-3.5 mt-3 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-800 flex items-center">
                  <Flame className="h-5 w-5 text-orange-500 mr-1.5" />
                  Sequência de Estudos
                </h2>
                <div className="text-sm bg-gradient-to-r from-orange-500 to-orange-600 text-white py-1 px-3 rounded-full font-medium shadow-sm">
                  <span className="font-bold">{studyStreak.currentStreak}</span> dias
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl py-2.5 px-2 mx-1">
                <div className="flex items-center justify-center space-x-1">
                  {studyStreak.weekDays && studyStreak.weekDays.length > 0 ? studyStreak.weekDays.map((day, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="text-xs font-medium text-gray-600">{day.dayName}</div>
                      <div 
                        className={`
                          w-8 h-8 flex items-center justify-center rounded-full my-1
                          ${day.isToday ? 'ring-1 ring-blue-400 ring-offset-1' : ''}
                          ${day.hasStudied 
                            ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-sm' 
                            : 'bg-white border border-gray-200 text-gray-500'}
                          transition-all duration-200
                        `}
                      >
                        {day.hasStudied 
                          ? <Flame className="h-4 w-4" /> 
                          : <span className="text-xs font-medium">{day.dayNumber}</span>}
                      </div>
                      <div className="text-[10px] font-medium">
                        {day.hasStudied ? (
                          <span className="inline-flex items-center px-1 rounded-full bg-green-100 text-green-800">
                            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                            <span>OK</span>
                          </span>
                        ) : day.isToday ? (
                          <span className="inline-flex items-center px-1 rounded-full bg-blue-100 text-blue-800">Hoje</span>
                        ) : null}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-2 w-full">
                      <p className="text-sm text-gray-500">Nenhum dado de sequência disponível</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-1.5">
                  <button className="p-1 rounded-full hover:bg-gray-200 text-gray-500">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="p-1 rounded-full hover:bg-gray-200 text-gray-500">
                    <ChevronRight className="h-4 w-4" />
                </button>
                </div>
              </div>
              
              {/* Estatísticas de streak com design moderno */}
              <div className="mt-4 pt-2 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-orange-50 p-2.5 shadow-sm">
                  <p className="text-sm text-orange-700 font-medium">Atual</p>
                  <p className="text-xl font-bold text-orange-600">{studyStreak.currentStreak}</p>
                </div>
                <div className="rounded-xl bg-purple-50 p-2.5 shadow-sm">
                  <p className="text-sm text-purple-700 font-medium">Recorde</p>
                  <p className="text-xl font-bold text-purple-600">{studyStreak.longestStreak}</p>
                </div>
                <div className="rounded-xl bg-blue-50 p-2.5 shadow-sm">
                  <p className="text-sm text-blue-700 font-medium">Semana</p>
                  <p className="text-xl font-bold text-blue-600">{studyStreak.totalDaysStudied}</p>
                </div>
              </div>
            </div>
            
            {/* Desempenho em simulados */}
            <div className="bg-white rounded-xl p-3.5 mt-3 shadow-sm">
              <SimuladosPerformanceChart />
            </div>
            
            {/* Tempo de estudo */}
            <div className="bg-white rounded-xl p-3.5 mt-3 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-800 flex items-center">
                  <BarChart2 className="h-5 w-5 text-green-500 mr-1.5" />
                  Tempo de Estudo
                </h2>
              </div>
              
              {renderStudyByDisciplineChart()}
            </div>
            
            {/* Gráficos com botões simples */}
            <div className="bg-white rounded-xl p-3.5 mt-3 shadow-sm">
              <div className="flex gap-2 mb-3">
                <button 
                  onClick={() => setActiveChart('dificuldade')}
                  className={`py-1.5 px-3 text-sm font-medium rounded-md transition-colors
                    ${activeChart === 'dificuldade' ? 
                      'bg-blue-600 text-white shadow-sm' : 
                      'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Dificuldade
                </button>
                <button 
                  onClick={() => setActiveChart('importancia')}
                  className={`py-1.5 px-3 text-sm font-medium rounded-md transition-colors
                    ${activeChart === 'importancia' ? 
                      'bg-purple-600 text-white shadow-sm' : 
                      'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Importância
                </button>
              </div>
              
              {activeChart === 'dificuldade' ? (
                <div>
                  <div className="flex items-center mb-3">
                    <TrendingUp className="h-5 w-5 text-blue-500 mr-1.5" />
                    <h2 className="text-sm font-semibold text-gray-800">Dificuldade dos Assuntos</h2>
                </div>
                {renderDifficultyChart()}
              </div>
              ) : (
                <div>
                  <div className="flex items-center mb-3">
                    <TrendingUp className="h-5 w-5 text-purple-500 mr-1.5" />
                    <h2 className="text-sm font-semibold text-gray-800">Importância dos Assuntos</h2>
                </div>
                {renderImportanceChart()}
              </div>
              )}
            </div>
            
            {/* Dica rápida */}
            <div className="bg-white rounded-xl p-3.5 border-l-4 border-blue-500 mt-3 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-2 flex items-center">
                <BookText className="h-5 w-5 text-blue-500 mr-1.5" />
                Dica de Estudo
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">Revisar o conteúdo regularmente aumenta sua retenção em até 80%. Tente revisar assuntos pelo menos uma vez por semana.</p>
            </div>
            
            {/* Acesso rápido */}
            <div className="bg-white rounded-xl p-3.5 mt-3 mb-2 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                <BookMarked className="h-5 w-5 text-indigo-500 mr-1.5" />
                Acesso Rápido
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard/disciplinas">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center text-white mb-2 shadow-sm">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <span className="text-sm text-blue-700 font-medium">Disciplinas</span>
                  </div>
                </Link>
                
                <Link href="/dashboard/planejamento">
                  <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-purple-500 w-10 h-10 rounded-full flex items-center justify-center text-white mb-2 shadow-sm">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <span className="text-sm text-purple-700 font-medium">Planejamento</span>
                  </div>
                </Link>
                
                <Link href="/dashboard/historico">
                  <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-green-500 w-10 h-10 rounded-full flex items-center justify-center text-white mb-2 shadow-sm">
                      <History className="h-5 w-5" />
                    </div>
                    <span className="text-sm text-green-700 font-medium">Histórico</span>
                  </div>
                </Link>
                
                <Link href="/dashboard/desempenho">
                  <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-amber-500 w-10 h-10 rounded-full flex items-center justify-center text-white mb-2 shadow-sm">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <span className="text-sm text-amber-700 font-medium">Desempenho</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        );
      
      case 'disciplines':
        return (
          <div className="space-y-3 px-1">
            <div className="bg-white rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold text-gray-800 flex items-center">
                  <BookOpen className="h-4 w-4 text-blue-500 mr-1" />
                  Disciplinas
                </h2>
                <Link href="/dashboard/disciplinas" className="text-blue-600 text-xs font-medium">
                  Ver todas
              </Link>
            </div>
            
              <div className="space-y-2">
                {disciplines.slice(0, 5).map((discipline, index) => {
                  // Contar quantos assuntos estão marcados como concluídos
                  const disciplineSubjects = subjects.filter(s => s.discipline_id === discipline.id);
                  const completedSubjects = disciplineSubjects.filter(s => s.completed).length;
                  const totalSubjects = disciplineSubjects.length;
                  const progress = totalSubjects > 0 ? (completedSubjects / totalSubjects) * 100 : 0;
                  
                  return (
                    <Link href={`/dashboard/disciplinas/${discipline.id}`} key={index}>
                      <div className="p-2.5 rounded-lg hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm text-gray-800">{discipline.name}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {totalSubjects} assuntos • Criada em {new Date(discipline.created_at).toLocaleDateString()}
                            </p>
                        </div>
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden mt-1.5">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                
                {disciplines.length === 0 && (
                  <div className="text-center py-6">
                    <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Nenhuma disciplina cadastrada</p>
                    <Link href="/dashboard/disciplinas/adicionar">
                      <button className="mt-3 px-4 py-1.5 bg-blue-500 text-white rounded-md text-sm">
                        Adicionar Disciplina
                      </button>
                </Link>
              </div>
                )}
              </div>
              
              {disciplines.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-gray-100">
                  <Link href="/dashboard/disciplinas/adicionar">
                    <button className="w-full py-2 flex items-center justify-center text-sm text-blue-600 font-medium">
                      <PlusCircle className="h-4 w-4 mr-1.5" />
                      Nova Disciplina
                    </button>
                </Link>
              </div>
            )}
            </div>
          </div>
        );
      
      case 'studies':
        return (
          <div className="space-y-3 px-1">
            <div className="bg-white rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-base font-semibold text-gray-800 flex items-center">
                  <Clock className="h-4 w-4 text-emerald-500 mr-1" />
                  Sessões de Estudo
                </h2>
                <Link href="/dashboard/estudos" className="text-emerald-600 text-xs font-medium">
                  Ver todas
                </Link>
            </div>
            
              <div className="space-y-2.5 mb-3">
                {studyByDiscipline.length > 0 ? studyByDiscipline.map((discipline, index) => {
                  // Converter minutos em horas e minutos formatados
                  const hours = Math.floor(discipline.minutes / 60);
                  const mins = discipline.minutes % 60;
                  const timeDisplay = hours > 0 
                    ? `${hours}h ${mins}min` 
                    : `${mins}min`;
                    
                  return (
                    <div key={index} className="rounded-lg p-1.5">
                      <div className="flex justify-between text-sm items-center mb-1">
                        <span className="font-medium truncate max-w-[180px]">{discipline.name}</span>
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                          {timeDisplay}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-1.5">
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            width: `${(discipline.minutes / Math.max(...studyByDiscipline.map(d => d.minutes))) * 100}%`, 
                            backgroundColor: discipline.color
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{discipline.sessionsCount} sessões</p>
                    </div>
                  );
                }) : (
                  <div className="text-center py-6">
                    <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Nenhuma sessão de estudo registrada</p>
                    <Link href="/planejamento/nova-sessao">
                      <button className="mt-3 px-4 py-1.5 bg-emerald-500 text-white rounded-md text-sm">
                        Iniciar Estudo
                      </button>
                    </Link>
                    </div>
                )}
              </div>
              
              {studyByDiscipline.length > 0 && (
                <div className="bg-emerald-50 rounded-lg p-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Total Estudado</p>
                    <p className="text-xs text-emerald-600">
                      {Math.floor(studyByDiscipline.reduce((acc, curr) => acc + curr.minutes, 0) / 60)}h {studyByDiscipline.reduce((acc, curr) => acc + curr.minutes, 0) % 60}min
                      <span className="ml-1">• {studyByDiscipline.reduce((acc, curr) => acc + curr.sessionsCount, 0)} sessões</span>
                      </p>
                    </div>
                <Link href="/planejamento/nova-sessao">
                  <button className="p-1.5 bg-emerald-500 text-white rounded-full">
                    <Plus className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            )}
            </div>
          </div>
        );
      
      case 'performance':
        return (
          <div className="space-y-3 px-1">
            {/* Gráficos de dificuldade */}
            <div className="bg-white rounded-lg p-2.5">
              <div className="flex items-center mb-2.5">
                <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                <h2 className="text-sm font-semibold text-gray-800">Dificuldade dos Assuntos</h2>
            </div>
                {renderDifficultyChart()}
              </div>
              
            {/* Gráficos de importância */}
            <div className="bg-white rounded-lg p-2.5 mt-3">
              <div className="flex items-center mb-2.5">
                <TrendingUp className="h-4 w-4 text-purple-500 mr-1" />
                <h2 className="text-sm font-semibold text-gray-800">Importância dos Assuntos</h2>
              </div>
                {renderImportanceChart()}
              </div>
              
            {/* Progresso geral */}
            <div className="bg-white rounded-lg p-2.5 mt-3">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-base font-semibold text-gray-800 flex items-center">
                  <BarChart3 className="h-4 w-4 text-indigo-500 mr-1" />
                  Progresso Geral
                </h2>
                <Link href="/dashboard/desempenho" className="text-indigo-600 text-xs font-medium">
                  Detalhes
                </Link>
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-xs text-gray-500">Concluído</span>
                  <span className="text-xs font-medium">{Math.round(subjects.filter(s => s.completed).length / (subjects.length || 1) * 100)}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.round(subjects.filter(s => s.completed).length / (subjects.length || 1) * 100)}%` }}
                  ></div>
                </div>
                </div>
              </div>
            </div>
        );

      case 'questions':
        return (
          <div className="space-y-3 px-1">
            {/* Cabeçalho do Banco de Questões */}
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center justify-between">
                <div className="flex items-center">
                <FileQuestion className="h-5 w-5 text-indigo-500 mr-1.5" />
                Banco de Questões
                </div>
                <button 
                  onClick={loadQuestionBankData} 
                  className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  disabled={loadingQuestions}
                  aria-label="Atualizar dados"
                >
                  <RefreshCw className={`h-4 w-4 text-gray-600 ${loadingQuestions ? 'animate-spin' : ''}`} />
                </button>
              </h2>
              
              {loadingQuestions ? (
                <div className="flex justify-center items-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
                </div>
              ) : (
                <>
              {/* Cards de estatísticas */}
              <div className="grid grid-cols-3 gap-2.5 mb-3">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-2.5 text-white shadow-sm">
                  <p className="text-xs font-medium opacity-90">Total</p>
                  <p className="text-lg font-bold mt-0.5">{questionStats.total}</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-2.5 text-white shadow-sm">
                  <p className="text-xs font-medium opacity-90">Respondidas</p>
                  <p className="text-lg font-bold mt-0.5">{questionStats.answered}</p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2.5 text-white shadow-sm">
                  <p className="text-xs font-medium opacity-90">Taxa</p>
                  <p className="text-lg font-bold mt-0.5">
                    {questionStats.total > 0 
                      ? `${Math.round((questionStats.answered / questionStats.total) * 100)}%` 
                      : '0%'}
                  </p>
                </div>
              </div>
              
              {/* Ações rápidas */}
              <div className="grid grid-cols-2 gap-2.5">
                    <Link href="/banco-questoes/nova-questao">
                  <div className="bg-indigo-50 p-2.5 rounded-lg flex items-center">
                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mr-2">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-indigo-700">Adicionar</span>
                  </div>
                </Link>
                
                <Link href="/banco-questoes/praticar">
                  <div className="bg-green-50 p-2.5 rounded-lg flex items-center">
                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mr-2">
                      <Brain className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-green-700">Praticar</span>
                  </div>
                </Link>
              </div>
                </>
              )}
            </div>
            
            {/* Categorias de Questões */}
            {!loadingQuestions && (
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-2.5">Tipos de Questões</h3>
              
              <div className="space-y-2.5">
                <div className="flex items-center">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mr-2.5">
                    <FileQuestion className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Múltipla Escolha</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${questionStats.total > 0 ? (questionStats.categories.multiple_choice / questionStats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium ml-2">{questionStats.categories.multiple_choice}</span>
                </div>
                
                <div className="flex items-center">
                  <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mr-2.5">
                    <FileQuestion className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Verdadeiro/Falso</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${questionStats.total > 0 ? (questionStats.categories.true_false / questionStats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium ml-2">{questionStats.categories.true_false}</span>
                </div>
                
                <div className="flex items-center">
                  <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mr-2.5">
                    <FileQuestion className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Dissertativa</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${questionStats.total > 0 ? (questionStats.categories.essay / questionStats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium ml-2">{questionStats.categories.essay}</span>
                </div>
              </div>
            </div>
            )}
            
            {/* Questões recentes */}
            {!loadingQuestions && (
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Questões Recentes</h3>
                <Link href="/banco-questoes" className="text-indigo-600 text-xs font-medium">
                  Ver todas
                </Link>
              </div>
              
              {recentQuestions.length > 0 ? (
                <div className="space-y-2.5">
                  {recentQuestions.map((question, index) => (
                    <Link href={`/banco-questoes/questao/${question.id}`} key={index}>
                      <div className="border border-gray-100 rounded-lg p-2.5 hover:bg-gray-50 transition-colors">
                          <p className="text-sm font-medium line-clamp-2">{question.content}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {question.question_type === 'multiple_choice' ? 'Múltipla Escolha' : 
                               question.question_type === 'true_false' ? 'V/F' : 'Dissertativa'}
                          </span>
                            {question.discipline_id && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                {getDisciplineName(question.discipline_id)}
                              </span>
                            )}
                            {question.difficulty && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                question.difficulty === 'baixa' ? 'bg-green-50 text-green-600' :
                                question.difficulty === 'média' ? 'bg-yellow-50 text-yellow-600' :
                                'bg-red-50 text-red-600'
                              }`}>
                                {question.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Nenhuma questão encontrada</p>
                    <Link href="/banco-questoes/nova-questao">
                    <button className="mt-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium flex items-center mx-auto">
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Questão
                    </button>
                  </Link>
                </div>
              )}
            </div>
            )}
            
            {/* Caixa de dica */}
            <div className="bg-indigo-50 rounded-xl p-3.5 border-l-4 border-indigo-500 shadow-sm">
              <h3 className="text-sm font-semibold text-indigo-800 mb-1.5 flex items-center">
                <LucideHelpCircle className="h-4 w-4 mr-1.5 text-indigo-600" />
                Dica para Estudos
              </h3>
              <p className="text-xs text-indigo-700 leading-relaxed">
                Responder questões regularmente ajuda a fixar o conteúdo. 
                Tente responder pelo menos 5 questões por dia para melhorar seu desempenho nos exames.
              </p>
              </div>
            </div>
        );

      case 'exams':
        return (
          <div className="space-y-3 px-1">
            {/* Cabeçalho dos Simulados */}
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center justify-between">
                <div className="flex items-center">
                  <ClipboardList className="h-5 w-5 text-purple-500 mr-1.5" />
                  Simulados
                </div>
                <button 
                  onClick={loadExamsData} 
                  className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  disabled={loadingExams}
                  aria-label="Atualizar dados"
                >
                  <RefreshCw className={`h-4 w-4 text-gray-600 ${loadingExams ? 'animate-spin' : ''}`} />
                </button>
              </h2>
              
              {loadingExams ? (
                <div className="flex justify-center items-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <>
                  {/* Cards de estatísticas */}
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-2.5 text-white shadow-sm">
                      <p className="text-xs font-medium opacity-90">Total</p>
                      <p className="text-lg font-bold mt-0.5">{examStats.total}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-2.5 text-white shadow-sm">
                      <p className="text-xs font-medium opacity-90">Realizados</p>
                      <p className="text-lg font-bold mt-0.5">{examStats.completed}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2.5 text-white shadow-sm">
                      <p className="text-xs font-medium opacity-90">Média</p>
                      <p className="text-lg font-bold mt-0.5">{formatScore(examStats.averageScore)}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-2.5 text-white shadow-sm">
                      <p className="text-xs font-medium opacity-90">Melhor</p>
                      <p className="text-lg font-bold mt-0.5">{formatScore(examStats.bestScore)}</p>
                    </div>
                  </div>
                  
                  {/* Ações rápidas */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link href="/simulados/novo">
                      <div className="bg-purple-50 p-2.5 rounded-lg flex items-center">
                        <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mr-2">
                          <PenSquare className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-purple-700">Novo Simulado</span>
                      </div>
                    </Link>
                    
                    <Link href="/simulados/meus-resultados">
                      <div className="bg-blue-50 p-2.5 rounded-lg flex items-center">
                        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mr-2">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-blue-700">Resultados</span>
                      </div>
                    </Link>
                  </div>
                </>
              )}
            </div>
            
            {/* Meus Simulados */}
            {!loadingExams && (
              <div className="bg-white rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Meus Simulados</h3>
                  <Link href="/simulados" className="text-purple-600 text-xs font-medium">
                    Ver todos
                  </Link>
                </div>
                
                {myExams.length > 0 ? (
                  <div className="space-y-2.5">
                    {myExams.slice(0, 3).map((exam) => (
                      <Link href={`/simulados/${exam.id}/iniciar`} key={exam.id}>
                        <div className="border border-gray-100 rounded-lg p-2.5 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium line-clamp-1">{exam.title}</p>
                            <div className={`px-2 py-0.5 text-xs rounded-full 
                              ${exam.is_public ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                              {exam.is_public ? 'Público' : 'Privado'}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center">
                              <Timer className="h-3.5 w-3.5 text-gray-500 mr-1" />
                              <span className="text-xs text-gray-500">
                                {formatTime(exam.time_limit)}
                              </span>
                            </div>
                            <span className="flex items-center text-xs px-2 py-1 bg-purple-500 text-white rounded-lg font-medium">
                              Iniciar <ArrowUpRight className="h-3 w-3 ml-0.5" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Nenhum simulado criado</p>
                    <Link href="/simulados/novo">
                      <button className="mt-2 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium flex items-center mx-auto">
                        <PenSquare className="h-4 w-4 mr-1" />
                        Criar Simulado
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            )}
            
            {/* Tentativas Recentes */}
            {!loadingExams && (
              <div className="bg-white rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Tentativas Recentes</h3>
                  <Link href="/simulados/meus-resultados" className="text-purple-600 text-xs font-medium">
                    Ver todas
                  </Link>
                </div>
                
                {attempts.length > 0 ? (
                  <div className="space-y-2.5">
                    {attempts.slice(0, 3).map((attempt) => (
                      <Link href={`/simulados/resultado/${attempt.id}`} key={attempt.id}>
                        <div className="border border-gray-100 rounded-lg p-2.5 hover:bg-gray-50 transition-colors">
                          <p className="text-sm font-medium line-clamp-1">{attempt.exam?.title}</p>
                          <div className="flex justify-between items-center mt-1.5">
                            <div className="flex items-center gap-2">
                              {attempt.completed_at ? (
                                <span className="flex items-center text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="h-3 w-3 mr-0.5" /> Concluído
                                </span>
                              ) : (
                                <span className="flex items-center text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                                  <Hourglass className="h-3 w-3 mr-0.5" /> Em andamento
                                </span>
                              )}
                            </div>
                            {attempt.completed_at && (
                              <div className="flex items-center bg-blue-50 px-2 py-0.5 rounded-full">
                                <Trophy className="h-3.5 w-3.5 text-blue-500 mr-1" />
                                <span className="text-xs font-medium text-blue-600">{formatScore(attempt.score)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Nenhuma tentativa realizada</p>
                    <Link href="/simulados">
                      <button className="mt-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium flex items-center mx-auto">
                        <ClipboardList className="h-4 w-4 mr-1" />
                        Ver Simulados
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            )}
            

            
            {/* Caixa de dica */}
            <div className="bg-purple-50 rounded-xl p-3.5 border-l-4 border-purple-500 shadow-sm">
              <h3 className="text-sm font-semibold text-purple-800 mb-1.5 flex items-center">
                <LucideHelpCircle className="h-4 w-4 mr-1.5 text-purple-600" />
                Dica para Simulados
              </h3>
              <p className="text-xs text-purple-700 leading-relaxed">
                Fazer simulados regularmente ajuda a identificar seus pontos fracos 
                e avaliar seu progresso. Tente fazer pelo menos um simulado por semana!
              </p>
            </div>
          </div>
        );

      case 'community':
        return (
          <div className="space-y-3 px-1">
            {/* Cabeçalho da Comunidade */}
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-500 mr-1.5" />
                  Comunidade
                </div>
                <button 
                  onClick={loadCommunityData} 
                  className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  disabled={loadingCommunity}
                  aria-label="Atualizar dados"
                >
                  <RefreshCw className={`h-4 w-4 text-gray-600 ${loadingCommunity ? 'animate-spin' : ''}`} />
                </button>
              </h2>
              
              {loadingCommunity ? (
                <div className="flex justify-center items-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  {/* Estatísticas do usuário */}
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-2.5 text-white shadow-sm">
                      <p className="text-xs font-medium opacity-90">Tempo Total</p>
                      <p className="text-lg font-bold mt-0.5">{formatStudyTime(communityStats.total_time)}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-2.5 text-white shadow-sm">
                      <p className="text-xs font-medium opacity-90">Sessões</p>
                      <p className="text-lg font-bold mt-0.5">{communityStats.sessions}</p>
                    </div>
                  </div>
                  
                  {/* Ações rápidas */}
                  <Link href="/comunidade/grupos-estudos">
                    <div className="bg-blue-50 p-2.5 rounded-lg flex items-center hover:bg-blue-100 transition-colors">
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mr-2">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-blue-700">Grupos de Estudos</span>
                        <p className="text-xs text-blue-500">Participe de grupos personalizados</p>
                      </div>
                    </div>
                  </Link>
                </>
              )}
            </div>
            
            {/* Dica de estudos em grupo */}
            <div className="bg-blue-50 rounded-xl p-3.5 border-l-4 border-blue-500 shadow-sm">
              <h3 className="text-sm font-semibold text-blue-800 mb-1.5 flex items-center">
                <LucideHelpCircle className="h-4 w-4 mr-1.5 text-blue-600" />
                Dica de Estudo
              </h3>
              <p className="text-xs text-blue-700 leading-relaxed">
                Estudar em grupo pode aumentar sua motivação e produtividade. Participe dos grupos de estudo e mantenha-se conectado com outros estudantes!
              </p>
            </div>
            
            {/* Em breve */}
            <div className="bg-white rounded-xl p-3.5 shadow-sm border border-dashed border-gray-300">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Zap className="h-4 w-4 mr-1.5 text-amber-500" />
                Em Breve
              </h3>
              <p className="text-xs text-gray-600 mb-2">
                Novos recursos de comunidade estão a caminho! Fique atento para fóruns de discussão, grupos de estudo e muito mais.
              </p>
              <div className="flex items-center justify-center">
                <span className="text-xs bg-amber-100 text-amber-600 px-2.5 py-1 rounded-full">
                  Novidades em breve
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Renderizar gráfico de barras para dificuldade
  const renderDifficultyChart = () => {
    const { baixa, média, alta } = stats.subjectsByDifficulty;
    const maxValue = Math.max(baixa, média, alta, 1); // Evitar divisão por zero
    
    return (
      <div className="flex flex-col space-y-3">
        <div className="flex items-center">
          <span className="w-12 text-sm text-gray-700 font-medium">Baixa</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" 
              style={{ width: `${(baixa / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-3 text-sm font-semibold w-6 text-right">{baixa}</span>
        </div>
        
        <div className="flex items-center">
          <span className="w-12 text-sm text-gray-700 font-medium">Média</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full" 
              style={{ width: `${(média / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-3 text-sm font-semibold w-6 text-right">{média}</span>
        </div>
        
        <div className="flex items-center">
          <span className="w-12 text-sm text-gray-700 font-medium">Alta</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full" 
              style={{ width: `${(alta / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-3 text-sm font-semibold w-6 text-right">{alta}</span>
        </div>
      </div>
    );
  };

  // Renderizar gráfico de barras para importância
  const renderImportanceChart = () => {
    const { baixa, média, alta } = stats.subjectsByImportance;
    const maxValue = Math.max(baixa, média, alta, 1); // Evitar divisão por zero
    
    return (
      <div className="flex flex-col space-y-3">
        <div className="flex items-center">
          <span className="w-12 text-sm text-gray-700 font-medium">Baixa</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" 
              style={{ width: `${(baixa / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-3 text-sm font-semibold w-6 text-right">{baixa}</span>
        </div>
        
        <div className="flex items-center">
          <span className="w-12 text-sm text-gray-700 font-medium">Média</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full" 
              style={{ width: `${(média / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-3 text-sm font-semibold w-6 text-right">{média}</span>
        </div>
        
        <div className="flex items-center">
          <span className="w-12 text-sm text-gray-700 font-medium">Alta</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full" 
              style={{ width: `${(alta / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-3 text-sm font-semibold w-6 text-right">{alta}</span>
        </div>
      </div>
    );
  };

  // Função para obter o nome da disciplina pelo ID
  const getDisciplineName = (disciplineId?: number) => {
    if (!disciplineId) return '';
    const discipline = disciplines.find(d => d.id === disciplineId);
    return discipline?.name || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden">
      {/* Header with modern design */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white w-full rounded-b-2xl shadow-lg">
        <div className="px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Genoma</h1>
              <p className="text-sm text-blue-100 mt-1 flex items-center">
                <User className="h-4 w-4 mr-1.5 opacity-80" />
                Olá, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isInstallable && !isInstalled && (
                <InstallPWAButton variant="subtle" className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-3 py-1.5">
                  <span className="text-xs font-medium flex items-center">
                    <PlusCircle className="h-3.5 w-3.5 mr-1" />
                    Instalar
                  </span>
                </InstallPWAButton>
              )}
              <Link href="/perfil">
                <div className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center shadow-sm">
                  <User className="h-5 w-5" />
                </div>
              </Link>
            </div>
          </div>
          <div className="mt-3 flex items-center bg-white/10 rounded-lg p-2.5 shadow-inner">
            <Flame className="h-5 w-5 text-orange-300 mr-2" />
            <p className="text-sm font-medium">
              {studyStreak.currentStreak > 0 ? 
                `${studyStreak.currentStreak} dias de estudo consecutivos 🔥` : 
                'Comece sua sequência de estudos hoje!'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Conteúdo principal com melhor espaçamento */}
      <div className="w-full py-4 pb-20 px-3">
        {renderTabContent()}
      </div>
      
      {/* Navegação inferior moderna - apenas ícones */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-2 z-10 shadow-lg">
        <div className="flex justify-around items-center px-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className="p-1.5"
          >
            <div className={`w-10 h-10 flex items-center justify-center rounded-full 
              ${activeTab === 'overview' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' 
                : 'bg-gray-100 text-gray-500'}`}
            >
              <Home className="h-5 w-5" />
            </div>
          </button>
          
          <button 
            onClick={() => setActiveTab('disciplines')}
            className="p-1.5"
          >
            <div className={`w-10 h-10 flex items-center justify-center rounded-full 
              ${activeTab === 'disciplines' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' 
                : 'bg-gray-100 text-gray-500'}`}
            >
              <BookOpen className="h-5 w-5" />
            </div>
          </button>
          
          <Link 
            href="/planejamento"
            className="p-1.5"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm">
              <BookText className="h-5 w-5" />
            </div>
          </Link>
          
          <button
            onClick={() => setActiveTab('exams')}
            className="p-1.5"
          >
            <div className={`w-10 h-10 flex items-center justify-center rounded-full 
              ${activeTab === 'exams' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' 
                : 'bg-gray-100 text-gray-500'}`}
            >
              <ClipboardList className="h-5 w-5" />
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('community')}
            className="p-1.5"
          >
            <div className={`w-10 h-10 flex items-center justify-center rounded-full 
              ${activeTab === 'community' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' 
                : 'bg-gray-100 text-gray-500'}`}
            >
              <Users className="h-5 w-5" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboard;
