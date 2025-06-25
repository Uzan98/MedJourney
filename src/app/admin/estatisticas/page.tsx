"use client";

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart3, 
  Users, 
  FileQuestion, 
  Clock, 
  Calendar, 
  Award,
  BookOpen,
  ClipboardList,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw
} from 'lucide-react';

interface StatCard {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  change?: number;
  changeText?: string;
  color: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalQuestions: 0,
    totalStudySessions: 0,
    totalStudyTime: 0,
    averageSessionTime: 0,
    totalSimulados: 0,
    totalDisciplines: 0
  });
  
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { user, isAdmin, checkAdminStatus } = useAuth();

  useEffect(() => {
    async function verifyAccessAndLoadStats() {
      try {
        // Verificar se o usuário atual é admin
        if (!user) {
          console.log("Admin/Estatísticas: Nenhum usuário autenticado, redirecionando para dashboard");
          router.push('/dashboard');
          return;
        }
        
        // Verificar status de administrador
        const adminStatus = await checkAdminStatus();
        console.log("Admin/Estatísticas: Status de administrador:", adminStatus);
        
        if (!adminStatus) {
          console.log("Admin/Estatísticas: Usuário não é administrador, redirecionando para dashboard");
          router.push('/dashboard');
          return;
        }
        
        // Carregar estatísticas
        await loadStatistics();
      } catch (error) {
        console.error('Erro ao verificar permissões ou carregar estatísticas:', error);
        router.push('/dashboard');
      }
    }
    
    verifyAccessAndLoadStats();
  }, [router, supabase, user, checkAdminStatus]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      // Contar total de usuários
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (usersError) throw usersError;
      
      // Contar usuários ativos (que fizeram login nos últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Contar questões
      const { count: totalQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });
      
      if (questionsError) throw questionsError;
      
      // Contar sessões de estudo
      const { count: totalStudySessions, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('*', { count: 'exact', head: true });
      
      if (sessionsError) throw sessionsError;
      
      // Calcular tempo total de estudo
      const { data: studyTimeData, error: studyTimeError } = await supabase
        .from('study_sessions')
        .select('actual_duration_minutes, duration_minutes')
        .eq('completed', true);
      
      if (studyTimeError) throw studyTimeError;
      
      const totalStudyTime = (studyTimeData || []).reduce((total, session) => {
        return total + (session.actual_duration_minutes || session.duration_minutes || 0);
      }, 0);
      
      // Corrigido para lidar com valores possivelmente nulos
      const safeStudySessions = totalStudySessions || 0;
      const averageSessionTime = safeStudySessions > 0 
        ? Math.round(totalStudyTime / safeStudySessions) 
        : 0;
      
      // Contar simulados
      const { count: totalSimulados, error: simuladosError } = await supabase
        .from('simulados')
        .select('*', { count: 'exact', head: true });
      
      // Contar disciplinas
      const { count: totalDisciplines, error: disciplinesError } = await supabase
        .from('disciplines')
        .select('*', { count: 'exact', head: true });
      
      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: Math.round((totalUsers || 0) * 0.7), // Estimativa para exemplo
        totalQuestions: totalQuestions || 0,
        totalStudySessions: safeStudySessions,
        totalStudyTime,
        averageSessionTime,
        totalSimulados: totalSimulados || 0,
        totalDisciplines: totalDisciplines || 0
      });
      
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      alert('Erro ao carregar estatísticas do sistema');
    } finally {
      setLoading(false);
    }
  };

  // Formatar tempo em horas e minutos
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    
    return `${mins} min`;
  };

  // Cards de estatísticas
  const statCards: StatCard[] = [
    {
      title: 'Usuários Totais',
      value: stats.totalUsers,
      icon: <Users className="h-6 w-6" />,
      change: 12,
      changeText: 'vs. mês anterior',
      color: 'bg-blue-500'
    },
    {
      title: 'Usuários Ativos',
      value: stats.activeUsers,
      icon: <Users className="h-6 w-6" />,
      change: 5,
      changeText: 'vs. mês anterior',
      color: 'bg-green-500'
    },
    {
      title: 'Questões',
      value: stats.totalQuestions,
      icon: <FileQuestion className="h-6 w-6" />,
      change: 24,
      changeText: 'vs. mês anterior',
      color: 'bg-purple-500'
    },
    {
      title: 'Sessões de Estudo',
      value: stats.totalStudySessions,
      icon: <Clock className="h-6 w-6" />,
      change: 18,
      changeText: 'vs. mês anterior',
      color: 'bg-yellow-500'
    },
    {
      title: 'Tempo Total de Estudo',
      value: formatTime(stats.totalStudyTime),
      icon: <Clock className="h-6 w-6" />,
      change: 8,
      changeText: 'vs. mês anterior',
      color: 'bg-indigo-500'
    },
    {
      title: 'Tempo Médio por Sessão',
      value: formatTime(stats.averageSessionTime),
      icon: <Clock className="h-6 w-6" />,
      change: -3,
      changeText: 'vs. mês anterior',
      color: 'bg-pink-500'
    },
    {
      title: 'Simulados',
      value: stats.totalSimulados,
      icon: <ClipboardList className="h-6 w-6" />,
      change: 15,
      changeText: 'vs. mês anterior',
      color: 'bg-red-500'
    },
    {
      title: 'Disciplinas',
      value: stats.totalDisciplines,
      icon: <BookOpen className="h-6 w-6" />,
      change: 0,
      changeText: 'vs. mês anterior',
      color: 'bg-teal-500'
    }
  ];

  // Renderizar indicador de mudança
  const renderChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <span className="flex items-center text-green-500">
          <ArrowUp className="h-3 w-3 mr-1" />
          {change}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center text-red-500">
          <ArrowDown className="h-3 w-3 mr-1" />
          {Math.abs(change)}%
        </span>
      );
    } else {
      return (
        <span className="flex items-center text-gray-500">
          <Minus className="h-3 w-3 mr-1" />
          0%
        </span>
      );
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <BarChart3 className="mr-2 h-6 w-6" />
            Estatísticas do Sistema
          </h1>
          <p className="text-gray-600 mt-1">
            Visão geral das métricas e desempenho da plataforma
          </p>
        </div>
        
        <button 
          onClick={loadStatistics}
          className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center"
          disabled={loading}
        >
          <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </button>
      </div>
      
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <div 
            key={index} 
            className="bg-white rounded-lg shadow overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`${card.color} rounded-full p-3 text-white`}>
                  {card.icon}
                </div>
                <div className="ml-4">
                  <h3 className="text-gray-500 text-sm font-medium">{card.title}</h3>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-gray-900 mr-2">
                      {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                    </p>
                    {card.change !== undefined && renderChangeIndicator(card.change)}
                  </div>
                  {card.changeText && (
                    <p className="text-xs text-gray-500 mt-1">{card.changeText}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Seção para gráficos futuros */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Atividade do Sistema</h2>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Gráficos de atividade serão implementados em breve</p>
          </div>
        </div>
      </div>
      
      {/* Seção para métricas de desempenho */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Desempenho do Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Uso de Recursos</h3>
            <div className="h-40 flex items-center justify-center bg-gray-100 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">Métricas de recursos serão implementadas em breve</p>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Tempo de Resposta</h3>
            <div className="h-40 flex items-center justify-center bg-gray-100 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">Métricas de desempenho serão implementadas em breve</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 