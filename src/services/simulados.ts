import { v4 as uuidv4 } from 'uuid';

// Interfaces para modelar os simulados
export interface Questao {
  id: string;
  enunciado: string;
  alternativas: {
    id: string;
    texto: string;
    correta: boolean;
  }[];
  explicacao?: string;
  disciplina: string;
  assunto: string;
  dificuldade: 'facil' | 'media' | 'dificil';
  imagem?: string; // URL da imagem opcional para ilustrar a questão
  selecionada?: string; // ID da alternativa selecionada pelo usuário
}

export interface BancoQuestoes {
  id: string;
  nome: string;
  questoes: Questao[];
  disciplinas: string[];
  dataCriacao: string;
  ultimaAtualizacao?: string;
}

export interface Simulado {
  id: string;
  titulo: string;
  descricao?: string;
  disciplinas: string[];
  duracao: number; // em minutos
  quantidadeQuestoes: number;
  questoes: Questao[];
  dataAgendada?: string;
  dataCriacao: string;
  dataInicio?: string;
  dataConclusao?: string;
  status: 'criado' | 'agendado' | 'em-andamento' | 'concluido';
  acertos?: number;
  tempoGasto?: number; // em minutos
  estatisticas?: {
    acertosPorDisciplina: {
      disciplina: string;
      acertos: number;
      total: number;
    }[];
    tempoPorQuestao: number[];
  };
}

export interface ResultadoSimulado {
  simulado: Simulado;
  respostas: { [questaoId: string]: string };
  acertos: number;
  percentualAcerto: number;
  questoesAcertadas: string[];
  questoesErradas: string[];
  questoesNaoRespondidas: string[];
  estatisticasPorDisciplina: {
    disciplina: string;
    acertos: number;
    total: number;
    percentual: number;
  }[];
}

const SIMULADOS_KEY = '@medjourney:simulados';
const BANCO_QUESTOES_KEY = '@medjourney:banco_questoes';

// Funções para gerenciar banco de questões
export function salvarBancoQuestoes(banco: BancoQuestoes): void {
  try {
    // Carregar bancos existentes
    const bancosAtuais = carregarBancosQuestoes();
    
    // Adicionar ou atualizar o banco
    const index = bancosAtuais.findIndex(b => b.id === banco.id);
    if (index >= 0) {
      bancosAtuais[index] = banco;
    } else {
      bancosAtuais.push({
        ...banco,
        id: banco.id || uuidv4(),
        dataCriacao: banco.dataCriacao || new Date().toISOString()
      });
    }
    
    // Salvar no localStorage
    localStorage.setItem(BANCO_QUESTOES_KEY, JSON.stringify(bancosAtuais));
  } catch (error) {
    console.error('Erro ao salvar banco de questões:', error);
    throw new Error('Não foi possível salvar o banco de questões');
  }
}

export function carregarBancosQuestoes(): BancoQuestoes[] {
  try {
    const bancosJson = localStorage.getItem(BANCO_QUESTOES_KEY);
    if (!bancosJson) return [];
    return JSON.parse(bancosJson);
  } catch (error) {
    console.error('Erro ao carregar bancos de questões:', error);
    return [];
  }
}

export function carregarBancoQuestoes(id: string): BancoQuestoes | null {
  try {
    const bancos = carregarBancosQuestoes();
    return bancos.find(b => b.id === id) || null;
  } catch (error) {
    console.error('Erro ao carregar banco de questões:', error);
    return null;
  }
}

export function deletarBancoQuestoes(id: string): void {
  try {
    const bancos = carregarBancosQuestoes().filter(b => b.id !== id);
    localStorage.setItem(BANCO_QUESTOES_KEY, JSON.stringify(bancos));
  } catch (error) {
    console.error('Erro ao deletar banco de questões:', error);
    throw new Error('Não foi possível deletar o banco de questões');
  }
}

export function atualizarBancoQuestoes(bancoId: string, atualizacoes: Partial<BancoQuestoes>): void {
  try {
    const bancos = carregarBancosQuestoes();
    const index = bancos.findIndex(b => b.id === bancoId);
    
    if (index === -1) {
      throw new Error('Banco de questões não encontrado');
    }
    
    bancos[index] = {
      ...bancos[index],
      ...atualizacoes,
      ultimaAtualizacao: new Date().toISOString()
    };
    
    localStorage.setItem(BANCO_QUESTOES_KEY, JSON.stringify(bancos));
  } catch (error) {
    console.error('Erro ao atualizar banco de questões:', error);
    throw new Error('Não foi possível atualizar o banco de questões');
  }
}

export function adicionarQuestaoBanco(bancoId: string, questao: Omit<Questao, 'id'>): Questao {
  try {
    const banco = carregarBancoQuestoes(bancoId);
    if (!banco) throw new Error('Banco de questões não encontrado');
    
    const novaQuestao: Questao = {
      ...questao,
      id: uuidv4()
    };
    
    banco.questoes.push(novaQuestao);
    
    // Garantir que a disciplina está na lista
    if (!banco.disciplinas.includes(questao.disciplina)) {
      banco.disciplinas.push(questao.disciplina);
    }
    
    banco.ultimaAtualizacao = new Date().toISOString();
    
    salvarBancoQuestoes(banco);
    return novaQuestao;
  } catch (error) {
    console.error('Erro ao adicionar questão:', error);
    throw new Error('Não foi possível adicionar a questão');
  }
}

export function removerQuestaoBanco(bancoId: string, questaoId: string): void {
  try {
    const banco = carregarBancoQuestoes(bancoId);
    if (!banco) throw new Error('Banco de questões não encontrado');
    
    banco.questoes = banco.questoes.filter(q => q.id !== questaoId);
    banco.ultimaAtualizacao = new Date().toISOString();
    
    // Atualizar lista de disciplinas se necessário
    const disciplinasUtilizadas = new Set(banco.questoes.map(q => q.disciplina));
    banco.disciplinas = banco.disciplinas.filter(d => disciplinasUtilizadas.has(d));
    
    salvarBancoQuestoes(banco);
  } catch (error) {
    console.error('Erro ao remover questão:', error);
    throw new Error('Não foi possível remover a questão');
  }
}

export function atualizarQuestaoBanco(bancoId: string, questao: Questao): void {
  try {
    const banco = carregarBancoQuestoes(bancoId);
    if (!banco) throw new Error('Banco de questões não encontrado');
    
    const index = banco.questoes.findIndex(q => q.id === questao.id);
    if (index === -1) throw new Error('Questão não encontrada');
    
    banco.questoes[index] = questao;
    banco.ultimaAtualizacao = new Date().toISOString();
    
    // Garantir que a disciplina está na lista
    if (!banco.disciplinas.includes(questao.disciplina)) {
      banco.disciplinas.push(questao.disciplina);
    }
    
    salvarBancoQuestoes(banco);
  } catch (error) {
    console.error('Erro ao atualizar questão:', error);
    throw new Error('Não foi possível atualizar a questão');
  }
}

// Funções para gerenciar simulados
export function salvarSimulado(simulado: Simulado): void {
  try {
    // Carregar simulados existentes
    const simuladosAtuais = carregarSimulados();
    
    // Adicionar ou atualizar o simulado
    const index = simuladosAtuais.findIndex(s => s.id === simulado.id);
    if (index >= 0) {
      simuladosAtuais[index] = simulado;
    } else {
      simuladosAtuais.push({
        ...simulado,
        id: simulado.id || uuidv4(),
        dataCriacao: simulado.dataCriacao || new Date().toISOString(),
        status: simulado.status || 'criado'
      });
    }
    
    // Salvar no localStorage
    localStorage.setItem(SIMULADOS_KEY, JSON.stringify(simuladosAtuais));
  } catch (error) {
    console.error('Erro ao salvar simulado:', error);
    throw new Error('Não foi possível salvar o simulado');
  }
}

export function carregarSimulados(): Simulado[] {
  try {
    const simuladosJson = localStorage.getItem(SIMULADOS_KEY);
    if (!simuladosJson) return [];
    return JSON.parse(simuladosJson);
  } catch (error) {
    console.error('Erro ao carregar simulados:', error);
    return [];
  }
}

export function carregarSimulado(id: string): Simulado | null {
  try {
    const simulados = carregarSimulados();
    return simulados.find(s => s.id === id) || null;
  } catch (error) {
    console.error('Erro ao carregar simulado:', error);
    return null;
  }
}

export function deletarSimulado(id: string): void {
  try {
    const simulados = carregarSimulados().filter(s => s.id !== id);
    localStorage.setItem(SIMULADOS_KEY, JSON.stringify(simulados));
  } catch (error) {
    console.error('Erro ao deletar simulado:', error);
    throw new Error('Não foi possível deletar o simulado');
  }
}

export function atualizarStatusSimulado(id: string, status: Simulado['status'], dados?: Partial<Simulado>): void {
  try {
    const simulado = carregarSimulado(id);
    if (!simulado) throw new Error('Simulado não encontrado');

    // Atualizar status e dados adicionais
    const simuladoAtualizado = {
      ...simulado,
      ...dados,
      status
    };
    
    // Adicionar timestamps conforme o status
    if (status === 'em-andamento' && !simuladoAtualizado.dataInicio) {
      simuladoAtualizado.dataInicio = new Date().toISOString();
    } else if (status === 'concluido' && !simuladoAtualizado.dataConclusao) {
      simuladoAtualizado.dataConclusao = new Date().toISOString();
    }

    // Salvar simulado atualizado
    salvarSimulado(simuladoAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar status do simulado:', error);
    throw new Error('Não foi possível atualizar o status do simulado');
  }
}

export function calcularEstatisticasSimulado(simulado: Simulado): void {
  try {
    if (simulado.status !== 'concluido') return;

    // Calcular acertos
    const acertos = simulado.questoes.filter(q => {
      if (!q.selecionada) return false;
      const alternativaCorreta = q.alternativas.find(a => a.correta);
      return q.selecionada === alternativaCorreta?.id;
    }).length;

    // Calcular estatísticas por disciplina
    const estatisticasPorDisciplina: { [key: string]: { acertos: number, total: number } } = {};
    
    simulado.questoes.forEach(q => {
      if (!estatisticasPorDisciplina[q.disciplina]) {
        estatisticasPorDisciplina[q.disciplina] = { acertos: 0, total: 0 };
      }
      
      estatisticasPorDisciplina[q.disciplina].total++;
      
      if (q.selecionada) {
        const alternativaCorreta = q.alternativas.find(a => a.correta);
        if (q.selecionada === alternativaCorreta?.id) {
          estatisticasPorDisciplina[q.disciplina].acertos++;
        }
      }
    });

    // Formatar estatísticas
    const acertosPorDisciplina = Object.entries(estatisticasPorDisciplina).map(([disciplina, dados]) => ({
      disciplina,
      acertos: dados.acertos,
      total: dados.total
    }));

    // Calcular tempo gasto (se o simulado já foi concluído)
    let tempoGasto = 0;
    if (simulado.dataInicio && simulado.dataConclusao) {
      const inicio = new Date(simulado.dataInicio).getTime();
      const fim = new Date(simulado.dataConclusao).getTime();
      tempoGasto = Math.ceil((fim - inicio) / (1000 * 60)); // Tempo em minutos
    }

    // Atualizar simulado com estatísticas
    const simuladoAtualizado: Simulado = {
      ...simulado,
      acertos,
      tempoGasto,
      estatisticas: {
        acertosPorDisciplina,
        tempoPorQuestao: [] // Implementação futura para rastrear tempo por questão
      }
    };

    // Salvar simulado atualizado
    salvarSimulado(simuladoAtualizado);
  } catch (error) {
    console.error('Erro ao calcular estatísticas do simulado:', error);
    throw new Error('Não foi possível calcular as estatísticas do simulado');
  }
}

// Função para gerar um simulado a partir de parâmetros
export function gerarSimulado(
  titulo: string,
  disciplinas: string[],
  quantidadeQuestoes: number,
  duracao: number,
  dataAgendada?: string,
  descricao?: string,
  questoesSelecionadas?: Questao[] // Novo parâmetro para questões selecionadas manualmente
): Simulado {
  try {
    // Se houver questões selecionadas manualmente, usá-las
    let questoesSelecionadasFinal: Questao[] = [];
    
    if (questoesSelecionadas && questoesSelecionadas.length > 0) {
      // Usar as questões que foram selecionadas manualmente
      questoesSelecionadasFinal = [...questoesSelecionadas];
    } else {
      // Carregar banco de questões para seleção aleatória
      const bancosQuestoes = carregarBancosQuestoes();
      let todasQuestoes: Questao[] = [];
      
      // Combinar questões de todos os bancos disponíveis
      bancosQuestoes.forEach(banco => {
        todasQuestoes = [...todasQuestoes, ...banco.questoes];
      });
      
      // Se não houver questões nos bancos, usar questões mockadas para demonstração
      if (todasQuestoes.length === 0) {
        todasQuestoes = gerarQuestoesMock();
      }
      
      // Filtrar questões pelas disciplinas selecionadas
      const questoesFiltradas = todasQuestoes.filter(q => disciplinas.includes(q.disciplina));
      
      // Se não houver questões suficientes nas disciplinas selecionadas, complementar com outras
      if (questoesFiltradas.length >= quantidadeQuestoes) {
        // Embaralhar e selecionar a quantidade desejada
        questoesSelecionadasFinal = embaralharArray(questoesFiltradas).slice(0, quantidadeQuestoes);
      } else {
        // Usar todas as questões filtradas e complementar com outras
        questoesSelecionadasFinal = [...questoesFiltradas];
        
        // Selecionar questões adicionais para complementar
        const questoesRestantes = todasQuestoes.filter(q => !disciplinas.includes(q.disciplina));
        const questoesAdicionais = embaralharArray(questoesRestantes).slice(0, quantidadeQuestoes - questoesSelecionadasFinal.length);
        
        questoesSelecionadasFinal = [...questoesSelecionadasFinal, ...questoesAdicionais];
      }
    }
    
    // Criar o simulado
    const novoSimulado: Simulado = {
      id: uuidv4(),
      titulo,
      descricao,
      disciplinas,
      duracao,
      quantidadeQuestoes,
      questoes: questoesSelecionadasFinal,
      dataAgendada,
      dataCriacao: new Date().toISOString(),
      status: dataAgendada ? 'agendado' : 'criado'
    };
    
    // Salvar o simulado
    salvarSimulado(novoSimulado);
    
    return novoSimulado;
  } catch (error) {
    console.error('Erro ao gerar simulado:', error);
    throw new Error('Não foi possível gerar o simulado');
  }
}

// Funções auxiliares
function embaralharArray<T>(array: T[]): T[] {
  const novoArray = [...array];
  for (let i = novoArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [novoArray[i], novoArray[j]] = [novoArray[j], novoArray[i]];
  }
  return novoArray;
}

// Função para gerar questões mockadas para demonstração
function gerarQuestoesMock(): Questao[] {
  const questoesMock: Questao[] = [
    {
      id: uuidv4(),
      enunciado: "Qual é o principal componente do sangue responsável pelo transporte de oxigênio?",
      alternativas: [
        { id: uuidv4(), texto: "Plaquetas", correta: false },
        { id: uuidv4(), texto: "Hemácias", correta: true },
        { id: uuidv4(), texto: "Leucócitos", correta: false },
        { id: uuidv4(), texto: "Plasma", correta: false }
      ],
      explicacao: "As hemácias (glóbulos vermelhos) contêm hemoglobina, proteína que se liga ao oxigênio nos pulmões e o transporta para os tecidos.",
      disciplina: "Fisiologia",
      assunto: "Sistema Circulatório",
      dificuldade: "facil"
    },
    {
      id: uuidv4(),
      enunciado: "Qual das seguintes estruturas NÃO faz parte do sistema límbico?",
      alternativas: [
        { id: uuidv4(), texto: "Amígdala", correta: false },
        { id: uuidv4(), texto: "Hipocampo", correta: false },
        { id: uuidv4(), texto: "Cerebelo", correta: true },
        { id: uuidv4(), texto: "Hipotálamo", correta: false }
      ],
      explicacao: "O cerebelo está envolvido principalmente com a coordenação motora e equilíbrio, não fazendo parte do sistema límbico, que está relacionado às emoções e memória.",
      disciplina: "Neuroanatomia",
      assunto: "Sistema Nervoso Central",
      dificuldade: "media"
    },
    {
      id: uuidv4(),
      enunciado: "Qual das seguintes doenças é causada por uma bactéria gram-positiva?",
      alternativas: [
        { id: uuidv4(), texto: "Febre tifoide", correta: false },
        { id: uuidv4(), texto: "Tuberculose", correta: true },
        { id: uuidv4(), texto: "Malária", correta: false },
        { id: uuidv4(), texto: "Dengue", correta: false }
      ],
      explicacao: "A tuberculose é causada pelo Mycobacterium tuberculosis, uma bactéria gram-positiva. Febre tifoide é causada por Salmonella typhi (gram-negativa), malária pelo Plasmodium (protozoário) e dengue por um vírus.",
      disciplina: "Microbiologia",
      assunto: "Bacteriologia",
      dificuldade: "media"
    },
    // Adicionar mais questões conforme necessário
  ];
  
  return questoesMock;
}

/**
 * Salva as respostas do usuário para um simulado
 */
export function salvarRespostasSimulado(
  simuladoId: string, 
  respostas: { [questaoId: string]: string },
  simulado?: Simulado
): void {
  try {
    const chave = `@medjourney:simulado_respostas_${simuladoId}`;
    
    // Salvar respostas no localStorage
    localStorage.setItem(chave, JSON.stringify(respostas));
    
    // Se o simulado foi passado, atualizar dataInicio se necessário
    if (simulado && !simulado.dataInicio) {
      atualizarStatusSimulado(simuladoId, 'em-andamento', {
        dataInicio: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Erro ao salvar respostas do simulado:', error);
    throw new Error('Não foi possível salvar as respostas do simulado');
  }
}

/**
 * Carrega as respostas do usuário para um simulado
 */
export function carregarRespostasUsuario(simuladoId: string): { [questaoId: string]: string } | null {
  try {
    const chave = `@medjourney:simulado_respostas_${simuladoId}`;
    const respostasJson = localStorage.getItem(chave);
    
    if (!respostasJson) return null;
    
    return JSON.parse(respostasJson);
  } catch (error) {
    console.error('Erro ao carregar respostas do usuário:', error);
    return null;
  }
}

/**
 * Calcula os resultados de um simulado com base nas respostas do usuário
 */
export function calcularResultados(
  simuladoId: string, 
  respostas: { [questaoId: string]: string }
): number {
  try {
    const simulado = carregarSimulado(simuladoId);
    if (!simulado) throw new Error('Simulado não encontrado');
    
    let acertos = 0;
    
    // Contabilizar acertos
    simulado.questoes.forEach(questao => {
      const respostaUsuario = respostas[questao.id];
      
      // Se o usuário respondeu
      if (respostaUsuario) {
        // Verificar se a resposta está correta
        const alternativaCorreta = questao.alternativas.find(alt => alt.correta);
        
        if (alternativaCorreta && respostaUsuario === alternativaCorreta.id) {
          acertos++;
        }
      }
    });
    
    // Calcular estatísticas por disciplina
    const estatisticasPorDisciplina: {
      disciplina: string;
      acertos: number;
      total: number;
    }[] = [];
    
    // Agrupar questões por disciplina
    const disciplinas = [...new Set(simulado.questoes.map(q => q.disciplina))];
    
    disciplinas.forEach(disciplina => {
      const questoesDisciplina = simulado.questoes.filter(q => q.disciplina === disciplina);
      let acertosDisciplina = 0;
      
      questoesDisciplina.forEach(questao => {
        const respostaUsuario = respostas[questao.id];
        if (respostaUsuario) {
          const alternativaCorreta = questao.alternativas.find(alt => alt.correta);
          if (alternativaCorreta && respostaUsuario === alternativaCorreta.id) {
            acertosDisciplina++;
          }
        }
      });
      
      estatisticasPorDisciplina.push({
        disciplina,
        acertos: acertosDisciplina,
        total: questoesDisciplina.length
      });
    });
    
    // Atualizar o simulado com os resultados
    atualizarStatusSimulado(simuladoId, 'concluido', {
      dataConclusao: new Date().toISOString(),
      acertos,
      estatisticas: {
        acertosPorDisciplina: estatisticasPorDisciplina,
        tempoPorQuestao: [] // Não implementado nesta versão
      }
    });
    
    return acertos;
  } catch (error) {
    console.error('Erro ao calcular resultados do simulado:', error);
    throw new Error('Não foi possível calcular os resultados do simulado');
  }
} 