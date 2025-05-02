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
  CalendarDays,
  X,
  ChevronLeft
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

// Funções auxiliares para o calendário
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

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
  
  // Novos estados para o calendário
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  // Para o calendário: obter sessões em uma data específica
  const getSessionsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return sessoes.filter(sessao => {
      if (!sessao.scheduledDate) return false;
      const sessionDate = new Date(sessao.scheduledDate).toISOString().split('T')[0];
      return sessionDate === dateStr;
    });
  };
  
  // Verificar se uma data tem sessões agendadas
  const hasSessionsOnDate = (date: Date) => {
    return getSessionsForDate(date).length > 0;
  };
  
  // Navegar para o mês anterior no calendário
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  // Navegar para o próximo mês no calendário
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  // Selecionar uma data no calendário
  const handleDateSelect = (date: Date) => {
    if (isDateEqual(date, selectedDate)) {
      // Deselecionar a data se já estiver selecionada
      setSelectedDate(null);
      setFiltroPeriodo('todos');
    } else {
      setSelectedDate(date);
      const dateStr = date.toISOString().split('T')[0];
      // Filtrar sessões apenas para a data selecionada
      const today = new Date().toISOString().split('T')[0];
      if (dateStr === today) {
        setFiltroPeriodo('hoje');
      } else {
        setFiltroPeriodo('data');
        // Atualizar a lista de sessões exibidas para apenas mostrar as da data selecionada
      }
    }
  };
  
  // Verificar se duas datas são iguais (apenas dia, mês e ano)
  const isDateEqual = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() && 
           date1.getMonth() === date2.getMonth() && 
           date1.getFullYear() === date2.getFullYear();
  };
  
  // Verificar se uma data é hoje
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };
  
  // Obter todas as disciplinas do plano
  const obterDisciplinas = () => {
    if (!plano || !plano.disciplines) return [];
    return plano.disciplines.map(d => d.name);
  };

  // Componente do calendário melhorado
  const CalendarComponent = () => {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
    
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 mb-8 animate-fadeIn overflow-hidden">
        {/* Cabeçalho do calendário com gradiente */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 -m-5 mb-4 p-5 border-b border-blue-100">
          <div className="flex justify-between items-center">
            <button 
              onClick={goToPreviousMonth}
              className="p-2 rounded-full text-blue-600 hover:text-blue-800 bg-white bg-opacity-80 hover:bg-opacity-100 shadow-sm hover:shadow transition-all duration-200"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-800">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            <button 
              onClick={goToNextMonth}
              className="p-2 rounded-full text-blue-600 hover:text-blue-800 bg-white bg-opacity-80 hover:bg-opacity-100 shadow-sm hover:shadow transition-all duration-200"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
          
        {/* Dias da semana */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center py-2">
              <span className="text-sm font-semibold text-gray-600">{day}</span>
            </div>
          ))}
        </div>
          
        {/* Grade do calendário */}
        <div className="grid grid-cols-7 gap-1">
          {/* Dias vazios no início do mês */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="p-1 min-h-[80px]"></div>
          ))}
          
          {/* Dias do mês */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const date = new Date(currentYear, currentMonth, day);
            const hasSessions = hasSessionsOnDate(date);
            const isSelectedDate = isDateEqual(date, selectedDate);
            const isTodayDate = isToday(date);
            const sessionsForDay = getSessionsForDate(date);
            
            return (
              <div
                key={`day-${day}`}
                onClick={() => handleDateSelect(date)}
                className={`
                  border p-1 min-h-[80px] rounded-lg cursor-pointer transition-all duration-200
                  ${isSelectedDate ? 'border-blue-500 bg-blue-50/50 shadow-md' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'}
                  ${isTodayDate && !isSelectedDate ? 'border-blue-400 bg-blue-50/20' : ''}
                `}
              >
                <div className="flex justify-between items-start p-1">
                  <div className={`
                    w-6 h-6 flex items-center justify-center rounded-full text-sm font-medium
                    ${isTodayDate ? 'bg-blue-500 text-white' : 'text-gray-800'}
                    ${isSelectedDate && !isTodayDate ? 'bg-blue-100 text-blue-800' : ''}
                  `}>
                    {day}
                  </div>
                  
                  {hasSessions && (
                    <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex justify-center items-center">
                      <span className="text-xs text-blue-800 font-medium">{sessionsForDay.length}</span>
                    </div>
                  )}
                </div>
                
                {/* Mini lista de sessões */}
                {hasSessions && (
                  <div className="mt-1 space-y-1">
                    {sessionsForDay.slice(0, 2).map((session, idx) => (
                      <div 
                        key={idx} 
                        className={`
                          text-[10px] truncate px-1.5 py-0.5 rounded 
                          ${session.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                        `}
                        title={session.title}
                      >
                        {session.title.length > 13 ? `${session.title.slice(0, 13)}...` : session.title}
                      </div>
                    ))}
                    
                    {sessionsForDay.length > 2 && (
                      <div className="text-[10px] text-blue-600 px-1.5">
                        +{sessionsForDay.length - 2} mais
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Legenda */}
        <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200 text-xs text-gray-600">
          <div className="flex space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-1.5"></div>
              <span>Hoje</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300 mr-1.5"></div>
              <span>Com sessões</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-100 text-blue-800 mr-1.5"></div>
              <span>Selecionado</span>
            </div>
          </div>
          
          <button
            onClick={() => {
              const now = new Date();
              setCurrentMonth(now.getMonth());
              setCurrentYear(now.getFullYear());
            }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Hoje
          </button>
        </div>
      </div>
    );
  };
  
  // Filtrar sessões também por data selecionada
  const filtrarSessoes = () => {
    if (!plano || !plano.sessions) return [];
    
    return plano.sessions.filter(sessao => {
      // Se houver uma data selecionada e o filtroPeriodo for 'data', só mostrar sessões dessa data
      if (selectedDate && filtroPeriodo === 'data' && sessao.scheduledDate) {
        const dataSessao = new Date(sessao.scheduledDate);
        const isEqual = dataSessao.getDate() === selectedDate.getDate() && 
                        dataSessao.getMonth() === selectedDate.getMonth() && 
                        dataSessao.getFullYear() === selectedDate.getFullYear();
        if (!isEqual) return false;
      }
      
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
      if (filtroPeriodo !== 'todos' && filtroPeriodo !== 'data' && sessao.scheduledDate) {
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

  // Melhorando a função getGrupoStatus para incluir informações mais detalhadas
  const getGrupoStatus = (sessoes: StudySession[]) => {
    const hoje = new Date().toISOString().split('T')[0];
    
    if (!sessoes[0].scheduledDate) return 'sem-data';
    
    const dataGrupo = new Date(sessoes[0].scheduledDate).toISOString().split('T')[0];
    
    if (dataGrupo === hoje) return 'hoje';
    
    // Verificar se está atrasado ou é no futuro, com informações mais específicas
    if (dataGrupo < hoje) {
      // Verificar quão atrasado está
      const diasAtrasados = Math.floor((new Date().getTime() - new Date(dataGrupo).getTime()) / (1000 * 60 * 60 * 24));
      if (diasAtrasados <= 1) return 'ontem';
      if (diasAtrasados <= 7) return 'esta-semana';
      if (diasAtrasados <= 30) return 'este-mes';
      return 'passado';
    }
    
    // Verificar quão futuro é
    const diasFuturos = Math.floor((new Date(dataGrupo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diasFuturos <= 1) return 'amanha';
    if (diasFuturos <= 7) return 'proxima-semana';
    if (diasFuturos <= 30) return 'este-mes';
    return 'futuro';
  };

  // Melhorando a função getCorGrupo para cores mais específicas
  const getCorGrupo = (status: string) => {
    switch (status) {
      case 'hoje': return 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200';
      case 'ontem': return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200';
      case 'esta-semana': return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200';
      case 'este-mes': return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
      case 'passado': return 'bg-gradient-to-r from-red-50 to-red-100 border-red-200';
      case 'amanha': return 'bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200';
      case 'proxima-semana': return 'bg-gradient-to-r from-green-50 to-green-100 border-green-200';
      case 'futuro': return 'bg-gradient-to-r from-lime-50 to-lime-100 border-lime-200';
      case 'sem-data': return 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200';
      default: return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
    }
  };

  // Melhorando a função getIconeGrupo para ícones mais específicos
  const getIconeGrupo = (status: string) => {
    switch (status) {
      case 'hoje': return <Clock8 className="h-5 w-5 text-blue-600" />;
      case 'ontem': return <Clock8 className="h-5 w-5 text-yellow-600" />;
      case 'esta-semana': return <CalendarDays className="h-5 w-5 text-orange-600" />;
      case 'passado': return <CalendarDays className="h-5 w-5 text-red-600" />;
      case 'amanha': return <CalendarCheck className="h-5 w-5 text-emerald-600" />;
      case 'proxima-semana': return <CalendarCheck className="h-5 w-5 text-green-600" />;
      case 'este-mes': return <CalendarDays className="h-5 w-5 text-gray-600" />;
      case 'futuro': return <Calendar className="h-5 w-5 text-lime-600" />;
      case 'sem-data': return <Calendar className="h-5 w-5 text-purple-600" />;
      default: return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  // Adicionando função para obter descrição do status do grupo
  const getDescricaoGrupo = (status: string, dataFormatada: string) => {
    switch (status) {
      case 'hoje': return 'Hoje';
      case 'ontem': return 'Ontem';
      case 'esta-semana': return 'Esta semana';
      case 'este-mes': return 'Este mês';
      case 'passado': return 'No passado';
      case 'amanha': return 'Amanhã';
      case 'proxima-semana': return 'Próxima semana';
      case 'futuro': return 'No futuro';
      case 'sem-data': return 'Sem data definida';
      default: return '';
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
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Cabeçalho aprimorado com visual moderno */}
        <div className="relative rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border border-blue-100 shadow-sm p-6 mb-8 overflow-hidden">
          {/* Elementos decorativos de fundo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-300 rounded-full opacity-10 transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-300 rounded-full opacity-10 transform -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>
          
          {/* Novo efeito de brilho animado */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -inset-[100%] opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-30 animate-shimmer"></div>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <Link href={`/planejamento/${planoId}`} className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-3 font-medium transition-colors duration-200 group">
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
            <span>Voltar para o plano</span>
            </Link>
          
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
                <CalendarCheck className="h-7 w-7 text-blue-600" />
                Sessões de Estudo
              </h1>
              
              <p className="text-gray-600 mt-1 flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm">Plano: <span className="font-medium">{plano.name}</span></span>
              </p>
              
              {/* Estatísticas resumidas */}
              <div className="flex flex-wrap items-center mt-3 gap-4">
                <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/60 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span>{estatisticas.concluidas} concluídas</span>
          </div>
                
                <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/60 shadow-sm">
                  <Clock8 className="h-3.5 w-3.5 text-amber-500" />
                  <span>{estatisticas.pendentes} pendentes</span>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/60 shadow-sm">
                  <Clock className="h-3.5 w-3.5 text-purple-500" />
                  <span>{estatisticas.horasEstudadas}h estudadas</span>
                </div>
              </div>
            </div>
            
          <Link href={`/planejamento/${planoId}/sessoes/nova`}>
              <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-300 font-medium flex items-center group">
                <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Nova Sessão
            </Button>
          </Link>
          </div>
        </div>
        
        {/* Cards de estatísticas aprimorados */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
            <div className="flex items-start">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <span className="text-xs text-gray-600 font-medium">Total de Sessões</span>
                <div className="text-2xl font-bold text-gray-800">{estatisticas.total}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
            <div className="flex items-start">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <span className="text-xs text-gray-600 font-medium">Concluídas</span>
                <div className="text-2xl font-bold text-gray-800">{estatisticas.concluidas}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
            <div className="flex items-start">
              <div className="p-2 bg-amber-100 rounded-lg mr-3">
                <Clock8 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <span className="text-xs text-gray-600 font-medium">Pendentes</span>
                <div className="text-2xl font-bold text-gray-800">{estatisticas.pendentes}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
            <div className="flex items-start">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <span className="text-xs text-gray-600 font-medium">Horas Estudadas</span>
                <div className="text-2xl font-bold text-gray-800">{estatisticas.horasEstudadas}h</div>
              </div>
            </div>
          </div>
        </div>

        {/* Botão para mostrar/esconder calendário */}
        <div className="flex justify-end mb-4">
          <Button 
            variant="outline" 
            onClick={() => setShowCalendar(!showCalendar)}
            className="bg-white hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 text-sm shadow-sm hover:shadow"
          >
            <Calendar className="h-4 w-4 text-blue-600" />
            {showCalendar ? 'Esconder Calendário' : 'Mostrar Calendário'}
          </Button>
        </div>
        
        {/* Componente de calendário */}
        {showCalendar && <CalendarComponent />}

        {/* Barra de busca e Filtros aprimorados */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-8 overflow-hidden transition-all duration-300 hover:shadow-lg">
          <div className="p-6">
            {/* Barra de busca com ícone interativo */}
            <div className="relative mb-5 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
              </div>
              <input
                type="text"
                placeholder="Buscar por título, disciplina ou assunto..."
                className="block w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              
              {/* Badge contador de resultados da busca */}
              {searchTerm && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {sessoesExibidas.length} resultado(s)
                </div>
              )}
        </div>

            {/* Filtros com ícones mais visíveis e melhor organização */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <div className={`p-1.5 rounded-md mr-2 transition-colors duration-200 ${filtroDisciplina !== 'todas' ? 'bg-blue-100' : 'bg-blue-50'}`}>
                    <BookOpen className={`h-4 w-4 transition-colors duration-200 ${filtroDisciplina !== 'todas' ? 'text-blue-600' : 'text-blue-500'}`} />
                  </div>
                  Disciplina {filtroDisciplina !== 'todas' && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">Filtrado</span>
                  )}
                </label>
                <select 
                  value={filtroDisciplina}
                  onChange={(e) => setFiltroDisciplina(e.target.value)}
                  className={`block w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 ${
                    filtroDisciplina !== 'todas' 
                      ? 'border-blue-300 bg-blue-50/50' 
                      : 'border-gray-200'
                  }`}
                >
                  <option value="todas">Todas as disciplinas</option>
                  {obterDisciplinas().map((disciplina: string) => (
                    <option key={disciplina} value={disciplina}>{disciplina}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <div className={`p-1.5 rounded-md mr-2 transition-colors duration-200 ${filtroStatus !== 'todos' ? 'bg-green-100' : 'bg-green-50'}`}>
                    <CheckCircle2 className={`h-4 w-4 transition-colors duration-200 ${filtroStatus !== 'todos' ? 'text-green-600' : 'text-green-500'}`} />
                  </div>
                  Status {filtroStatus !== 'todos' && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">Filtrado</span>
                  )}
                </label>
                <select 
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className={`block w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 ${
                    filtroStatus !== 'todos' 
                      ? 'border-green-300 bg-green-50/50' 
                      : 'border-gray-200'
                  }`}
                >
                  <option value="todos">Todos os status</option>
                  <option value="concluidas">Concluídas</option>
                  <option value="pendentes">Pendentes</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <div className={`p-1.5 rounded-md mr-2 transition-colors duration-200 ${filtroPeriodo !== 'todos' ? 'bg-amber-100' : 'bg-amber-50'}`}>
                    <CalendarCheck className={`h-4 w-4 transition-colors duration-200 ${filtroPeriodo !== 'todos' ? 'text-amber-600' : 'text-amber-500'}`} />
                  </div>
                  Período {filtroPeriodo !== 'todos' && (
                    <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">Filtrado</span>
                  )}
                </label>
                <select 
                  value={filtroPeriodo}
                  onChange={(e) => setFiltroPeriodo(e.target.value)}
                  className={`block w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 ${
                    filtroPeriodo !== 'todos' 
                      ? 'border-amber-300 bg-amber-50/50' 
                      : 'border-gray-200'
                  }`}
                >
                  <option value="todos">Todos os períodos</option>
                  <option value="hoje">Hoje</option>
                  <option value="semana">Próximos 7 dias</option>
                  <option value="passadas">Sessões passadas</option>
                  <option value="futuras">Sessões futuras</option>
                </select>
              </div>
              </div>
            
            {/* Botão para limpar filtros com melhor feedback visual */}
            {(searchTerm || filtroDisciplina !== 'todas' || filtroStatus !== 'todos' || filtroPeriodo !== 'todos') && (
              <div className="mt-4 flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFiltroDisciplina('todas');
                    setFiltroStatus('todos');
                    setFiltroPeriodo('todos');
                  }}
                  className="text-sm flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border-gray-200 transition-all duration-200 group"
                >
                  <X className="h-4 w-4 text-gray-500 group-hover:text-gray-700 group-hover:rotate-90 transition-all duration-200" />
                  <span>Limpar {(searchTerm ? 1 : 0) + (filtroDisciplina !== 'todas' ? 1 : 0) + (filtroStatus !== 'todos' ? 1 : 0) + (filtroPeriodo !== 'todos' ? 1 : 0)} filtro(s)</span>
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Indicador de filtro por data selecionada */}
        {selectedDate && filtroPeriodo === 'data' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
              <span className="text-blue-700 font-medium">
                Mostrando sessões de {selectedDate.getDate()}/{selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedDate(null);
                setFiltroPeriodo('todos');
              }}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
            >
              <X className="h-4 w-4 mr-1.5" />
              Limpar
            </Button>
          </div>
        )}
          
        {/* Lista de sessões */}
        {sessoesExibidas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-md p-10 animate-fadeIn">
            <div className="flex flex-col items-center justify-center py-8 relative">
              {/* Elementos decorativos */}
              <div className="absolute opacity-5 w-full h-full max-w-md max-h-64 flex justify-center items-center pointer-events-none">
                <div className="w-32 h-32 rounded-full bg-blue-400 blur-xl absolute"></div>
                <div className="w-24 h-24 rounded-full bg-purple-400 blur-xl absolute -translate-x-20 translate-y-10"></div>
                <div className="w-28 h-28 rounded-full bg-indigo-400 blur-xl absolute translate-x-16 translate-y-5"></div>
              </div>
              
              <div className="relative">
                <div className="bg-blue-50 p-5 rounded-full mb-5 relative z-10 shadow-sm animate-pulse">
                  <Calendar className="h-12 w-12 text-blue-500" />
                </div>
                {/* Círculos decorativos ao redor do ícone */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-blue-200 rounded-full opacity-50"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-blue-100 rounded-full opacity-30"></div>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-700 mb-3 relative z-10">
                Nenhuma sessão encontrada
              </h2>
              <p className="text-gray-500 text-center max-w-md mb-6 relative z-10">
                {searchTerm || filtroDisciplina !== 'todas' || filtroStatus !== 'todos' || filtroPeriodo !== 'todos'
                  ? 'Não encontramos sessões de estudo com os filtros aplicados. Tente ajustar os critérios de busca.'
                  : 'Você ainda não tem sessões de estudo agendadas para este plano. Crie sua primeira sessão agora.'}
              </p>
              <div className="flex flex-wrap gap-3 justify-center relative z-10">
                {(searchTerm || filtroDisciplina !== 'todas' || filtroStatus !== 'todos' || filtroPeriodo !== 'todos') && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setFiltroDisciplina('todas');
                      setFiltroStatus('todos');
                      setFiltroPeriodo('todos');
                    }}
                    className="bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Limpar filtros
                  </Button>
                )}
            <Link href={`/planejamento/${planoId}/sessoes/nova`}>
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-300 font-medium">
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
              
              return keysOrdenadas.map((dataKey, index) => {
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
                const descricaoGrupo = getDescricaoGrupo(statusGrupo, dataFormatada);
                
                return (
                  <div 
                    key={dataKey} 
                    className="space-y-3 transition-all duration-500" 
                    style={{ animationDelay: `${index * 75}ms` }}
                  >
                    {/* Cabeçalho do grupo com visual melhorado */}
                    <div className={`p-3 px-5 rounded-xl flex items-center ${corGrupo} shadow-sm border border-opacity-60 transition-all duration-300 hover:shadow group relative overflow-hidden`}>
                      {/* Elemento decorativo de fundo */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 pointer-events-none"></div>
                      
                      <div className="mr-3 bg-white bg-opacity-50 p-1.5 rounded-lg shadow-sm">
                        {iconeGrupo}
                      </div>
                      <div className="flex flex-col space-y-0.5">
                      <h3 className="font-semibold text-gray-700">
                        {dataFormatada}
                      </h3>
                        {descricaoGrupo && (
                          <div className="text-xs text-gray-500 font-medium">
                            {descricaoGrupo}
                          </div>
                        )}
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-sm text-gray-500 bg-white bg-opacity-60 py-1 px-2.5 rounded-full font-medium shadow-sm">
                        {sessoesDoDia.length} sessão(ões)
                        </span>
                      </div>
                    </div>
                    
                    {/* Sessões do dia com design melhorado */}
                    <div className="space-y-4 pl-0">
                      {sessoesDoDia.map((sessao, sessaoIndex) => {
                        const sessaoHoje = isHoje(sessao.scheduledDate);
                        const sessaoAtrasada = isAtrasada(sessao);
                        
                        return (
                          <div 
                            key={sessao.id} 
                            className={`bg-white rounded-xl border shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 ${
                              sessao.completed ? 'border-green-200' : 
                              sessaoHoje ? 'border-blue-200' : 
                              sessaoAtrasada ? 'border-red-200' : 'border-gray-100'
                            }`}
                            style={{ animationDelay: `${(index * 75) + (sessaoIndex * 50)}ms` }}
                          >
                            {/* Barra de progresso no topo do card */}
                            {sessao.completed && (
                              <div className="h-1 w-full bg-gradient-to-r from-green-400 to-green-500 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-30 animate-shimmer"></div>
                              </div>
                            )}
                            {!sessao.completed && sessaoHoje && (
                              <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-500 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-30 animate-shimmer"></div>
                              </div>
                            )}
                            {!sessao.completed && sessaoAtrasada && (
                              <div className="h-1 w-full bg-gradient-to-r from-red-400 to-red-500 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-30 animate-shimmer"></div>
                              </div>
                            )}
                            
                            <div className="flex flex-col md:flex-row">
                              {/* Coluna de data com estilo aprimorado */}
                              <div className={`md:w-40 p-5 flex flex-row md:flex-col justify-between md:justify-center items-center text-center ${
                                sessao.completed ? 'bg-gradient-to-br from-green-50 to-green-100 text-green-700' : 
                                sessaoHoje ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700' : 
                                sessaoAtrasada ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-700' : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700'
                              }`}>
                                {sessao.scheduledDate ? (
                                  <>
                                    <div className="flex flex-col justify-center items-center relative group">
                                      <div className="text-2xl font-bold group-hover:scale-105 transition-transform">
                                        {formatarHora(sessao.scheduledDate)}
                                      </div>
                                      <div className="mt-1 text-xs opacity-75 font-medium">
                                        {formatarDataCurta(sessao.scheduledDate)}
                                      </div>
                                      <div className="mt-0.5 text-xs opacity-75">
                                        {formatarDiaSemana(sessao.scheduledDate)}
                                      </div>
                                      {/* Efeito de brilho no hover */}
                                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 rounded-full transition-colors duration-300 pointer-events-none"></div>
                                    </div>
                                    <div className="flex items-center md:mt-3">
                                      {sessao.completed ? (
                                        <div className="flex items-center gap-1 text-xs font-medium bg-white bg-opacity-60 px-2.5 py-1 rounded-full shadow-sm">
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          <span>Concluída</span>
                                        </div>
                                      ) : sessaoHoje ? (
                                        <div className="flex items-center gap-1 text-xs font-medium bg-white bg-opacity-60 px-2.5 py-1 rounded-full shadow-sm">
                                          <Clock8 className="h-3.5 w-3.5" />
                                          <span>Hoje</span>
                                        </div>
                                      ) : sessaoAtrasada ? (
                                        <div className="flex items-center gap-1 text-xs font-medium bg-white bg-opacity-60 px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                                          <AlarmClock className="h-3.5 w-3.5" />
                                          <span>Atrasada</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 text-xs font-medium bg-white bg-opacity-60 px-2.5 py-1 rounded-full shadow-sm">
                                          <CalendarCheck className="h-3.5 w-3.5" />
                                          <span>Agendada</span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-full py-3">
                                    <div className="p-2 bg-white/40 rounded-full mb-2">
                                      <Calendar className="h-6 w-6 text-purple-500" />
                                    </div>
                                    <div className="text-sm font-medium bg-white/50 px-3 py-1.5 rounded-lg shadow-sm">
                                      Sem horário
                                    </div>
                                    <div className="text-xs text-purple-700/70 mt-1.5">
                                      Defina um horário para esta sessão
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Conteúdo principal com layout aprimorado */}
                              <div className="flex-1 p-5">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-700 transition-colors duration-300">{sessao.title}</h3>
                                    
                                    <div className="mt-3 flex flex-wrap gap-2">
                                  {sessao.disciplineName && (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border border-purple-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                                          <BookOpen className="h-3.5 w-3.5 mr-1" />
                                      {sessao.disciplineName}
                                        </span>
                                  )}
                                      
                                  {sessao.subjectName && (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                                          <FileText className="h-3.5 w-3.5 mr-1" />
                                      {sessao.subjectName}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                                      <div className="flex items-center bg-gray-50 px-3 py-1 rounded-full shadow-sm">
                                        <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
                                        {formatarDuracao(sessao.duration)}
                                      </div>
                                      
                                      {sessao.completed && sessao.actualDuration && (
                                        <div className="flex items-center bg-green-50 px-3 py-1.5 rounded-full shadow-sm">
                                          <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-500" />
                                          Real: {formatarDuracao(sessao.actualDuration)}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {sessao.notes && (
                                      <div className="mt-3 text-sm text-gray-600">
                                        <div className="flex items-center text-gray-500 mb-1">
                                          <FileText className="h-3.5 w-3.5 mr-1" />
                                          <span className="text-xs font-medium">Notas:</span>
                                        </div>
                                        <p className="line-clamp-2 text-gray-600 bg-gray-50 p-2.5 rounded-md shadow-sm border border-gray-100">{sessao.notes}</p>
                                  </div>
                                )}
                                  </div>
                              
                                  <div className="flex space-x-2">
                                    <Link href={`/planejamento/${planoId}/sessoes/${sessao.id}`}>
                                      <Button 
                                        variant={sessao.completed ? "outline" : "default"} 
                                        size="sm"
                                        className={`font-medium transition-all duration-300 ${
                                          sessao.completed 
                                            ? "bg-white hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow" 
                                            : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-none shadow-sm hover:shadow-md hover:-translate-y-0.5 transform"
                                        }`}
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
                            
                            {/* Barra de ações aprimorada */}
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-2.5 border-t border-gray-100 flex justify-end">
                              <div className="flex space-x-2">
                                <Link href={`/planejamento/${planoId}/sessoes/${sessao.id}`}>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200 font-medium group"
                                  >
                                    <span className="sr-only">Ver detalhes</span>
                                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                  </Button>
                                </Link>
                                  <Link href={`/planejamento/${planoId}/sessoes/${sessao.id}/editar`}>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-gray-600 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
                                  >
                                    <Edit className="h-4 w-4 mr-1.5 group-hover:scale-110 transition-transform" />
                                    <span>Editar</span>
                                      </Button>
                                    </Link>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleExcluirSessao(sessao.id)}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 group"
                                  >
                                  <Trash2 className="h-4 w-4 mr-1.5 group-hover:scale-110 transition-transform" />
                                  <span>Excluir</span>
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