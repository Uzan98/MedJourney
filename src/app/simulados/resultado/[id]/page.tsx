"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../../../components/layout/AppLayout';
import { 
  carregarSimulado, 
  carregarRespostasUsuario, 
  calcularResultados,
  Simulado, 
  ResultadoSimulado,
  Questao 
} from '../../../../services/simulados';
import { Card } from '../../../../components/ui/Card';
import { 
  ArrowLeft, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  Calendar,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  Share2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PageProps {
  params: {
    id: string;
  };
}

export default function ResultadoSimuladoPage({ params }: PageProps) {
  const router = useRouter();
  const [simulado, setSimulado] = useState<Simulado | null>(null);
  const [resultado, setResultado] = useState<ResultadoSimulado | null>(null);
  const [respostas, setRespostas] = useState<{[questaoId: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questoesExpandidas, setQuestoesExpandidas] = useState<{[questaoId: string]: boolean}>({});

  useEffect(() => {
    carregarDados();
  }, [params.id]);

  const carregarDados = async () => {
    setLoading(true);
    setError(null);

    try {
      const simuladoCarregado = carregarSimulado(params.id);
      
      if (!simuladoCarregado) {
        setError('Simulado não encontrado');
        return;
      }

      // Verificar se o simulado foi concluído
      if (simuladoCarregado.status !== 'concluido') {
        setError('Este simulado ainda não foi concluído');
        return;
      }
      
      // Carregar respostas do usuário
      const respostasUsuario = carregarRespostasUsuario(simuladoCarregado.id);
      if (!respostasUsuario) {
        setError('Não foi possível carregar as respostas deste simulado');
        return;
      }
      
      // Calcular resultados e construir objeto ResultadoSimulado
      const acertosTotal = calcularResultados(simuladoCarregado.id, respostasUsuario);
      const resultadosCalculados = construirResultadoSimulado(simuladoCarregado, respostasUsuario, acertosTotal);
      
      setSimulado(simuladoCarregado);
      setRespostas(respostasUsuario);
      setResultado(resultadosCalculados);
    } catch (err) {
      console.error('Erro ao carregar resultados:', err);
      setError('Falha ao carregar os resultados. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Função para construir o objeto ResultadoSimulado
  const construirResultadoSimulado = (
    simulado: Simulado, 
    respostas: { [questaoId: string]: string },
    acertos: number
  ): ResultadoSimulado => {
    // Identificar questões acertadas, erradas e não respondidas
    const questoesAcertadas: string[] = [];
    const questoesErradas: string[] = [];
    const questoesNaoRespondidas: string[] = [];
    
    simulado.questoes.forEach(questao => {
      const resposta = respostas[questao.id];
      const alternativaCorreta = questao.alternativas.find(alt => alt.correta);
      
      if (!resposta) {
        questoesNaoRespondidas.push(questao.id);
      } else if (alternativaCorreta && resposta === alternativaCorreta.id) {
        questoesAcertadas.push(questao.id);
      } else {
        questoesErradas.push(questao.id);
      }
    });
    
    // Calcular estatísticas por disciplina
    const estatisticasPorDisciplina: Array<{
      disciplina: string;
      acertos: number;
      total: number;
      percentual: number;
    }> = [];
    
    // Agrupar questões por disciplina
    const disciplinas = [...new Set(simulado.questoes.map(q => q.disciplina))];
    
    disciplinas.forEach(disciplina => {
      const questoesDisciplina = simulado.questoes.filter(q => q.disciplina === disciplina);
      let acertosDisciplina = 0;
      
      questoesDisciplina.forEach(questao => {
        if (questoesAcertadas.includes(questao.id)) {
          acertosDisciplina++;
        }
      });
      
      const totalDisciplina = questoesDisciplina.length;
      const percentualDisciplina = totalDisciplina > 0 
        ? Math.round((acertosDisciplina / totalDisciplina) * 100) 
        : 0;
      
      estatisticasPorDisciplina.push({
        disciplina,
        acertos: acertosDisciplina,
        total: totalDisciplina,
        percentual: percentualDisciplina
      });
    });
    
    // Calcular percentual de acerto geral
    const percentualAcerto = simulado.questoes.length > 0 
      ? Math.round((acertos / simulado.questoes.length) * 100) 
      : 0;
    
    return {
      simulado,
      respostas,
      acertos,
      percentualAcerto,
      questoesAcertadas,
      questoesErradas,
      questoesNaoRespondidas,
      estatisticasPorDisciplina
    };
  };

  const toggleQuestaoExpandida = (questaoId: string) => {
    setQuestoesExpandidas(prev => ({
      ...prev,
      [questaoId]: !prev[questaoId]
    }));
  };

  const compartilharResultados = () => {
    if (!resultado) return;
    
    const texto = `Resultado do meu simulado "${simulado?.titulo}": ${resultado.acertos} acertos de ${simulado?.questoes.length} questões (${Math.round(resultado.percentualAcerto)}%)`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Meu resultado no simulado',
        text: texto,
        // url: window.location.href,
      }).catch(err => console.error('Erro ao compartilhar:', err));
    } else {
      // Fallback para copiar para área de transferência
      navigator.clipboard.writeText(texto)
        .then(() => alert('Resultado copiado para a área de transferência!'))
        .catch(err => console.error('Erro ao copiar:', err));
    }
  };

  const obterStatusQuestao = (questaoId: string): 'correta' | 'incorreta' | 'nao-respondida' => {
    if (!resultado) return 'nao-respondida';
    
    const resposta = respostas[questaoId];
    if (!resposta) return 'nao-respondida';
    
    return resultado.questoesAcertadas.includes(questaoId) ? 'correta' : 'incorreta';
  };

  const obterCorAlternativa = (questao: Questao, alternativaId: string): string => {
    const statusQuestao = obterStatusQuestao(questao.id);
    const alternativaCorreta = questao.alternativas.find(alt => alt.correta)?.id;
    const respostaUsuario = respostas[questao.id];
    
    if (alternativaId === alternativaCorreta) {
      return 'bg-green-50 border-green-300 text-green-800'; // Alternativa correta
    } else if (respostaUsuario === alternativaId) {
      return 'bg-red-50 border-red-300 text-red-800'; // Resposta errada do usuário
    } else {
      return 'bg-gray-50 border-gray-200 text-gray-700'; // Outras alternativas
    }
  };

  const obterDesempenhoQuestao = (questao: Questao): React.ReactNode => {
    const status = obterStatusQuestao(questao.id);
    
    if (status === 'nao-respondida') {
      return (
        <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>Não respondida</span>
        </div>
      );
    } else if (status === 'correta') {
      return (
        <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-md text-sm">
          <CheckCircle className="h-4 w-4" />
          <span>Correta</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-md text-sm">
          <XCircle className="h-4 w-4" />
          <span>Incorreta</span>
        </div>
      );
    }
  };

  const baixarResultadosPDF = () => {
    // Esta função seria implementada para gerar um PDF com os resultados
    alert('Funcionalidade de download de PDF será implementada em breve!');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando resultados...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !simulado || !resultado) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 my-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <p className="text-red-600 font-medium">Erro</p>
                <p className="text-sm text-red-500">{error || 'Resultados não disponíveis'}</p>
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

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Cabeçalho com informações */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <button
              onClick={() => router.push('/simulados')}
              className="mr-3 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Resultado do Simulado</h1>
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-4">{simulado.titulo}</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Cartão de resumo */}
          <Card title="Resumo" className="lg:col-span-2">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 flex flex-col items-center">
                <Award className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-2xl font-bold text-blue-700">{Math.round(resultado.percentualAcerto)}%</span>
                <span className="text-sm text-blue-600">Aproveitamento</span>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 flex flex-col items-center">
                <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-2xl font-bold text-green-700">{resultado.acertos}</span>
                <span className="text-sm text-green-600">Acertos</span>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4 flex flex-col items-center">
                <XCircle className="h-8 w-8 text-red-600 mb-2" />
                <span className="text-2xl font-bold text-red-700">{resultado.questoesErradas.length}</span>
                <span className="text-sm text-red-600">Erros</span>
              </div>
              
              <div className="bg-amber-50 rounded-lg p-4 flex flex-col items-center">
                <AlertTriangle className="h-8 w-8 text-amber-600 mb-2" />
                <span className="text-2xl font-bold text-amber-700">{resultado.questoesNaoRespondidas.length}</span>
                <span className="text-sm text-amber-600">Não respondidas</span>
              </div>
            </div>
            
            <div className="px-4 pb-4">
              <div className="mt-6 mb-2 flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-600">Desempenho por disciplina</h3>
                <BarChart3 className="h-4 w-4 text-gray-400" />
              </div>
              
              {/* Gráfico de desempenho por disciplina */}
              {resultado.estatisticasPorDisciplina.length > 0 ? (
                <div className="space-y-3 mt-2">
                  {resultado.estatisticasPorDisciplina.map((dados) => (
                    <div key={dados.disciplina}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-700">{dados.disciplina}</span>
                        <span className="text-sm font-medium">{dados.percentual}% ({dados.acertos}/{dados.total})</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: `${dados.percentual}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Dados por disciplina não disponíveis</p>
              )}
            </div>
          </Card>
          
          {/* Cartão de informações */}
          <Card title="Informações">
            <div className="px-4 pb-4">
              <ul className="space-y-3 mt-2">
                <li className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Data</p>
                    <p className="text-sm text-gray-600">
                      {simulado.dataInicio ? format(new Date(simulado.dataInicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                    </p>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Duração</p>
                    <p className="text-sm text-gray-600">{simulado.duracao} minutos</p>
                  </div>
                </li>
                
                <li className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Questões</p>
                    <p className="text-sm text-gray-600">{simulado.questoes.length} questões no total</p>
                  </div>
                </li>
              </ul>
              
              <div className="border-t border-gray-200 pt-4 mt-4 flex flex-col gap-2">
                <button 
                  onClick={compartilharResultados}
                  className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Compartilhar resultado</span>
                </button>
                
                <button 
                  onClick={baixarResultadosPDF}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Baixar resultado (PDF)</span>
                </button>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Lista de questões */}
        <Card title="Detalhamento das questões" className="mb-6">
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">Corretas: {resultado.acertos}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-600">Incorretas: {resultado.questoesErradas.length}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <span className="text-sm text-gray-600">Não respondidas: {resultado.questoesNaoRespondidas.length}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {simulado.questoes.map((questao, idx) => {
                const status = obterStatusQuestao(questao.id);
                const isExpandida = questoesExpandidas[questao.id] || false;
                
                return (
                  <div 
                    key={questao.id} 
                    className={`border rounded-lg overflow-hidden ${
                      status === 'correta' ? 'border-green-200' : 
                      status === 'incorreta' ? 'border-red-200' : 
                      'border-gray-200'
                    }`}
                  >
                    <div 
                      className={`p-4 flex justify-between items-center cursor-pointer ${
                        status === 'correta' ? 'bg-green-50' : 
                        status === 'incorreta' ? 'bg-red-50' : 
                        'bg-gray-50'
                      }`}
                      onClick={() => toggleQuestaoExpandida(questao.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm font-medium">
                          {idx + 1}
                        </span>
                        <div className="line-clamp-1">{questao.enunciado}</div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {obterDesempenhoQuestao(questao)}
                        {isExpandida ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                    
                    {isExpandida && (
                      <div className="p-4 border-t border-gray-200">
                        <div className="prose max-w-none mb-6">
                          <div className="text-lg font-medium text-gray-800 mb-4">{questao.enunciado}</div>
                          
                          {/* Imagem da questão */}
                          {questao.imagem && (
                            <div className="my-4">
                              <img 
                                src={questao.imagem} 
                                alt="Imagem da questão"
                                className="max-w-full h-auto rounded-lg border border-gray-200" 
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Alternativas */}
                        <div className="space-y-3">
                          {questao.alternativas?.map((alternativa, altIdx) => (
                            <div
                              key={altIdx}
                              className={`p-4 rounded-lg border ${obterCorAlternativa(questao, alternativa.id)}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`
                                  flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium
                                  ${alternativa.correta ? 'bg-green-500 text-white' : 
                                    (respostas[questao.id] === alternativa.id && !alternativa.correta) ? 'bg-red-500 text-white' : 
                                    'bg-gray-200 text-gray-700'}
                                `}>
                                  {String.fromCharCode(65 + altIdx)}
                                </div>
                                <div className="flex-1">
                                  <div>{alternativa.texto}</div>
                                  
                                  {alternativa.correta && (
                                    <div className="mt-2 text-sm text-green-700 flex items-center gap-1">
                                      <CheckCircle className="h-4 w-4" />
                                      <span>Resposta correta</span>
                                    </div>
                                  )}
                                  
                                  {!alternativa.correta && respostas[questao.id] === alternativa.id && (
                                    <div className="mt-2 text-sm text-red-700 flex items-center gap-1">
                                      <XCircle className="h-4 w-4" />
                                      <span>Sua resposta (incorreta)</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Explicação, se disponível */}
                        {questao.explicacao && (
                          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-blue-800 mb-2">Explicação:</h4>
                            <div className="text-sm text-blue-700">{questao.explicacao}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
} 