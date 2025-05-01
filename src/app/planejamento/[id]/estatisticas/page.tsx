'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft, BarChart2, PieChart, Clock, CheckCircle2, Calendar, BookOpen } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { obterPlanosLocais } from '@/services';
import { StudyPlan, PlanDiscipline, PlanSubject, StudySession } from '@/lib/types/planning';

// Componente simplificado de gráfico de barras para progresso
const BarGraph = ({ items, valueKey, nameKey, colorKey = "color", maxValue = 100 }: { items: any[], valueKey: string, nameKey: string, colorKey?: string, maxValue?: number }) => {
  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const value = item[valueKey] || 0;
        const percent = Math.min(100, (value / maxValue) * 100);
        const color = item[colorKey] || `hsl(${index * 36}, 70%, 50%)`;
        
        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{item[nameKey]}</span>
              <span>{value}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full" 
                style={{ 
                  width: `${percent}%`,
                  backgroundColor: color
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Componente de cartão de estatística
type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  color?: string;
}

const StatCard = ({ title, value, icon, description, color = "blue" }: StatCardProps) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    yellow: "bg-yellow-50 text-yellow-700",
    red: "bg-red-50 text-red-700"
  };
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
            {icon}
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
      <div className="container mx-auto px-4 py-6">
        {/* Cabeçalho */}
        <div className="flex items-center mb-6">
          <Link href={`/planejamento/${planoId}`} className="mr-4">
            <Button variant="ghost" className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Estatísticas e Progresso</h1>
            <p className="text-gray-600">Plano: {plano.name}</p>
          </div>
        </div>

        {/* Cartões de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Progresso Geral"
            value={`${calcularProgressoGeral()}%`}
            icon={<BarChart2 className="h-6 w-6" />}
            description={`${estatisticas.assuntosConcluidos} de ${estatisticas.assuntosTotal} assuntos concluídos`}
            color="blue"
          />
          
          <StatCard
            title="Tempo de Estudo"
            value={formatarDuracao(estatisticas.tempoTotalReal)}
            icon={<Clock className="h-6 w-6" />}
            description={`${formatarDuracao(estatisticas.tempoTotalEstimado)} planejados`}
            color="purple"
          />
          
          <StatCard
            title="Sessões de Estudo"
            value={estatisticas.sessoesTotal}
            icon={<Calendar className="h-6 w-6" />}
            description={`${estatisticas.sessoesConcluidas} sessões concluídas`}
            color="green"
          />
          
          <StatCard
            title="Disciplinas"
            value={estatisticas.disciplinasTotal}
            icon={<BookOpen className="h-6 w-6" />}
            description={`${estatisticas.statusDisciplinas.concluidas} disciplinas concluídas`}
            color="yellow"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progresso por disciplina */}
          <Card>
            <CardHeader>
              <CardTitle>Progresso por Disciplina</CardTitle>
            </CardHeader>
            <CardContent>
              {estatisticas.progessoPorDisciplina.length > 0 ? (
                <BarGraph 
                  items={estatisticas.progessoPorDisciplina}
                  valueKey="progress"
                  nameKey="name"
                  colorKey="color"
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma disciplina disponível
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Tempo por disciplina */}
          <Card>
            <CardHeader>
              <CardTitle>Tempo de Estudo por Disciplina</CardTitle>
            </CardHeader>
            <CardContent>
              {estatisticas.tempoGastoPorDisciplina.some(d => d.tempo > 0) ? (
                <BarGraph 
                  items={estatisticas.tempoGastoPorDisciplina}
                  valueKey="tempo"
                  nameKey="name"
                  colorKey="color"
                  maxValue={Math.max(...estatisticas.tempoGastoPorDisciplina.map(d => d.tempo), 60)}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhum tempo de estudo registrado
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status das disciplinas */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Status das Disciplinas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-gray-500 text-sm mb-1">Não Começadas</div>
                <div className="text-2xl font-bold">{estatisticas.statusDisciplinas.naoComeçadas}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round((estatisticas.statusDisciplinas.naoComeçadas / estatisticas.disciplinasTotal) * 100)}% do total
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-blue-500 text-sm mb-1">Em Andamento</div>
                <div className="text-2xl font-bold text-blue-700">{estatisticas.statusDisciplinas.emAndamento}</div>
                <div className="text-xs text-blue-500 mt-1">
                  {Math.round((estatisticas.statusDisciplinas.emAndamento / estatisticas.disciplinasTotal) * 100)}% do total
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-green-500 text-sm mb-1">Concluídas</div>
                <div className="text-2xl font-bold text-green-700">{estatisticas.statusDisciplinas.concluidas}</div>
                <div className="text-xs text-green-500 mt-1">
                  {Math.round((estatisticas.statusDisciplinas.concluidas / estatisticas.disciplinasTotal) * 100)}% do total
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progresso geral */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Progresso Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex justify-between items-center">
              <span className="text-sm text-gray-500">Progresso total</span>
              <span className="text-sm font-medium">{calcularProgressoGeral()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full"
                style={{
                  width: `${calcularProgressoGeral()}%`,
                  transition: 'width 1s ease-in-out'
                }}
              />
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Assuntos Concluídos</div>
                <div className="text-xl font-bold">{estatisticas.assuntosConcluidos}</div>
                <div className="text-xs text-gray-500 mt-1">de {estatisticas.assuntosTotal} assuntos</div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Eficiência de Tempo</div>
                <div className="text-xl font-bold">
                  {estatisticas.tempoTotalEstimado > 0 
                    ? `${Math.round((estatisticas.tempoTotalReal / estatisticas.tempoTotalEstimado) * 100)}%`
                    : '0%'
                  }
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {estatisticas.tempoTotalReal > estatisticas.tempoTotalEstimado
                    ? 'Acima do estimado'
                    : 'Abaixo do estimado'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
} 