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
  BarChart2,
  CheckCircle
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
  completedSessions?: number;
  completionRate?: number;
  topDisciplines: {name: string, sessions: number, minutes: number, completedSessions?: number}[];
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
      const smartPlanningService = new SmartPlanningService();
      const plans = await smartPlanningService.getUserPlans();
      
      if (plans) {
        setPlans(plans);
        
        // Inicializar contadores
        const activePlans = plans.filter(plan => plan.status === 'active').length;
        const completedPlans = plans.filter(plan => plan.status === 'completed').length;
        
        let totalSessionsPlanned = 0;
        let totalStudyHours = 0;
        let completedSessions = 0;
        let completionRate = 0;
        
        // Mapa para armazenar estatísticas por disciplina
        const disciplineStats: Record<string, {
          name: string, 
          sessions: number, 
          minutes: number,
          completedSessions: number
        }> = {};
        
        // Processar cada plano para obter suas sessões
        for (const plan of plans) {
          try {
            const planSessions = await smartPlanningService.getPlanSessions(plan.id);
            
            if (planSessions && planSessions.length > 0) {
              // Incrementar contadores gerais
              totalSessionsPlanned += planSessions.length;
              
              // Processar cada sessão
              for (const session of planSessions) {
                // Adicionar à contagem total de horas
                totalStudyHours += session.duration_minutes / 60;
                
                // Verificar se a sessão está concluída
                if (session.completed) {
                  completedSessions++;
                }
                
                // Atualizar estatísticas da disciplina
                const disciplineKey = `${session.discipline_id}-${session.discipline_name}`;
                if (!disciplineStats[disciplineKey]) {
                  disciplineStats[disciplineKey] = {
                    name: session.discipline_name || `Disciplina ${session.discipline_id}`,
                    sessions: 0,
                    minutes: 0,
                    completedSessions: 0
                  };
                }
                
                disciplineStats[disciplineKey].sessions++;
                disciplineStats[disciplineKey].minutes += session.duration_minutes;
                
                if (session.completed) {
                  disciplineStats[disciplineKey].completedSessions++;
                }
              }
            }
          } catch (error) {
            console.error(`Erro ao buscar sessões do plano ${plan.id}:`, error);
          }
        }
        
        // Calcular taxa de conclusão
        completionRate = totalSessionsPlanned > 0 
          ? Math.round((completedSessions / totalSessionsPlanned) * 100) 
          : 0;
        
        // Calcular média de sessões por dia
        const allSessions = plans.reduce((total, plan) => total + (plan.total_sessions || 0), 0);
        const allDays = plans.reduce((total, plan) => {
          if (plan.start_date && plan.end_date) {
            const start = new Date(plan.start_date);
            const end = new Date(plan.end_date);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return total + days;
          }
          return total;
        }, 0);
        
        const averageSessionsPerDay = allDays > 0 
          ? Math.round((allSessions / allDays) * 10) / 10 
          : 0;
        
        // Converter o mapa de disciplinas em um array e ordenar por número de sessões
        const topDisciplines = Object.values(disciplineStats)
          .sort((a, b) => b.sessions - a.sessions)
          .map(d => ({
            name: d.name,
            sessions: d.sessions,
            minutes: d.minutes,
            completedSessions: d.completedSessions
          }));
        
        setStats({
          totalPlans: plans.length,
          activePlans,
          completedPlans,
          totalSessionsPlanned,
          totalStudyHours: Math.round(totalStudyHours),
          averageSessionsPerDay,
          completedSessions,
          completionRate,
          topDisciplines: topDisciplines.slice(0, 5) // Limitar a 5 disciplinas
        });
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Não foi possível carregar os dados para estatísticas.');
    } finally {
      setIsLoading(false);
    }
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

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-md">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-green-100 mb-1">Sessões Concluídas</h3>
                    <p className="text-3xl font-bold">{stats.completedSessions}</p>
                    <p className="text-xs text-green-200 mt-1">Taxa de conclusão: {stats.completionRate}%</p>
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
                  // Calcular a porcentagem de conclusão para esta disciplina
                  const completionPercentage = discipline.sessions > 0 
                    ? Math.round(((discipline.completedSessions || 0) / discipline.sessions) * 100) 
                    : 0;
                  
                  // Determinar a cor da barra de progresso com base na porcentagem
                  let progressColor = 'bg-blue-500';
                  if (completionPercentage >= 75) progressColor = 'bg-green-500';
                  else if (completionPercentage >= 50) progressColor = 'bg-teal-500';
                  else if (completionPercentage >= 25) progressColor = 'bg-amber-500';
                  else if (completionPercentage > 0) progressColor = 'bg-orange-500';
                  
                  return (
                    <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full bg-indigo-${(index * 100) + 500} mr-2`}></div>
                          <span className="font-medium text-gray-800">{discipline.name}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {discipline.sessions} sessões ({Math.round(discipline.minutes / 60)}h)
                        </div>
                      </div>
                      
                      {/* Barra de progresso de conclusão */}
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${progressColor} rounded-full`}
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                      
                      {/* Detalhes de conclusão */}
                      <div className="flex justify-between items-center mt-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                          <span>{discipline.completedSessions} concluídas</span>
                        </div>
                        <div className="font-medium">
                          {completionPercentage}% concluído
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
