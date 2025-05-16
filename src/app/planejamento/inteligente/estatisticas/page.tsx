"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  BarChart3, 
  PieChart, 
  Clock, 
  Calendar,
  BookOpen,
  Star, 
  BrainCog,
  BarChart2
} from 'lucide-react';
import SmartPlanningService, { SmartPlan } from '@/services/smart-planning.service';
import { toast } from 'react-hot-toast';

interface StatsSummary {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  totalSessionsPlanned: number;
  totalStudyHours: number;
  averageSessionsPerDay: number;
  topDisciplines: {name: string, sessions: number, minutes: number}[];
}

export default function SmartPlanningStatisticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState<SmartPlan[]>([]);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadPlansAndCalculateStats();
  }, []);

  const loadPlansAndCalculateStats = async () => {
    setIsLoading(true);
    try {
      const { data: plans, error } = await SmartPlanningService.getPlans();
      
      if (error) {
        throw error;
      }
      
      if (plans) {
        setPlans(plans);
        const calculatedStats = calculateStats(plans);
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Não foi possível carregar os dados para estatísticas.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (plans: SmartPlan[]): StatsSummary => {
    // Esta é uma versão simplificada. Em uma versão real, você iria buscar 
    // as sessões de cada plano e fazer cálculos mais detalhados.
    const activePlans = plans.filter(plan => plan.status === 'active').length;
    const completedPlans = plans.filter(plan => plan.status === 'completed').length;
    
    // Dados de exemplo para simulação
    const mockData = {
      totalSessionsPlanned: 245,
      totalStudyHours: 167,
      averageSessionsPerDay: 2.8,
      topDisciplines: [
        {name: 'Anatomia', sessions: 45, minutes: 2850},
        {name: 'Fisiologia', sessions: 38, minutes: 2280},
        {name: 'Bioquímica', sessions: 27, minutes: 1620},
        {name: 'Patologia', sessions: 25, minutes: 1500},
        {name: 'Farmacologia', sessions: 22, minutes: 1320},
      ]
    };
    
    return {
      totalPlans: plans.length,
      activePlans,
      completedPlans,
      ...mockData
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/planejamento/inteligente"
          className="flex items-center text-indigo-600 hover:text-indigo-800 transition-colors font-medium mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar para Planejamento Inteligente
        </Link>
        
        <div className="flex items-center space-x-4">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl shadow-md">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Estatísticas de Estudo</h1>
            <p className="text-gray-600 mt-1">
              Análise detalhada do seu desempenho e hábitos de estudo
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-indigo-100 mb-1">Planos Criados</h3>
                    <p className="text-3xl font-bold">{stats.totalPlans}</p>
                    <p className="text-xs text-indigo-200 mt-1">{stats.activePlans} ativos, {stats.completedPlans} concluídos</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-purple-100 mb-1">Sessões Planejadas</h3>
                    <p className="text-3xl font-bold">{stats.totalSessionsPlanned}</p>
                    <p className="text-xs text-purple-200 mt-1">Média de {stats.averageSessionsPerDay} por dia</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-blue-100 mb-1">Horas de Estudo</h3>
                    <p className="text-3xl font-bold">{stats.totalStudyHours}h</p>
                    <p className="text-xs text-blue-200 mt-1">Planejadas no total</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <BrainCog className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-amber-100 mb-1">Disciplinas</h3>
                    <p className="text-3xl font-bold">{stats.topDisciplines.length}</p>
                    <p className="text-xs text-amber-200 mt-1">Sendo estudadas ativamente</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Discipline Distribution */}
          {stats && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-10">
              <h2 className="text-xl font-bold text-gray-800 flex items-center mb-6">
                <PieChart className="h-5 w-5 mr-2 text-indigo-600" />
                Distribuição por Disciplina
              </h2>

              <div className="space-y-6">
                {stats.topDisciplines.map((discipline, index) => {
                  const percentage = Math.round((discipline.minutes / (stats.totalStudyHours * 60)) * 100);
                  const colors = [
                    'from-blue-500 to-blue-400',
                    'from-purple-500 to-purple-400',
                    'from-indigo-500 to-indigo-400',
                    'from-green-500 to-green-400',
                    'from-amber-500 to-amber-400',
                  ];
                  const bgGradient = colors[index % colors.length];
                  
                  return (
                    <div key={discipline.name} className="bg-gray-50 p-4 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white shadow-sm`}>
                            <Star className="h-5 w-5" />
                          </div>
                          <span className="font-semibold text-gray-800">{discipline.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
                            {discipline.sessions} sessões
                          </span>
                          <span className="text-sm bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full">
                            {Math.floor(discipline.minutes / 60)}h {discipline.minutes % 60}min
                          </span>
                        </div>
                      </div>
                      
                      <div className="relative pt-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-semibold text-indigo-600 uppercase">Proporção do tempo total</div>
                          <div className="text-xs font-bold text-indigo-800">{percentage}%</div>
                        </div>
                        <div className="overflow-hidden h-3 text-xs flex rounded-full bg-gray-200">
                          <div 
                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r ${bgGradient}`} 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suggestions Based on Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center mb-6">
              <BarChart2 className="h-5 w-5 mr-2 text-indigo-600" />
              Análise e Sugestões
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                <h3 className="font-semibold text-indigo-800 mb-3 flex items-center">
                  <Star className="h-4 w-4 mr-2" />
                  Disciplinas com Melhor Desempenho
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                    <span className="text-gray-700">Anatomia</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
                    <span className="text-gray-700">Fisiologia</span>
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50 p-5 rounded-xl border border-amber-100">
                <h3 className="font-semibold text-amber-800 mb-3 flex items-center">
                  <BrainCog className="h-4 w-4 mr-2" />
                  Sugestões de Melhoria
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mr-2 mt-1.5"></div>
                    <span className="text-gray-700">Aumente o tempo dedicado a Bioquímica</span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mr-2 mt-1.5"></div>
                    <span className="text-gray-700">Revise o material de Patologia com mais frequência</span>
                  </li>
                </ul>
              </div>

              <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
                <h3 className="font-semibold text-purple-800 mb-3 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Padrões de Estudo
                </h3>
                <p className="text-gray-700">
                  Você tem estudado consistentemente 5 dias por semana, com sessões mais produtivas durante as manhãs.
                </p>
              </div>

              <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Próximos Passos
                </h3>
                <p className="text-gray-700">
                  Considere adicionar mais sessões de revisão para maximizar a retenção de conteúdo nas disciplinas prioritárias.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 