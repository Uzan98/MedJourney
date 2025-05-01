'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Clock, 
  Check, 
  Edit, 
  Trash2, 
  Filter,
  CheckCircle2,
  BookOpen,
  Clock8,
  AlarmClock,
  CalendarCheck,
  BarChart2,
  Search,
  FileText,
  ChevronRight,
  ClipboardList,
  PlayCircle,
  CalendarDays
} from 'lucide-react';
import toast from 'react-hot-toast';
import { obterPlanosLocais, obterSessaoEstudo, excluirSessaoEstudo } from '@/services';
import { StudyPlan, StudySession } from '@/lib/types/planning';

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

export default function SessoesEstudoPage() {
  const params = useParams();
  const router = useRouter();
  const planoId = params.id as string;
  
  const [plano, setPlano] = useState<StudyPlan | null>(null);
  const [sessoes, setSessoes] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroDisciplina, setFiltroDisciplina] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Carregar o plano e suas sessões
  useEffect(() => {
    if (!planoId) return;
    
    function carregarPlanoESessoes() {
      try {
        const planosLocais = obterPlanosLocais();
        const planoEncontrado = planosLocais.find(p => p.id === planoId);
        
        if (planoEncontrado) {
          setPlano(planoEncontrado);
          
          // Recuperar sessões do plano
          const sessoesPlano = planoEncontrado.sessions || [];
          setSessoes(sessoesPlano);
        } else {
          toast.error('Plano não encontrado');
          router.push('/planejamento');
        }
      } catch (error) {
        console.error('Erro ao carregar plano:', error);
        toast.error('Não foi possível carregar as sessões de estudo');
      } finally {
        setIsLoading(false);
      }
    }

    carregarPlanoESessoes();
  }, [planoId, router]);

  // Calcular estatísticas das sessões
  const calcularEstatisticas = () => {
    if (!plano || !plano.sessions) return { total: 0, concluidas: 0, pendentes: 0, horasEstudadas: 0 };
    
    const total = plano.sessions.length;
    const concluidas = plano.sessions.filter(s => s.completed).length;
    const pendentes = total - concluidas;
    
    // Calcular total de horas estudadas (usando duração real quando disponível)
    const horasEstudadas = plano.sessions.reduce((total, sessao) => {
      if (sessao.completed) {
        return total + (sessao.actualDuration || sessao.duration || 0);
      }
      return total;
    }, 0) / 60; // Converter minutos para horas
    
    return {
      total,
      concluidas,
      pendentes,
      horasEstudadas: Math.round(horasEstudadas * 10) / 10 // Arredondar para 1 casa decimal
    };
  };

  // Função para formatar data
  const formatarData = (data?: string | Date) => {
    if (!data) return 'Data não definida';
    
    try {
      return new Date(data).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit', 
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Função para formatar data curta
  const formatarDataCurta = (data?: string | Date) => {
    if (!data) return '';
    
    try {
      const date = new Date(data);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit', 
        month: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };
  
  // Função para formatar dia da semana
  const formatarDiaSemana = (data?: string | Date) => {
    if (!data) return '';
    
    try {
      const date = new Date(data);
      return date.toLocaleDateString('pt-BR', {
        weekday: 'short'
      }).replace('.', '');
    } catch (error) {
      return '';
    }
  };

  // Função para verificar se a sessão é hoje
  const isHoje = (data?: string | Date) => {
    if (!data) return false;
    
    try {
      const dataHoje = new Date();
      const dataSessao = new Date(data);
      return dataSessao.toDateString() === dataHoje.toDateString();
    } catch (error) {
      return false;
    }
  };

  // Função para verificar se a sessão está atrasada
  const isAtrasada = (sessao: StudySession) => {
    if (!sessao.scheduledDate || sessao.completed) return false;
    
    try {
      const dataHoje = new Date();
      const dataSessao = new Date(sessao.scheduledDate);
      return dataSessao < dataHoje;
    } catch (error) {
      return false;
    }
  };

  // Função para extrair hora da data
  const formatarHora = (data?: string | Date) => {
    if (!data) return '';
    
    try {
      const date = new Date(data);
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };
  
  // Função para formatar duração
  const formatarDuracao = (minutos?: number) => {
    if (!minutos) return '0 min';
    
    if (minutos < 60) {
      return `${minutos} min`;
    }
    
    const horas = Math.floor(minutos / 60);
    const min = minutos % 60;
    
    return min > 0 ? `${horas}h ${min}min` : `${horas}h`;
  };

  // Excluir uma sessão
  const handleExcluirSessao = async (sessaoId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta sessão de estudo?')) {
      try {
        const resultado = await excluirSessaoEstudo(sessaoId);
        
        if (resultado) {
          // Atualizar lista de sessões
          setSessoes(sessoes.filter(s => s.id !== sessaoId));
          toast.success('Sessão de estudo excluída com sucesso');
        } else {
          toast.error('Não foi possível excluir a sessão');
        }
      } catch (error) {
        console.error('Erro ao excluir sessão:', error);
        toast.error('Erro ao excluir sessão de estudo');
      }
    }
  };

  // Filtrar sessões
  const filtrarSessoes = () => {
    if (!plano || !plano.sessions) return [];
    
    return plano.sessions.filter(sessao => {
      // Filtro por termo de busca
      if (searchTerm) {
        const termo = searchTerm.toLowerCase();
        const titulo = (sessao.title || '').toLowerCase();
        const disciplina = (sessao.disciplineName || '').toLowerCase();
        const assunto = (sessao.subjectName || '').toLowerCase();
        const notas = (sessao.notes || '').toLowerCase();
        
        if (!titulo.includes(termo) && !disciplina.includes(termo) && 
            !assunto.includes(termo) && !notas.includes(termo)) {
          return false;
        }
      }
      
      // Filtro por disciplina
      if (filtroDisciplina !== 'todas' && sessao.disciplineName !== filtroDisciplina) {
        return false;
      }
      
      // Filtro por status
      if (filtroStatus === 'concluidas' && !sessao.completed) {
        return false;
      }
      if (filtroStatus === 'pendentes' && sessao.completed) {
        return false;
      }
      
      // Filtro por período
      if (filtroPeriodo !== 'todos' && sessao.scheduledDate) {
        const dataHoje = new Date();
        const dataSessao = new Date(sessao.scheduledDate);
        
        if (filtroPeriodo === 'hoje') {
          return dataSessao.toDateString() === dataHoje.toDateString();
        }
        
        if (filtroPeriodo === 'semana') {
          const dataFimSemana = new Date();
          dataFimSemana.setDate(dataHoje.getDate() + 7);
          return dataSessao >= dataHoje && dataSessao <= dataFimSemana;
        }
        
        if (filtroPeriodo === 'passadas') {
          return dataSessao < dataHoje;
        }
        
        if (filtroPeriodo === 'futuras') {
          return dataSessao > dataHoje;
        }
      }
      
      return true;
    }).sort((a, b) => {
      // Ordenar por data (mais próximas primeiro)
      if (a.scheduledDate && b.scheduledDate) {
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      }
      return 0;
    });
  };

  // Obter lista de disciplinas para o filtro
  const obterDisciplinas = () => {
    if (!plano || !plano.sessions) return [];
    
    const disciplinas = new Set<string>();
    plano.sessions.forEach(sessao => {
      if (sessao.disciplineName) {
        disciplinas.add(sessao.disciplineName);
      }
    });
    
    return Array.from(disciplinas);
  };

  // Sessões filtradas
  const sessoesExibidas = filtrarSessoes();
  const estatisticas = calcularEstatisticas();

  // Função para formatar data completa (para cabeçalhos de grupo)
  const formatarDataCompleta = (data?: string | Date) => {
    if (!data) return 'Data não definida';
    
    try {
      return new Date(data).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit', 
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Agrupar sessões por dia
  const agruparSessoesPorDia = (sessoes: StudySession[]) => {
    const grupos: Record<string, StudySession[]> = {};
    
    sessoes.forEach(sessao => {
      if (!sessao.scheduledDate) {
        const keySemData = 'sem-data';
        if (!grupos[keySemData]) {
          grupos[keySemData] = [];
        }
        grupos[keySemData].push(sessao);
        return;
      }
      
      // Usar apenas a data (sem horas) como chave
      const dataObj = new Date(sessao.scheduledDate);
      const key = dataObj.toISOString().split('T')[0];
      
      if (!grupos[key]) {
        grupos[key] = [];
      }
      
      grupos[key].push(sessao);
    });
    
    // Ordenar as chaves por data
    const keysOrdenadas = Object.keys(grupos).sort((a, b) => {
      if (a === 'sem-data') return 1; // Sem data fica no final
      if (b === 'sem-data') return -1;
      return a.localeCompare(b);
    });
    
    return { grupos, keysOrdenadas };
  };

  // Determinar o status do grupo de sessões
  const getGrupoStatus = (sessoes: StudySession[]) => {
    const hoje = new Date().toISOString().split('T')[0];
    
    if (!sessoes[0].scheduledDate) return 'sem-data';
    
    const dataGrupo = new Date(sessoes[0].scheduledDate).toISOString().split('T')[0];
    
    if (dataGrupo === hoje) return 'hoje';
    if (dataGrupo < hoje) return 'passado';
    return 'futuro';
  };

  // Obter cor para o cabeçalho do grupo
  const getCorGrupo = (status: string) => {
    switch (status) {
      case 'hoje': return 'bg-blue-50 border-blue-200';
      case 'passado': return 'bg-gray-50 border-gray-200';
      case 'futuro': return 'bg-green-50 border-green-200';
      case 'sem-data': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  // Obter ícone para o cabeçalho do grupo
  const getIconeGrupo = (status: string) => {
    switch (status) {
      case 'hoje': return <Clock8 className="h-5 w-5 text-blue-600" />;
      case 'passado': return <CalendarDays className="h-5 w-5 text-gray-600" />;
      case 'futuro': return <CalendarCheck className="h-5 w-5 text-green-600" />;
      case 'sem-data': return <Calendar className="h-5 w-5 text-purple-600" />;
      default: return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <span className="text-gray-600">Carregando sessões de estudo...</span>
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
            <div className="bg-red-50 p-4 rounded-full inline-flex items-center justify-center mb-4">
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Plano não encontrado</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-6">O plano que você está procurando não existe ou foi removido.</p>
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
        {/* Cabeçalho e navegação */}
        <div className="mb-6">
          <Link href={`/planejamento/${planoId}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Voltar para o plano</span>
            </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Sessões de Estudo</h1>
              <p className="text-gray-600">Plano: {plano.name}</p>
          </div>
          <Link href={`/planejamento/${planoId}/sessoes/nova`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Sessão
            </Button>
          </Link>
          </div>
        </div>
        
        {/* Resumo de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex flex-col">
              <span className="text-xs text-blue-700 mb-1 flex items-center">
                <ClipboardList className="h-3.5 w-3.5 mr-1" />
                Total de Sessões
              </span>
              <span className="text-2xl font-bold">{estatisticas.total}</span>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex flex-col">
              <span className="text-xs text-green-700 mb-1 flex items-center">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Concluídas
              </span>
              <span className="text-2xl font-bold">{estatisticas.concluidas}</span>
            </div>
          </div>
          
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex flex-col">
              <span className="text-xs text-amber-700 mb-1 flex items-center">
                <Clock8 className="h-3.5 w-3.5 mr-1" />
                Pendentes
              </span>
              <span className="text-2xl font-bold">{estatisticas.pendentes}</span>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex flex-col">
              <span className="text-xs text-purple-700 mb-1 flex items-center">
                <Clock className="h-3.5 w-3.5 mr-1" />
                Horas Estudadas
              </span>
              <span className="text-2xl font-bold">{estatisticas.horasEstudadas}h</span>
            </div>
          </div>
        </div>

        {/* Barra de busca e Filtros */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
          <div className="p-4">
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por título, disciplina ou assunto..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
        </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <BookOpen className="h-4 w-4 mr-1.5 text-gray-500" />
                  Disciplina
                </label>
                <select 
                  value={filtroDisciplina}
                  onChange={(e) => setFiltroDisciplina(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="todas">Todas as disciplinas</option>
                  {obterDisciplinas().map(disciplina => (
                    <option key={disciplina} value={disciplina}>{disciplina}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-1.5 text-gray-500" />
                  Status
                </label>
                <select 
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="todos">Todos os status</option>
                  <option value="concluidas">Concluídas</option>
                  <option value="pendentes">Pendentes</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <CalendarCheck className="h-4 w-4 mr-1.5 text-gray-500" />
                  Período
                </label>
                <select 
                  value={filtroPeriodo}
                  onChange={(e) => setFiltroPeriodo(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="todos">Todos os períodos</option>
                  <option value="hoje">Hoje</option>
                  <option value="semana">Próximos 7 dias</option>
                  <option value="passadas">Sessões passadas</option>
                  <option value="futuras">Sessões futuras</option>
                </select>
              </div>
              </div>
          </div>
        </div>
          
        {/* Lista de sessões */}
        {sessoesExibidas.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-blue-50 p-4 rounded-full mb-4">
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma sessão encontrada</h2>
              <p className="text-gray-500 text-center max-w-md mb-6">
                {searchTerm || filtroDisciplina !== 'todas' || filtroStatus !== 'todos' || filtroPeriodo !== 'todos'
                  ? 'Não encontramos sessões de estudo com os filtros aplicados. Tente ajustar os critérios de busca.'
                  : 'Você ainda não tem sessões de estudo agendadas para este plano. Crie sua primeira sessão agora.'}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {(searchTerm || filtroDisciplina !== 'todas' || filtroStatus !== 'todos' || filtroPeriodo !== 'todos') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setFiltroDisciplina('todas');
                      setFiltroStatus('todos');
                      setFiltroPeriodo('todos');
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
            <Link href={`/planejamento/${planoId}/sessoes/nova`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                    Agendar Sessão
              </Button>
            </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Agrupar sessões por dia */}
            {(() => {
              const { grupos, keysOrdenadas } = agruparSessoesPorDia(sessoesExibidas);
              
              return keysOrdenadas.map(dataKey => {
                const sessoesDoDia = grupos[dataKey];
                const primeiraDataDoDia = sessoesDoDia[0].scheduledDate;
                const dataFormatada = dataKey === 'sem-data' 
                  ? 'Sessões sem data definida' 
                  : formatarDataCompleta(primeiraDataDoDia);
                
                const statusGrupo = dataKey === 'sem-data' 
                  ? 'sem-data' 
                  : getGrupoStatus(sessoesDoDia);
                  
                const corGrupo = getCorGrupo(statusGrupo);
                const iconeGrupo = getIconeGrupo(statusGrupo);
                
                return (
                  <div key={dataKey} className="space-y-2">
                    {/* Cabeçalho do grupo */}
                    <div className={`p-2 px-4 rounded-lg flex items-center ${corGrupo}`}>
                      <div className="mr-2">
                        {iconeGrupo}
                      </div>
                      <h3 className="font-medium">
                        {dataFormatada}
                      </h3>
                      <div className="ml-auto text-sm text-gray-500">
                        {sessoesDoDia.length} sessão(ões)
                      </div>
                    </div>
                    
                    {/* Sessões do dia */}
                    <div className="space-y-2 pl-2">
                      {sessoesDoDia.map((sessao) => {
                        const sessaoHoje = isHoje(sessao.scheduledDate);
                        const sessaoAtrasada = isAtrasada(sessao);
                        
                        return (
                          <div 
                            key={sessao.id} 
                            className={`bg-white rounded-lg border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                              sessao.completed ? 'border-green-200' : 
                              sessaoHoje ? 'border-blue-200' : 
                              sessaoAtrasada ? 'border-red-200' : 'border-gray-100'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row">
                              {/* Coluna de data */}
                              <div className={`md:w-36 p-4 flex flex-row md:flex-col justify-between md:justify-center items-center text-center ${
                                sessao.completed ? 'bg-green-50 text-green-700' : 
                                sessaoHoje ? 'bg-blue-50 text-blue-700' : 
                                sessaoAtrasada ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                              }`}>
                                {sessao.scheduledDate ? (
                                  <>
                                    <div className="flex flex-col justify-center items-center">
                                      <div className="text-2xl font-bold">
                                        {formatarHora(sessao.scheduledDate)}
                                      </div>
                                    </div>
                                    <div className="flex items-center md:mt-3">
                                      {sessao.completed ? (
                                        <div className="flex items-center gap-1 text-xs font-medium">
                                          <CheckCircle2 className="h-4 w-4" />
                                          <span>Concluída</span>
                                        </div>
                                      ) : sessaoHoje ? (
                                        <div className="flex items-center gap-1 text-xs font-medium">
                                          <Clock8 className="h-4 w-4" />
                                          <span>Hoje</span>
                                        </div>
                                      ) : sessaoAtrasada ? (
                                        <div className="flex items-center gap-1 text-xs font-medium">
                                          <AlarmClock className="h-4 w-4" />
                                          <span>Atrasada</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-xs font-medium">
                                          <CalendarCheck className="h-4 w-4" />
                                          <span>Agendada</span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <div className="text-sm font-medium">Sem horário</div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Conteúdo principal */}
                              <div className="flex-1 p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-800">{sessao.title}</h3>
                                    
                                    <div className="mt-2 flex flex-wrap gap-2">
                                  {sessao.disciplineName && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                      {sessao.disciplineName}
                                        </span>
                                  )}
                                      
                                  {sessao.subjectName && (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {sessao.subjectName}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                                      <div className="flex items-center">
                                        <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
                                        {formatarDuracao(sessao.duration)}
                                      </div>
                                      
                                      {sessao.completed && sessao.actualDuration && (
                                        <div className="flex items-center">
                                          <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-500" />
                                          Real: {formatarDuracao(sessao.actualDuration)}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {sessao.notes && (
                                      <div className="mt-3 text-sm text-gray-600">
                                        <div className="flex items-center text-gray-500 mb-1">
                                          <FileText className="h-3.5 w-3.5 mr-1" />
                                          <span className="text-xs">Notas:</span>
                                        </div>
                                        <p className="line-clamp-2">{sessao.notes}</p>
                                  </div>
                                )}
                                  </div>
                              
                                  <div className="flex space-x-2">
                                    <Link href={`/planejamento/${planoId}/sessoes/${sessao.id}`}>
                                      <Button 
                                        variant={sessao.completed ? "outline" : "primary"} 
                                        size="sm"
                                        className={sessao.completed ? "" : "bg-blue-500 hover:bg-blue-600"}
                                      >
                                        {sessao.completed ? (
                                          <>
                                            <FileText className="h-4 w-4 mr-1.5" />
                                            Detalhes
                                          </>
                                        ) : (
                                          <>
                                            <PlayCircle className="h-4 w-4 mr-1.5" />
                                            Iniciar
                                          </>
                                        )}
                                    </Button>
                                  </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Barra de ações */}
                            <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-end">
                              <div className="flex space-x-2">
                                  <Link href={`/planejamento/${planoId}/sessoes/${sessao.id}/editar`}>
                                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                                    <Edit className="h-4 w-4 mr-1.5" />
                                    Editar
                                      </Button>
                                    </Link>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleExcluirSessao(sessao.id)}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  >
                                  <Trash2 className="h-4 w-4 mr-1.5" />
                                  Excluir
                                  </Button>
                                  </div>
                                </div>
                              </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </AppLayout>
  );
} 