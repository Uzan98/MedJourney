"use client";

import React, { useState, useEffect } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { Brain, Calendar, Clock, ChevronRight, ChevronLeft, Check, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { gerarPlanoEstudo } from '../../../services/planejamento';
import { toast } from '../../../components/ui/Toast';
import Link from 'next/link';

interface Assunto {
  id: number;
  nome: string;
  dificuldade: 'baixa' | 'média' | 'alta';
  importancia: 'baixa' | 'média' | 'alta';
  horasEstimadas: number;
  selecionado: boolean;
}

interface DisciplinaSelecionada {
  id: number;
  nome: string;
  assuntos: Assunto[];
}

// Interface para disciplinas do sistema
interface Disciplina {
  id: number;
  nome: string;
  assuntos: {
    id: number;
    nome: string;
    dificuldade: 'baixa' | 'média' | 'alta';
    importancia: 'baixa' | 'média' | 'alta';
    horasEstimadas: number;
  }[];
}

interface HorarioConfig {
  inicio: string;
  fim: string;
}

interface DiaConfig {
  id: number;
  nome: string;
  selecionado: boolean;
  horasDisponiveis: number;
}

export default function CriarPlanejamentoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(true);
  const [nomePlano, setNomePlano] = useState('');
  const [dataProva, setDataProva] = useState('');
  const [disciplinasSelecionadas, setDisciplinasSelecionadas] = useState<DisciplinaSelecionada[]>([]);
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<Disciplina[]>([]);
  const [diasConfig, setDiasConfig] = useState<DiaConfig[]>([
    { id: 0, nome: 'Domingo', selecionado: false, horasDisponiveis: 2 },
    { id: 1, nome: 'Segunda', selecionado: false, horasDisponiveis: 2 },
    { id: 2, nome: 'Terça', selecionado: false, horasDisponiveis: 2 },
    { id: 3, nome: 'Quarta', selecionado: false, horasDisponiveis: 2 },
    { id: 4, nome: 'Quinta', selecionado: false, horasDisponiveis: 2 },
    { id: 5, nome: 'Sexta', selecionado: false, horasDisponiveis: 2 },
    { id: 6, nome: 'Sábado', selecionado: false, horasDisponiveis: 2 }
  ]);

  // Carregar disciplinas do localStorage ao montar o componente
  useEffect(() => {
    carregarDisciplinasDisponiveis();
  }, []);

  // Função para carregar disciplinas do localStorage
  const carregarDisciplinasDisponiveis = () => {
    setLoadingDisciplinas(true);
    try {
      const disciplinasSalvas = localStorage.getItem('disciplinas');
      if (disciplinasSalvas) {
        const disciplinas: Disciplina[] = JSON.parse(disciplinasSalvas);
        setDisciplinasDisponiveis(disciplinas);
      }
    } catch (error) {
      console.error('Erro ao carregar disciplinas:', error);
      toast.error('Erro ao carregar disciplinas do sistema');
    } finally {
      setLoadingDisciplinas(false);
    }
  };

  // Função para adicionar disciplina à seleção
  const adicionarDisciplinaAoPlano = (disciplinaId: number) => {
    const disciplina = disciplinasDisponiveis.find(d => d.id === disciplinaId);
    if (!disciplina) return;

    // Verificar se a disciplina já está selecionada
    if (disciplinasSelecionadas.some(d => d.id === disciplinaId)) {
      toast.error('Esta disciplina já foi adicionada ao plano');
      return;
    }

    // Adicionar disciplina formatada às selecionadas
    const disciplinaFormatada: DisciplinaSelecionada = {
      id: disciplina.id,
      nome: disciplina.nome,
      assuntos: disciplina.assuntos.map(assunto => ({
        ...assunto,
        selecionado: true
      }))
    };

    setDisciplinasSelecionadas(prev => [...prev, disciplinaFormatada]);
    toast.success(`Disciplina "${disciplina.nome}" adicionada ao plano`);
  };

  const handleNext = () => {
    if (step === 2) {
      // Verificar disciplinas selecionadas antes de avançar
      console.log("Disciplinas selecionadas:", disciplinasSelecionadas);
      
      // Contar assuntos selecionados por disciplina
      disciplinasSelecionadas.forEach(disciplina => {
        const assuntosSelecionados = disciplina.assuntos.filter(a => a.selecionado);
        console.log(`Disciplina ${disciplina.nome}: ${assuntosSelecionados.length}/${disciplina.assuntos.length} assuntos selecionados`);
      });
    }
    
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleDia = (diaId: number) => {
    setDiasConfig(prev => prev.map(dia => 
      dia.id === diaId ? { ...dia, selecionado: !dia.selecionado } : dia
    ));
  };

  const atualizarHorasDisponiveis = (diaId: number, horas: number) => {
    setDiasConfig(prev => prev.map(dia => 
      dia.id === diaId ? { ...dia, horasDisponiveis: horas } : dia
    ));
  };

  const getDataMinima = () => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  };

  const formatarHorariosParaSubmissao = () => {
    const diasSemanaFormatados = diasConfig.map(dia => ({
      id: dia.id,
      nome: dia.nome.toLowerCase(),
      selecionado: dia.selecionado,
      horasDisponiveis: dia.horasDisponiveis
    }));

    return { diasSemana: diasSemanaFormatados };
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!nomePlano) throw new Error('Nome do plano é obrigatório');
      if (!dataProva) throw new Error('Data da prova é obrigatória');
      if (disciplinasSelecionadas.length === 0) throw new Error('Selecione pelo menos uma disciplina');
      
      const diasSelecionados = diasConfig.filter(dia => dia.selecionado);
      if (diasSelecionados.length === 0) {
        throw new Error('Selecione pelo menos um dia da semana');
      }
      
      const temHorasDisponiveis = diasSelecionados.some(dia => dia.horasDisponiveis > 0);
      if (!temHorasDisponiveis) {
        throw new Error('Defina pelo menos 1 hora disponível em um dos dias selecionados');
      }

      // Filtrar disciplinas para incluir apenas os assuntos selecionados
      const disciplinasFiltradas = disciplinasSelecionadas.map(disciplina => {
        const assuntosSelecionados = disciplina.assuntos.filter(assunto => assunto.selecionado);
        
        if (assuntosSelecionados.length === 0) {
          throw new Error(`A disciplina "${disciplina.nome}" não tem nenhum assunto selecionado. Selecione pelo menos um assunto ou remova a disciplina.`);
        }
        
        return {
          ...disciplina,
          assuntos: assuntosSelecionados
        };
      });

      const { diasSemana } = formatarHorariosParaSubmissao();

      const plano = gerarPlanoEstudo(
        nomePlano,
        dataProva,
        disciplinasFiltradas,
        diasSemana,
        []
      );

      toast.success('Plano de estudos criado com sucesso!');
      router.push('/planejamento');
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar plano de estudos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Criar Plano de Estudos</h1>
            <p className="text-gray-600">
              Vamos criar um plano de estudos otimizado para você. Siga os passos abaixo.
            </p>
          </div>

          {/* Indicador de passos */}
          <div className="flex mb-8">
            <div className={`flex-1 p-4 rounded-l-lg ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${step >= 1 ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                  <span className="font-bold">1</span>
                </div>
                <span className="font-medium">Informações</span>
              </div>
            </div>
            
            <div className={`flex-1 p-4 ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${step >= 2 ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                  <span className="font-bold">2</span>
                </div>
                <span className="font-medium">Disciplinas</span>
              </div>
            </div>
            
            <div className={`flex-1 p-4 ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${step >= 3 ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                  <span className="font-bold">3</span>
                </div>
                <span className="font-medium">Disponibilidade</span>
              </div>
            </div>
            
            <div className={`flex-1 p-4 rounded-r-lg ${step >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${step >= 4 ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                  <span className="font-bold">4</span>
                </div>
                <span className="font-medium">Revisão</span>
              </div>
            </div>
          </div>

          <div className="mb-8 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            {/* Passo 1: Informações da Prova */}
            {step === 1 && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Informações da Prova</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="nomePlano" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do plano de estudos
                    </label>
                    <input
                      type="text"
                      id="nomePlano"
                      value={nomePlano}
                      onChange={(e) => setNomePlano(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Residência Médica 2024"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="dataProva" className="block text-sm font-medium text-gray-700 mb-1">
                      Data da prova
                    </label>
                    <input
                      type="date"
                      id="dataProva"
                      value={dataProva}
                      min={getDataMinima()}
                      onChange={(e) => setDataProva(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Passo 2: Seleção de Disciplinas */}
            {step === 2 && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Selecione as Disciplinas</h3>
                
                {/* Lista de disciplinas disponíveis para seleção */}
                {loadingDisciplinas ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando disciplinas...</p>
                  </div>
                ) : disciplinasDisponiveis.length === 0 ? (
                  <div className="text-center py-8 border border-gray-200 rounded-lg">
                    <p className="text-gray-600 mb-4">Você ainda não possui disciplinas cadastradas.</p>
                    <Link href="/disciplinas" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      Cadastrar Disciplinas
                    </Link>
                  </div>
                ) : (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Disciplinas Disponíveis</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {disciplinasDisponiveis.map(disciplina => (
                        <div 
                          key={disciplina.id} 
                          className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="font-medium text-gray-800">{disciplina.nome}</h5>
                            <button
                              onClick={() => adicionarDisciplinaAoPlano(disciplina.id)}
                              disabled={disciplinasSelecionadas.some(d => d.id === disciplina.id)}
                              className={`text-sm px-3 py-1 rounded-md ${
                                disciplinasSelecionadas.some(d => d.id === disciplina.id)
                                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                              }`}
                            >
                              {disciplinasSelecionadas.some(d => d.id === disciplina.id) ? 'Adicionada' : 'Adicionar'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500">{disciplina.assuntos.length} assuntos</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Lista de disciplinas selecionadas */}
                <div className="space-y-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Disciplinas Selecionadas para o Plano</h4>
                  
                  {disciplinasSelecionadas.length === 0 ? (
                    <div className="text-center py-6 border border-gray-200 border-dashed rounded-lg">
                      <p className="text-gray-500">Nenhuma disciplina selecionada para o plano</p>
                    </div>
                  ) : (
                    disciplinasSelecionadas.map((disciplina, index) => (
                      <div key={disciplina.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                          <h4 className="text-md font-medium text-gray-700">{disciplina.nome}</h4>
                            <p className="text-xs text-gray-500">
                              {disciplina.assuntos.filter(a => a.selecionado).length} de {disciplina.assuntos.length} assuntos selecionados
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setDisciplinasSelecionadas(prev =>
                                prev.filter((_, i) => i !== index)
                              );
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remover
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          {disciplina.assuntos.map((assunto, assuntoIndex) => (
                            <div key={assunto.id} className={`flex items-center gap-4 p-2 rounded-md ${assunto.selecionado ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
                              <input
                                type="checkbox"
                                checked={assunto.selecionado}
                                onChange={() => {
                                  setDisciplinasSelecionadas(prev =>
                                    prev.map((d, i) =>
                                      i === index
                                        ? {
                                            ...d,
                                            assuntos: d.assuntos.map((a, ai) =>
                                              ai === assuntoIndex
                                                ? { ...a, selecionado: !a.selecionado }
                                                : a
                                            ),
                                          }
                                        : d
                                    )
                                  );
                                }}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <span className={`flex-1 ${assunto.selecionado ? 'font-medium' : 'text-gray-500'}`}>{assunto.nome}</span>
                              
                              <select
                                value={assunto.dificuldade}
                                onChange={(e) => {
                                  setDisciplinasSelecionadas(prev =>
                                    prev.map((d, i) =>
                                      i === index
                                        ? {
                                            ...d,
                                            assuntos: d.assuntos.map((a, ai) =>
                                              ai === assuntoIndex
                                                ? {
                                                    ...a,
                                                    dificuldade: e.target.value as 'baixa' | 'média' | 'alta',
                                                  }
                                                : a
                                            ),
                                          }
                                        : d
                                    )
                                  );
                                }}
                                className={`px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  assunto.selecionado 
                                    ? 'border-gray-300' 
                                    : 'bg-gray-100 border-gray-200 text-gray-400'
                                }`}
                                disabled={!assunto.selecionado}
                              >
                                <option value="baixa">Baixa</option>
                                <option value="média">Média</option>
                                <option value="alta">Alta</option>
                              </select>
                              
                              <select
                                value={assunto.importancia}
                                onChange={(e) => {
                                  setDisciplinasSelecionadas(prev =>
                                    prev.map((d, i) =>
                                      i === index
                                        ? {
                                            ...d,
                                            assuntos: d.assuntos.map((a, ai) =>
                                              ai === assuntoIndex
                                                ? {
                                                    ...a,
                                                    importancia: e.target.value as 'baixa' | 'média' | 'alta',
                                                  }
                                                : a
                                            ),
                                          }
                                        : d
                                    )
                                  );
                                }}
                                className={`px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  assunto.selecionado 
                                    ? 'border-gray-300' 
                                    : 'bg-gray-100 border-gray-200 text-gray-400'
                                }`}
                                disabled={!assunto.selecionado}
                              >
                                <option value="baixa">Baixa</option>
                                <option value="média">Média</option>
                                <option value="alta">Alta</option>
                              </select>
                              
                              <input
                                type="number"
                                value={assunto.horasEstimadas}
                                onChange={(e) => {
                                  setDisciplinasSelecionadas(prev =>
                                    prev.map((d, i) =>
                                      i === index
                                        ? {
                                            ...d,
                                            assuntos: d.assuntos.map((a, ai) =>
                                              ai === assuntoIndex
                                                ? {
                                                    ...a,
                                                    horasEstimadas: parseInt(e.target.value) || 0,
                                                  }
                                                : a
                                            ),
                                          }
                                        : d
                                    )
                                  );
                                }}
                                className={`w-20 px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  assunto.selecionado 
                                    ? 'border-gray-300' 
                                    : 'bg-gray-100 border-gray-200 text-gray-400'
                                }`}
                                placeholder="Horas"
                                disabled={!assunto.selecionado}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  
                  {disciplinasSelecionadas.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        <span className="font-medium">Dica:</span> Você pode personalizar a dificuldade, importância e horas estimadas para cada assunto.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Passo 3: Configuração de Disponibilidade */}
            {step === 3 && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Configure sua Disponibilidade</h3>
                <div className="space-y-6">
                  <p className="text-gray-600 text-sm">
                    Selecione os dias da semana em que você pode estudar e defina quantas horas estão disponíveis em cada dia.
                  </p>
                  
                  <div className="space-y-4">
                    {diasConfig.map(dia => (
                      <div key={dia.id} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center mb-4">
                          <input
                            type="checkbox"
                            id={`dia-${dia.id}`}
                            checked={dia.selecionado}
                            onChange={() => toggleDia(dia.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label
                            htmlFor={`dia-${dia.id}`}
                            className="ml-2 block text-sm font-medium text-gray-700"
                          >
                            {dia.nome}
                          </label>
                        </div>
                        
                        {dia.selecionado && (
                          <div className="ml-6">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-gray-600 min-w-[120px]">Horas disponíveis:</span>
                              <input
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1"
                                value={dia.horasDisponiveis}
                                onChange={(e) => atualizarHorasDisponiveis(dia.id, parseInt(e.target.value))}
                                className="w-full max-w-xs"
                              />
                              <span className="text-blue-600 font-medium ml-2 min-w-[40px]">
                                {dia.horasDisponiveis} {dia.horasDisponiveis === 1 ? 'hora' : 'horas'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 ml-9">
                              As sessões de estudo terão duração fixa de 1 hora e as revisões de 30 minutos.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Passo 4: Revisão */}
            {step === 4 && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Revisão</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Informações da Prova</h4>
                    <p><strong>Nome:</strong> {nomePlano}</p>
                    <p><strong>Data:</strong> {new Date(dataProva).toLocaleDateString()}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Disciplinas e Assuntos Selecionados</h4>
                    
                    {disciplinasSelecionadas.length === 0 ? (
                      <div className="p-3 bg-red-50 text-red-600 rounded-md">
                        Nenhuma disciplina selecionada. Volte e selecione pelo menos uma disciplina.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {disciplinasSelecionadas.map(disciplina => {
                          const assuntosSelecionados = disciplina.assuntos.filter(a => a.selecionado);
                          
                          return (
                            <div key={disciplina.id} className="p-3 border border-gray-200 rounded-lg">
                              <h5 className="font-medium text-gray-800 mb-1">{disciplina.nome}</h5>
                              
                              {assuntosSelecionados.length === 0 ? (
                                <p className="text-sm text-red-500">Nenhum assunto selecionado nesta disciplina!</p>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-600 mb-2">{assuntosSelecionados.length} assuntos selecionados</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {assuntosSelecionados.map(assunto => (
                                      <div key={assunto.id} className="text-sm flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                        <span>{assunto.nome}</span>
                                        <span className="text-xs text-gray-500">
                                          ({assunto.dificuldade}, {assunto.importancia}, {assunto.horasEstimadas}h)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Disponibilidade</h4>
                    <p>
                      <strong>Dias selecionados:</strong>{' '}
                      {diasConfig.filter(dia => dia.selecionado).map(dia => dia.nome).join(', ')}
                    </p>
                    <p>
                      <strong>Horas disponíveis:</strong>{' '}
                      {diasConfig
                        .filter(dia => dia.selecionado)
                        .map(dia => `${dia.nome}: ${dia.horasDisponiveis}h`)
                        .join(', ')}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Resumo:</span> O sistema criará um plano de estudos para {disciplinasSelecionadas.length} disciplina(s) e {disciplinasSelecionadas.reduce((total, d) => total + d.assuntos.filter(a => a.selecionado).length, 0)} assunto(s),
                      distribuindo sessões de estudo e revisão nos dias selecionados conforme sua disponibilidade.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Voltar
                </button>
              )}
              {step < 4 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ml-auto"
                >
                  Próximo
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Gerando Plano...' : 'Gerar Plano'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
} 