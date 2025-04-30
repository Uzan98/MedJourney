import { gerarCronogramaComRepeticaoEspacada } from '../utils/spaced-repetition';
import { getStudyPlans, createStudyPlan, updateStudyPlan, deleteStudyPlan, getStudyPlanDetails } from '../lib/api';
import { isServerAvailable } from '../lib/utils/offline';

export interface PlanoEstudo {
  id: string;
  nome: string;
  dataProva: string;
  disciplinas: {
    id: number;
    nome: string;
    assuntos: {
      id: number;
      nome: string;
      dificuldade: 'baixa' | 'média' | 'alta';
      importancia: 'baixa' | 'média' | 'alta';
      horasEstimadas: number;
    }[];
  }[];
  diasSemana: {
    id: number;
    nome: string;
    selecionado: boolean;
    horasDisponiveis?: number;
  }[];
  horarios: {
    id: number;
    inicio: string;
    fim: string;
  }[];
  cronograma: {
    id: number;
    data: string;
    disciplina: string;
    assunto: string;
    horaInicio?: string;
    horaFim?: string;
    duracao?: number;
    concluido: boolean;
    tipo?: 'estudo' | 'revisao';
    cicloRevisao?: number;
    emRisco?: boolean;
    atraso?: number;
  }[];
  estatisticas: {
    totalSessoes: number;
    sessoesEstudo: number;
    sessoesRevisao: number;
    sessoesAtrasadas: number;
    conteudosEmRisco: number;
  };
  notificacoes: string[];
  dataCriacao: string;
  ultimaAtualizacao: string;
  sincronizado?: boolean; // Flag para indicar se o plano foi sincronizado com o backend
  idBackend?: number; // ID no backend, se disponível
}

const STORAGE_KEY = '@medjourney:planos_estudo';
const SYNC_QUEUE_KEY = '@medjourney:sync_queue_planos';

/**
 * Salva um plano de estudo, localmente e no backend (se disponível)
 */
export async function salvarPlano(plano: PlanoEstudo): Promise<void> {
  try {
    // Sempre salvar localmente primeiro (abordagem offline-first)
    salvarPlanoLocal(plano);
    
    // Tentar sincronizar com o backend, se o servidor estiver disponível
    const serverDisponivel = await isServerAvailable();
    
    if (serverDisponivel) {
      try {
        await sincronizarPlanoComBackend(plano);
        
        // Atualizar o status de sincronização localmente
        const planos = carregarPlanosLocal();
        const index = planos.findIndex(p => p.id === plano.id);
        
        if (index >= 0) {
          planos[index].sincronizado = true;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(planos));
        }
      } catch (error) {
        console.error('Erro ao sincronizar com o backend:', error);
        // Adicionar à fila de sincronização para tentar mais tarde
        adicionarPlanoFilaSincronizacao(plano.id);
      }
    } else {
      // Se o servidor não estiver disponível, adicionar à fila
      adicionarPlanoFilaSincronizacao(plano.id);
    }
  } catch (error) {
    console.error('Erro ao salvar plano:', error);
    // Adicionar à fila de sincronização para tentar mais tarde
    adicionarPlanoFilaSincronizacao(plano.id);
    
    // Mesmo com erro na API, o plano já foi salvo localmente
    throw new Error('Não foi possível salvar o plano de estudos no servidor, mas foi salvo localmente');
  }
}

/**
 * Salva um plano de estudo apenas localmente
 */
function salvarPlanoLocal(plano: PlanoEstudo): void {
  try {
    // Carregar planos existentes
    const planosAtuais = carregarPlanosLocal();
    
    // Adicionar ou atualizar o plano
    const index = planosAtuais.findIndex(p => p.id === plano.id);
    if (index >= 0) {
      planosAtuais[index] = {
        ...plano,
        ultimaAtualizacao: new Date().toISOString()
      };
    } else {
      planosAtuais.push({
        ...plano,
        id: plano.id || `plano_${Date.now()}`,
        dataCriacao: new Date().toISOString(),
        ultimaAtualizacao: new Date().toISOString()
      });
    }
    
    // Salvar no localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(planosAtuais));
  } catch (error) {
    console.error('Erro ao salvar plano localmente:', error);
    throw new Error('Não foi possível salvar o plano de estudos localmente');
  }
}

/**
 * Adiciona um plano à fila de sincronização para tentar mais tarde
 */
function adicionarPlanoFilaSincronizacao(planoId: string): void {
  try {
    // Obter fila atual
    const queueJson = localStorage.getItem(SYNC_QUEUE_KEY) || '[]';
    const queue = JSON.parse(queueJson) as string[];
    
    // Adicionar plano à fila se ainda não estiver lá
    if (!queue.includes(planoId)) {
      queue.push(planoId);
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (error) {
    console.error('Erro ao adicionar plano à fila de sincronização:', error);
  }
}

/**
 * Tenta sincronizar planos pendentes
 */
export async function processarFilaSincronizacao(): Promise<void> {
  try {
    // Verificar disponibilidade do servidor
    const serverDisponivel = await isServerAvailable();
    if (!serverDisponivel) {
      return; // Não tentar sincronizar se o servidor estiver indisponível
    }
    
    // Obter fila atual
    const queueJson = localStorage.getItem(SYNC_QUEUE_KEY) || '[]';
    const queue = JSON.parse(queueJson) as string[];
    
    if (queue.length === 0) {
      return; // Nada para sincronizar
    }
    
    // Carregar todos os planos
    const planos = carregarPlanosLocal();
    
    // Processar cada plano na fila
    const novaFila: string[] = [];
    
    for (const planoId of queue) {
      const plano = planos.find(p => p.id === planoId);
      if (!plano) continue; // Plano não encontrado, pular
      
      try {
        await sincronizarPlanoComBackend(plano);
        // Se chegar aqui, a sincronização foi bem-sucedida
      } catch (error) {
        console.error(`Erro ao sincronizar plano ${planoId}:`, error);
        novaFila.push(planoId); // Manter na fila para tentar novamente
      }
    }
    
    // Atualizar fila
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(novaFila));
  } catch (error) {
    console.error('Erro ao processar fila de sincronização:', error);
  }
}

/**
 * Converte um plano para o formato da API
 */
function converterPlanoParaAPI(plano: PlanoEstudo) {
  // Verificar se o plano tem conteúdo válido
  const conteudoValido = plano.disciplinas && plano.disciplinas.length > 0 &&
                         plano.cronograma && plano.cronograma.length > 0;
  
  if (!conteudoValido) {
    console.error('Tentativa de sincronizar plano vazio ou inválido:', plano.id);
    return null;
  }
  
  // Todos os dados detalhados do plano vão para o campo MetaData
  const metaData = JSON.stringify({
    disciplinas: plano.disciplinas,
    diasSemana: plano.diasSemana,
    horarios: plano.horarios,
    cronograma: plano.cronograma,
    estatisticas: plano.estatisticas,
    notificacoes: plano.notificacoes
  });
  
  // Construir o objeto no formato da API
  const planAPI = {
    id: plano.idBackend, // Se for uma atualização
    name: plano.nome,
    description: `Plano de estudos para ${plano.nome}`,
    startDate: new Date().toISOString(),
    endDate: plano.dataProva,
    status: 'ativo',
    metaData: metaData
  };
  
  return planAPI;
}

/**
 * Sincroniza um plano com o backend
 */
async function sincronizarPlanoComBackend(plano: PlanoEstudo): Promise<void> {
  try {
    // Verificar disponibilidade do servidor
    const serverDisponivel = await isServerAvailable();
    if (!serverDisponivel) {
      throw new Error('Servidor indisponível');
    }
    
    // Converter o plano para o formato da API
    const planoAPI = converterPlanoParaAPI(plano);
    
    // Se o plano não for válido para sincronização, abortar
    if (!planoAPI) {
      throw new Error('Plano inválido para sincronização');
    }
    
    // Determinar se é uma criação ou atualização
    let response;
    if (plano.idBackend) {
      // É uma atualização
      response = await updateStudyPlan({
        ...planoAPI,
        id: plano.idBackend
      });
    } else {
      // É uma criação
      response = await createStudyPlan(planoAPI);
    }

    if (!response.success) {
      throw new Error(response.error || 'Erro na operação com a API');
    }

    // Obter o ID do backend e atualizar localmente
    if (response.plan?.id) {
      const planId = typeof response.plan.id === 'string' ? parseInt(response.plan.id) : response.plan.id;
      
      // Atualizar o plano local com o ID do backend
      const planos = carregarPlanosLocal();
      const index = planos.findIndex(p => p.id === plano.id);
      
      if (index >= 0) {
        planos[index] = {
          ...planos[index],
          idBackend: planId,
          sincronizado: true
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(planos));
        console.log(`Plano ${plano.id} sincronizado com backend, ID: ${planId}`);
      }
    }
  } catch (error) {
    console.error('Erro ao sincronizar plano com o backend:', error);
    // Permitir que esse erro seja tratado pelo chamador
    throw error;
  }
}

/**
 * Carrega planos de estudo locais e tenta sincronizar com o backend
 */
export async function carregarPlanos(): Promise<PlanoEstudo[]> {
  try {
    // Carregar planos locais primeiro
    const planosLocais = carregarPlanosLocal();
    
    // Tentar processar fila de sincronização
    await processarFilaSincronizacao();
    
    // Tentar carregar planos do backend e mesclar
    try {
      const planosBackend = await carregarPlanosBackend();
      
      // Mesclar planos - priorizar dados locais se existirem com o mesmo ID
      // Isso garante que mudanças feitas offline não sejam perdidas
      const planosFinais = mesclaPlanosLocaisEBackend(planosLocais, planosBackend);
      
      // Atualizar localStorage com planos mesclados
      localStorage.setItem(STORAGE_KEY, JSON.stringify(planosFinais));
      
      return planosFinais;
    } catch (error) {
      console.error('Erro ao carregar planos do backend:', error);
      // Em caso de erro com o backend, retornar apenas os planos locais
      return planosLocais;
    }
  } catch (error) {
    console.error('Erro ao carregar planos:', error);
    return [];
  }
}

/**
 * Mescla planos de estudo locais com os do backend
 */
function mesclaPlanosLocaisEBackend(planosLocais: PlanoEstudo[], planosBackend: PlanoEstudo[]): PlanoEstudo[] {
  console.log(`Mesclando planos: ${planosLocais.length} locais, ${planosBackend.length} do backend`);
  
  // Criar um mapa de todos os planos locais por ID
  const mapaLocal = new Map<string, PlanoEstudo>();
  const mapaBackendIds = new Map<number, PlanoEstudo>();
  
  // Mapear planos locais por ID local e ID de backend
  planosLocais.forEach(plano => {
    // Garantir que não estamos adicionando planos vazios ou inválidos
    if (plano.disciplinas && plano.disciplinas.length > 0) {
      mapaLocal.set(plano.id, plano);
      if (plano.idBackend) {
        mapaBackendIds.set(plano.idBackend, plano);
      }
    } else {
      console.warn(`Ignorando plano local vazio: ${plano.id}`);
    }
  });
  
  // Criar um resultado combinado
  const resultado: PlanoEstudo[] = [];
  
  // Adicionar planos do backend, verificando se há versões locais
  for (const planoBackend of planosBackend) {
    // Verificar se o plano do backend tem dados válidos no metaData
    let planoValido = true;
    try {
      // Usar type assertion para acessar as propriedades do objeto de qualquer tipo
      const planoAny = planoBackend as any;
      const metaDataStr = planoAny.MetaData || planoAny.metaData || '{}';
      const metaData = JSON.parse(metaDataStr);
      if (!metaData.disciplinas || metaData.disciplinas.length === 0) {
        planoValido = false;
        console.warn(`Ignorando plano backend inválido: ${planoBackend.id}`);
      }
    } catch (e) {
      planoValido = false;
      console.warn(`Erro ao analisar metaData do plano backend: ${planoBackend.id}`);
    }
    
    if (!planoValido) continue;
    
    // Verificar se temos uma versão local com o mesmo ID de backend
    const idBackendNumerico = typeof planoBackend.id === 'string' 
      ? parseInt(planoBackend.id) 
      : (planoBackend.idBackend || 0);
    
    const planoLocalPorIdBackend = idBackendNumerico > 0 
      ? mapaBackendIds.get(idBackendNumerico) 
      : undefined;
    
    if (planoLocalPorIdBackend) {
      // Temos uma versão local deste plano do backend
      const dataLocal = new Date(planoLocalPorIdBackend.ultimaAtualizacao).getTime();
      const dataBackend = new Date(planoBackend.ultimaAtualizacao).getTime();
      
      if (dataLocal > dataBackend) {
        // A versão local é mais recente
        resultado.push(planoLocalPorIdBackend);
        // Remover do mapa local para não duplicar
        mapaLocal.delete(planoLocalPorIdBackend.id);
      } else {
        // A versão do backend é mais recente
        // Manter o ID local para referências
        const planoMesclado = {
          ...planoBackend,
          id: planoLocalPorIdBackend.id,
          idBackend: idBackendNumerico,
          sincronizado: true
        };
        resultado.push(planoMesclado);
        // Remover do mapa local
        mapaLocal.delete(planoLocalPorIdBackend.id);
      }
    } else {
      // Plano existe apenas no backend, adicionar com ID do backend
      const planoComIds = {
        ...planoBackend,
        id: `remote_${idBackendNumerico}_${Date.now()}`, // Garantir ID único
        idBackend: idBackendNumerico,
        sincronizado: true
      };
      resultado.push(planoComIds);
    }
  }
  
  // Adicionar planos que existem apenas localmente
  for (const planoLocal of mapaLocal.values()) {
    // Verificar novamente se o plano local é válido
    if (planoLocal.disciplinas && planoLocal.disciplinas.length > 0) {
      resultado.push(planoLocal);
    }
  }
  
  console.log(`Resultado da mesclagem: ${resultado.length} planos`);
  return resultado;
}

/**
 * Carrega planos de estudo apenas localmente
 */
function carregarPlanosLocal(): PlanoEstudo[] {
  try {
    const planosJson = localStorage.getItem(STORAGE_KEY);
    if (!planosJson) return [];
    return JSON.parse(planosJson);
  } catch (error) {
    console.error('Erro ao carregar planos do localStorage:', error);
    return [];
  }
}

/**
 * Converte planos do formato da API para o formato local
 */
function converterPlanosDaAPI(planosAPI: any[]): PlanoEstudo[] {
  return planosAPI.map(planoAPI => {
    // Valores padrão
    let disciplinas: PlanoEstudo['disciplinas'] = [];
    let diasSemana: PlanoEstudo['diasSemana'] = [];
    let cronograma: PlanoEstudo['cronograma'] = [];
    let horarios: PlanoEstudo['horarios'] = [];
    let estatisticas = {
      totalSessoes: 0,
      sessoesEstudo: 0,
      sessoesRevisao: 0,
      sessoesAtrasadas: 0,
      conteudosEmRisco: 0
    };
    let notificacoes: string[] = [];
    
    // Analisar metaData se existir
    if (planoAPI.MetaData || planoAPI.metaData) {
      try {
        const metaData = JSON.parse(planoAPI.MetaData || planoAPI.metaData);
        disciplinas = metaData.disciplinas || [];
        diasSemana = metaData.diasSemana || [];
        cronograma = metaData.cronograma || [];
        estatisticas = metaData.estatisticas || estatisticas;
        notificacoes = metaData.notificacoes || [];
        horarios = metaData.horarios || [];
      } catch (e) {
        console.error('Erro ao analisar metaData do plano:', e);
      }
    }
    
    // Criar objeto no formato local
    return {
      id: `remote_${planoAPI.Id || planoAPI.id}`, // Prefixo para indicar origem remota
      idBackend: parseInt(planoAPI.Id || planoAPI.id),
      nome: planoAPI.Name || planoAPI.name,
      dataProva: planoAPI.EndDate || planoAPI.endDate,
      disciplinas,
      diasSemana,
      horarios,
      cronograma,
      estatisticas,
      notificacoes,
      dataCriacao: planoAPI.CreatedAt || planoAPI.createdAt,
      ultimaAtualizacao: planoAPI.UpdatedAt || planoAPI.updatedAt,
      sincronizado: true
    };
  });
}

/**
 * Carrega planos de estudo do backend
 */
async function carregarPlanosBackend(): Promise<PlanoEstudo[]> {
  try {
    // Verificar disponibilidade do servidor
    const serverDisponivel = await isServerAvailable();
    if (!serverDisponivel) {
      throw new Error('Servidor indisponível');
    }
    
    // Chamar a API para obter planos do servidor
    const response = await getStudyPlans();
    
    if (!response.success || !response.plans) {
      throw new Error('Falha ao obter planos do servidor');
    }
    
    // Converter os planos do formato da API para o formato local
    const planosConvertidos = converterPlanosDaAPI(response.plans);
    
    // Filtrar planos vazios ou inválidos
    const planosValidos = planosConvertidos.filter(plano => 
      plano.disciplinas && plano.disciplinas.length > 0 && 
      plano.cronograma && plano.cronograma.length > 0
    );
    
    console.log(`Planos obtidos do backend: ${response.plans.length}, válidos: ${planosValidos.length}`);
    
    return planosValidos;
  } catch (error) {
    console.error('Erro ao carregar planos do backend:', error);
    throw error;
  }
}

export function carregarPlano(id: string): PlanoEstudo | null {
  try {
    const planos = carregarPlanosLocal();
    return planos.find(p => p.id === id) || null;
  } catch (error) {
    console.error('Erro ao carregar plano específico:', error);
    return null;
  }
}

export async function deletarPlano(id: string): Promise<void> {
  try {
    // Carregar o plano para verificar se tem ID no backend
    const planos = carregarPlanosLocal();
    const plano = planos.find(p => p.id === id);
    
    if (!plano) {
      throw new Error('Plano não encontrado');
    }
    
    // Remover do armazenamento local
    const novaLista = planos.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novaLista));
    
    // Tentar remover do backend se tiver ID no backend
    if (plano.idBackend) {
      try {
        // Verificar disponibilidade do servidor
        const serverDisponivel = await isServerAvailable();
        if (serverDisponivel) {
          const response = await deleteStudyPlan(plano.idBackend);
          
          if (!response.success) {
            console.error('Erro ao deletar plano do backend:', response.error);
          }
        } else {
          // Adicionar à fila para remover do backend quando estiver online
          const deleteQueueKey = '@medjourney:delete_queue_planos';
          const deleteQueueJson = localStorage.getItem(deleteQueueKey) || '[]';
          const deleteQueue = JSON.parse(deleteQueueJson) as number[];
          
          if (!deleteQueue.includes(plano.idBackend)) {
            deleteQueue.push(plano.idBackend);
            localStorage.setItem(deleteQueueKey, JSON.stringify(deleteQueue));
          }
        }
      } catch (error) {
        console.error('Erro ao deletar plano do backend:', error);
        // Continuar mesmo com erro no backend - já foi removido localmente
      }
    }
  } catch (error) {
    console.error('Erro ao deletar plano:', error);
    throw new Error('Não foi possível deletar o plano de estudos');
  }
}

export function atualizarStatusSessao(planoId: string, sessaoId: number, concluida: boolean): void {
  try {
    // Carregar planos
    const planos = carregarPlanosLocal();
    
    // Encontrar o plano
    const planoIndex = planos.findIndex(p => p.id === planoId);
    if (planoIndex === -1) return;
    
    // Criar cópia do plano
    const plano = { ...planos[planoIndex] };
    
    // Encontrar a sessão
    const sessaoIndex = plano.cronograma.findIndex(s => s.id === sessaoId);
    if (sessaoIndex === -1) return;
    
    // Atualizar status
    plano.cronograma[sessaoIndex].concluido = concluida;
    
    // Atualizar estatísticas
    if (concluida) {
      // Incrementar contadores se for uma conclusão nova
      if (!planos[planoIndex].cronograma[sessaoIndex].concluido) {
        const tipo = plano.cronograma[sessaoIndex].tipo || 'estudo';
        if (tipo === 'estudo') {
          plano.estatisticas.sessoesEstudo += 1;
        } else if (tipo === 'revisao') {
          plano.estatisticas.sessoesRevisao += 1;
        }
      }
    } else {
      // Decrementar contadores se for uma desmarção
      if (planos[planoIndex].cronograma[sessaoIndex].concluido) {
        const tipo = plano.cronograma[sessaoIndex].tipo || 'estudo';
        if (tipo === 'estudo') {
          plano.estatisticas.sessoesEstudo = Math.max(0, plano.estatisticas.sessoesEstudo - 1);
        } else if (tipo === 'revisao') {
          plano.estatisticas.sessoesRevisao = Math.max(0, plano.estatisticas.sessoesRevisao - 1);
        }
      }
    }
    
    // Atualizar data de última atualização
    plano.ultimaAtualizacao = new Date().toISOString();
    
    // Marcar como não sincronizado
    plano.sincronizado = false;
    
    // Salvar planos de volta
    planos[planoIndex] = plano;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(planos));
    
    // Sincronizar com o backend
    sincronizarPlanoComBackend(plano).catch(error => {
      console.error('Erro ao sincronizar atualização de sessão com o backend:', error);
      // Adicionar à fila de sincronização
      adicionarPlanoFilaSincronizacao(plano.id);
    });
  } catch (error) {
    console.error('Erro ao atualizar status da sessão:', error);
    throw new Error('Não foi possível atualizar o status da sessão');
  }
}

export function gerarPlanoEstudo(
  nome: string,
  dataProva: string,
  disciplinas: PlanoEstudo['disciplinas'],
  diasSemana: { 
    id: number;
    nome: string;
    selecionado: boolean;
    horasDisponiveis: number;
  }[],
  horarios: PlanoEstudo['horarios'] = []
): PlanoEstudo {
  try {
    console.log('Gerando plano com disciplinas:', JSON.stringify(disciplinas, null, 2));
    
    // Verificar se há assuntos nas disciplinas
    const totalAssuntos = disciplinas.reduce((total, disc) => total + disc.assuntos.length, 0);
    if (totalAssuntos === 0) {
      throw new Error('Não há assuntos selecionados para gerar o plano');
    }
    
    // Preparar dados para o algoritmo de geração
    const assuntos = disciplinas.flatMap(disciplina =>
      disciplina.assuntos.map(assunto => ({
        ...assunto,
        disciplinaId: disciplina.id,
        disciplinaNome: disciplina.nome
      }))
    );
    
    console.log(`Total de assuntos processados: ${assuntos.length}`);

    // Usar a nova estrutura de tempo disponível
    const tempoDisponivel = {
      diasSemana: diasSemana,
    };

    // Gerar cronograma usando o algoritmo de repetição espaçada
    const { cronograma, notificacoes, estatisticas } = gerarCronogramaComRepeticaoEspacada(
      assuntos,
      tempoDisponivel,
      dataProva
    );
    
    console.log(`Cronograma gerado com ${cronograma.length} sessões`);

    // Criar novo plano
    const novoPlano: PlanoEstudo = {
      id: `plano_${Date.now()}`, // ID temporário que será substituído pelo ID do backend após sincronização
      nome,
      dataProva,
      disciplinas,
      diasSemana,
      horarios,
      cronograma,
      estatisticas,
      notificacoes,
      dataCriacao: new Date().toISOString(),
      ultimaAtualizacao: new Date().toISOString(),
      sincronizado: false
    };

    // Salvar o plano (local e tenta sincronizar com backend)
    salvarPlano(novoPlano).catch(error => {
      console.error('Erro ao sincronizar o novo plano com o backend:', error);
    });
    
    return novoPlano;
  } catch (error) {
    console.error('Erro ao gerar plano de estudos:', error);
    throw new Error('Não foi possível gerar o plano de estudos');
  }
}

export function obterEstatisticasGerais(): {
  totalPlanos: number;
  planosAtivos: number;
  horasPlanejadas: number;
  taxaMediaConclusao: number;
} {
  try {
    const planos = carregarPlanosLocal();
    
    if (planos.length === 0) {
      return {
        totalPlanos: 0,
        planosAtivos: 0,
        horasPlanejadas: 0,
        taxaMediaConclusao: 0
      };
    }
    
    // Filtrar planos ativos (com data futura)
    const dataAtual = new Date();
    const planosAtivos = planos.filter(plano => {
      const dataProva = new Date(plano.dataProva);
      return dataProva >= dataAtual;
    });
    
    // Calcular horas totais planejadas
    const horasPlanejadas = planos.reduce((total, plano) => {
      return total + plano.cronograma.reduce((sum, sessao) => {
        // Converter minutos para horas se duracao estiver em minutos
        const horas = sessao.duracao ? sessao.duracao / 60 : 0;
        return sum + horas;
      }, 0);
    }, 0);
    
    // Calcular taxa média de conclusão
    const taxaMedia = planos.reduce((total, plano) => {
      if (plano.cronograma.length === 0) return total;
      
      const sessoesPassadas = plano.cronograma.filter(sessao => {
        const dataSessao = new Date(sessao.data);
        return dataSessao <= dataAtual;
      });
      
      if (sessoesPassadas.length === 0) return total;
      
      const sessoesConluidas = sessoesPassadas.filter(sessao => sessao.concluido);
      const taxa = (sessoesConluidas.length / sessoesPassadas.length) * 100;
      
      return total + taxa;
    }, 0) / planos.length;
    
    return {
      totalPlanos: planos.length,
      planosAtivos: planosAtivos.length,
      horasPlanejadas: Math.round(horasPlanejadas * 10) / 10, // Arredonda para 1 casa decimal
      taxaMediaConclusao: Math.round(taxaMedia)
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas gerais:', error);
    return {
      totalPlanos: 0,
      planosAtivos: 0,
      horasPlanejadas: 0,
      taxaMediaConclusao: 0
    };
  }
} 