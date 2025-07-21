/**
 * Implementação do algoritmo de repetição espaçada para o planejamento inteligente de estudos
 */

// Interfaces
interface Assunto {
  id: number;
  nome: string;
  disciplinaId: number;
  disciplinaNome: string;
  dificuldade: 'baixa' | 'média' | 'alta';
  importancia: 'baixa' | 'média' | 'alta';
  horasEstimadas: number;
  desempenho?: number; // 0-100
  historicoRevisoes?: HistoricoRevisao[];
}

interface HistoricoRevisao {
  data: string;
  desempenho: number; // 0-100
  tempoGasto: number; // minutos
}

interface DiaSemana {
  id: number;
  nome: string;
  selecionado: boolean;
  horasDisponiveis: number; // Única informação necessária: quantidade de horas disponíveis
}

// Esta interface não será mais usada diretamente pelo usuário,
// mas mantemos para compatibilidade interna
interface HorarioDisponivel {
  diaSemana: number;
  duracao: number; // Em minutos (60 para estudo, 30 para revisão)
  tipo: 'estudo' | 'revisao';
}

interface TempoDisponivel {
  diasSemana: DiaSemana[];
  cargaDiariaMaxima?: number;
  cargaSemanalMaxima?: number;
}

interface CronogramaItem {
  id: number;
  data: string; // formato ISO "YYYY-MM-DD"
  disciplina: string;
  assunto: string;
  horaInicio?: string; // Opcional para compatibilidade com código existente
  horaFim?: string; // Opcional para compatibilidade com código existente
  duracao: number; // Em minutos (60 para estudo, 30 para revisão)
  concluido: boolean;
  tipo: 'estudo' | 'revisao';
  emRisco?: boolean;
  atraso?: number;
  cicloRevisao?: number;
  prioridade?: number; // 0-100
  desempenhoEsperado?: number; // 0-100
}

interface ConfiguracaoAdaptativa {
  fatorDesempenho: number; // Peso do desempenho na adaptação (0-1)
  fatorAtraso: number; // Peso do atraso na priorização (0-1)
  limiteDesempenhoRisco: number; // Desempenho abaixo do qual o conteúdo é considerado em risco
  intervalosBase: number[]; // Intervalos base para revisão
  ajusteIntervalo: { // Fatores de ajuste dos intervalos baseados no desempenho
    baixo: number;
    medio: number;
    alto: number;
  };
}

// Constantes
const CONFIG_PADRAO: ConfiguracaoAdaptativa = {
  fatorDesempenho: 0.7,
  fatorAtraso: 0.3,
  limiteDesempenhoRisco: 70,
  intervalosBase: [1, 3, 7, 14, 30],
  ajusteIntervalo: {
    baixo: 0.7, // Reduz o intervalo em 30%
    medio: 1.0, // Mantém o intervalo
    alto: 1.3, // Aumenta o intervalo em 30%
  }
};

const MAX_TENTATIVAS_AGENDAMENTO = 5;
const LIMITE_CARGA_DIARIA_PADRAO = 6; // horas
const LIMITE_CARGA_SEMANAL_PADRAO = 30; // horas

// Pesos para cálculo de pontuação de alocação
const PESO_DIFICULDADE = {
  'baixa': 1,
  'média': 2,
  'alta': 3
};

const PESO_IMPORTANCIA = {
  'baixa': 1,
  'média': 2,
  'alta': 3
};

const AFINIDADE_PERIODO = {
  'manha': {
    'baixa': 0.8,
    'média': 0.9,
    'alta': 1.0
  },
  'tarde': {
    'baixa': 0.9,
    'média': 1.0,
    'alta': 0.8
  },
  'noite': {
    'baixa': 1.0,
    'média': 0.8,
    'alta': 0.7
  }
};

// Funções auxiliares
function calcularPrioridade(
  assunto: Assunto,
  dataLimite: Date,
  config: ConfiguracaoAdaptativa
): number {
  const desempenho = assunto.desempenho ?? 100;
  const diasAteProva = Math.ceil((dataLimite.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const urgencia = 1 - (diasAteProva / 30); // Normalizado entre 0 e 1

  const fatorDificuldade = { 'baixa': 0.6, 'média': 0.8, 'alta': 1 }[assunto.dificuldade];
  const fatorImportancia = { 'baixa': 0.6, 'média': 0.8, 'alta': 1 }[assunto.importancia];
  
  // Combina os fatores para gerar uma prioridade de 0 a 100
  return Math.min(100, Math.round(
    (1 - (desempenho / 100)) * config.fatorDesempenho * 100 +
    urgencia * config.fatorAtraso * 100 +
    fatorDificuldade * 30 +
    fatorImportancia * 30
  ));
}

function ajustarIntervalosRevisao(
  intervalosBase: number[],
  desempenho: number,
  config: ConfiguracaoAdaptativa
): number[] {
  const fatorAjuste = desempenho >= 90 ? config.ajusteIntervalo.alto :
                     desempenho >= 70 ? config.ajusteIntervalo.medio :
                     config.ajusteIntervalo.baixo;
  
  return intervalosBase.map(intervalo => Math.round(intervalo * fatorAjuste));
}

function verificarCargaDiaria(
  data: Date,
  duracao: number, // duracao em minutos
  cronograma: CronogramaItem[],
  limiteHoras: number
): boolean {
  const dataStr = data.toISOString().split('T')[0];
  const sessoesNoDia = cronograma.filter(item => item.data === dataStr);
  
  // Calcular a carga atual usando o campo duracao
  const cargaAtual = sessoesNoDia.reduce((total, sessao) => {
    return total + (sessao.duracao / 60); // converter minutos para horas
  }, 0);

  return (cargaAtual + (duracao / 60)) <= limiteHoras;
}

function calcularDesempenhoEsperado(
  assunto: Assunto,
  tipoSessao: 'estudo' | 'revisao',
  cicloRevisao: number
): number {
  const desempenhoBase = assunto.desempenho ?? 70;
  const fatorTipo = tipoSessao === 'estudo' ? 0.7 : 0.9;
  const fatorCiclo = 1 + (cicloRevisao * 0.05); // Cada ciclo de revisão aumenta 5% na expectativa

  return Math.min(100, Math.round(desempenhoBase * fatorTipo * fatorCiclo));
}

// Função para calcular o tempo de estudo entre dois horários em minutos
function calcularTempoEstudo(horaInicio: string, horaFim: string): number {
  if (!horaInicio || !horaFim) return 0;
  const inicio = new Date(`2000-01-01T${horaInicio}`);
  const fim = new Date(`2000-01-01T${horaFim}`);
  return Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60));
}

// Função para dividir um intervalo de tempo em slots menores
function dividirIntervalo(horaInicio: string, horaFim: string, duracaoDesejada: number): { inicio: string; fim: string }[] {
  const slots: { inicio: string; fim: string }[] = [];
  const inicio = new Date(`2000-01-01T${horaInicio}`);
  const fim = new Date(`2000-01-01T${horaFim}`);
  const duracaoTotal = (fim.getTime() - inicio.getTime()) / (1000 * 60); // em minutos

  // Se o intervalo é menor que a duração desejada, retorna o intervalo completo
  if (duracaoTotal < duracaoDesejada) {
    return [{ inicio: horaInicio, fim: horaFim }];
  }

  // Calcular quantos slots completos cabem no intervalo
  const numSlotsCompletos = Math.floor(duracaoTotal / duracaoDesejada);
  let slotInicio = new Date(inicio);

  // Criar slots completos
  for (let i = 0; i < numSlotsCompletos; i++) {
    const slotFim = new Date(slotInicio.getTime() + (duracaoDesejada * 60 * 1000));
    
    // Se este é o último slot e ainda sobra tempo significativo, podemos criar mais um slot
    if (i === numSlotsCompletos - 1) {
      const tempoRestante = (fim.getTime() - slotFim.getTime()) / (1000 * 60);
      
      // Para sessões de estudo (60 min), criar novo slot se sobrar pelo menos 60 min
      if (duracaoDesejada === 60 && tempoRestante >= 60) {
        slots.push({
          inicio: formatarHora(slotInicio),
          fim: formatarHora(slotFim)
        });
        slotInicio = slotFim;
        continue;
      }
      
      // Para revisões (15-30 min), criar novo slot se sobrar pelo menos 15 min
      if (duracaoDesejada <= 30 && tempoRestante >= 15) {
        slots.push({
          inicio: formatarHora(slotInicio),
          fim: formatarHora(slotFim)
        });
        slotInicio = slotFim;
        continue;
      }
    }
    
    slots.push({
      inicio: formatarHora(slotInicio),
      fim: formatarHora(slotFim)
    });
    slotInicio = slotFim;
  }

  // Verificar se sobrou tempo suficiente para mais um slot
  const tempoRestante = (fim.getTime() - slotInicio.getTime()) / (1000 * 60);
  
  // Para sessões de estudo, adicionar slot se sobrar 60 min ou mais
  if (duracaoDesejada === 60 && tempoRestante >= 60) {
    slots.push({
      inicio: formatarHora(slotInicio),
      fim: formatarHora(new Date(slotInicio.getTime() + (60 * 60 * 1000)))
    });
  }
  // Para revisões, adicionar slot se sobrar 15 min ou mais
  else if (duracaoDesejada <= 30 && tempoRestante >= 15) {
    // Ajustar a duração do último slot para não ultrapassar 30 min
    const ultimaDuracao = Math.min(30, tempoRestante);
    slots.push({
      inicio: formatarHora(slotInicio),
      fim: formatarHora(new Date(slotInicio.getTime() + (ultimaDuracao * 60 * 1000)))
    });
  }

  return slots;
}

// Função auxiliar para formatar hora no padrão HH:mm
function formatarHora(data: Date): string {
  return data.getHours().toString().padStart(2, '0') + ':' + 
         data.getMinutes().toString().padStart(2, '0');
}

// Função para calcular duração da sessão - simplificada para valores fixos
function calcularDuracaoSessao(assunto: Assunto, tipoSessao: 'estudo' | 'revisao'): number {
  // Valores fixos conforme requisito
  return tipoSessao === 'estudo' ? 60 : 30; // 1h para estudo, 30min para revisão
}

// Nova função para calcular pontuação de prioridade baseada apenas em dificuldade e importância
function calcularPrioridadeBaseadaEmDificuldadeImportancia(assunto: Assunto): number {
  // Pontuação de dificuldade: baixa=1, média=2, alta=3
  const pontosDificuldade = assunto.dificuldade === 'alta' ? 3 : 
                            assunto.dificuldade === 'média' ? 2 : 1;
  
  // Pontuação de importância: baixa=1, média=2, alta=3
  const pontosImportancia = assunto.importancia === 'alta' ? 3 : 
                            assunto.importancia === 'média' ? 2 : 1;
  
  // Combinar os fatores (multiplicação para dar mais peso quando ambos são altos)
  return pontosDificuldade * pontosImportancia;
}

// Nova função para determinar quantidade de revisões baseada na dificuldade e importância
function determinarQuantidadeRevisoes(assunto: Assunto): number {
  const pontuacao = calcularPrioridadeBaseadaEmDificuldadeImportancia(assunto);
  
  // Escala de 1 a 9 (3x3)
  if (pontuacao >= 9) return 5;  // Máxima prioridade: 5 revisões 
  if (pontuacao >= 7) return 4;  // 4 revisões
  if (pontuacao >= 5) return 3;  // 3 revisões
  if (pontuacao >= 3) return 2;  // 2 revisões
  return 1;                      // Mínima prioridade: 1 revisão
}

/**
 * Versão reformulada da função geradora de cronograma
 */
export function gerarCronogramaComRepeticaoEspacada(
  assuntos: Assunto[],
  tempoDisponivel: TempoDisponivel,
  dataLimiteStr: string,
  cronogramaAnterior: CronogramaItem[] = [],
  config: ConfiguracaoAdaptativa = CONFIG_PADRAO
): { 
  cronograma: CronogramaItem[]; 
  notificacoes: string[]; 
  estatisticas: {
    totalSessoes: number;
    sessoesEstudo: number;
    sessoesRevisao: number;
    sessoesAtrasadas: number;
    conteudosEmRisco: number;
  }
} {
  // Validações iniciais
  if (!assuntos || assuntos.length === 0) {
    throw new Error("Nenhum assunto fornecido");
  }

  if (!tempoDisponivel || !tempoDisponivel.diasSemana || tempoDisponivel.diasSemana.length === 0) {
    throw new Error("Nenhum dia disponível fornecido");
  }

  if (!dataLimiteStr) {
    throw new Error("Data limite não fornecida");
  }

  // Inicialização
  const dataLimite = new Date(dataLimiteStr);
  dataLimite.setHours(23, 59, 59, 999);
  
  const dataAtual = new Date();
  dataAtual.setHours(0, 0, 0, 0);

  if (dataLimite <= dataAtual) {
    throw new Error("A data limite deve ser posterior à data atual");
  }

  const notificacoes: string[] = [];
  const cronograma: CronogramaItem[] = [...cronogramaAnterior];
  let sessoesEstudo = 0;
  let sessoesRevisao = 0;
  let sessoesAtrasadas = 0;
  let conteudosEmRisco = 0;

  // Ordenar assuntos por prioridade (com a nova função)
  const assuntosOrdenados = [...assuntos].sort((a, b) => {
    // Usar a nova função que considera apenas dificuldade e importância
    return calcularPrioridadeBaseadaEmDificuldadeImportancia(b) - 
           calcularPrioridadeBaseadaEmDificuldadeImportancia(a);
  });

  // Criar registro de datas para estudo de cada assunto
  const dataEstudoAssunto = new Map<string, Date>();
  
  // Função para verificar se ainda há tempo disponível em um dia
  function temTempoDisponivel(data: Date, duracaoMinutos: number): boolean {
    const dataStr = data.toISOString().split('T')[0];
    const diaSemana = data.getDay();
    
    // Verificar se o dia está selecionado
    const diaConfig = tempoDisponivel.diasSemana.find(d => d.id === diaSemana && d.selecionado);
    if (!diaConfig) return false;
    
    // Calcular quanto tempo já foi usado naquele dia
    const sessoesNoDia = cronograma.filter(s => s.data === dataStr);
    const tempoUsado = sessoesNoDia.reduce((soma, s) => soma + s.duracao, 0) / 60; // converter para horas
    
    // Verificar se há tempo suficiente disponível
    return (tempoUsado + (duracaoMinutos / 60)) <= diaConfig.horasDisponiveis;
  }
  
  // Função para agendar uma sessão
  const agendarSessao = (
    assunto: Assunto,
    tipoSessao: 'estudo' | 'revisao',
    cicloRevisao: number = 0,
    dataPreferencial?: Date
  ): boolean => {
    // Usar o valor fixo de duração
    const duracao = calcularDuracaoSessao(assunto, tipoSessao);
    let dataInicio = dataPreferencial ? new Date(dataPreferencial) : new Date(dataAtual);
    
    type OpcaoAgendamento = {
      data: Date;
      pontuacao: number;
    };
    
    const opcoesAgendamento: OpcaoAgendamento[] = [];
    let tentativas = 0;

    while (tentativas < MAX_TENTATIVAS_AGENDAMENTO) {
      const dataFim = new Date(dataLimite);
      
      // Se for uma data preferencial, limitamos a busca a essa data específica
      if (dataPreferencial) {
        dataFim.setTime(dataPreferencial.getTime());
        dataFim.setHours(23, 59, 59, 999);
      }
      
      while (dataInicio <= dataFim) {
        const diaSemana = dataInicio.getDay();
        const diaDisponivel = tempoDisponivel.diasSemana.find(d => d.id === diaSemana && d.selecionado);
        
        if (diaDisponivel) {
          // Verificar se há tempo disponível neste dia para a duração desejada
          if (temTempoDisponivel(dataInicio, duracao)) {
            // Calcular pontuação para este dia baseando-se na prioridade
            const pontuacao = calcularPrioridadeBaseadaEmDificuldadeImportancia(assunto);
            
            opcoesAgendamento.push({
              data: new Date(dataInicio),
              pontuacao
            });
          }
        }
        
        // Avançar para o próximo dia
        dataInicio.setDate(dataInicio.getDate() + 1);
      }
      
      // Se encontramos opções, escolher a melhor
      if (opcoesAgendamento.length > 0) {
        // Ordenar por pontuação (maior para menor)
        opcoesAgendamento.sort((a, b) => b.pontuacao - a.pontuacao);
        
        // Escolher a melhor opção
        const melhorOpcao = opcoesAgendamento[0];
        
        // Calcular valores relacionados à sessão
        const prioridade = calcularPrioridadeBaseadaEmDificuldadeImportancia(assunto);
        const emRisco = (assunto.desempenho ?? 100) < 70;
        
        // Adicionar ao cronograma com o novo formato
        cronograma.push({
          id: cronograma.length + 1,
          data: melhorOpcao.data.toISOString().split('T')[0],
          disciplina: assunto.disciplinaNome,
          assunto: assunto.nome,
          duracao: duracao, // Usando o novo campo duração em minutos
          concluido: false,
          tipo: tipoSessao,
          cicloRevisao,
          prioridade,
          emRisco
        });

        if (tipoSessao === 'estudo') {
          sessoesEstudo++;
        } else {
          sessoesRevisao++;
        }

        return true;
      }
        
      // Se for data preferencial e não encontrou, expandir a busca
      if (dataPreferencial) {
        dataPreferencial = undefined;
        dataInicio = new Date(dataAtual);
      }

      tentativas++;
    }

    return false;
  };
  
  // Primeiro passo: agendar todas as sessões de estudo
  for (const assunto of assuntosOrdenados) {
    // Verificar se é um assunto em risco
    if (assunto.desempenho !== undefined && assunto.desempenho < 70) {
      conteudosEmRisco++;
    }

    // Agendar sessão de estudo
    if (agendarSessao(assunto, 'estudo')) {
      // Encontrar a sessão que acabamos de agendar
      const sessaoEstudo = cronograma[cronograma.length - 1];
      const dataEstudo = new Date(sessaoEstudo.data);
      
      // Armazenar a data para uso nas revisões
      dataEstudoAssunto.set(`${assunto.disciplinaNome}:${assunto.nome}`, dataEstudo);
    } else {
      notificacoes.push(`Não foi possível agendar o estudo de "${assunto.nome}". Considere aumentar o tempo disponível.`);
    }
  }
  
  // Segundo passo: agendar as revisões com o número baseado na dificuldade/importância
  for (const assunto of assuntosOrdenados) {
    const chaveAssunto = `${assunto.disciplinaNome}:${assunto.nome}`;
    const dataEstudo = dataEstudoAssunto.get(chaveAssunto);
    
    // Só agendar revisões para assuntos que tiveram sessão de estudo agendada
    if (!dataEstudo) continue;
    
    // Determinar quantidade de revisões baseada na nova função
    const quantidadeRevisoes = determinarQuantidadeRevisoes(assunto);
    
    // Criar intervalos personalizados de revisão (adaptados à quantidade)
    const intervalosRevisao = [];
    
    // Esquema de revisão baseado na quantidade determinada pela prioridade
    if (quantidadeRevisoes >= 1) intervalosRevisao.push(1);  // 1 dia depois
    if (quantidadeRevisoes >= 2) intervalosRevisao.push(3);  // 3 dias depois
    if (quantidadeRevisoes >= 3) intervalosRevisao.push(7);  // 1 semana depois
    if (quantidadeRevisoes >= 4) intervalosRevisao.push(14); // 2 semanas depois
    if (quantidadeRevisoes >= 5) intervalosRevisao.push(30); // 1 mês depois
    
    // Agendar cada revisão
    for (let i = 0; i < intervalosRevisao.length; i++) {
      const dataRevisao = new Date(dataEstudo);
      dataRevisao.setDate(dataRevisao.getDate() + intervalosRevisao[i]);
      
      if (dataRevisao > dataLimite) {
        continue; // Pular se ultrapassou a data da prova
      }
      
      if (!agendarSessao(assunto, 'revisao', i + 1, dataRevisao)) {
        notificacoes.push(
          `Não foi possível agendar a revisão ${i + 1} para "${assunto.nome}".`
        );
      }
    }
  }

  // Verificar sessões atrasadas
  const hoje = new Date().toISOString().split('T')[0];
  sessoesAtrasadas = cronograma.filter(
    sessao => !sessao.concluido && sessao.data < hoje
  ).length;
  
  // Ordenar cronograma por data
  cronograma.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return {
    cronograma,
    notificacoes,
    estatisticas: {
      totalSessoes: cronograma.length,
      sessoesEstudo,
      sessoesRevisao,
      sessoesAtrasadas,
      conteudosEmRisco
    }
  };
}