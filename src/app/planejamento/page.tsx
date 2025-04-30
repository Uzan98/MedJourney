"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { Brain, Calendar, Clock, Target, BookOpen, ArrowUpRight, Plus, ChevronRight, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { carregarPlanos, obterEstatisticasGerais, PlanoEstudo, processarFilaSincronizacao } from '../../services/planejamento';
import { toast } from '../../components/ui/Toast';
import { isServerAvailable } from '../../lib/utils/offline';
import PlanCard from './components/PlanCard';

export default function PlanejamentoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [planosAtivos, setPlanosAtivos] = useState<PlanoEstudo[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [estatisticas, setEstatisticas] = useState({
    totalPlanos: 0,
    planosAtivos: 0,
    horasPlanejadas: 0,
    taxaMediaConclusao: 0
  });

  useEffect(() => {
    carregarDados();
    
    // Verificar status de conexão inicial
    verificarStatusConexao();
    
    // Adicionar listeners para mudanças de status de rede
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Tentar sincronizar automaticamente quando a página carrega, sem bloquear a interface
  useEffect(() => {
    // Esperar que a página termine de carregar
    const timer = setTimeout(() => {
      if (isOnline && !sincronizando) {
        sincronizarPlanosQuietamente();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [isOnline]);
  
  const verificarStatusConexao = async () => {
    const serverDisponivel = await isServerAvailable();
    setIsOnline(serverDisponivel);
  };
  
  const handleOnline = () => {
    verificarStatusConexao();
    
    // Tentar sincronizar planos quando ficar online
    sincronizarPlanosQuietamente();
  };
  
  const handleOffline = () => {
    setIsOnline(false);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar planos e estatísticas
      const planos = await carregarPlanos();
      const stats = obterEstatisticasGerais();
      
      // Filtrar planos ativos (com data de prova futura)
      const dataAtual = new Date();
      const planosAtivos = planos.filter(plano => {
        // Ignorar planos vazios
        const planoValido = plano.disciplinas && plano.disciplinas.length > 0;
        if (!planoValido) return false;
        
        const dataProva = new Date(plano.dataProva);
        return dataProva >= dataAtual;
      });
      
      setPlanosAtivos(planosAtivos);
      setEstatisticas(stats);
      
      // Limpar planos vazios do localStorage
      if (planos.length !== planosAtivos.length) {
        console.log(`Limpando ${planos.length - planosAtivos.length} planos inválidos`);
        // Atualizar localStorage com apenas os planos válidos
        localStorage.setItem('@medjourney:planos', JSON.stringify(planosAtivos));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar planos de estudo');
    } finally {
      setLoading(false);
    }
  };

  // Versão silenciosa da sincronização, sem notificações na UI
  const sincronizarPlanosQuietamente = async () => {
    if (sincronizando) return;
    
    try {
      setSincronizando(true);
      await processarFilaSincronizacao();
      await carregarDados();
      console.log('Planos sincronizados com sucesso');
    } catch (error) {
      console.error('Erro ao sincronizar planos em segundo plano:', error);
    } finally {
      setSincronizando(false);
    }
  };

  const sincronizarPlanos = async () => {
    if (sincronizando) return;
    
    setSincronizando(true);
    try {
      await processarFilaSincronizacao();
      await carregarDados();
      toast.success('Planos sincronizados com sucesso');
    } catch (error) {
      console.error('Erro ao sincronizar planos:', error);
      toast.error('Não foi possível sincronizar os planos');
    } finally {
      setSincronizando(false);
    }
  };

  const handleNovoPlanejamento = () => {
    router.push('/planejamento/criar');
  };

  const handleVerPlano = (planoId: string) => {
    router.push(`/planejamento/${planoId}`);
  };

  // Componente para indicar status de sincronização do plano
  const StatusSincronizacao = ({ plano }: { plano: PlanoEstudo }) => {
    const iconSize = 'h-4 w-4';
    
    if (!isOnline) {
      return (
        <span title="Modo offline" className="text-gray-500">
          <CloudOff className={iconSize} />
        </span>
      );
    }
    
    if (plano.sincronizado) {
      return (
        <span title="Sincronizado com o servidor" className="text-green-500">
          <Cloud className={iconSize} />
        </span>
      );
    }
    
    return (
      <span title="Pendente de sincronização" className="text-amber-500">
        <Cloud className={iconSize} />
      </span>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando planejamento inteligente...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Planejamento Inteligente</h1>
            <p className="text-gray-600">Otimize seus estudos com nosso sistema de planejamento adaptativo.</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={sincronizarPlanos}
              disabled={sincronizando || !isOnline}
              className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                isOnline ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}
              title={isOnline ? 'Sincronizar planos com o servidor' : 'Servidor indisponível'}
            >
              <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
              <span>{sincronizando ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
            <button
              onClick={handleNovoPlanejamento}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Planejamento</span>
            </button>
          </div>
        </div>

        {/* Status de Conexão */}
        {!isOnline && (
          <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
            <div className="flex items-center">
              <CloudOff className="h-5 w-5 text-amber-500 mr-2" />
              <div>
                <h3 className="font-medium text-amber-800">Modo Offline</h3>
                <p className="text-sm text-amber-700">
                  Você está trabalhando no modo offline. Suas alterações serão sincronizadas automaticamente quando a conexão for restaurada.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center mb-4 text-blue-600">
              <Brain className="w-6 h-6 mr-2" />
              <h3 className="font-semibold">Total de Planos</h3>
            </div>
            <p className="text-3xl font-bold text-gray-800">{estatisticas.totalPlanos}</p>
            <p className="text-sm text-gray-500 mt-1">Planos de estudo criados</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center mb-4 text-green-600">
              <Target className="w-6 h-6 mr-2" />
              <h3 className="font-semibold">Planos Ativos</h3>
            </div>
            <p className="text-3xl font-bold text-gray-800">{estatisticas.planosAtivos}</p>
            <p className="text-sm text-gray-500 mt-1">Planos em andamento</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center mb-4 text-orange-600">
              <Clock className="w-6 h-6 mr-2" />
              <h3 className="font-semibold">Horas Planejadas</h3>
            </div>
            <p className="text-3xl font-bold text-gray-800">{estatisticas.horasPlanejadas}</p>
            <p className="text-sm text-gray-500 mt-1">Total de horas de estudo</p>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center mb-4 text-purple-600">
              <Calendar className="w-6 h-6 mr-2" />
              <h3 className="font-semibold">Taxa de Conclusão</h3>
            </div>
            <p className="text-3xl font-bold text-gray-800">{estatisticas.taxaMediaConclusao}%</p>
            <p className="text-sm text-gray-500 mt-1">Sessões concluídas</p>
          </div>
        </div>

        {/* Lista de Planos */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500 rounded-md">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-semibold text-gray-800">Planos de Estudo Ativos</h2>
            </div>
            <button 
              onClick={handleNovoPlanejamento}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
            >
              Criar novo
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          {planosAtivos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {planosAtivos.map((plano) => (
                <PlanCard
                  key={plano.id}
                  plano={plano}
                  onClick={() => handleVerPlano(plano.id)}
                  isOnline={isOnline}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center mt-6">
              <div className="flex flex-col items-center justify-center">
                <Calendar className="w-16 h-16 text-gray-300 mb-3" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum plano ativo</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Você ainda não possui planos de estudo ativos. Crie seu primeiro plano inteligente para otimizar seus estudos.
                </p>
                <button 
                  onClick={handleNovoPlanejamento}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Plano
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
} 