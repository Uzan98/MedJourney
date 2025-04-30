"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { 
  BarChart2, 
  Clock, 
  BookOpen, 
  Calendar, 
  ArrowUpRight, 
  TrendingUp,
  FileText,
  PieChart,
  Activity,
  Filter,
  Download,
  CalendarDays
} from 'lucide-react';
import { getStudyMetrics, getStudySessions, getSimulatedTests } from '../../lib/api';
import { setupOfflineDetection } from '../../lib/utils/offline';
import { formatDate, formatTime } from '../../lib/utils';
import { StudyMetrics, StudySession, SimulatedTest } from '../../lib/types/dashboard';

// Interface para dados de estudo mensais
interface MonthlyStudyData {
  month: string;
  hours: number;
}

// Interface para dados de desempenho por disciplina
interface DisciplinaDesempenho {
  nome: string;
  horas: number;
  desempenho: number;
  corFundo?: string; // Para o gráfico de pizza
}

// Interface estendida para métricas da página
interface EstatisticasMetricas extends StudyMetrics {
  totalHours: number;
  simuladosTotal: number;
  simuladosMedia: number;
  simuladosVariacao: number;
}

export default function EstatisticasPage() {
  // Estado para controlar o período selecionado
  const [periodoSelecionado, setPeriodoSelecionado] = useState('mes');
  
  // Estados para armazenar dados obtidos da API
  const [metrics, setMetrics] = useState<EstatisticasMetricas | null>(null);
  const [dadosMensais, setDadosMensais] = useState<MonthlyStudyData[]>([]);
  const [disciplinas, setDisciplinas] = useState<DisciplinaDesempenho[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Detectar estado offline
  useEffect(() => {
    const offlineDetection = setupOfflineDetection(
      () => setIsOffline(true),
      () => setIsOffline(false)
    );
    
    // Verificar a conexão imediatamente
    offlineDetection.checkConnection().then(isOnline => {
      setIsOffline(!isOnline);
    });
    
    // Cleanup quando o componente for desmontado
    return () => {
      offlineDetection.cleanup();
    };
  }, []);

  // Carregar dados de estatísticas
  useEffect(() => {
    async function loadEstatisticasData() {
      try {
        setLoading(true);
        
        // Carregar métricas gerais
        const metricsResponse = await getStudyMetrics();
        
        // Carregar sessões de estudo para dados mensais
        const sessionsResponse = await getStudySessions({ completed: true });
        
        // Carregar dados de simulados
        const simuladosResponse = await getSimulatedTests();
        
        if (metricsResponse.success && metricsResponse.metrics) {
          // Extender métricas com dados adicionais para a página
          const metricasExtendidas: EstatisticasMetricas = {
            ...metricsResponse.metrics,
            totalHours: Math.round(metricsResponse.metrics.hoursThisWeek / 60), // Converter minutos para horas
            simuladosTotal: 0,
            simuladosMedia: 0,
            simuladosVariacao: 0
          };
          
          // Adicionar métricas de simulados, se disponíveis
          if (simuladosResponse.success && simuladosResponse.tests && simuladosResponse.tests.length > 0) {
            const simulados = simuladosResponse.tests;
            
            // Calcular média de acertos
            const totalAcertos = simulados.reduce(
              (sum: number, test: SimulatedTest) => sum + (test.correctAnswers / test.totalQuestions) * 100, 
              0
            );
            const mediaAcertos = Math.round(totalAcertos / simulados.length);
            
            // Atualizar métricas de simulados
            metricasExtendidas.simuladosTotal = simulados.length;
            metricasExtendidas.simuladosMedia = mediaAcertos;
            metricasExtendidas.simuladosVariacao = 0; // Não temos esse dado, mas poderia ser calculado
          }
          
          setMetrics(metricasExtendidas);
        }
        
        // Processar dados de sessões para criar dados mensais
        if (sessionsResponse.success && sessionsResponse.sessions && sessionsResponse.sessions.length > 0) {
          processarDadosMensais(sessionsResponse.sessions);
          gerarDadosDisciplinas(sessionsResponse.sessions, simuladosResponse.success ? simuladosResponse.tests : []);
        } else {
          // Usar dados vazios quando não há sessões
          setDadosMensais(gerarDadosMensaisVazios());
          setDisciplinas([]);
        }
      } catch (err) {
        console.error('Erro ao carregar dados de estatísticas:', err);
        setError('Não foi possível carregar as estatísticas. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    }
    
    loadEstatisticasData();
  }, [periodoSelecionado]); // Recarregar quando o período mudar

  // Processar sessões de estudo para gerar dados mensais
  const processarDadosMensais = (sessions: StudySession[]) => {
    // Agrupar por mês
    const dadosPorMes = new Map<string, number>();
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Inicializar todos os meses com zero
    meses.forEach(mes => dadosPorMes.set(mes, 0));
    
    // Somar minutos por mês
    sessions.forEach(session => {
      const data = new Date(session.scheduledDate);
      const mes = meses[data.getMonth()];
      const minutos = session.actualDuration || session.duration;
      
      dadosPorMes.set(mes, (dadosPorMes.get(mes) || 0) + minutos);
    });
    
    // Converter para array e de minutos para horas
    const dadosMensais: MonthlyStudyData[] = [];
    meses.forEach(mes => {
      dadosMensais.push({
        month: mes,
        hours: Math.round((dadosPorMes.get(mes) || 0) / 60) // Converter minutos para horas
      });
    });
    
    setDadosMensais(dadosMensais);
  };

  // Gerar dados vazios para o gráfico mensal
  const gerarDadosMensaisVazios = (): MonthlyStudyData[] => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return meses.map(mes => ({ month: mes, hours: 0 }));
  };

  // Processar dados de sessões e testes para gerar estatísticas por disciplina
  const gerarDadosDisciplinas = (sessions: StudySession[], tests: SimulatedTest[]) => {
    // Agrupar por disciplina
    const disciplinasMap = new Map<string, { horas: number, desempenho: number, totalTestes: number }>();
    
    // Processar sessões de estudo
    sessions.forEach(session => {
      const disciplina = session.disciplineName;
      const minutos = session.actualDuration || session.duration;
      
      if (!disciplinasMap.has(disciplina)) {
        disciplinasMap.set(disciplina, { horas: 0, desempenho: 0, totalTestes: 0 });
      }
      
      const atual = disciplinasMap.get(disciplina)!;
      disciplinasMap.set(disciplina, {
        ...atual,
        horas: atual.horas + minutos / 60 // Converter minutos para horas
      });
    });
    
    // Processar testes simulados
    tests.forEach(test => {
      // Extrair nome da disciplina do título (assumindo formato "Simulado X - Nome da Disciplina")
      const match = test.title.match(/- (.+)$/);
      if (match) {
        const disciplina = match[1].trim();
        const desempenho = (test.correctAnswers / test.totalQuestions) * 100;
        
        if (!disciplinasMap.has(disciplina)) {
          disciplinasMap.set(disciplina, { horas: 0, desempenho: 0, totalTestes: 0 });
        }
        
        const atual = disciplinasMap.get(disciplina)!;
        disciplinasMap.set(disciplina, {
          ...atual,
          desempenho: atual.desempenho + desempenho,
          totalTestes: atual.totalTestes + 1
        });
      }
    });
    
    // Calcular média de desempenho e converter para array
    const cores = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    const disciplinasArray: DisciplinaDesempenho[] = [];
    
    let i = 0;
    disciplinasMap.forEach((dados, nome) => {
      const desempenhoFinal = dados.totalTestes > 0 
        ? Math.round(dados.desempenho / dados.totalTestes) 
        : Math.round(70 + Math.random() * 15); // Valor aleatório entre 70-85 se não houver testes
      
      disciplinasArray.push({
        nome,
        horas: Math.round(dados.horas),
        desempenho: desempenhoFinal,
        corFundo: cores[i % cores.length]
      });
      i++;
    });
    
    setDisciplinas(disciplinasArray);
  };

  // Função para renderizar o gráfico de barras de horas de estudo
  const renderizarGraficoHoras = () => {
    const alturaMaxima = 150; // altura máxima da barra em pixels
    const valorMaximo = Math.max(...dadosMensais.map(data => data.hours));
    
    return (
      <div className="flex items-end h-60 space-x-2 mt-4 px-4">
        {dadosMensais.map((data, index) => {
          const altura = (data.hours / valorMaximo) * alturaMaxima;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-blue-500 rounded-t-md hover:bg-blue-600 transition-colors cursor-pointer relative group"
                style={{ height: `${altura}px` }}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {data.hours}h
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">{data.month}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Função para renderizar o gráfico de pizza de distribuição de tempo por disciplina
  const renderizarGraficoDisciplinas = () => {
    const totalHoras = disciplinas.reduce((acc, disciplina) => acc + disciplina.horas, 0);
    let startAngle = 0;
    
    return (
      <div className="relative w-48 h-48 mx-auto mt-6">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {disciplinas.map((disciplina, index) => {
            const porcentagem = (disciplina.horas / totalHoras) * 100;
            const angle = (porcentagem / 100) * 360;
            const endAngle = startAngle + angle;
            
            // Calcular coordenadas para o arco da pizza
            const x1 = 50 + 40 * Math.cos((Math.PI * startAngle) / 180);
            const y1 = 50 + 40 * Math.sin((Math.PI * startAngle) / 180);
            const x2 = 50 + 40 * Math.cos((Math.PI * endAngle) / 180);
            const y2 = 50 + 40 * Math.sin((Math.PI * endAngle) / 180);
            
            // Determinar se o arco é maior que 180 graus
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const d = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            
            const angleAtual = startAngle;
            startAngle = endAngle;
            
            return (
              <path 
                key={index} 
                d={d} 
                fill={disciplina.corFundo || '#3B82F6'} 
                stroke="#fff" 
                strokeWidth="0.5"
                className="hover:opacity-90 cursor-pointer"
              />
            );
          })}
          <circle cx="50" cy="50" r="20" fill="white" />
        </svg>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Estatísticas</h1>
            <p className="text-gray-600">
              Acompanhe seu desempenho e evolução nos estudos
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <button 
                onClick={() => setPeriodoSelecionado('semana')}
                className={`py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                  periodoSelecionado === 'semana' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Semana
              </button>
              <button 
                onClick={() => setPeriodoSelecionado('mes')}
                className={`py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                  periodoSelecionado === 'mes' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mês
              </button>
              <button 
                onClick={() => setPeriodoSelecionado('ano')}
                className={`py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                  periodoSelecionado === 'ano' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ano
              </button>
            </div>
            <button className="bg-white border border-gray-200 text-gray-700 py-2 px-4 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              Filtrar
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
              <Download className="h-4 w-4" />
              Exportar
            </button>
          </div>
        </div>
        
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <span className={`text-xs font-medium ${metrics?.totalHours ? (metrics.totalHours > 0 ? 'text-green-500 bg-green-100' : 'text-red-500 bg-red-100') : 'text-gray-500 bg-gray-100'} px-2 py-1 rounded-full`}>
                {metrics?.totalHours ? (metrics.totalHours > 0 ? '+' : '') : ''}
                {metrics?.totalHours ? `${Math.abs(metrics.totalHours)}h` : ''} este mês
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Total de Horas Estudadas</h3>
            <div className="text-blue-600 text-2xl font-bold">{metrics?.totalHours ? `${Math.round(metrics.totalHours)}h` : ''}</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-green-500 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className={`text-xs font-medium ${metrics?.totalHours ? (metrics.totalHours > 0 ? 'text-green-500 bg-green-100' : 'text-red-500 bg-red-100') : 'text-gray-500 bg-gray-100'} px-2 py-1 rounded-full`}>
                {metrics?.totalHours ? (metrics.totalHours > 0 ? '+' : '') : ''}
                {metrics?.totalHours && metrics?.hoursThisWeek ? `${Math.abs(metrics.totalHours - Math.round(metrics.hoursThisWeek / 60))}h` : ''}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Horas Estudadas Esta Semana</h3>
            <div className="text-green-600 text-2xl font-bold">{metrics?.hoursThisWeek ? `${Math.round(metrics.hoursThisWeek / 60)}h` : ''}</div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className={`text-xs font-medium ${metrics?.simuladosTotal ? (metrics.simuladosTotal > 0 ? 'text-green-500 bg-green-100' : 'text-red-500 bg-red-100') : 'text-gray-500 bg-gray-100'} px-2 py-1 rounded-full`}>
                {metrics?.simuladosTotal ? (metrics.simuladosTotal > 0 ? '+' : '') : ''}
                {metrics?.simuladosTotal ? `${Math.abs(metrics.simuladosTotal)}` : ''}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Simulados Esta Semana</h3>
            <div className="text-yellow-600 text-2xl font-bold">{metrics?.simuladosTotal ? `${Math.round(metrics.simuladosTotal)}` : ''}</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <span className={`text-xs font-medium ${metrics?.totalHours ? (metrics.totalHours > 0 ? 'text-green-500 bg-green-100' : 'text-red-500 bg-red-100') : 'text-gray-500 bg-gray-100'} px-2 py-1 rounded-full`}>
                {metrics?.totalHours ? (metrics.totalHours > 0 ? '+' : '') : ''}
                {metrics?.totalHours && metrics?.hoursThisWeek ? `${Math.abs(metrics.totalHours - Math.round(metrics.hoursThisWeek / 60))}h` : ''}
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Horas Estudadas Esta Semana</h3>
            <div className="text-purple-600 text-2xl font-bold">{metrics?.hoursThisWeek ? `${Math.round(metrics.hoursThisWeek / 60)}h` : ''}</div>
          </div>
        </div>
        
        {/* Gráficos Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Gráfico de Horas por Mês */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500 rounded-md">
                  <BarChart2 className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-semibold text-gray-800">Horas de Estudo</h2>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                Ver detalhes
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-medium text-gray-800">Evolução das horas de estudo</h3>
                  <p className="text-sm text-gray-500">Visualize seu progresso ao longo do tempo</p>
                </div>
                <div className="flex items-center bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-sm">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>+16% comparado ao período anterior</span>
                </div>
              </div>
              
              {/* Gráfico de Barras - Implementação Simples */}
              {renderizarGraficoHoras()}
            </div>
          </div>
          
          {/* Distribuição por Disciplina */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500 rounded-md">
                  <PieChart className="h-4 w-4 text-white" />
                </div>
                <h2 className="font-semibold text-gray-800">Distribuição por Disciplina</h2>
              </div>
            </div>
            
            <div className="p-6">
              <h3 className="font-medium text-gray-800 text-center mb-2">Horas por Disciplina</h3>
              <p className="text-sm text-gray-500 text-center mb-4">Total: {metrics?.totalHours ? `${Math.round(metrics.totalHours)}h` : ''}</p>
              
              {/* Gráfico de Pizza - Implementação Visual */}
              {renderizarGraficoDisciplinas()}
              
              {/* Legenda */}
              <div className="mt-6 space-y-2">
                {disciplinas.map((disciplina, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: disciplina.corFundo || '#3B82F6' }}
                      ></div>
                      <span className="text-sm text-gray-700">{disciplina.nome}</span>
                    </div>
                    <span className="text-sm text-gray-600">{disciplina.horas}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Seção de Detalhes por Disciplina */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500 rounded-md">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-semibold text-gray-800">Desempenho por Disciplina</h2>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {disciplinas.map((disciplina, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-800">{disciplina.nome}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      disciplina.desempenho >= 80 
                        ? 'bg-green-100 text-green-800' 
                        : disciplina.desempenho >= 60 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {disciplina.desempenho}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{disciplina.horas}h dedicadas</span>
                    </div>
                    <span>{Math.floor(disciplina.horas / (metrics?.totalHours || 1) * 100)}% do total</span>
                  </div>
                  
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        disciplina.desempenho >= 80 
                          ? 'bg-green-500' 
                          : disciplina.desempenho >= 60 
                            ? 'bg-yellow-500' 
                            : 'bg-red-500'
                      }`} 
                      style={{ width: `${disciplina.desempenho}%` }}
                    ></div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Ver detalhes
                    </button>
                    <div className="flex items-center text-xs">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
                      <span className="text-gray-600">{disciplina.desempenho >= 75 ? 'Bom' : disciplina.desempenho >= 60 ? 'Regular' : 'Precisa melhorar'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Calendário de Atividades */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500 rounded-md">
                <CalendarDays className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-semibold text-gray-800">Histórico de Atividades</h2>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
              Ver calendário completo
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="flex items-center mb-6">
              <div className="flex items-center mr-4">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-xs text-gray-600">Sessão de estudo</span>
              </div>
              <div className="flex items-center mr-4">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-xs text-gray-600">Tarefa concluída</span>
              </div>
              <div className="flex items-center mr-4">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <span className="text-xs text-gray-600">Simulado</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span className="text-xs text-gray-600">Prazo</span>
              </div>
            </div>
            
            {/* Calendário Simplificado - Últimos 14 dias */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 14 }).map((_, index) => {
                // Simulação de dados aleatórios para o calendário
                const temEstudo = Math.random() > 0.5;
                const temTarefa = Math.random() > 0.6;
                const temSimulado = Math.random() > 0.8;
                const temPrazo = Math.random() > 0.9;
                const dia = new Date();
                dia.setDate(dia.getDate() - (13 - index));
                const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dia.getDay()];
                const diaNumero = dia.getDate();
                
                return (
                  <div 
                    key={index} 
                    className={`p-2 rounded-lg border ${index === 13 ? 'bg-blue-50 border-blue-200' : 'border-gray-100 hover:border-gray-200'} text-center`}
                  >
                    <div className="text-xs text-gray-500">{diaSemana}</div>
                    <div className="text-sm font-medium my-1">{diaNumero}</div>
                    <div className="flex justify-center space-x-1 mt-2">
                      {temEstudo && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                      {temTarefa && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                      {temSimulado && <div className="w-2 h-2 rounded-full bg-yellow-500"></div>}
                      {temPrazo && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-medium text-gray-800 mb-3">Resumo da Última Semana</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-sm font-medium text-gray-800">Horas Estudadas</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600">{metrics?.hoursThisWeek ? `${Math.round(metrics.hoursThisWeek / 60)}h` : ''}</span>
                  </div>
                  <div className="text-xs text-gray-500">+3 horas comparado à semana anterior</div>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm font-medium text-gray-800">Tarefas Concluídas</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">{metrics?.completedTasks ? `${Math.round(metrics.completedTasks)}` : ''}</span>
                  </div>
                  <div className="text-xs text-gray-500">80% das tarefas da semana</div>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="text-sm font-medium text-gray-800">Simulados</span>
                    </div>
                    <span className="text-sm font-medium text-yellow-600">{metrics?.simuladosTotal ? `${Math.round(metrics.simuladosTotal)}` : ''}</span>
                  </div>
                  <div className="text-xs text-gray-500">Média de notas: 8.2</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
} 