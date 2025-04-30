"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { setupOfflineDetection } from '../../lib/utils/offline';
import { getSimulatedTests } from '../../lib/api';
import { SimulatedTest } from '../../lib/types/dashboard';
import { carregarSimulados, Simulado } from '../../services/simulados';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowUpDown, 
  CalendarIcon, 
  ClockIcon, 
  BarChart3, 
  PlusCircle, 
  ChevronRight,
  ListChecks,
  FileText,
  AlertTriangle,
  Database
} from 'lucide-react';

interface SimulatedTestExtended extends SimulatedTest {
  status: string;
  description?: string;
  duration: number;
}

export default function SimuladosPage() {
  const router = useRouter();
  const [tests, setTests] = useState<SimulatedTestExtended[]>([]);
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Configurar detecção offline
    const offlineDetection = setupOfflineDetection(
      () => setIsOffline(true),
      () => setIsOffline(false)
    );
    
    // Verificar a conexão imediatamente
    offlineDetection.checkConnection().then(isOnline => {
      setIsOffline(!isOnline);
    });
    
    loadSimulados();
    
    // Cleanup quando o componente for desmontado
    return () => {
      offlineDetection.cleanup();
    };
  }, []);

  async function loadSimulados() {
    setLoading(true);
    setError(null);
    
    try {
      // Carregar simulados salvos localmente
      const simuladosLocais = carregarSimulados();
      setSimulados(simuladosLocais);
      
      // Também carregar da API para manter compatibilidade
      const response = await getSimulatedTests();
      
      if (response.success && response.tests) {
        setTests(response.tests);
      } else {
        // Se a API falhar, apenas usamos os simulados locais
        console.log('Usando apenas simulados locais');
      }
    } catch (err) {
      console.error('Erro ao carregar simulados:', err);
      // Mesmo com erro na API, ainda mostramos os simulados locais
      if (simulados.length === 0) {
      setError('Falha ao carregar os simulados. Tente novamente mais tarde.');
      }
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string, label: string }> = {
      'criado': { color: 'bg-blue-100 text-blue-800', label: 'Criado' },
      'agendado': { color: 'bg-purple-100 text-purple-800', label: 'Agendado' },
      'em-andamento': { color: 'bg-yellow-100 text-yellow-800', label: 'Em andamento' },
      'concluido': { color: 'bg-green-100 text-green-800', label: 'Concluído' }
    };
    
    const statusInfo = statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  // Calcular porcentagem de acertos
  const calculatePercentage = (correct: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  // Rendirizar alerta quando estiver offline
  const OfflineAlert = () => isOffline ? (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
      <div className="flex">
        <div className="ml-3">
          <p className="text-amber-600 font-medium">Você está offline</p>
          <p className="text-sm text-amber-500">
        Os dados exibidos podem estar desatualizados. Algumas funcionalidades podem estar limitadas até que sua conexão seja restabelecida.
          </p>
        </div>
      </div>
    </div>
  ) : null;

  // Agrupar testes por disciplina para mostrar no gráfico de desempenho
  const calculatePerformanceByDiscipline = () => {
    const disciplines: Record<string, { correct: number, total: number }> = {};
    
    // Processar simulados da API
    tests.forEach(test => {
      // Assumindo que todos os testes estão sob "Medicina Geral" neste exemplo
      const discipline = "Medicina Geral";
      
      if (!disciplines[discipline]) {
        disciplines[discipline] = { correct: 0, total: 0 };
      }
      
      disciplines[discipline].correct += test.correctAnswers;
      disciplines[discipline].total += test.totalQuestions;
    });
    
    // Processar simulados locais
    simulados.filter(s => s.status === 'concluido' && s.acertos !== undefined)
      .forEach(simulado => {
        simulado.disciplinas.forEach(disciplina => {
          if (!disciplines[disciplina]) {
            disciplines[disciplina] = { correct: 0, total: 0 };
          }
          
          // Distribuir os acertos proporcionalmente entre as disciplinas
          const proporcao = 1 / simulado.disciplinas.length;
          disciplines[disciplina].correct += (simulado.acertos || 0) * proporcao;
          disciplines[disciplina].total += simulado.quantidadeQuestoes * proporcao;
        });
    });
    
    return Object.entries(disciplines).map(([name, data]) => ({
      name,
      percentage: calculatePercentage(data.correct, data.total),
      count: data.total
    }));
  };

  const handleCriarSimulado = () => {
    router.push('/simulados/novo');
  };

  const formatarData = (data: string) => {
    return format(new Date(data), "dd 'de' MMM", { locale: ptBR });
  };

  const renderContent = () => {
    if (loading) {
  return (
        <div className="flex justify-center p-8">
          <div className="animate-pulse flex flex-col space-y-4 w-full">
            <div className="h-10 bg-gray-200 rounded w-3/4"></div>
            <div className="h-64 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      );
    }

    if (error && simulados.length === 0 && tests.length === 0) {
      return (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-red-600 font-medium">Erro</p>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    const todosSimuladosVazios = simulados.length === 0 && tests.length === 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
          <Card 
            title="Simulados Disponíveis" 
            icon={<ListChecks className="h-5 w-5" />}
            action={
              <div className="flex gap-3">
                <Link
                  href="/simulados/questoes"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Database className="h-5 w-5" />
                  Banco de Questões
                </Link>
              <button
                onClick={handleCriarSimulado}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                  <PlusCircle className="h-5 w-5" />
                  Criar Simulado
              </button>
              </div>
            }
          >
            {todosSimuladosVazios ? (
              <div className="text-center py-12">
                <div className="bg-blue-100 rounded-full p-3 h-16 w-16 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum simulado disponível</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Você ainda não tem simulados criados. Crie seu primeiro simulado para testar seus conhecimentos.
                </p>
                <button 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 mx-auto"
                  onClick={handleCriarSimulado}
                >
                  <PlusCircle className="h-5 w-5" />
                  Criar Simulado
                </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Título
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center">
                              <CalendarIcon className="mr-1 h-4 w-4" />
                              Data
                            </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center">
                          <ClockIcon className="mr-1 h-4 w-4" />
                          Duração
                            </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Renderizar simulados locais */}
                    {simulados.map((simulado) => (
                      <tr key={simulado.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{simulado.titulo}</div>
                          {simulado.descricao && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{simulado.descricao}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {simulado.status === 'agendado' 
                              ? formatarData(simulado.dataAgendada || simulado.dataCriacao)
                              : formatarData(simulado.dataCriacao)
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {simulado.duracao} min
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(simulado.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/simulados/${simulado.id}`} className="text-blue-600 hover:text-blue-900">
                            <ChevronRight className="h-4 w-4 inline" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Renderizar simulados da API (para manter compatibilidade) */}
                    {tests.map((test) => (
                      <tr key={test.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{test.title}</div>
                          {test.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{test.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatarData(test.date.toString())}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {test.duration} min
                              </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(test.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/simulados/${test.id}`} className="text-blue-600 hover:text-blue-900">
                            <ChevronRight className="h-4 w-4 inline" />
                                </Link>
                        </td>
                      </tr>
                        ))}
                  </tbody>
                </table>
                  </div>
                )}
            </Card>
          </div>
          
          <div>
          <Card title="Desempenho por Disciplina" icon={<BarChart3 className="h-5 w-5" />}>
            {simulados.filter(s => s.status === 'concluido').length === 0 && tests.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm">Sem dados de desempenho</p>
                <p className="text-gray-400 text-xs mt-1">Complete simulados para ver estatísticas</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {calculatePerformanceByDiscipline().map((discipline) => (
                      <div key={discipline.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{discipline.name}</span>
                          <span className="text-green-600">{discipline.percentage}%</span>
                        </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{width: `${discipline.percentage}%`}}
                      ></div>
                    </div>
                        <p className="text-xs text-gray-500">Baseado em {discipline.count} questões</p>
                      </div>
                    ))}
                  </div>
                )}
            </Card>
            
          <div className="mt-6">
            <Card title="Dicas para Simulados" icon={<AlertTriangle className="h-5 w-5" />}>
              <div className="space-y-3 p-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium block text-gray-700">Pratique regularmente</span>
                  Resolva simulados semanalmente para fixar o conteúdo e se familiarizar com o formato das questões.
                </p>
                
                <p className="text-sm text-gray-600">
                  <span className="font-medium block text-gray-700">Controle o tempo</span>
                  Pratique respeitando o tempo disponível para melhorar sua velocidade de resolução.
                </p>
                
                <p className="text-sm text-gray-600">
                  <span className="font-medium block text-gray-700">Revise seus erros</span>
                  Após cada simulado, revise cuidadosamente as questões que errou para identificar padrões.
                </p>
                  </div>
            </Card>
          </div>
          </div>
        </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Simulados</h1>
            <p className="text-gray-600">Teste seus conhecimentos e prepare-se para as provas</p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex gap-3">
            <Link
              href="/simulados/questoes"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
            >
              <Database className="h-5 w-5" />
              Banco de Questões
            </Link>
          <button 
            onClick={handleCriarSimulado}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusCircle className="h-5 w-5" />
            Criar Simulado
          </button>
          </div>
        </div>

        <OfflineAlert />
        
        {renderContent()}
    </div>
    </AppLayout>
  );
} 