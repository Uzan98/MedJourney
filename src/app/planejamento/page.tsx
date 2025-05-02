'use client';

import { useState, useEffect } from 'react';
import { obterPlanosLocais, excluirPlano, sincronizarPlanos } from '@/services';
import { StudyPlan, StudySession } from '@/lib/types/planning';
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
  Brain,
  X,
  CalendarClock,
  Sparkles
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
  const [mostrarAviso, setMostrarAviso] = useState(true);

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
    
    // Verificar se o serviço de sincronização está disponível
    // Isso garante que os dados de disciplinas estejam sincronizados
    try {
      const { sincronizarDados } = require('@/services/data-sync');
      sincronizarDados().catch((err: Error) => {
        console.error("Erro ao sincronizar dados:", err);
      });
    } catch (error) {
      console.warn("Serviço de sincronização não disponível:", error);
    }
    
    // Esconder o aviso de boas-vindas após 30 dias
    const ultimaVisitaStr = localStorage.getItem('ultimaVisitaPlanejamento');
    if (ultimaVisitaStr) {
      const ultimaVisita = new Date(ultimaVisitaStr);
      const hoje = new Date();
      const diffDias = Math.floor((hoje.getTime() - ultimaVisita.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDias > 30) {
        setMostrarAviso(false);
      }
    }
    
    // Registrar visita atual
    localStorage.setItem('ultimaVisitaPlanejamento', new Date().toISOString());
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

  // Verifica se uma data é válida
  const isValidDate = (date: string | Date | undefined): boolean => {
    if (!date) return false;
    
    const d = new Date(date);
    return !isNaN(d.getTime());
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

  // Função segura para criar datas
  const safeParseDate = (dateInput: string | Date | undefined): Date | null => {
    if (!dateInput) return null;
    try {
      return new Date(dateInput);
    } catch (e) {
      console.error("Erro ao converter data:", e);
      return null;
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
      <div className="container mx-auto px-4 py-8">
        {/* Header com visual melhorado */}
        <div className="flex flex-wrap items-center justify-between mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-blue-100">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-full mr-4 shadow-inner">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Planejamento de Estudos</h1>
              <p className="text-gray-600 text-sm">Organize e acompanhe seu progresso acadêmico</p>
            </div>
          </div>
          
          <div className="flex space-x-3 mt-4 md:mt-0">
            {/* Botão de novo plano */}
            <Link href="/planejamento/novo">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200 hover:shadow flex items-center gap-2">
                <Plus className="h-4 w-4" /> 
                Novo Plano
              </Button>
            </Link>
            
            {/* Botão de sincronização com efeito de hover melhorado */}
            <Button 
              variant="outline"
              className="whitespace-nowrap bg-white hover:bg-blue-50 transition-all duration-200 border-blue-200 hover:border-blue-300 shadow-sm"
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
                  <RefreshCw className="h-4 w-4 mr-2 text-blue-500" /> 
                  Sincronizar
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Cards principais - Adicionar antes da seção de filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Card de Visão Geral */}
          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 shadow-md relative overflow-hidden group">
            {/* Elementos decorativos */}
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-blue-400 opacity-20"></div>
            <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-indigo-500 opacity-20"></div>
            
            <div className="relative">
              <h3 className="text-lg font-semibold mb-1 flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
                Visão Geral do Estudo
              </h3>
              <p className="text-blue-100 text-sm mb-4">Seu progresso até o momento</p>
              
              {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="text-2xl font-bold">{planos.length}</div>
                  <div className="text-xs text-blue-100">Planos de Estudo</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="text-2xl font-bold">
                    {planos.reduce((acc, plano) => acc + (plano.disciplines?.length || 0), 0)}
                  </div>
                  <div className="text-xs text-blue-100">Disciplinas</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="text-2xl font-bold">
                    {planos.reduce((acc, plano) => {
                      let assuntos = 0;
                      plano.disciplines?.forEach(d => {
                        assuntos += d.subjects?.length || 0;
                      });
                      return acc + assuntos;
                    }, 0)}
                  </div>
                  <div className="text-xs text-blue-100">Assuntos</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="text-2xl font-bold">
                    {planos.reduce((acc, plano) => acc + (plano.sessions?.length || 0), 0)}
                  </div>
                  <div className="text-xs text-blue-100">Sessões</div>
                </div>
              </div>
              
              <div className="mt-4 bg-blue-500/30 rounded-lg p-3 border border-blue-300/30">
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Última atualização: {new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Card de Próxima Sessão */}
          <div className="rounded-xl bg-white p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <CalendarClock className="h-5 w-5 mr-2 text-blue-600" />
              Próxima Sessão
            </h3>
            
            {(() => {
              // Encontrar todas as sessões futuras não completadas
              type SessaoComPlano = {sessao: StudySession, plano: StudyPlan};
              const todasSessoesFuturas: SessaoComPlano[] = [];
              
              planos.forEach(plano => {
                if (!plano.sessions) return;
                
                plano.sessions.forEach(sessao => {
                  if (sessao && sessao.scheduledDate && !sessao.completed) {
                    try {
                      const dataAgendada = new Date(sessao.scheduledDate);
                      const agora = new Date();
                      
                      if (dataAgendada > agora) {
                        todasSessoesFuturas.push({
                          sessao: sessao,
                          plano: plano
                        });
                      }
                    } catch (error) {
                      console.error("Erro ao processar data da sessão:", error);
                    }
                  }
                });
              });
              
              // Se não houver sessões futuras
              if (todasSessoesFuturas.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="p-4 bg-gray-100 rounded-full text-gray-400 mb-3">
                      <CalendarClock className="h-8 w-8" />
                    </div>
                    <p className="text-gray-600 font-medium">Nenhuma sessão agendada</p>
                    <p className="text-sm text-gray-500 mt-1 mb-4">Crie sessões em um de seus planos de estudo</p>
                    <Link href="/planejamento/novo">
                      <Button size="sm" variant="outline">
                        Criar plano
                        <Plus className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                );
              }
              
              // Ordenar e pegar a próxima sessão
              todasSessoesFuturas.sort((a, b) => {
                const dateA = new Date(a.sessao.scheduledDate || 0);
                const dateB = new Date(b.sessao.scheduledDate || 0);
                return dateA.getTime() - dateB.getTime();
              });
              
              const proximaSessao = todasSessoesFuturas[0];
              if (!proximaSessao.sessao.scheduledDate) return null;
              
              const sessionDate = new Date(proximaSessao.sessao.scheduledDate);
              const now = new Date();
              const diffMs = sessionDate.getTime() - now.getTime();
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              
              const timeLeft = diffDays > 0 
                ? `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
                : diffHours > 0
                  ? `${diffHours}h ${diffMin > 0 ? diffMin + 'min' : ''}`
                  : `${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
              
              return (
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="text-sm text-blue-800 font-medium">{proximaSessao.sessao.title}</div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center">
                      <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                      {proximaSessao.sessao.disciplineName || 'Sem disciplina'}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <div className="flex items-center">
                      <CalendarDays className="h-4 w-4 mr-1.5 text-blue-500" />
                      <span>{sessionDate.toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1.5 text-blue-500" />
                      <span>{sessionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100 flex items-center">
                    <div className="relative mr-2">
                      <div className="animate-ping absolute h-3 w-3 rounded-full bg-indigo-400 opacity-75"></div>
                      <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
                    </div>
                    <div className="text-sm text-indigo-700">Começa em <span className="font-bold">{timeLeft}</span></div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Link href={`/planejamento/${proximaSessao.plano.id}/sessoes`}>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        Ver detalhes
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })()}
          </div>
          
          {/* Card de Dicas */}
          <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-md border border-amber-100 hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-amber-500" />
              Dicas de Estudo
            </h3>
            
            <div className="space-y-4">
              {/* Dica do dia - rotaciona aleatoriamente */}
              {(() => {
                const dicas = [
                  { 
                    icon: <Clock className="h-4 w-4 text-amber-500" />, 
                    title: "Técnica Pomodoro", 
                    text: "Utilize ciclos de 25 minutos de foco intenso seguidos por 5 minutos de descanso." 
                  },
                  { 
                    icon: <BookOpen className="h-4 w-4 text-amber-500" />, 
                    title: "Revisão Espaçada", 
                    text: "Revise o conteúdo em intervalos crescentes para melhor retenção a longo prazo." 
                  },
                  { 
                    icon: <CheckCircle2 className="h-4 w-4 text-amber-500" />, 
                    title: "Prática Ativa", 
                    text: "Teste seus conhecimentos ativamente, não apenas relendo o material." 
                  },
                  { 
                    icon: <Brain className="h-4 w-4 text-amber-500" />, 
                    title: "Associações", 
                    text: "Conecte novos conhecimentos com informações que você já domina." 
                  },
                  { 
                    icon: <BarChart2 className="h-4 w-4 text-amber-500" />, 
                    title: "Elimine Distrações", 
                    text: "Crie um ambiente livre de interrupções durante seus períodos de estudo." 
                  }
                ];
                
                // Usa a data para escolher uma dica fixa para o dia
                const hoje = new Date();
                const indiceDica = (hoje.getDate() + hoje.getMonth()) % dicas.length;
                const dica = dicas[indiceDica];
                
                return (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
                    <div className="flex items-center mb-1.5">
                      <div className="p-1.5 bg-amber-100 rounded-full mr-2">{dica.icon}</div>
                      <h4 className="font-medium text-gray-800">{dica.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600">{dica.text}</p>
                  </div>
                );
              })()}
              
              {/* Progresso geral */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-800 text-sm">Progresso Geral</h4>
                  <div className="text-xs text-amber-600 font-medium">
                    {Math.floor(
                      planos.reduce((total, plano) => {
                        return total + calcularProgresso(plano);
                      }, 0) / (planos.length || 1)
                    )}%
                  </div>
                </div>
                <div className="relative h-2 bg-amber-100 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-amber-500"
                    style={{ 
                      width: `${Math.floor(
                        planos.reduce((total, plano) => {
                          return total + calcularProgresso(plano);
                        }, 0) / (planos.length || 1)
                      )}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Média do progresso de todos os seus planos de estudo
                </p>
              </div>
              
              <div className="text-center pt-2">
                <Link href="/dashboard">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-amber-200 text-amber-700 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-300"
                  >
                    Ver estatísticas completas
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filtros e pesquisa com design aprimorado */}
        <div className="mb-8 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
            <Filter className="h-4 w-4 mr-2 text-blue-500" />
            Filtrar Planos
          </h2>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 group-hover:text-blue-500 transition-colors" />
              <input
                type="text"
                  placeholder="Buscar plano por nome ou descrição..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                />
                {termoBusca && (
                  <button 
                    onClick={() => setTermoBusca('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
            </div>
          </div>
          
          <div>
            <select
              value={filtroStatus || ''}
              onChange={(e) => setFiltroStatus(e.target.value === '' ? null : e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-all duration-200 text-gray-700"
            >
              <option value="">Todos os status</option>
              <option value="ativo">Ativos</option>
              <option value="pausado">Pausados</option>
              <option value="concluido">Concluídos</option>
            </select>
            </div>
            
            {(filtroStatus || termoBusca) && (
              <Button
                variant="ghost"
                onClick={() => {setFiltroStatus(null); setTermoBusca('')}}
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 py-3"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Cards para criar planos com visual aprimorado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Plano Inteligente */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 hover:shadow-lg transition-all duration-300 overflow-hidden group relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full opacity-20 transform translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200 rounded-full opacity-20 transform -translate-x-6 translate-y-6 group-hover:scale-110 transition-transform duration-500"></div>
            
            <CardHeader className="pb-3 relative z-10">
              <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform duration-300">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl text-blue-800 group-hover:text-blue-700 transition-colors">
                Plano Inteligente
              </CardTitle>
              <CardDescription className="text-blue-600/80">
                Otimize seus estudos com base na dificuldade e disponibilidade
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative z-10">
              <div className="space-y-3 text-sm text-gray-600 mb-4">
                <div className="flex items-start">
                  <div className="bg-blue-100 p-1.5 rounded-full mr-3 mt-0.5 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p>Prioriza assuntos com base na dificuldade e importância</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-blue-100 p-1.5 rounded-full mr-3 mt-0.5 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p>Distribui sessões conforme sua disponibilidade de horário</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-blue-100 p-1.5 rounded-full mr-3 mt-0.5 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p>Cria um cronograma otimizado para maximizar seu aprendizado</p>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="relative z-10">
              <Link href="/planejamento/inteligente" className="w-full">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow transition-all duration-200 py-6">
                  Criar Plano Inteligente 
                  <div className="ml-2 bg-blue-500 rounded-full p-1">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Plano Manual */}
          <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden group relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-200 rounded-full opacity-20 transform translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-slate-200 rounded-full opacity-20 transform -translate-x-6 translate-y-6 group-hover:scale-110 transition-transform duration-500"></div>
            
            <CardHeader className="pb-3 relative z-10">
              <div className="bg-gray-100 w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform duration-300">
                <CalendarDays className="h-6 w-6 text-gray-600" />
              </div>
              <CardTitle className="text-xl text-gray-800 group-hover:text-gray-700 transition-colors">
                Plano Manual
              </CardTitle>
              <CardDescription className="text-gray-500">
                Crie um plano personalizado selecionando disciplinas e assuntos
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative z-10">
              <div className="space-y-3 text-sm text-gray-600 mb-4">
                <div className="flex items-start">
                  <div className="bg-gray-200 p-1.5 rounded-full mr-3 mt-0.5 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                  <p>Selecione disciplinas e assuntos específicos</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-gray-200 p-1.5 rounded-full mr-3 mt-0.5 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                  <p>Defina manualmente prioridades e horas de estudo</p>
                </div>
                <div className="flex items-start">
                  <div className="bg-gray-200 p-1.5 rounded-full mr-3 mt-0.5 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                  <p>Crie e organize suas próprias sessões de estudo</p>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="relative z-10">
              <Link href="/planejamento/novo" className="w-full">
                <Button variant="outline" className="w-full border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200 py-6">
                  Criar Plano Manual
                  <div className="ml-2 bg-gray-200 rounded-full p-1">
                    <ArrowRight className="h-4 w-4 text-gray-700" />
                  </div>
                </Button>
              </Link>
            </CardFooter>
          </Card>
            </div>

        {/* Lista de planos - Título com novo estilo */}
        <div className="flex items-center mb-6 border-b border-gray-200 pb-4">
          <CalendarCheck className="h-5 w-5 mr-3 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-800">Meus Planos de Estudo</h2>
          <div className="ml-3 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
            {planos.length} {planos.length === 1 ? 'plano' : 'planos'}
          </div>
        </div>

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
                  className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:translate-y-[-6px] group relative bg-white border-gray-200"
                >
                  {/* Efeitos decorativos que aparecem no hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-400 rounded-full opacity-0 group-hover:opacity-5 transition-opacity duration-700 transform group-hover:scale-150"></div>
                  <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-400 rounded-full opacity-0 group-hover:opacity-5 transition-opacity duration-700 transform group-hover:scale-150"></div>

                  {/* Barra de progresso no topo do card com efeito de brilho */}
                  <div className="h-2 bg-gray-100 w-full absolute top-0 left-0 overflow-hidden z-10">
                    <div 
                      className={`h-full group-hover:animate-pulse ${
                        progresso < 30 ? 'bg-gradient-to-r from-blue-300 to-blue-400' : 
                        progresso < 70 ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 
                        'bg-gradient-to-r from-blue-500 to-blue-600'
                      }`}
                      style={{ width: `${progresso}%` }}
                    ></div>
                    {/* Efeito de brilho que se move quando em hover */}
                    <div 
                      className="absolute top-0 left-0 h-full w-20 bg-white/20 transform -skew-x-30 opacity-0 group-hover:animate-shimmer"
                      style={{ width: `${progresso}%` }}
                    ></div>
                  </div>
                  
                  {/* Badge no canto superior direito com o status */}
                  <div className="absolute top-3 right-3 z-20">
                    <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border shadow-sm
                      ${plano.status === 'ativo' ? 'bg-green-50 text-green-600 border-green-200' : 
                        plano.status === 'pausado' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 
                        'bg-blue-50 text-blue-600 border-blue-200'}`}
                    >
                      {statusInfo.icon}
                      <span>{plano.status === 'ativo' ? 'Ativo' : plano.status === 'pausado' ? 'Pausado' : 'Concluído'}</span>
                    </div>
                  </div>
                  
                  <CardHeader className="pt-9 pb-2 relative z-10">
                    <div className="flex items-start gap-3">
                      {/* Ícone decorativo baseado na primeira letra do nome do plano */}
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white w-12 h-12 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:rotate-3">
                        <span className="text-xl font-bold">{(plano.name?.[0] || 'P').toUpperCase()}</span>
                      </div>
                      
                      <div className="flex-1">
                        <CardTitle className="text-xl truncate group-hover:text-blue-600 transition-colors duration-200" title={plano.name}>
                      {plano.name || 'Plano sem nome'}
                    </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <CardDescription className="line-clamp-1" title={plano.description}>
                          {plano.description || "Sem descrição"}
                        </CardDescription>
                          <div className="transform group-hover:scale-110 transition-transform duration-200">
                    {renderSyncStatus(plano.synchronizationStatus)}
                          </div>
                        </div>
                  </div>
                    </div>
                </CardHeader>
                  
                  <CardContent className="relative z-10">
                    <div className="space-y-5">
                      {/* Card com informações principais */}
                      <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-4 border border-gray-100 shadow-sm">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Informações de período */}
                          <div className="space-y-1">
                            <h4 className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-blue-500" />
                              <span>Período</span>
                            </h4>
                            <p className="text-sm font-medium text-gray-700">
                          {plano.startDate ? formatarData(plano.startDate) : 'N/D'} 
                          {plano.endDate ? ` - ${formatarData(plano.endDate)}` : ''}
                            </p>
          </div>
          
                          {/* Informações de progresso */}
                          <div className="space-y-1">
                            <h4 className="text-xs text-gray-500 flex items-center gap-1.5">
                              <BarChart2 className="h-3.5 w-3.5 text-blue-500" />
                              <span>Progresso</span>
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    progresso < 30 ? 'bg-blue-400' : 
                                    progresso < 70 ? 'bg-blue-500' : 
                                    'bg-blue-600'
                            }`}
                            style={{ width: `${progresso}%` }}
                          ></div>
                              </div>
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                                progresso < 30 ? 'bg-blue-100 text-blue-600' : 
                                progresso < 70 ? 'bg-blue-100 text-blue-700' : 
                                'bg-blue-600 text-white'
                              }`}>
                                {progresso}%
                              </span>
                            </div>
                          </div>
          </div>
        </div>

                      {/* Métricas em cards 3D com efeito de elevação */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-3 text-center shadow-sm group-hover:shadow-md transform group-hover:translate-y-[-2px] transition-all duration-300 border border-blue-50">
                          <div className="flex justify-center text-blue-500 mb-1 group-hover:animate-bounce-small">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="text-lg font-bold text-gray-800">{totalDisciplinas}</div>
                          <div className="text-xs text-blue-600 font-medium">Disciplinas</div>
              </div>
                        
                        <div className="bg-gradient-to-br from-white to-green-50 rounded-xl p-3 text-center shadow-sm group-hover:shadow-md transform group-hover:translate-y-[-2px] transition-all duration-300 border border-green-50">
                          <div className="flex justify-center text-green-500 mb-1 group-hover:animate-bounce-small">
                            <BookCheck className="h-4 w-4" />
            </div>
                          <div className="text-lg font-bold text-gray-800">{totalAssuntos}</div>
                          <div className="text-xs text-green-600 font-medium">Assuntos</div>
          </div>

                        <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl p-3 text-center shadow-sm group-hover:shadow-md transform group-hover:translate-y-[-2px] transition-all duration-300 border border-purple-50">
                          <div className="flex justify-center text-purple-500 mb-1 group-hover:animate-bounce-small">
                            <CalendarCheck className="h-4 w-4" />
                    </div>
                          <div className="text-lg font-bold text-gray-800">{sessoesAgendadas}</div>
                          <div className="text-xs text-purple-600 font-medium">Sessões</div>
                      </div>
                      </div>

                      {/* Visualização de disciplinas com scroll elegante */}
                      {plano.disciplines && plano.disciplines.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <BookOpen className="h-4 w-4 mr-1.5 text-blue-500" />
                            Disciplinas incluídas
                          </h4>
                          <div className="max-h-36 overflow-y-auto pr-1 custom-scrollbar rounded-lg">
                            {plano.disciplines.slice(0, 5).map((disciplina) => {
                              const disciplinaProgresso = disciplina.progress || 0;
                              const assuntoCount = disciplina.subjects?.length || 0;
                              const assuntosConcluidos = disciplina.subjects?.filter(a => a.completed)?.length || 0;
                              
                              // Cores diferentes para cada disciplina
                              const disciplinasColors: Record<number, { bg: string, text: string, lightBg: string, darkBg: string, icon: React.ReactNode }> = {
                                1: { bg: 'bg-red-100', text: 'text-red-600', lightBg: 'bg-red-50', darkBg: 'bg-red-200', icon: getDisciplineIcon(1) }, // Anatomia
                                2: { bg: 'bg-blue-100', text: 'text-blue-600', lightBg: 'bg-blue-50', darkBg: 'bg-blue-200', icon: getDisciplineIcon(2) }, // Fisiologia
                                3: { bg: 'bg-green-100', text: 'text-green-600', lightBg: 'bg-green-50', darkBg: 'bg-green-200', icon: getDisciplineIcon(3) }, // Bioquímica
                                4: { bg: 'bg-orange-100', text: 'text-orange-600', lightBg: 'bg-orange-50', darkBg: 'bg-orange-200', icon: getDisciplineIcon(4) }, // Farmacologia
                                5: { bg: 'bg-purple-100', text: 'text-purple-600', lightBg: 'bg-purple-50', darkBg: 'bg-purple-200', icon: getDisciplineIcon(5) }, // Patologia
                                6: { bg: 'bg-yellow-100', text: 'text-yellow-600', lightBg: 'bg-yellow-50', darkBg: 'bg-yellow-200', icon: getDisciplineIcon(6) }, // Microbiologia
                                7: { bg: 'bg-teal-100', text: 'text-teal-600', lightBg: 'bg-teal-50', darkBg: 'bg-teal-200', icon: getDisciplineIcon(7) }, // Semiologia
                                8: { bg: 'bg-indigo-100', text: 'text-indigo-600', lightBg: 'bg-indigo-50', darkBg: 'bg-indigo-200', icon: getDisciplineIcon(8) }, // Clínica Médica
                              };
                              
                              const colorInfo = disciplinasColors[disciplina.id] || { 
                                bg: 'bg-gray-100', 
                                text: 'text-gray-600', 
                                lightBg: 'bg-gray-50',
                                darkBg: 'bg-gray-200',
                                icon: <BookOpen className="h-4 w-4" /> 
                              };
                              
                              return (
                                <div 
                                  key={disciplina.id} 
                                  className={`flex items-center gap-3 p-2 mb-2 rounded-lg hover:bg-${colorInfo.lightBg} transition-all duration-200 cursor-pointer group/disc border border-transparent hover:border-${colorInfo.darkBg}`}
                                >
                                  <div className={`p-2 rounded-lg ${colorInfo.bg} ${colorInfo.text} flex items-center justify-center shadow-sm`}>
                                    {colorInfo.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                      <div className="truncate font-medium text-sm">{disciplina.name}</div>
                                      <div className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                        disciplinaProgresso > 70 ? 'bg-green-100 text-green-700' : 
                                        disciplinaProgresso > 30 ? 'bg-blue-100 text-blue-700' : 
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {assuntosConcluidos}/{assuntoCount}
                                    </div>
                                    </div>
                                    <div className="mt-1 relative w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`absolute top-0 left-0 h-full ${colorInfo.bg} group-hover/disc:${colorInfo.darkBg} transition-all duration-300`}
                                        style={{ width: `${disciplinaProgresso}%` }}
                                      ></div>
                                    </div>
                                  </div>
            </div>
                              );
                            })}
                            
                            {plano.disciplines.length > 5 && (
                              <div className="text-center pt-1 pb-2">
                                <span className="text-xs text-blue-600 font-medium">
                                  +{plano.disciplines.length - 5} disciplinas
                                </span>
                              </div>
                            )}
              </div>
            </div>
          )}
        </div>
                </CardContent>
                  
                  <CardFooter className="flex justify-between bg-gradient-to-br from-gray-50 to-blue-50/30 border-t border-gray-100 p-4 relative z-10">
                    <div className="flex gap-2">
                  <Link href={`/planejamento/${plano.id}`}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50 shadow-sm hover:shadow group-hover:border-blue-300 transition-all duration-200 flex items-center gap-1.5"
                        >
                          <ArrowRight className="h-4 w-4" />
                          Detalhes
                        </Button>
                    </Link>
                    <Link href={`/planejamento/${plano.id}/estatisticas`}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50 shadow-sm hover:shadow group-hover:border-blue-300 transition-all duration-200 flex items-center gap-1.5"
                        >
                          <BarChart2 className="h-4 w-4" />
                          Estatísticas
                        </Button>
                  </Link>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleExcluir(plano.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 group/trash relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-red-100 scale-0 rounded-full group-hover/trash:scale-100 transition-transform duration-300 z-0"></div>
                      <Trash2 className="h-4 w-4 relative z-10" />
                      <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs py-1 px-2 rounded opacity-0 group-hover/trash:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                        Excluir plano
                      </span>
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