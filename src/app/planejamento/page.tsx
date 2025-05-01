'use client';

import { useState, useEffect } from 'react';
import { obterPlanosLocais, excluirPlano, sincronizarPlanos } from '@/services';
import { StudyPlan } from '@/lib/types/planning';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  CalendarDays, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Calendar, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  BarChart2, 
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  SortAsc,
  Clock8,
  CalendarCheck,
  BookCheck,
  Heart,
  Brain
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

// Componente Badge inline para evitar problemas de importação
type InlineBadgeProps = {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
  children: React.ReactNode;
  title?: string;
}

function InlineBadge({ variant = 'default', children, title }: InlineBadgeProps) {
  const styles = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    outline: 'bg-transparent border border-gray-300 text-gray-700',
    success: 'bg-green-100 text-green-800',
    destructive: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    secondary: 'bg-purple-100 text-purple-800'
  };

  return (
    <div 
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${styles[variant]}`}
      title={title}
    >
      {children}
    </div>
  );
}

// Função para obter ícone baseado no ID da disciplina
const getDisciplineIcon = (disciplineId: number) => {
  switch (disciplineId) {
    case 1: // Anatomia
      return <Heart className="h-4 w-4" />;
    case 2: // Fisiologia
      return <BarChart2 className="h-4 w-4" />;
    case 3: // Bioquímica
      return <Filter className="h-4 w-4" />;
    case 4: // Farmacologia
      return <BookCheck className="h-4 w-4" />;
    case 5: // Patologia
      return <AlertCircle className="h-4 w-4" />;
    case 6: // Microbiologia
      return <Search className="h-4 w-4" />;
    case 7: // Semiologia
      return <CheckCircle2 className="h-4 w-4" />;
    case 8: // Clínica Médica
      return <Clock8 className="h-4 w-4" />;
    default:
      return <BookOpen className="h-4 w-4" />;
  }
};

export default function PlanejamentoPage() {
  const [planos, setPlanos] = useState<StudyPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);
  const [termoBusca, setTermoBusca] = useState('');

  // Carregar planos do armazenamento local
  useEffect(() => {
    function carregarPlanos() {
      try {
        const planosLocais = obterPlanosLocais();
        
        // Garantir que todos os planos tenham os campos necessários
        const planosValidados = planosLocais.map(plano => ({
          ...plano,
          // Garantir que disciplines seja um array
          disciplines: Array.isArray(plano.disciplines) ? plano.disciplines : [],
          // Garantir que synchronizationStatus existe
          synchronizationStatus: plano.synchronizationStatus || {
            synced: false
          },
          // Garantir que outros campos essenciais existam
          name: plano.name || 'Plano sem nome',
          description: plano.description || '',
          status: plano.status || 'ativo'
        }));
        
        setPlanos(planosValidados);
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
        toast.error('Não foi possível carregar os planos de estudo');
      } finally {
        setIsLoading(false);
      }
    }

    carregarPlanos();
  }, []);
  
  // Função para sincronizar planos com o backend
  const handleSincronizar = async () => {
    setIsSynchronizing(true);
    try {
      const resultado = await sincronizarPlanos();
      
      if (resultado.success) {
        toast.success(`Sincronização concluída: ${resultado.plansCreated} planos criados, ${resultado.plansUpdated} atualizados`);
        // Atualizar a lista de planos
        const planosAtualizados = obterPlanosLocais().map(plano => ({
          ...plano,
          disciplines: Array.isArray(plano.disciplines) ? plano.disciplines : [],
          synchronizationStatus: plano.synchronizationStatus || {
            synced: false
          },
          name: plano.name || 'Plano sem nome',
          description: plano.description || '',
          status: plano.status || 'ativo'
        }));
        setPlanos(planosAtualizados);
      } else {
        toast.error(`Erro na sincronização: ${resultado.errors?.join(', ')}`);
      }
    } catch (error) {
      console.error('Erro ao sincronizar planos:', error);
      toast.error('Não foi possível sincronizar os planos de estudo');
    } finally {
      setIsSynchronizing(false);
    }
  };

  // Função para excluir um plano
  const handleExcluir = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este plano?')) {
      try {
        excluirPlano(id);
        setPlanos(planos.filter(plano => plano.id !== id));
        toast.success('Plano de estudo excluído com sucesso');
    } catch (error) {
        console.error('Erro ao excluir plano:', error);
        toast.error('Não foi possível excluir o plano de estudo');
      }
    }
  };

  // Renderizar status de sincronização
  const renderSyncStatus = (status: StudyPlan['synchronizationStatus'] | undefined) => {
    // Se não tiver status de sincronização, mostrar como pendente
    if (!status) {
      return <InlineBadge variant="outline">Pendente</InlineBadge>;
    }

    if (status.synced) {
      return <InlineBadge variant="success">Sincronizado</InlineBadge>;
    } else if (status.syncFailed) {
      return <InlineBadge variant="destructive" title={status.errorMessage || 'Erro desconhecido'}>Falha na sincronização</InlineBadge>;
    } else {
      return <InlineBadge variant="outline">Pendente</InlineBadge>;
    }
  };

  // Calcular progresso do plano
  const calcularProgresso = (plano: StudyPlan): number => {
    if (!plano.disciplines || plano.disciplines.length === 0) return 0;
    
    let totalAssuntos = 0;
    let assuntosConcluidos = 0;
    
    plano.disciplines.forEach(disciplina => {
      if (disciplina.subjects && disciplina.subjects.length) {
        totalAssuntos += disciplina.subjects.length;
        assuntosConcluidos += disciplina.subjects.filter(a => a.completed).length;
        
        // Atualiza o progresso de cada disciplina
        if (!disciplina.progress) {
          const total = disciplina.subjects.length;
          const concluidos = disciplina.subjects.filter(a => a.completed).length;
          disciplina.progress = total === 0 ? 0 : Math.floor((concluidos / total) * 100);
        }
      }
    });
    
    return totalAssuntos === 0 ? 0 : Math.floor((assuntosConcluidos / totalAssuntos) * 100);
  };

  // Calcular totais do plano
  const calcularTotais = (plano: StudyPlan) => {
    let totalDisciplinas = plano.disciplines?.length || 0;
    let totalAssuntos = 0;
    let totalSessoes = plano.sessions?.length || 0;
    let sessoesAgendadas = plano.sessions?.filter(s => !s.completed).length || 0;
    
    plano.disciplines?.forEach(d => {
      if (d.subjects) {
        totalAssuntos += d.subjects.length;
      }
    });
    
    return { totalDisciplinas, totalAssuntos, totalSessoes, sessoesAgendadas };
  };

  // Formatar data para exibição
  const formatarData = (data?: string | Date) => {
    if (!data) return "";
    try {
      return new Date(data).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch (e) {
      return "";
    }
  };

  // Filtrar planos
  const planosFiltrados = planos
    .filter(plano => {
      // Filtrar por status
      if (filtroStatus && plano.status !== filtroStatus) return false;
      
      // Filtrar por termo de busca
      if (termoBusca) {
        const termo = termoBusca.toLowerCase();
    return (
          plano.name.toLowerCase().includes(termo) || 
          (plano.description && plano.description.toLowerCase().includes(termo))
        );
      }
      
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Pegar o ícone e cor do status
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ativo':
        return { icon: <Clock8 className="h-4 w-4" />, color: 'bg-green-500', text: 'text-green-500' };
      case 'pausado':
        return { icon: <AlertCircle className="h-4 w-4" />, color: 'bg-yellow-500', text: 'text-yellow-500' };
      case 'concluido':
        return { icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-blue-500', text: 'text-blue-500' };
      default:
        return { icon: <Clock8 className="h-4 w-4" />, color: 'bg-gray-500', text: 'text-gray-500' };
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Planejamento de Estudos</h1>
          
          <div className="flex space-x-2 mt-3 sm:mt-0">
            {/* Botão de sincronização */}
            <Button 
              variant="outline"
              className="whitespace-nowrap"
              onClick={handleSincronizar}
              disabled={isSynchronizing}
            >
              {isSynchronizing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" /> 
                  Sincronizar
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Filtros e pesquisa */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar plano..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <select
              value={filtroStatus || ''}
              onChange={(e) => setFiltroStatus(e.target.value === '' ? null : e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="pausado">Pausados</option>
              <option value="concluido">Concluídos</option>
            </select>
          </div>
        </div>
        
        {/* Cards para criar planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {/* Plano Inteligente */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-blue-800">
                <Brain className="h-5 w-5 mr-2 text-blue-600" />
                Plano Inteligente
              </CardTitle>
              <CardDescription>
                Otimize seus estudos com base na dificuldade e disponibilidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600 mb-3">
                <div className="flex items-start">
                  <div className="bg-blue-100 p-1 rounded-full mr-2 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p>Prioriza assuntos com base na dificuldade e importância</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-blue-100 p-1 rounded-full mr-2 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p>Distribui sessões conforme sua disponibilidade de horário</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-blue-100 p-1 rounded-full mr-2 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p>Cria um cronograma otimizado para maximizar seu aprendizado</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/planejamento/inteligente" className="w-full">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Criar Plano Inteligente <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Plano Manual */}
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <CalendarDays className="h-5 w-5 mr-2 text-gray-600" />
                Plano Manual
              </CardTitle>
              <CardDescription>
                Crie um plano personalizado selecionando disciplinas e assuntos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600 mb-3">
                <div className="flex items-start">
                  <div className="bg-gray-200 p-1 rounded-full mr-2 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                  <p>Selecione disciplinas e assuntos específicos</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-gray-200 p-1 rounded-full mr-2 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                  <p>Defina manualmente prioridades e horas de estudo</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-gray-200 p-1 rounded-full mr-2 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                  <p>Crie e organize suas próprias sessões de estudo</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/planejamento/novo" className="w-full">
                <Button variant="outline" className="w-full">
                  Criar Plano Manual <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Lista de planos */}
        <h2 className="text-xl font-semibold mb-4">Meus Planos de Estudo</h2>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2">Carregando planos...</span>
          </div>
        ) : planos.length === 0 ? (
          <Card className="w-full bg-gray-50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-3 rounded-full bg-blue-100 mb-4">
                <CalendarDays className="h-8 w-8 text-blue-500" />
            </div>
              <CardTitle className="mb-2 text-xl">Nenhum plano de estudo</CardTitle>
              <CardDescription className="text-center max-w-md mb-6">
                Você ainda não criou nenhum plano de estudo. Crie seu primeiro plano para organizar suas disciplinas e matérias.
              </CardDescription>
              <Link href="/planejamento/novo">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Plano de Estudo
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : planosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-8 w-8 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhum plano encontrado</h3>
            <p className="mt-1 text-gray-500">Tente ajustar seus filtros ou termos de busca</p>
            <Button variant="outline" className="mt-4" onClick={() => {setFiltroStatus(null); setTermoBusca('')}}>
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planosFiltrados.map((plano) => {
              const progresso = calcularProgresso(plano);
              const { totalDisciplinas, totalAssuntos, sessoesAgendadas } = calcularTotais(plano);
              const statusInfo = getStatusInfo(plano.status || 'ativo');
              
              return (
                <Card 
                  key={plano.id} 
                  className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:translate-y-[-4px] group relative bg-gradient-to-b from-white to-gray-50"
                >
                  {/* Barra de progresso no topo do card */}
                  <div className="h-2 bg-gray-100 w-full absolute top-0 left-0">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500 rounded-r-full" 
                      style={{ width: `${progresso}%` }}
                    ></div>
                  </div>
                  
                  <CardHeader className="pt-7">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl truncate group-hover:text-blue-600 transition-colors duration-200" title={plano.name}>
                      {plano.name || 'Plano sem nome'}
                    </CardTitle>
                        <CardDescription className="line-clamp-2 mt-1" title={plano.description}>
                          {plano.description || "Sem descrição"}
                        </CardDescription>
                      </div>
                      <div className="ml-2">
                    {renderSyncStatus(plano.synchronizationStatus)}
                  </div>
                    </div>
                </CardHeader>
                  
                <CardContent>
                    <div className="space-y-4">
                      {/* Datas */}
                      <div className="flex justify-between items-center text-sm bg-blue-50/50 p-2 rounded-lg">
                        <div className="flex items-center text-blue-700">
                          <Calendar className="h-4 w-4 mr-1.5" />
                          <span>Período:</span>
                        </div>
                        <span className="font-medium text-gray-700">
                          {plano.startDate ? formatarData(plano.startDate) : 'N/D'} 
                          {plano.endDate ? ` - ${formatarData(plano.endDate)}` : ''}
                        </span>
          </div>
          
                      {/* Status com tag colorida */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-sm text-gray-600">
                          {statusInfo.icon}
                          <span className="ml-1.5">Status:</span>
            </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.text} bg-opacity-10 border-0 shadow-sm`}>
                          {plano.status === 'ativo' ? 'Ativo' : 
                           plano.status === 'pausado' ? 'Pausado' : 'Concluído'}
                        </span>
          </div>
          
                      {/* Progresso */}
                      <div className="pt-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">Progresso</span>
                          <span className="text-sm font-medium text-blue-600">{progresso}%</span>
            </div>
                        <div className="relative w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                              progresso < 30 ? 'bg-gradient-to-r from-blue-300 to-blue-400' : 
                              progresso < 70 ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 
                              'bg-gradient-to-r from-blue-500 to-blue-600'
                            }`}
                            style={{ width: `${progresso}%` }}
                          ></div>
          </div>
        </div>

                      {/* Métricas em cards pequenos */}
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div className="bg-gradient-to-b from-white to-blue-50 rounded-xl p-3 text-center shadow-sm">
                          <div className="flex justify-center text-blue-500 mb-1">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="text-lg font-bold text-gray-800">{totalDisciplinas}</div>
                          <div className="text-xs text-blue-600 font-medium">Disciplinas</div>
              </div>
                        
                        <div className="bg-gradient-to-b from-white to-green-50 rounded-xl p-3 text-center shadow-sm">
                          <div className="flex justify-center text-green-500 mb-1">
                            <BookCheck className="h-4 w-4" />
            </div>
                          <div className="text-lg font-bold text-gray-800">{totalAssuntos}</div>
                          <div className="text-xs text-green-600 font-medium">Assuntos</div>
          </div>

                        <div className="bg-gradient-to-b from-white to-purple-50 rounded-xl p-3 text-center shadow-sm">
                          <div className="flex justify-center text-purple-500 mb-1">
                            <CalendarCheck className="h-4 w-4" />
                    </div>
                          <div className="text-lg font-bold text-gray-800">{sessoesAgendadas}</div>
                          <div className="text-xs text-purple-600 font-medium">Sessões</div>
                      </div>
                      </div>

                      {/* Visualização de disciplinas */}
                      {plano.disciplines && plano.disciplines.length > 0 && (
                        <div className="mt-5 border-t border-gray-100 pt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Disciplinas incluídas</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {plano.disciplines.map((disciplina) => {
                              const disciplinaProgresso = disciplina.progress || 0;
                              const assuntoCount = disciplina.subjects?.length || 0;
                              const assuntosConcluidos = disciplina.subjects?.filter(a => a.completed)?.length || 0;
                              
                              // Cores diferentes para cada disciplina
                              const disciplinasColors: Record<number, { bg: string, text: string, icon: React.ReactNode }> = {
                                1: { bg: 'bg-red-100', text: 'text-red-600', icon: getDisciplineIcon(1) }, // Anatomia
                                2: { bg: 'bg-blue-100', text: 'text-blue-600', icon: getDisciplineIcon(2) }, // Fisiologia
                                3: { bg: 'bg-green-100', text: 'text-green-600', icon: getDisciplineIcon(3) }, // Bioquímica
                                4: { bg: 'bg-orange-100', text: 'text-orange-600', icon: getDisciplineIcon(4) }, // Farmacologia
                                5: { bg: 'bg-purple-100', text: 'text-purple-600', icon: getDisciplineIcon(5) }, // Patologia
                                6: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: getDisciplineIcon(6) }, // Microbiologia
                                7: { bg: 'bg-teal-100', text: 'text-teal-600', icon: getDisciplineIcon(7) }, // Semiologia
                                8: { bg: 'bg-indigo-100', text: 'text-indigo-600', icon: getDisciplineIcon(8) }, // Clínica Médica
                              };
                              
                              const colorInfo = disciplinasColors[disciplina.id] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: <BookOpen className="h-4 w-4" /> };
                              
                              return (
                                <div key={disciplina.id} className="flex items-center space-x-2">
                                  <div className={`p-1.5 rounded-full ${colorInfo.bg} ${colorInfo.text} flex items-center justify-center`}>
                                    {colorInfo.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                      <div className="truncate font-medium text-sm">{disciplina.name}</div>
                                      <div className="text-xs text-gray-500">{assuntosConcluidos}/{assuntoCount}</div>
                                    </div>
                                    <div className="mt-1 relative w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div 
                                        className={`absolute top-0 left-0 h-full ${colorInfo.bg}`}
                                        style={{ width: `${disciplinaProgresso}%` }}
                                      ></div>
                                    </div>
                                  </div>
            </div>
                              );
                            })}
              </div>
            </div>
          )}
        </div>
                </CardContent>
                  
                  <CardFooter className="flex justify-between bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-100">
                  <div className="flex space-x-2">
                  <Link href={`/planejamento/${plano.id}`}>
                        <Button variant="outline" size="sm" className="group-hover:border-blue-500 group-hover:text-blue-600 transition-colors bg-white hover:bg-blue-50">
                          <ArrowRight className="h-4 w-4 mr-1.5" />
                          Detalhes
                        </Button>
                    </Link>
                    <Link href={`/planejamento/${plano.id}/estatisticas`}>
                        <Button variant="outline" size="sm" className="group-hover:border-blue-500 group-hover:text-blue-600 transition-colors bg-white hover:bg-blue-50">
                          <BarChart2 className="h-4 w-4 mr-1.5" />
                          Estatísticas
                        </Button>
                  </Link>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleExcluir(plano.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
} 