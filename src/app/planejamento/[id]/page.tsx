"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../../components/layout/AppLayout';
import { carregarPlano, atualizarStatusSessao } from '../../../services/planejamento';
import type { PlanoEstudo } from '../../../services/planejamento';
import { Clock, Check, AlertTriangle, Calendar, BookOpen, ArrowLeft, BarChart2, PenLine } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: {
    id: string;
  };
}

interface SessaoEstudo {
  id: number;
  data: string;
  disciplina: string;
  assunto: string;
  horaInicio?: string;
  horaFim?: string;
  duracao: number;
  concluido: boolean;
  tipo: 'estudo' | 'revisao';
  emRisco?: boolean;
}

export default function VisualizarPlanoPage({ params }: PageProps) {
  const router = useRouter();
  const [plano, setPlano] = useState<PlanoEstudo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlano() {
      try {
        const planoBuscado = carregarPlano(params.id);
        if (!planoBuscado) {
          throw new Error('Plano não encontrado');
        }
        setPlano(planoBuscado);
      } catch (err) {
        console.error('Erro ao carregar plano:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar plano');
      } finally {
        setLoading(false);
      }
    }

    loadPlano();
  }, [params.id]);

  // Função auxiliar para agrupar sessões por data
  const agruparSessoesPorData = (sessoes: SessaoEstudo[]) => {
    const grupos = sessoes.reduce((acc: Record<string, SessaoEstudo[]>, sessao) => {
      const data = sessao.data;
      if (!acc[data]) {
        acc[data] = [];
      }
      acc[data].push(sessao);
      return acc;
    }, {});

    // Ordenar as sessões de cada dia - considerando horaInicio (se existir), duracao e tipo de sessão
    Object.keys(grupos).forEach(data => {
      grupos[data].sort((a, b) => {
        // Se ambos têm horaInicio, usar ordenação por hora
        if (a.horaInicio && b.horaInicio) {
          return a.horaInicio.localeCompare(b.horaInicio);
        }
        
        // Se apenas um tem horaInicio, considerar o outro como posterior
        if (a.horaInicio && !b.horaInicio) return -1;
        if (!a.horaInicio && b.horaInicio) return 1;
        
        // Se nenhum tem horaInicio, ordenar por tipo de sessão (estudo vem antes de revisão)
        if (a.tipo !== b.tipo) {
          return a.tipo === 'estudo' ? -1 : 1;
        }
        
        // Se são do mesmo tipo, ordenar por duração (sessões mais longas primeiro)
        if (a.duracao !== b.duracao) {
          return b.duracao - a.duracao;
        }
        
        // Se tudo for igual, manter a ordem original
        return 0;
      });
    });

    return grupos;
  };

  const handleMarcarConcluido = (sessaoId: number, concluido: boolean) => {
    if (!plano) return;
    try {
      atualizarStatusSessao(params.id, sessaoId, concluido);
      // Atualizar o estado local
      const planAtualizado = { ...plano };
      const sessaoIndex = planAtualizado.cronograma.findIndex(s => s.id === sessaoId);
      if (sessaoIndex !== -1) {
        planAtualizado.cronograma[sessaoIndex].concluido = concluido;
        setPlano(planAtualizado);
      }
    } catch (err) {
      console.error('Erro ao atualizar status da sessão:', err);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando plano de estudos...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !plano) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
              <p>{error || 'Plano não encontrado'}</p>
            </div>
            <button
              onClick={() => router.push('/planejamento')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Voltar para lista de planos
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Cabeçalho do Plano com navegação */}
        <div className="flex items-center justify-between">
          <Link 
            href="/planejamento" 
            className="group flex items-center text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar</span>
          </Link>
          
          <div className="flex items-center space-x-2">
            <PenLine className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              Última atualização: {new Date(plano.ultimaAtualizacao).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Cabeçalho Principal */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl border border-blue-100 shadow-sm p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center mb-2 text-blue-600">
                <Calendar className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">
                  {new Date(plano.dataProva).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{plano.nome}</h1>
              <div className="flex items-center text-gray-500 text-sm">
                <BookOpen className="h-4 w-4 mr-1" />
                <span>{plano.disciplinas.length} disciplinas</span>
                <span className="mx-2">•</span>
                <span>{plano.estatisticas.totalSessoes} sessões</span>
              </div>
            </div>
            
            <div className="flex-shrink-0 flex items-center justify-center bg-blue-600 text-white p-4 rounded-2xl">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {Math.round((plano.cronograma.filter(s => s.concluido).length / plano.cronograma.length) * 100)}%
                </div>
                <div className="text-xs font-medium text-blue-100">CONCLUÍDO</div>
              </div>
            </div>
          </div>
        </div>
            
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 border border-purple-200 p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 mb-2">Total de Sessões</p>
                <p className="text-3xl font-bold text-purple-900">{plano.estatisticas.totalSessoes}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <BarChart2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-5 h-2 w-full bg-purple-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 border border-blue-200 p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-2">Sessões de Estudo</p>
                <p className="text-3xl font-bold text-blue-900">{plano.estatisticas.sessoesEstudo}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-5 h-2 w-full bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: `${plano.estatisticas.sessoesEstudo/plano.estatisticas.totalSessoes*100}%` }} />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 via-indigo-100 to-indigo-50 border border-indigo-200 p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700 mb-2">Sessões de Revisão</p>
                <p className="text-3xl font-bold text-indigo-900">{plano.estatisticas.sessoesRevisao}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-5 h-2 w-full bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full" style={{ width: `${plano.estatisticas.sessoesRevisao/plano.estatisticas.totalSessoes*100}%` }} />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 via-amber-100 to-amber-50 border border-amber-200 p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700 mb-2">Em Risco</p>
                <p className="text-3xl font-bold text-amber-900">{plano.estatisticas.conteudosEmRisco}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-5 h-2 w-full bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" style={{ width: `${(plano.estatisticas.conteudosEmRisco/plano.estatisticas.totalSessoes)*100}%` }} />
            </div>
          </div>
        </div>

        {/* Cronograma */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white px-8 py-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">Cronograma de Estudos</h2>
          </div>
          
          <div>
            {Object.entries(agruparSessoesPorData(plano.cronograma as SessaoEstudo[]))
              .sort(([dataA], [dataB]) => dataA.localeCompare(dataB))
              .map(([data, sessoes]) => {
                // Corrigindo o cálculo da data atual para considerar o fuso horário local
                const dataAtual = new Date();
                const hoje = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}-${String(dataAtual.getDate()).padStart(2, '0')}`;
                const isHoje = data === hoje;
                const dataPassada = data < hoje;
                
                return (
                  <div key={data} className="border-b border-gray-100 last:border-b-0">
                    <div className={`px-8 py-4 ${isHoje ? 'bg-blue-50' : dataPassada ? 'bg-gray-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${
                            isHoje ? 'bg-blue-100 text-blue-700' : 
                            dataPassada ? 'bg-gray-100 text-gray-500' : 
                            'bg-white border border-gray-200 text-gray-700'
                          }`}>
                            <span className="font-medium">{new Date(data).getDate()}</span>
                          </div>
                          <h3 className={`font-medium ${isHoje ? 'text-blue-800' : dataPassada ? 'text-gray-400' : 'text-gray-700'}`}>
                            {new Date(data).toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </h3>
                        </div>
                        {isHoje && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            Hoje
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="px-8 py-4 space-y-4">
                      {sessoes.map((sessao) => {
                        // Cálculo de duração - usando o campo duracao ou calculando a partir de horaInicio/horaFim
                        let duracaoMinutos = sessao.duracao;
                        if (sessao.horaInicio && sessao.horaFim) {
                          const inicio = new Date(`2000-01-01T${sessao.horaInicio}`);
                          const fim = new Date(`2000-01-01T${sessao.horaFim}`);
                          duracaoMinutos = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60));
                        }
                        
                        return (
                          <div 
                            key={sessao.id}
                            className={`
                              bg-white rounded-xl overflow-hidden
                              ${sessao.concluido 
                                ? 'border border-green-100 shadow-sm' 
                                : sessao.emRisco
                                ? 'border border-red-100 shadow-sm'
                                : 'border border-gray-100 shadow-sm hover:shadow-md'
                              }
                              transition duration-300 ease-in-out
                            `}
                          >
                            <div className={`h-1
                              ${sessao.concluido 
                                ? 'bg-green-500' 
                                : sessao.emRisco
                                ? 'bg-red-500'
                                : sessao.tipo === 'estudo'
                                ? 'bg-blue-500'
                                : 'bg-purple-500'
                              }
                            `}></div>
                            
                            <div className="p-5">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-gray-800">
                                      {sessao.disciplina}
                                    </h4>
                                    <span className={`
                                      text-xs px-2 py-0.5 rounded-full font-medium
                                      ${sessao.tipo === 'estudo' 
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-purple-100 text-purple-700'
                                      }
                                    `}>
                                      {sessao.tipo === 'estudo' ? 'Estudo' : 'Revisão'}
                                    </span>
                                    {sessao.emRisco && (
                                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium flex items-center">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Atenção
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mb-3">{sessao.assunto}</p>
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center">
                                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                                      {duracaoMinutos} min
                                    </div>
                                    <div className="flex items-center bg-gray-100 px-2 py-0.5 rounded-md text-xs font-medium">
                                      {sessao.tipo === 'estudo' ? '1h (Estudo)' : '30min (Revisão)'}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Status e Ações */}
                                <div>
                                  {sessao.concluido ? (
                                    <button
                                      onClick={() => handleMarcarConcluido(sessao.id, false)}
                                      className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                                    >
                                      <Check className="h-4 w-4 mr-1.5" />
                                      Concluído
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleMarcarConcluido(sessao.id, true)}
                                      className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                      Marcar concluído
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}