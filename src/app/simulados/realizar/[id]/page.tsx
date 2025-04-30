"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../../../components/layout/AppLayout';
import { 
  carregarSimulado, 
  salvarRespostasSimulado, 
  atualizarStatusSimulado, 
  calcularResultados, 
  Simulado, 
  Questao,
  carregarRespostasUsuario
} from '../../../../services/simulados';
import { toast } from '../../../../components/ui/Toast';
import { Card } from '../../../../components/ui/Card';
import { 
  ArrowLeft, 
  ArrowRight, 
  Flag, 
  Clock, 
  Check, 
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  Bookmark,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Modal } from '../../../../components/ui/Modal';

interface PageProps {
  params: {
    id: string;
  };
}

interface RespostasUsuario {
  [questaoId: string]: string;
}

interface QuestaoMarcada {
  [questaoId: string]: boolean;
}

export default function RealizarSimuladoPage({ params }: PageProps) {
  const router = useRouter();
  const [simulado, setSimulado] = useState<Simulado | null>(null);
  const [questaoAtual, setQuestaoAtual] = useState<number>(0);
  const [respostas, setRespostas] = useState<RespostasUsuario>({});
  const [questoesMarcadas, setQuestoesMarcadas] = useState<QuestaoMarcada>({});
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmacaoModal, setShowConfirmacaoModal] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar simulado ao montar
  useEffect(() => {
    carregarDadosSimulado();
    
    // Função de cleanup para limpar o intervalo quando o componente for desmontado
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [params.id]);
  
  // Efeito separado para atualizar documento title com tempo restante
  useEffect(() => {
    if (simulado && tempoRestante !== null) {
      document.title = `${formatarTempoRestante()} | ${simulado.titulo}`;
    }
    
    return () => {
      document.title = 'MedJourney - Seu Assistente de Estudos';
    };
  }, [tempoRestante, simulado]);

  const carregarDadosSimulado = async () => {
    setLoading(true);
    setError(null);

    try {
      const simuladoCarregado = carregarSimulado(params.id);
      
      if (!simuladoCarregado) {
        setError('Simulado não encontrado');
        return;
      }

      // Verificar se o simulado pode ser realizado
      if (simuladoCarregado.status !== 'em-andamento' && simuladoCarregado.status !== 'criado' && simuladoCarregado.status !== 'agendado') {
        setError(`Este simulado já foi ${simuladoCarregado.status === 'concluido' ? 'concluído' : 'cancelado'}`);
        return;
      }
      
      // Carregar respostas anteriores se existirem
      const respostasAnteriores = carregarRespostasUsuario(simuladoCarregado.id);
      if (respostasAnteriores) {
        setRespostas(respostasAnteriores);
      }

      // Atualizar status do simulado
      if (simuladoCarregado.status !== 'em-andamento') {
        atualizarStatusSimulado(simuladoCarregado.id, 'em-andamento');
        simuladoCarregado.status = 'em-andamento';
      }
      
      setSimulado(simuladoCarregado);
      
      // Configurar timer
      const agora = new Date();
      let inicio = new Date(simuladoCarregado.dataInicio || agora);
      
      // Se o simulado nunca foi iniciado, definir o início como agora
      if (!simuladoCarregado.dataInicio) {
        simuladoCarregado.dataInicio = agora.toISOString();
        salvarRespostasSimulado(simuladoCarregado.id, {}, simuladoCarregado); // Atualizar a data de início
        inicio = agora;
      }
      
      setStartTime(inicio);
      
      // Calcular tempo restante em minutos
      const tempoDecorrido = Math.floor((agora.getTime() - inicio.getTime()) / (60 * 1000));
      const novoTempoRestante = Math.max(0, simuladoCarregado.duracao - tempoDecorrido);
      
      // Iniciar contagem com o tempo restante
      iniciarContagem(novoTempoRestante);
    } catch (err) {
      console.error('Erro ao carregar simulado:', err);
      setError('Falha ao carregar o simulado. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const iniciarContagem = (minutos: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Definir tempo restante em minutos
    setTempoRestante(minutos);
    
    // Atualizar a cada segundo (1000ms)
    intervalRef.current = setInterval(() => {
      setTempoRestante((prevTempo) => {
        if (prevTempo === null || prevTempo <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          
          if (prevTempo === 0) {
            // Enviar automaticamente quando o tempo acabar
            finalizarSimulado();
          }
          
          return 0;
        }
        
        // Subtrair 1/60 de um minuto (equivalente a 1 segundo)
        return prevTempo - (1/60);
      });
    }, 1000);
  };

  const responderQuestao = (questaoId: string, alternativa: string) => {
    if (!simulado) return;
    
    const novasRespostas = { ...respostas, [questaoId]: alternativa };
    setRespostas(novasRespostas);
    
    // Salvar resposta no localStorage
    salvarRespostasSimulado(simulado.id, novasRespostas, simulado);
  };

  const marcarQuestao = (questaoId: string) => {
    setQuestoesMarcadas(prev => ({
      ...prev,
      [questaoId]: !prev[questaoId]
    }));
  };

  const navegarQuestao = (direcao: 'anterior' | 'proxima') => {
    if (!simulado || !simulado.questoes) return;
    
    if (direcao === 'anterior' && questaoAtual > 0) {
      setQuestaoAtual(questaoAtual - 1);
    } else if (direcao === 'proxima' && questaoAtual < simulado.questoes.length - 1) {
      setQuestaoAtual(questaoAtual + 1);
    }
  };

  const navegarParaQuestao = (index: number) => {
    if (!simulado || !simulado.questoes) return;
    
    if (index >= 0 && index < simulado.questoes.length) {
      setQuestaoAtual(index);
    }
  };

  const verificarRespostasCompletas = (): boolean => {
    if (!simulado || !simulado.questoes) return false;
    
    const questoesComResposta = Object.keys(respostas).length;
    return questoesComResposta === simulado.questoes.length;
  };

  const solicitarFinalizacao = () => {
    if (!verificarRespostasCompletas()) {
      // Perguntar se realmente deseja finalizar
      setShowConfirmacaoModal(true);
    } else {
      // Todas as questões respondidas, finalizar diretamente
      finalizarSimulado();
    }
  };

  const finalizarSimulado = () => {
    if (!simulado) return;
    
    try {
      // Calcular resultados
      const resultados = calcularResultados(simulado.id, respostas);
      
      // Atualizar status para concluído
      atualizarStatusSimulado(simulado.id, 'concluido');
      
      // Redirecionar para página de resultados
      router.push(`/simulados/resultado/${simulado.id}`);
    } catch (error) {
      console.error('Erro ao finalizar simulado:', error);
      toast.error('Não foi possível finalizar o simulado');
    }
  };

  const formatarTempoRestante = () => {
    if (tempoRestante === null) return "--:--";
    
    const totalMinutos = Math.max(0, tempoRestante);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = Math.floor(totalMinutos % 60);
    const segundos = Math.floor((totalMinutos - Math.floor(totalMinutos)) * 60);
    
    // Exibir no formato HH:MM:SS
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  };

  const calcularProgresso = () => {
    if (!simulado || !simulado.questoes) return 0;
    
    const questoesRespondidas = Object.keys(respostas).length;
    return Math.floor((questoesRespondidas / simulado.questoes.length) * 100);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando simulado...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !simulado || !simulado.questoes) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <p className="text-red-600 font-medium">Erro</p>
                <p className="text-sm text-red-500">{error || 'Simulado não disponível'}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push('/simulados')}
            className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para Simulados</span>
          </button>
        </div>
      </AppLayout>
    );
  }

  const questao = simulado.questoes[questaoAtual];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Cabeçalho com informações */}
        <div className="flex justify-between items-center mb-6 bg-white shadow-sm rounded-lg p-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{simulado.titulo}</h1>
            <p className="text-sm text-gray-500">
              {startTime && (
                <>Iniciado há {formatDistanceToNow(startTime, { locale: ptBR })}</>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Progresso</p>
              <div className="w-36 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${calcularProgresso()}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {Object.keys(respostas).length} de {simulado.questoes.length} respondidas
              </p>
            </div>
            
            {/* Timer - Versão para desktop */}
            <div className="hidden md:flex flex-col items-center">
              <p className="text-sm text-gray-500 mb-1">Tempo Restante</p>
              <div className={`flex items-center justify-center ${tempoRestante && tempoRestante < 10 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                <Clock className="w-4 h-4 mr-1" />
                <span className="font-mono text-lg font-bold">{formatarTempoRestante()}</span>
              </div>
            </div>
            
            <button
              onClick={solicitarFinalizacao}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1 ml-4"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Finalizar</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-12 gap-6">
          {/* Card lateral com os números das questões */}
          <div className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="sticky top-4">
              <Card className="overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 border-b border-blue-600">
                  <h3 className="font-medium text-white text-sm">Questões do Simulado</h3>
                </div>
                
                {/* Timer - Mobile apenas */}
                <div className="md:hidden p-4 border-b border-gray-100 bg-blue-50">
                  <div className={`flex items-center justify-center ${tempoRestante && tempoRestante < 10 ? 'text-red-600 animate-pulse font-bold' : 'text-gray-800'}`}>
                    <Clock className="w-5 h-5 mr-2" />
                    <span className="font-mono text-lg font-bold">{formatarTempoRestante()}</span>
                  </div>
                </div>
                
                {/* Lista de questões com scrolling */}
                <div className="p-4 overflow-y-auto bg-white" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                  <div className="grid grid-cols-3 gap-3">
                    {simulado.questoes.map((questao, index) => {
                      const isRespondida = Boolean(respostas[questao.id]);
                      const isMarcada = Boolean(questoesMarcadas[questao.id]);
                      const isAtual = questaoAtual === index;
                      
                      return (
                        <button
                          key={questao.id}
                          onClick={() => setQuestaoAtual(index)}
                          className={`
                            w-full aspect-square flex items-center justify-center 
                            text-lg font-semibold transition-all duration-200
                            shadow-sm hover:shadow 
                            ${isAtual ? 'ring-2 ring-blue-500 ring-offset-2 z-10' : ''}
                            ${
                              isRespondida
                                ? 'bg-gradient-to-br from-green-50 to-green-100 text-green-700 border border-green-200' 
                                : isMarcada
                                  ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-700 border border-yellow-200'
                                  : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-100'
                            }
                            rounded-xl
                          `}
                          title={`Ir para questão ${index + 1}${isRespondida ? ' (Respondida)' : ''}${isMarcada ? ' (Marcada)' : ''}`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>
          </div>
          
          {/* Área principal com questões */}
          <div className="col-span-12 md:col-span-9 lg:col-span-10">
            {/* Timer - Área principal, visível apenas em desktop */}
            <div className="hidden md:block mb-4">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center ${tempoRestante && tempoRestante < 10 ? 'text-red-600 animate-pulse font-bold' : 'text-gray-800'}`}>
                      <Clock className="w-5 h-5 mr-2" />
                      <span className="font-mono text-xl font-semibold">{formatarTempoRestante()}</span>
                    </div>
                    <div className="text-gray-500 text-sm hidden lg:block">
                      <span className="font-medium">Simulado:</span> {simulado.titulo}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-600 mr-3">
                      Questão {questaoAtual + 1} de {simulado.questoes.length}
                    </span>
                    <div 
                      className="hidden md:block w-48 h-2 bg-gray-200 rounded-full overflow-hidden"
                      title={`${calcularProgresso()}% concluído`}
                    >
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${calcularProgresso()}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
                
            {/* Conteúdo da Questão */}
            <Card>
              <div className="border-b border-gray-100 p-4 flex items-center justify-between">
                <h3 className="font-medium text-gray-800">
                  Questão {questaoAtual + 1}
                </h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => marcarQuestao(questaoAtual >= 0 ? simulado.questoes[questaoAtual].id : '')}
                    className={`p-2 rounded-md ${
                      questaoAtual >= 0 && questoesMarcadas[simulado.questoes[questaoAtual].id]
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Marcar esta questão para revisão"
                  >
                    <Bookmark className="h-5 w-5" />
                  </button>
                  
                  {/* Visível apenas em mobile */}
                  <div className="md:hidden rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600">
                    {questaoAtual + 1}/{simulado.questoes.length}
                  </div>
                </div>
              </div>
              
              {/* Corpo da questão */}
              {questaoAtual >= 0 && questaoAtual < simulado.questoes.length && (
                <div className="divide-y divide-gray-100">
                  <div className="p-6">
                    <div className="text-gray-800 whitespace-pre-wrap mb-8">
                      {simulado.questoes[questaoAtual].enunciado}
                    </div>
              
                    {/* Alternativas */}
                    <div className="space-y-3">
                      {simulado.questoes[questaoAtual].alternativas.map((alternativa) => (
                        <div
                          key={alternativa.id}
                          onClick={() => responderQuestao(simulado.questoes[questaoAtual].id, alternativa.id)}
                          className={`
                            p-3 border rounded-lg cursor-pointer flex items-start transition-colors
                            ${respostas[simulado.questoes[questaoAtual].id] === alternativa.id 
                              ? 'bg-blue-50 border-blue-300' 
                              : 'bg-white border-gray-200 hover:bg-gray-50'}
                          `}
                        >
                          <div className={`
                            w-6 h-6 rounded-full mr-3 flex-shrink-0 flex items-center justify-center border
                            ${respostas[simulado.questoes[questaoAtual].id] === alternativa.id 
                              ? 'bg-blue-500 text-white border-blue-500' 
                              : 'bg-white text-gray-500 border-gray-300'}
                          `}>
                            {String.fromCharCode(65 + simulado.questoes[questaoAtual].alternativas.findIndex(a => a.id === alternativa.id))}
                          </div>
                          <span className="text-gray-800">{alternativa.texto}</span>
                        </div>
                      ))}
                    </div>
                  </div>
              
                  {/* Navegação */}
                  <div className="p-4 flex justify-between items-center">
                    <button
                      onClick={() => navegarQuestao('anterior')}
                      disabled={questaoAtual <= 0}
                      className={`
                        flex items-center gap-1.5 px-3 py-2 rounded-md
                        ${questaoAtual <= 0
                          ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                          : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}
                      `}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Anterior</span>
                    </button>
                
                    <button
                      onClick={solicitarFinalizacao}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      Finalizar Simulado
                    </button>
                  
                    <button
                      onClick={() => navegarQuestao('proxima')}
                      disabled={questaoAtual >= simulado.questoes.length - 1}
                      className={`
                        flex items-center gap-1.5 px-3 py-2 rounded-md
                        ${questaoAtual >= simulado.questoes.length - 1
                          ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                          : 'text-gray-700 bg-gray-100 hover:bg-gray-200'}
                      `}
                    >
                      <span>Próxima</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
      
      {/* Modal de confirmação */}
      <Modal
        isOpen={showConfirmacaoModal}
        onClose={() => setShowConfirmacaoModal(false)}
        title="Finalizar Simulado"
      >
        <div className="py-4">
          {!verificarRespostasCompletas() ? (
            <div className="flex items-start mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500 mr-2 flex-shrink-0 mt-1" />
              <div>
                <p className="text-gray-700 font-medium">
                  Há questões não respondidas!
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  Você respondeu {Object.keys(respostas).length} de {simulado.questoes.length} questões.
                  Tem certeza que deseja finalizar o simulado agora?
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start mb-4">
              <CheckCircle className="h-6 w-6 text-green-500 mr-2 flex-shrink-0 mt-1" />
              <div>
                <p className="text-gray-700 font-medium">
                  Todas as questões foram respondidas!
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  Deseja finalizar o simulado e ver seus resultados?
                </p>
              </div>
            </div>
          )}
            
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowConfirmacaoModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              <span>Continuar Respondendo</span>
            </button>
            
            <button
              onClick={finalizarSimulado}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              <span>Finalizar Simulado</span>
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
} 