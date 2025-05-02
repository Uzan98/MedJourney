'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  ArrowLeft, 
  BarChart2, 
  PieChart, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  BookOpen,
  Flame,
  TrendingUp,
  Activity,
  Award,
  Target,
  BarChart4
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { obterPlanosLocais } from '@/services';
import { StudyPlan, PlanDiscipline, PlanSubject, StudySession } from '@/lib/types/planning';

// Componente aprimorado de gráfico de barras para progresso
const BarGraph = ({ items, valueKey, nameKey, colorKey = "color", maxValue = 100 }: { items: any[], valueKey: string, nameKey: string, colorKey?: string, maxValue?: number }) => {
  return (
    <div className="space-y-5">
      {items.map((item, index) => {
        const value = item[valueKey] || 0;
        const percent = Math.min(100, (value / maxValue) * 100);
        const color = item[colorKey] || `hsl(${index * 36}, 70%, 50%)`;
        
        return (
          <div key={index} className="space-y-2 group">
            <div className="flex justify-between text-sm items-center">
              <div className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="font-medium group-hover:text-blue-600 transition-colors">
                  {item[nameKey]}
                </span>
              </div>
              <span className="bg-gray-100 px-2 py-0.5 rounded-full text-gray-700 text-xs font-medium group-hover:bg-blue-100 transition-colors">
                {value}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out relative group-hover:shadow-md"
                style={{ 
                  width: `${percent}%`,
                  backgroundColor: color
                }}
              >
                <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Componente aprimorado de cartão de estatística
type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  color?: string;
  trend?: number;
}

const StatCard = ({ title, value, icon, description, color = "blue", trend }: StatCardProps) => {
  const colorClasses = {
    blue: {
      bg: "bg-gradient-to-br from-blue-500 to-blue-600",
      light: "bg-blue-50",
      border: "border-blue-100",
      text: "text-blue-700",
      fill: "fill-blue-500"
    },
    green: {
      bg: "bg-gradient-to-br from-green-500 to-green-600",
      light: "bg-green-50",
      border: "border-green-100",
      text: "text-green-700",
      fill: "fill-green-500"
    },
    purple: {
      bg: "bg-gradient-to-br from-purple-500 to-purple-600",
      light: "bg-purple-50",
      border: "border-purple-100",
      text: "text-purple-700",
      fill: "fill-purple-500"
    },
    yellow: {
      bg: "bg-gradient-to-br from-yellow-500 to-amber-500",
      light: "bg-yellow-50",
      border: "border-yellow-100",
      text: "text-yellow-700",
      fill: "fill-yellow-500"
    },
    red: {
      bg: "bg-gradient-to-br from-red-500 to-red-600",
      light: "bg-red-50",
      border: "border-red-100",
      text: "text-red-700",
      fill: "fill-red-500"
    }
  };
  
  const colors = colorClasses[color as keyof typeof colorClasses];
  
  return (
    <Card className="border overflow-hidden transition-all duration-300 hover:shadow-md group">
      <CardContent className="p-0">
        <div className="flex flex-col h-full">
          <div className={`h-1.5 w-full ${colors.bg}`}></div>
          <div className="p-6 flex-grow">
            <div className="flex items-start justify-between">
              <div className="flex-grow">
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <p className="text-2xl font-bold text-gray-800 transition-colors group-hover:text-blue-600">
                  {value}
                  {trend !== undefined && (
                    <span className={`ml-2 text-xs font-semibold px-2 py-1 rounded ${
                      trend > 0 
                        ? 'bg-green-100 text-green-700' 
                        : trend < 0 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} 
                      {Math.abs(trend)}%
                    </span>
                  )}
                </p>
                {description && (
                  <p className="text-xs text-gray-500 mt-2 group-hover:text-gray-700 transition-colors">{description}</p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${colors.light} ${colors.text} group-hover:scale-110 transition-transform`}>
                {icon}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function EstatisticasPage() {
  const params = useParams();
  const router = useRouter();
  const planoId = params.id as string;
  
  const [plano, setPlano] = useState<StudyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [estatisticas, setEstatisticas] = useState({
    disciplinasTotal: 0,
    assuntosTotal: 0,
    assuntosConcluidos: 0,
    tempoTotalEstimado: 0,
    tempoTotalReal: 0,
    sessoesTotal: 0,
    sessoesConcluidas: 0,
    progessoPorDisciplina: [] as { name: string, progress: number, color: string }[],
    tempoGastoPorDisciplina: [] as { name: string, tempo: number, color: string }[],
    statusDisciplinas: {
      naoComeçadas: 0,
      emAndamento: 0,
      concluidas: 0
    }
  });

  // Carregar o plano
  useEffect(() => {
    if (!planoId) return;
    
    function carregarPlano() {
      try {
        const planosLocais = obterPlanosLocais();
        const planoEncontrado = planosLocais.find(p => p.id === planoId);
        
        if (planoEncontrado) {
          setPlano(planoEncontrado);
          calcularEstatisticas(planoEncontrado);
        } else {
          toast.error('Plano não encontrado');
          router.push('/planejamento');
        }
      } catch (error) {
        console.error('Erro ao carregar plano:', error);
        toast.error('Não foi possível carregar as estatísticas');
      } finally {
        setIsLoading(false);
      }
    }

    carregarPlano();
  }, [planoId, router]);

  // Calcular estatísticas do plano
  const calcularEstatisticas = (plano: StudyPlan) => {
    // Total de disciplinas e assuntos
    const disciplinasTotal = plano.disciplines.length;
    
    let assuntosTotal = 0;
    let assuntosConcluidos = 0;
    let tempoTotalEstimado = 0;
    let tempoTotalReal = 0;
    
    // Progressos por disciplina
    const progressoPorDisciplina: {name: string, progress: number, color: string}[] = [];
    const tempoGastoPorDisciplina: {name: string, tempo: number, color: string}[] = [];
    
    // Status das disciplinas
    let disciplinasNaoComeçadas = 0;
    let disciplinasEmAndamento = 0;
    let disciplinasConcluidas = 0;
    
    // Análise de sessões
    const sessoes = plano.sessions || [];
    const sessoesTotal = sessoes.length;
    const sessoesConcluidas = sessoes.filter(s => s.completed).length;
    
    // Calcular por disciplina
    plano.disciplines.forEach((disciplina, index) => {
      // Total de assuntos na disciplina
      const totalAssuntos = disciplina.subjects.length;
      assuntosTotal += totalAssuntos;
      
      // Assuntos concluídos na disciplina
      const assuntosConcluídosDisciplina = disciplina.subjects.filter(s => s.completed).length;
      assuntosConcluidos += assuntosConcluídosDisciplina;
      
      // Calcular tempo estimado
      const tempoEstimadoDisciplina = disciplina.subjects.reduce((total, assunto) => total + (assunto.hours || 0), 0);
      tempoTotalEstimado += tempoEstimadoDisciplina;
      
      // Calcular tempo real
      const sessoesDisciplina = sessoes.filter(s => s.disciplineName === disciplina.name && s.completed);
      const tempoRealDisciplina = sessoesDisciplina.reduce((total, sessao) => total + (sessao.actualDuration || 0), 0);
      tempoTotalReal += tempoRealDisciplina;
      
      // Calcular progresso da disciplina
      const progressoDisciplina = totalAssuntos > 0 
        ? Math.round((assuntosConcluídosDisciplina / totalAssuntos) * 100) 
        : 0;
      
      // Status da disciplina
      if (progressoDisciplina === 0) {
        disciplinasNaoComeçadas++;
      } else if (progressoDisciplina === 100) {
        disciplinasConcluidas++;
      } else {
        disciplinasEmAndamento++;
      }
      
      // Cor da disciplina (para gráficos)
      const cor = `hsl(${index * (360 / disciplinasTotal)}, 70%, 50%)`;
      
      // Adicionar aos arrays para gráficos
      progressoPorDisciplina.push({
        name: disciplina.name,
        progress: progressoDisciplina,
        color: cor
      });
      
      tempoGastoPorDisciplina.push({
        name: disciplina.name,
        tempo: tempoRealDisciplina,
        color: cor
      });
    });
    
    // Atualizar o estado com as estatísticas calculadas
    setEstatisticas({
      disciplinasTotal,
      assuntosTotal,
      assuntosConcluidos,
      tempoTotalEstimado,
      tempoTotalReal,
      sessoesTotal,
      sessoesConcluidas,
      progessoPorDisciplina: progressoPorDisciplina,
      tempoGastoPorDisciplina,
      statusDisciplinas: {
        naoComeçadas: disciplinasNaoComeçadas,
        emAndamento: disciplinasEmAndamento,
        concluidas: disciplinasConcluidas
      }
    });
  };

  // Formatar duração
  const formatarDuracao = (minutos: number) => {
    if (minutos < 60) {
      return `${minutos} min`;
    }
    
    const horas = Math.floor(minutos / 60);
    const min = minutos % 60;
    
    return min > 0 ? `${horas}h ${min}min` : `${horas}h`;
  };

  // Calcular progresso geral
  const calcularProgressoGeral = () => {
    if (estatisticas.assuntosTotal === 0) return 0;
    return Math.round((estatisticas.assuntosConcluidos / estatisticas.assuntosTotal) * 100);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2">Carregando estatísticas...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!plano) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700">Plano não encontrado</h2>
            <p className="text-gray-500 mt-2">O plano que você está procurando não existe ou foi removido.</p>
            <Link href="/planejamento">
              <Button className="mt-4">Voltar para Planejamento</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Seção de cabeçalho aprimorada */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-100 shadow-sm relative overflow-hidden">
          {/* Elementos decorativos */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200 rounded-full opacity-10 transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-300 rounded-full opacity-10 transform -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start">
          <Link href={`/planejamento/${planoId}`} className="mr-4">
                <Button variant="ghost" className="p-2 bg-white bg-opacity-70 hover:bg-opacity-100 backdrop-blur-sm border border-blue-100 shadow-sm transition-all">
                  <ArrowLeft className="h-5 w-5 text-blue-600" />
            </Button>
          </Link>
          <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">Estatísticas e Progresso</h1>
                <p className="text-blue-600 flex items-center text-sm">
                  <BarChart4 className="h-4 w-4 mr-1.5" />
                  {plano.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="bg-white bg-opacity-80 backdrop-blur-sm border border-blue-100 rounded-lg py-2 px-4 shadow-sm">
                <span className="text-sm text-gray-500">Progresso geral</span>
                <div className="flex items-center mt-1">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{width: `${calcularProgressoGeral()}%`}}
                    ></div>
                  </div>
                  <span className="text-blue-700 font-bold">{calcularProgressoGeral()}%</span>
                </div>
              </div>
              <Link href={`/planejamento/${planoId}/sessoes`} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors duration-200">
                Ver Sessões
              </Link>
            </div>
          </div>
        </div>

        {/* Cartões de estatísticas em grid com design aprimorado */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Progresso Geral"
            value={`${calcularProgressoGeral()}%`}
            icon={<BarChart2 className="h-6 w-6" />}
            description={`${estatisticas.assuntosConcluidos} de ${estatisticas.assuntosTotal} assuntos concluídos`}
            color="blue"
            trend={5} // Exemplo - você pode calcular isso com dados reais
          />
          
          <StatCard
            title="Tempo de Estudo"
            value={formatarDuracao(estatisticas.tempoTotalReal)}
            icon={<Clock className="h-6 w-6" />}
            description={`Meta: ${formatarDuracao(estatisticas.tempoTotalEstimado)}`}
            color="purple"
          />
          
          <StatCard
            title="Sessões de Estudo"
            value={estatisticas.sessoesTotal}
            icon={<Calendar className="h-6 w-6" />}
            description={`${estatisticas.sessoesConcluidas} sessões concluídas`}
            color="green"
            trend={estatisticas.sessoesTotal > 0 ? Math.round((estatisticas.sessoesConcluidas / estatisticas.sessoesTotal) * 100) : 0}
          />
          
          <StatCard
            title="Disciplinas"
            value={estatisticas.disciplinasTotal}
            icon={<BookOpen className="h-6 w-6" />}
            description={`${estatisticas.statusDisciplinas.concluidas} disciplinas concluídas`}
            color="yellow"
          />
        </div>

        {/* Gráficos com design aprimorado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Progresso por disciplina */}
          <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
            <CardHeader className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-100">
              <CardTitle className="flex items-center text-gray-800">
                <BarChart2 className="h-5 w-5 mr-2 text-blue-600" />
                Progresso por Disciplina
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {estatisticas.progessoPorDisciplina.length > 0 ? (
                <BarGraph 
                  items={estatisticas.progessoPorDisciplina}
                  valueKey="progress"
                  nameKey="name"
                  colorKey="color"
                />
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <BarChart2 className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium">Nenhuma disciplina disponível</p>
                  <p className="text-sm mt-1">Adicione disciplinas ao seu plano para visualizar o progresso</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Tempo por disciplina */}
          <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
            <CardHeader className="p-6 bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-100">
              <CardTitle className="flex items-center text-gray-800">
                <Clock className="h-5 w-5 mr-2 text-purple-600" />
                Tempo de Estudo por Disciplina
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {estatisticas.tempoGastoPorDisciplina.some(d => d.tempo > 0) ? (
                <BarGraph 
                  items={estatisticas.tempoGastoPorDisciplina}
                  valueKey="tempo"
                  nameKey="name"
                  colorKey="color"
                  maxValue={Math.max(...estatisticas.tempoGastoPorDisciplina.map(d => d.tempo), 60)}
                />
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <Clock className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium">Nenhum tempo de estudo registrado</p>
                  <p className="text-sm mt-1">Complete sessões de estudo para visualizar estatísticas de tempo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status das disciplinas com design atraente */}
        <Card className="mb-8 border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="p-6 bg-gradient-to-r from-green-50 to-green-100 border-b border-green-100">
            <CardTitle className="flex items-center text-gray-800">
              <BookOpen className="h-5 w-5 mr-2 text-green-600" />
              Status das Disciplinas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl text-center border border-gray-100 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 duration-300">
                <div className="bg-gray-100 w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3">
                  <Target className="h-6 w-6 text-gray-600" />
                </div>
                <div className="text-gray-600 text-sm font-medium mb-1">Não Começadas</div>
                <div className="text-3xl font-bold text-gray-800">{estatisticas.statusDisciplinas.naoComeçadas}</div>
                <div className="text-xs text-gray-500 mt-2 bg-gray-100 px-2 py-1 rounded-full inline-block">
                  {Math.round((estatisticas.statusDisciplinas.naoComeçadas / estatisticas.disciplinasTotal) * 100)}% do total
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-xl text-center border border-blue-100 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 duration-300">
                <div className="bg-blue-100 w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-blue-600 text-sm font-medium mb-1">Em Andamento</div>
                <div className="text-3xl font-bold text-blue-700">{estatisticas.statusDisciplinas.emAndamento}</div>
                <div className="text-xs text-blue-600 mt-2 bg-blue-50 px-2 py-1 rounded-full inline-block">
                  {Math.round((estatisticas.statusDisciplinas.emAndamento / estatisticas.disciplinasTotal) * 100)}% do total
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-xl text-center border border-green-100 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 duration-300">
                <div className="bg-green-100 w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-green-600 text-sm font-medium mb-1">Concluídas</div>
                <div className="text-3xl font-bold text-green-700">{estatisticas.statusDisciplinas.concluidas}</div>
                <div className="text-xs text-green-600 mt-2 bg-green-50 px-2 py-1 rounded-full inline-block">
                  {Math.round((estatisticas.statusDisciplinas.concluidas / estatisticas.disciplinasTotal) * 100)}% do total
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progresso geral aprimorado */}
        <Card className="border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
          <CardHeader className="p-6 bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-indigo-100">
            <CardTitle className="flex items-center text-gray-800">
              <Award className="h-5 w-5 mr-2 text-indigo-600" />
              Progresso Geral e Métricas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">Progresso total do plano</span>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {estatisticas.assuntosConcluidos} de {estatisticas.assuntosTotal} assuntos concluídos
                  </div>
                </div>
                <span className="text-xl font-bold text-indigo-700">{calcularProgressoGeral()}%</span>
            </div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full relative group"
                style={{
                  width: `${calcularProgressoGeral()}%`,
                  transition: 'width 1s ease-in-out'
                }}
                >
                  <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm group hover:shadow-md transition-all">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm mr-4 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Assuntos Concluídos</div>
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold text-gray-800 mr-2">{estatisticas.assuntosConcluidos}</span>
                      <span className="text-sm text-gray-500">de {estatisticas.assuntosTotal} assuntos</span>
                    </div>
                  </div>
            </div>
            
                <div className="h-2 w-full bg-white rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-blue-600 rounded-full" 
                    style={{width: `${estatisticas.assuntosTotal > 0 ? (estatisticas.assuntosConcluidos / estatisticas.assuntosTotal) * 100 : 0}%`}}
                  ></div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm group hover:shadow-md transition-all">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm mr-4 group-hover:scale-110 transition-transform">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Eficiência de Tempo</div>
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold text-gray-800 mr-2">
                  {estatisticas.tempoTotalEstimado > 0 
                    ? `${Math.round((estatisticas.tempoTotalReal / estatisticas.tempoTotalEstimado) * 100)}%`
                    : '0%'
                  }
                      </span>
                      <span className="text-sm text-gray-500">
                  {estatisticas.tempoTotalReal > estatisticas.tempoTotalEstimado
                    ? 'Acima do estimado'
                    : 'Abaixo do estimado'
                  }
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="h-2 w-full bg-white rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-purple-600 rounded-full" 
                    style={{
                      width: `${estatisticas.tempoTotalEstimado > 0 
                        ? Math.min(100, (estatisticas.tempoTotalReal / estatisticas.tempoTotalEstimado) * 100) 
                        : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 