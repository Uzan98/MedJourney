"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Discipline, Subject } from '@/lib/supabase';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import {
  BookOpen,
  Clock,
  Calendar,
  BookMarked,
  BarChart3,
  TrendingUp,
  Layers,
  Brain,
  ArrowUpRight,
  Award,
  Flame,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Função auxiliar para gerar dias da semana
const getDaysOfWeek = () => {
  const today = new Date();
  const days = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    days.push({
      date,
      dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3),
      dayNumber: date.getDate(),
      isToday: i === 0,
      // Vamos simular dias com estudo - em um app real, isso viria do banco de dados
      hasStudied: Math.random() > 0.3 // Aleatório para demonstração
    });
  }
  
  return days;
};

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState({
    totalDisciplines: 0,
    totalSubjects: 0,
    subjectsByDifficulty: { baixa: 0, média: 0, alta: 0 },
    subjectsByImportance: { baixa: 0, média: 0, alta: 0 },
    studyHours: 0
  });
  const [studyStreak, setStudyStreak] = useState({
    currentStreak: 0,
    longestStreak: 0,
    weekDays: getDaysOfWeek(),
    totalDaysStudied: 0
  });
  
  // Carregar dados do dashboard
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
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
        
        // Simular dados de sequência de estudos (streak)
        // Em um app real, isso viria do banco de dados
        const weekDays = getDaysOfWeek();
        const studiedDays = weekDays.filter(day => day.hasStudied);
        const currentStreak = calculateCurrentStreak(weekDays);
        
        setStudyStreak({
          currentStreak,
          longestStreak: Math.max(currentStreak, 5), // Valor fictício para demonstração
          weekDays,
          totalDaysStudied: studiedDays.length
        });
        
        // Exibir mensagem de boas-vindas
        toast.success('Bem-vindo ao Dashboard!');
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        toast.error('Erro ao carregar alguns dados');
      } finally {
        // Garantir que o carregamento termine
        setLoading(false);
      }
    };
    
    // Adicionar um timeout de segurança para garantir que o loading termine
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);
    
    loadDashboardData();
    
    return () => clearTimeout(safetyTimeout);
  }, []);
  
  // Função para calcular a sequência atual (para demonstração)
  const calculateCurrentStreak = (days) => {
    let streak = 0;
    const today = new Date();
    
    // Começamos do dia atual e voltamos até encontrar um dia sem estudo
    for (let i = 0; i < days.length; i++) {
      const day = days[days.length - 1 - i];
      if (day.hasStudied) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao fazer logout');
    }
  };
  
  // Renderizar loading state
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 border-solid mb-4"></div>
        <p className="text-gray-700">Carregando seu dashboard...</p>
      </div>
    );
  }
  
  // Gráfico de barras para dificuldade
  const renderDifficultyChart = () => {
    const { baixa, média, alta } = stats.subjectsByDifficulty;
    const maxValue = Math.max(baixa, média, alta, 1); // Evitar divisão por zero
    
    return (
      <div className="flex flex-col space-y-2">
        <div className="flex items-center">
          <span className="w-16 text-sm text-gray-600">Baixa</span>
          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full" 
              style={{ width: `${(baixa / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm font-medium">{baixa}</span>
        </div>
        
        <div className="flex items-center">
          <span className="w-16 text-sm text-gray-600">Média</span>
          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 rounded-full" 
              style={{ width: `${(média / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm font-medium">{média}</span>
        </div>
        
        <div className="flex items-center">
          <span className="w-16 text-sm text-gray-600">Alta</span>
          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 rounded-full" 
              style={{ width: `${(alta / maxValue) * 100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm font-medium">{alta}</span>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="mt-1 text-blue-100">
                Olá, {user?.user_metadata?.name || user?.email || 'Usuário'}
              </p>
            </div>
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-md transition-colors"
            >
              Sair
            </button>
          </div>
          
          {/* Cards de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-3 mr-4">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Disciplinas</p>
                  <h3 className="text-2xl font-bold">{stats.totalDisciplines}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-3 mr-4">
                  <BookMarked className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Assuntos</p>
                  <h3 className="text-2xl font-bold">{stats.totalSubjects}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-3 mr-4">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Horas de Estudo</p>
                  <h3 className="text-2xl font-bold">{stats.studyHours}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
              <div className="flex items-center">
                <div className="rounded-full bg-white/20 p-3 mr-4">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100">Alta Importância</p>
                  <h3 className="text-2xl font-bold">{stats.subjectsByImportance.alta}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-6 py-8">
        {/* Seção de Sequência de Estudos */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <Flame className="h-6 w-6 text-orange-500 mr-2" />
              Sequência de Estudos
            </h2>
            <div className="text-sm text-gray-500">
              <span className="font-medium text-orange-500">{studyStreak.currentStreak} dias</span> consecutivos
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5 text-gray-400" />
            </button>
            
            <div className="flex justify-between space-x-2 md:space-x-6">
              {studyStreak.weekDays.map((day, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="text-xs text-gray-500">{day.dayName}</div>
                  <div 
                    className={`
                      w-10 h-10 flex items-center justify-center rounded-full my-2
                      ${day.isToday ? 'border-2 border-blue-400' : ''}
                      ${day.hasStudied 
                        ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white' 
                        : 'bg-gray-100 text-gray-400'}
                    `}
                  >
                    {day.hasStudied 
                      ? <Flame className="h-5 w-5" /> 
                      : day.dayNumber}
                  </div>
                  <div className="text-xs font-medium">
                    {day.hasStudied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : day.isToday ? (
                      <span className="text-blue-500">Hoje</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            
            <button className="p-2 rounded-full hover:bg-gray-100">
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <Flame className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Sequência Atual</p>
                <p className="text-xl font-bold text-orange-600">{studyStreak.currentStreak} dias</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <Award className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Maior Sequência</p>
                <p className="text-xl font-bold text-purple-600">{studyStreak.longestStreak} dias</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total na Semana</p>
                <p className="text-xl font-bold text-blue-600">{studyStreak.totalDaysStudied} dias</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Área principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gráfico de disciplinas */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  Disciplinas e Assuntos
                </h2>
                <BarChart3 className="text-blue-600 h-5 w-5" />
              </div>
              
              <div className="space-y-3 mt-3">
                {disciplines.slice(0, 5).map((discipline) => {
                  const subjectCount = subjects.filter(s => s.discipline_id === discipline.id).length;
                  const percentage = disciplines.length > 0 
                    ? Math.round((subjectCount / subjects.length) * 100) 
                    : 0;
                  
                  return (
                    <div key={discipline.id} className="flex flex-col">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                          {discipline.name}
                        </span>
                        <span className="text-sm text-gray-600">{subjectCount} assuntos</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${percentage || 5}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
                
                {disciplines.length === 0 && (
                  <p className="text-gray-500 text-sm italic">Nenhuma disciplina cadastrada</p>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link 
                  href="/dashboard/disciplinas" 
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                >
                  Ver todas as disciplinas <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
            
            {/* Lista de disciplinas */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Últimas Disciplinas
              </h2>
              
              {disciplines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assuntos
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data de Criação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {disciplines.slice(0, 5).map((discipline) => (
                        <tr key={discipline.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Link href={`/dashboard/disciplinas/${discipline.id}`} className="text-blue-600 hover:text-blue-900">
                              {discipline.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {subjects.filter(s => s.discipline_id === discipline.id).length}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {new Date(discipline.created_at).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6">
                  <BookOpen className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-600">Nenhuma disciplina cadastrada</p>
                  <Link
                    href="/dashboard/disciplinas"
                    className="mt-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Criar disciplina
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar com estatísticas */}
          <div className="space-y-6">
            {/* Gráfico de dificuldade */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Dificuldade dos Assuntos
                </h2>
                <TrendingUp className="text-blue-600 h-5 w-5" />
              </div>
              
              {renderDifficultyChart()}
            </div>
            
            {/* Acesso rápido */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Acesso Rápido
              </h2>
              
              <div className="space-y-3">
                <Link href="/dashboard/disciplinas" className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="bg-blue-100 p-2 rounded-lg mr-3">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">Disciplinas</span>
                  </div>
                </Link>
                
                <Link href="/planejamento" className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="bg-purple-100 p-2 rounded-lg mr-3">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">Planejamento</span>
                  </div>
                </Link>
                
                <Link href="/desempenho" className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="bg-green-100 p-2 rounded-lg mr-3">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">Desempenho</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Dica para estudos */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center mb-4">
            <Brain className="h-8 w-8 mr-4" />
            <h2 className="text-xl font-bold">Dica de Estudo</h2>
          </div>
          
          <p className="text-blue-100">
            Estudos mostram que revisar o conteúdo em intervalos regulares aumenta significativamente a retenção. 
            Tente revisar seus assuntos de alta importância pelo menos uma vez por semana.
          </p>
        </div>
      </div>
    </div>
  );
} 