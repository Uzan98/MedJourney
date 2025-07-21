/**
 * Serviço de Planejamento - Gerencia planos de estudo e sincronização com o backend
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  StudyPlan, 
  StudyPlanCreate, 
  StudyPlanUpdate,
  PlanStatus,
  SyncQueues,
  SyncResult,
  ProcessingResult,
  PlanDiscipline,
  SyncStatus,
  StudySession,
  StudySessionCreate,
  StudySessionUpdate
} from '@/lib/types/planning';
import { 
  getStudyPlans as apiGetStudyPlans,
  getStudyPlanDetails as apiGetStudyPlanDetails,
  createStudyPlan as apiCreateStudyPlan,
  updateStudyPlan as apiUpdateStudyPlan,
  deleteStudyPlan as apiDeleteStudyPlan
} from '@/lib/api';
import { isServerAvailable } from '@/lib/utils/offline';
import { convertToPlanDisciplines } from './disciplines';

// Funções de utilidade
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Constantes
const STORAGE_KEY = '@medjourney:planos_estudo';
const SYNC_QUEUE_KEY = '@medjourney:sync_queue_planos';
const DELETE_QUEUE_KEY = '@medjourney:delete_queue_planos';
const TIMESTAMP_KEY = (key: string) => `${key}_timestamps`;

// Estado do serviço
let _initialized = false;
let _syncInProgress = false;
let _syncInterval: NodeJS.Timeout | null = null;

/**
 * Inicia o processo de sincronização com o backend
 * Esta função agenda a sincronização para acontecer em breve
 */
function iniciarSincronizacao(): void {
  // Se já tiver uma sincronização em andamento, não fazer nada
  if (_syncInProgress) return;

  // Opcionalmente, podemos adicionar o plano à fila de sincronização aqui
  
  // Se estiver online, tentar sincronizar imediatamente
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    sincronizarPlanos().catch(error => {
      console.error('Erro ao iniciar sincronização:', error);
    });
  }
}

/**
 * Inicializa o serviço de planejamento
 * Carrega dados iniciais e configura eventos de sincronização
 */
export function inicializarPlanejamento(): void {
  console.log('Inicializando serviço de planejamento...');
  
  // Verificar se já existem planos no armazenamento local
  const planos = obterPlanosLocais();
  
  if (planos.length === 0) {
    console.log('Nenhum plano local encontrado. Tentando carregar do servidor...');
    sincronizarPlanos().then((result: SyncResult) => {
      console.log('Sincronização inicial concluída:', result);
    });
  } else {
    console.log(`${planos.length} planos locais encontrados.`);
  }
  
  // Configurar eventos para sincronização
  window.addEventListener('online', async () => {
    console.log('Conexão com a internet detectada. Iniciando sincronização...');
    await sincronizarPlanos();
    await processarFilaExclusao();
  });
  
  // Verificar itens na fila de exclusão
  processarFilaExclusao();
}

/**
 * Obtém todos os planos armazenados localmente
 */
export function obterPlanosLocais(): StudyPlan[] {
  try {
    const dados = localStorage.getItem(STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch (error) {
    console.error('Erro ao obter planos locais:', error);
    return [];
  }
}

/**
 * Salva os planos no armazenamento local
 */
function salvarPlanosLocais(planos: StudyPlan[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(planos));
  } catch (error) {
    console.error('Erro ao salvar planos localmente:', error);
  }
}

/**
 * Cria um novo plano de estudo
 * @param dados Dados do novo plano
 * @returns Plano criado ou null em caso de erro
 */
export function criarPlanoEstudo(dados: StudyPlanCreate): StudyPlan | null {
  try {
    const planosLocais = obterPlanosLocais();
    
    // Preparar disciplinas
    let disciplinas: PlanDiscipline[] = [];
    
    if (dados.disciplines && dados.disciplines.length > 0) {
      // Buscar informações das disciplinas do localStorage
      const storedDisciplinas = localStorage.getItem('disciplinas');
      let userDisciplinesMap: Record<number, { id: number, nome: string, assuntos: Array<{ id: number, nome: string }> }> = {};
      
      if (storedDisciplinas) {
        try {
          const userDisciplines = JSON.parse(storedDisciplinas);
          userDisciplinesMap = userDisciplines.reduce((acc: any, d: any) => {
            acc[d.id] = d;
            return acc;
          }, {});
        } catch (e) {
          console.error('Erro ao processar disciplinas do usuário:', e);
        }
      }
      
      // Mapear assuntos selecionados por disciplina
      const selectedSubjects: Record<number, number[]> = {};
      dados.disciplines.forEach(d => {
        if (d.subjects && d.subjects.length > 0) {
          selectedSubjects[d.id] = d.subjects.map(s => s.id);
        }
      });
      
      // Disciplinas pré-definidas (hard-coded)
      const predefinedDisciplines = [
        { id: 1, name: 'Anatomia' },
        { id: 2, name: 'Fisiologia' },
        { id: 3, name: 'Bioquímica' },
        { id: 4, name: 'Farmacologia' },
        { id: 5, name: 'Patologia' },
        { id: 6, name: 'Microbiologia' },
        { id: 7, name: 'Semiologia' },
        { id: 8, name: 'Clínica Médica' }
      ];
      
      // Converter as disciplinas de StudyPlanCreate para formato adequado
      const apiDisciplines = dados.disciplines.map(d => {
        const isPredefined = d.id <= 8;
        const userDiscipline = userDisciplinesMap[d.id];
        
        return {
          id: d.id,
          name: isPredefined 
            ? predefinedDisciplines.find(pd => pd.id === d.id)?.name || `Disciplina ${d.id}`
            : (userDiscipline?.nome || `Disciplina ${d.id}`),
          subjects: d.subjects?.map(s => {
            // Buscar nome do assunto (para disciplinas do usuário)
            const userSubjectName = userDiscipline?.assuntos?.find((a: any) => a.id === s.id)?.nome;
            
            return {
              id: s.id,
              name: userSubjectName || `Assunto ${s.id}`,
              hours: s.hours || 4,
              priority: s.priority || 'média',
            };
          }) || []
        };
      });
      
      // Converter para o formato completo do plano
      disciplinas = convertToPlanDisciplines(apiDisciplines, selectedSubjects);
      
      // Atualizar propriedades específicas
      dados.disciplines.forEach(d => {
        const disc = disciplinas.find(pd => pd.id === d.id);
        if (disc) {
          disc.priority = d.priority;
          
          if (d.subjects) {
            d.subjects.forEach(s => {
              const subj = disc.subjects.find(ps => ps.id === s.id);
              if (subj) {
                if (s.priority) subj.priority = s.priority;
                if (s.hours) subj.hours = s.hours;
              }
            });
          }
        }
      });
    }
    
    // Criar novo plano
    const novoPlano: StudyPlan = {
      id: generateUUID(),
      name: dados.name,
      description: dados.description,
      startDate: dados.startDate || new Date().toISOString(),
      endDate: dados.endDate,
      status: dados.status || 'ativo',
      disciplines: disciplinas,
      synchronizationStatus: {
        synced: false,
        pendingSync: true,
        lastSyncDate: null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Adicionar à lista local
    planosLocais.push(novoPlano);
    salvarPlanosLocais(planosLocais);
    
    // Agendar sincronização
    iniciarSincronizacao();
    
    return novoPlano;
  } catch (error) {
    console.error('Erro ao criar plano:', error);
    return null;
  }
}

// Manter a função original como alias para compatibilidade
export const criarNovoPlano = criarPlanoEstudo;

/**
 * Atualiza um plano existente
 * @param planoUpdate Dados da atualização
 * @returns O plano atualizado ou null se não encontrado
 */
export function atualizarPlano(planoUpdate: StudyPlanUpdate): StudyPlan | null {
  // Validar ID
  if (!planoUpdate.id) {
    console.error('ID do plano é obrigatório para atualização');
    return null;
  }
  
  // Obter planos existentes
  const planos = obterPlanosLocais();
  
  // Encontrar o plano a ser atualizado
  const indice = planos.findIndex(p => p.id === planoUpdate.id);
  
  if (indice === -1) {
    console.error(`Plano com ID ${planoUpdate.id} não encontrado`);
    return null;
  }
  
  const planoExistente = planos[indice];
  
  // Buscar informações das disciplinas personalizadas do usuário
  const storedDisciplinas = localStorage.getItem('disciplinas');
  let userDisciplinesMap: Record<number, { id: number, nome: string, assuntos: Array<{ id: number, nome: string }> }> = {};
  
  if (storedDisciplinas) {
    try {
      const userDisciplines = JSON.parse(storedDisciplinas);
      userDisciplinesMap = userDisciplines.reduce((acc: any, d: any) => {
        acc[d.id] = d;
        return acc;
      }, {});
    } catch (e) {
      console.error('Erro ao processar disciplinas do usuário:', e);
    }
  }
  
  // Lista de disciplinas predefinidas para referência rápida
  const predefinedDisciplines = [
    { id: 1, name: 'Anatomia' },
    { id: 2, name: 'Fisiologia' },
    { id: 3, name: 'Bioquímica' },
    { id: 4, name: 'Farmacologia' },
    { id: 5, name: 'Patologia' },
    { id: 6, name: 'Microbiologia' },
    { id: 7, name: 'Semiologia' },
    { id: 8, name: 'Clínica Médica' }
  ];
  
  // Criar versão atualizada do plano
  const planoAtualizado: StudyPlan = {
    ...planoExistente,
    name: planoUpdate.name !== undefined ? planoUpdate.name : planoExistente.name,
    description: planoUpdate.description !== undefined ? planoUpdate.description : planoExistente.description,
    startDate: planoUpdate.startDate !== undefined ? planoUpdate.startDate : planoExistente.startDate,
    endDate: planoUpdate.endDate !== undefined ? planoUpdate.endDate : planoExistente.endDate,
    status: planoUpdate.status !== undefined ? planoUpdate.status : planoExistente.status,
    updatedAt: new Date().toISOString(),
    synchronizationStatus: {
      ...planoExistente.synchronizationStatus,
      synced: false
    }
  };
  
  // Atualizar disciplinas se fornecidas
  if (planoUpdate.disciplines) {
    // Para cada disciplina atualizada
    planoUpdate.disciplines.forEach(disciplineUpdate => {
      // Encontrar a disciplina no plano existente
      const existingDisciplineIndex = planoAtualizado.disciplines.findIndex(d => d.id === disciplineUpdate.id);
      
      if (existingDisciplineIndex !== -1) {
        // Disciplina já existe no plano, atualizar
        const existingDiscipline = planoAtualizado.disciplines[existingDisciplineIndex];
        
        // Verificar se a disciplina é personalizada e obter o nome correto
        const isCustom = disciplineUpdate.id > 8;
        const userDiscipline = isCustom ? userDisciplinesMap[disciplineUpdate.id] : null;
        
        // Atualizar a disciplina preservando o nome
        planoAtualizado.disciplines[existingDisciplineIndex] = {
          ...existingDiscipline,
          priority: disciplineUpdate.priority || existingDiscipline.priority,
          // Garantir que o nome seja mantido ou atualizado corretamente
          name: existingDiscipline.name || 
                (isCustom ? userDiscipline?.nome : 
                predefinedDisciplines.find(p => p.id === disciplineUpdate.id)?.name) ||
                `Disciplina ${disciplineUpdate.id}`
        };
        
        // Atualizar assuntos se fornecidos
        if (disciplineUpdate.subjects) {
          disciplineUpdate.subjects.forEach(subjectUpdate => {
            // Encontrar o assunto na disciplina existente
            const existingSubjectIndex = existingDiscipline.subjects.findIndex(s => s.id === subjectUpdate.id);
            
            if (existingSubjectIndex !== -1) {
              // Assunto já existe, atualizar mantendo o nome
              const existingSubject = existingDiscipline.subjects[existingSubjectIndex];
              
              // Obter o nome correto do assunto personalizado, se aplicável
              const userSubject = isCustom && userDiscipline ? 
                userDiscipline.assuntos.find(a => a.id === subjectUpdate.id) : null;
              
              planoAtualizado.disciplines[existingDisciplineIndex].subjects[existingSubjectIndex] = {
                ...existingSubject,
                hours: subjectUpdate.hours !== undefined ? subjectUpdate.hours : existingSubject.hours,
                priority: subjectUpdate.priority !== undefined ? subjectUpdate.priority : existingSubject.priority,
                completed: subjectUpdate.completed !== undefined ? subjectUpdate.completed : existingSubject.completed,
                progress: subjectUpdate.progress !== undefined ? subjectUpdate.progress : existingSubject.progress,
                // Garantir que o nome seja mantido ou atualizado corretamente
                name: existingSubject.name || 
                      (userSubject ? userSubject.nome : `Assunto ${subjectUpdate.id}`)
              };
            }
          });
        }
      }
    });
  }
  
  // Salvar as alterações
  planos[indice] = planoAtualizado;
  salvarPlanosLocais(planos);
  
  // Agendar sincronização
  iniciarSincronizacao();
  
  return planoAtualizado;
}

/**
 * Exclui um plano existente
 * @param planoId ID do plano a ser excluído
 * @returns true se o plano foi excluído, false caso contrário
 */
export function excluirPlano(planoId: string): boolean {
  // Obter planos existentes
  const planos = obterPlanosLocais();
  
  // Encontrar o plano a ser excluído
  const indice = planos.findIndex(p => p.id === planoId);
  
  if (indice === -1) {
    console.error(`Plano com ID ${planoId} não encontrado`);
    return false;
  }
  
  const plano = planos[indice];
  
  // Se o plano já foi sincronizado (tem ID de backend), adicionar à fila de exclusão
  if (plano.backendId) {
    adicionarFilaExclusao(Number(plano.backendId));
  }
  
  // Remover das filas de sincronização (se estiver)
  removerFilaSincronizacao('create', planoId);
  removerFilaSincronizacao('update', planoId);
  
  // Remover o plano da lista
  planos.splice(indice, 1);
  
  // Salvar localmente
  salvarPlanosLocais(planos);
  
  // Tentar excluir do backend imediatamente se online
  if (plano.backendId) {
    isServerAvailable().then(online => {
      if (online) {
        processarFilaExclusao();
      }
    });
  }
  
  return true;
}

/**
 * Gerencia as filas de sincronização
 */

/**
 * Obtém as filas de sincronização
 */
function obterFilasSincronizacao(): SyncQueues {
  try {
    const filaCreate = localStorage.getItem(`${SYNC_QUEUE_KEY}_create`);
    const filaUpdate = localStorage.getItem(`${SYNC_QUEUE_KEY}_update`);
    const filaDelete = localStorage.getItem(DELETE_QUEUE_KEY);
    const timestampsCreate = localStorage.getItem(TIMESTAMP_KEY(`${SYNC_QUEUE_KEY}_create`));
    const timestampsUpdate = localStorage.getItem(TIMESTAMP_KEY(`${SYNC_QUEUE_KEY}_update`));
    const timestampsDelete = localStorage.getItem(TIMESTAMP_KEY(DELETE_QUEUE_KEY));
    
    return {
      create: filaCreate ? JSON.parse(filaCreate) : [],
      update: filaUpdate ? JSON.parse(filaUpdate) : [],
      delete: filaDelete ? JSON.parse(filaDelete) : [],
      timestamps: {
        ...(timestampsCreate ? JSON.parse(timestampsCreate) : {}),
        ...(timestampsUpdate ? JSON.parse(timestampsUpdate) : {}),
        ...(timestampsDelete ? JSON.parse(timestampsDelete) : {})
      }
    };
  } catch (error) {
    console.error('Erro ao obter filas de sincronização:', error);
    return {
      create: [],
      update: [],
      delete: [],
      timestamps: {}
    };
  }
}

/**
 * Salva as filas de sincronização
 */
function salvarFilasSincronizacao(filas: SyncQueues): void {
  try {
    localStorage.setItem(`${SYNC_QUEUE_KEY}_create`, JSON.stringify(filas.create));
    localStorage.setItem(`${SYNC_QUEUE_KEY}_update`, JSON.stringify(filas.update));
    localStorage.setItem(DELETE_QUEUE_KEY, JSON.stringify(filas.delete));
    
    // Separar os timestamps por tipo
    const timestampsCreate: Record<string, number> = {};
    const timestampsUpdate: Record<string, number> = {};
    const timestampsDelete: Record<string, number> = {};
    
    for (const id of filas.create) {
      if (filas.timestamps[id]) {
        timestampsCreate[id] = filas.timestamps[id];
      }
    }
    
    for (const id of filas.update) {
      if (filas.timestamps[id]) {
        timestampsUpdate[id] = filas.timestamps[id];
      }
    }
    
    for (const id of filas.delete) {
      const stringId = id.toString();
      if (filas.timestamps[stringId]) {
        timestampsDelete[stringId] = filas.timestamps[stringId];
      }
    }
    
    localStorage.setItem(TIMESTAMP_KEY(`${SYNC_QUEUE_KEY}_create`), JSON.stringify(timestampsCreate));
    localStorage.setItem(TIMESTAMP_KEY(`${SYNC_QUEUE_KEY}_update`), JSON.stringify(timestampsUpdate));
    localStorage.setItem(TIMESTAMP_KEY(DELETE_QUEUE_KEY), JSON.stringify(timestampsDelete));
  } catch (error) {
    console.error('Erro ao salvar filas de sincronização:', error);
  }
}

/**
 * Adiciona um item à fila de sincronização
 */
function adicionarFilaSincronizacao(tipo: 'create' | 'update', id: string): void {
  try {
    const filas = obterFilasSincronizacao();
    
    // Verificar se já existe na fila
    if (!filas[tipo].includes(id)) {
      filas[tipo].push(id);
      filas.timestamps[id] = Date.now();
      salvarFilasSincronizacao(filas);
    }
  } catch (error) {
    console.error(`Erro ao adicionar à fila de ${tipo}:`, error);
  }
}

/**
 * Remove um item da fila de sincronização
 */
function removerFilaSincronizacao(tipo: 'create' | 'update', id: string): void {
  try {
    const filas = obterFilasSincronizacao();
    
    // Filtrar a fila para remover o item
    filas[tipo] = filas[tipo].filter(itemId => itemId !== id);
    
    // Remover o timestamp
    delete filas.timestamps[id];
    
    salvarFilasSincronizacao(filas);
  } catch (error) {
    console.error(`Erro ao remover da fila de ${tipo}:`, error);
  }
}

/**
 * Adiciona um item à fila de exclusão
 */
function adicionarFilaExclusao(id: number): void {
  try {
    const filas = obterFilasSincronizacao();
    const stringId = id.toString();
    
    // Verificar se já existe na fila
    if (!filas.delete.includes(id)) {
      filas.delete.push(id);
      filas.timestamps[stringId] = Date.now();
      salvarFilasSincronizacao(filas);
    }
  } catch (error) {
    console.error('Erro ao adicionar à fila de exclusão:', error);
  }
}

/**
 * Processa a fila de exclusão
 */
export async function processarFilaExclusao(): Promise<ProcessingResult> {
  try {
    // Verificar conexão com o servidor
    const isOnline = await isServerAvailable();
    if (!isOnline) {
      console.log('Dispositivo offline. Não é possível processar a fila de exclusão.');
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: ['Dispositivo offline']
      };
    }
    
    const filas = obterFilasSincronizacao();
    const filaExclusao = [...filas.delete]; // Cópia da fila
    
    if (filaExclusao.length === 0) {
      console.log('Fila de exclusão vazia. Nada a processar.');
      return {
        success: true,
        processed: 0,
        failed: 0
      };
    }
    
    console.log(`Processando fila de exclusão: ${filaExclusao.length} itens`);
    
    let processados = 0;
    let falhas = 0;
    const erros: string[] = [];
    
    // Processar cada item da fila
    for (const backendId of filaExclusao) {
      try {
        const response = await apiDeleteStudyPlan(Number(backendId));
        
        if (response.success) {
          console.log(`Plano ${backendId} excluído com sucesso no backend`);
          
          // Remover da fila
          filas.delete = filas.delete.filter(id => id !== backendId);
          delete filas.timestamps[backendId.toString()];
          
          processados++;
        } else {
          console.error(`Erro ao excluir plano ${backendId} no backend:`, response.error);
          
          // Se o erro for 404 (não encontrado), podemos remover da fila
          if (response.status === 404) {
            console.log(`Plano ${backendId} não encontrado no backend. Removendo da fila.`);
            
            // Remover da fila
            filas.delete = filas.delete.filter(id => id !== backendId);
            delete filas.timestamps[backendId.toString()];
            
            processados++;
          } else {
            falhas++;
            erros.push(`Erro ao excluir plano ${backendId}: ${response.error}`);
          }
        }
      } catch (error) {
        console.error(`Erro ao processar exclusão do plano ${backendId}:`, error);
        falhas++;
        erros.push(`Erro ao excluir plano ${backendId}: ${error}`);
      }
    }
    
    // Salvar as filas atualizadas
    salvarFilasSincronizacao(filas);
    
    console.log(`Processamento da fila de exclusão concluído: ${processados} processados, ${falhas} falhas`);
    
    return {
      success: falhas === 0,
      processed: processados,
      failed: falhas,
      errors: erros.length > 0 ? erros : undefined
    };
  } catch (error) {
    console.error('Erro ao processar fila de exclusão:', error);
    return {
      success: false,
      processed: 0,
      failed: 1,
      errors: [`Erro ao processar fila de exclusão: ${error}`]
    };
  }
}

/**
 * Sincroniza os planos locais com o backend
 */
export async function sincronizarPlanos(): Promise<SyncResult> {
  if (_syncInProgress) {
    return { 
      success: false, 
      errors: ['Sincronização já em andamento'],
      plansCreated: 0,
      plansUpdated: 0,
      plansDeleted: 0
    };
  }
  
  _syncInProgress = true;
  
  try {
    // Verificar conexão com o servidor
    const isOnline = await isServerAvailable();
    if (!isOnline) {
      console.log('Dispositivo offline. Não é possível sincronizar planos.');
      _syncInProgress = false;
      return {
        success: false,
        errors: ['Dispositivo offline'],
        plansCreated: 0,
        plansUpdated: 0,
        plansDeleted: 0
      };
    }
    
    console.log('Iniciando sincronização de planos...');
    
    // Obter planos do backend
    const responsePlanos = await apiGetStudyPlans();
    
    if (!responsePlanos.success) {
      console.error('Erro ao obter planos do backend:', responsePlanos.error);
      _syncInProgress = false;
      return {
        success: false,
        errors: [`Erro ao obter planos do backend: ${responsePlanos.error}`],
        plansCreated: 0,
        plansUpdated: 0,
        plansDeleted: 0
      };
    }
    
    const planosBackend = responsePlanos.plans || [];
    console.log(`${planosBackend.length} planos obtidos do backend`);
    
    // Obter planos locais
    let planosLocais = obterPlanosLocais();
    console.log(`${planosLocais.length} planos locais encontrados`);
    
    // Obter filas de sincronização
    const filas = obterFilasSincronizacao();
    
    // Resultados da sincronização
    let criadosNoBackend = 0;
    let atualizadosNoBackend = 0;
    let atualizadosLocalmente = 0;
    let removidosDoBackend = 0;
    const erros: string[] = [];
    
    // 1. Processar fila de criação
    for (const localId of filas.create) {
      try {
        // Encontrar o plano local
        const planoLocal = planosLocais.find(p => p.id === localId);
        
        if (!planoLocal) {
          console.log(`Plano ${localId} não encontrado localmente. Removendo da fila.`);
          
          // Remover da fila
          removerFilaSincronizacao('create', localId);
          continue;
        }
        
        // Converter para formato da API
        const planoAPI = converterPlanoParaAPI(planoLocal);
        
        // Enviar para o backend
        const response = await apiCreateStudyPlan(planoAPI);
        
        if (response.success && response.planId) {
          console.log(`Plano ${localId} criado no backend com ID ${response.planId}`);
          
          // Atualizar o plano local com o ID do backend
          planoLocal.backendId = response.planId;
          planoLocal.synchronizationStatus = {
            synced: true,
            lastSyncedAt: new Date().toISOString(),
            syncFailed: false
          };
          
          // Remover da fila de criação
          removerFilaSincronizacao('create', localId);
          
          criadosNoBackend++;
        } else {
          console.error(`Erro ao criar plano ${localId} no backend:`, response.error);
          
          // Marcar como falha de sincronização
          planoLocal.synchronizationStatus = {
            synced: false,
            lastSyncedAt: planoLocal.synchronizationStatus.lastSyncedAt,
            syncFailed: true,
            errorMessage: response.error
          };
          
          erros.push(`Erro ao criar plano ${localId}: ${response.error}`);
        }
      } catch (error) {
        console.error(`Erro ao processar criação do plano ${localId}:`, error);
        
        const planoLocal = planosLocais.find(p => p.id === localId);
        if (planoLocal) {
          planoLocal.synchronizationStatus = {
            synced: false,
            lastSyncedAt: planoLocal.synchronizationStatus.lastSyncedAt,
            syncFailed: true,
            errorMessage: String(error)
          };
        }
        
        erros.push(`Erro ao criar plano ${localId}: ${error}`);
      }
    }
    
    // 2. Processar fila de atualização
    for (const localId of filas.update) {
      try {
        // Encontrar o plano local
        const planoLocal = planosLocais.find(p => p.id === localId);
        
        if (!planoLocal) {
          console.log(`Plano ${localId} não encontrado localmente. Removendo da fila.`);
          
          // Remover da fila
          removerFilaSincronizacao('update', localId);
          continue;
        }
        
        // Verificar se o plano tem ID de backend
        if (!planoLocal.backendId) {
          console.log(`Plano ${localId} não tem ID de backend. Movendo para fila de criação.`);
          
          // Mover para fila de criação
          removerFilaSincronizacao('update', localId);
          adicionarFilaSincronizacao('create', localId);
          continue;
        }
        
        // Converter para formato da API
        const planoAPI = converterPlanoParaAPI(planoLocal);
        
        // Enviar para o backend
        const response = await apiUpdateStudyPlan({
          ...planoAPI,
          id: localId,
          backendId: planoLocal.backendId
        });
        
        if (response.success) {
          console.log(`Plano ${localId} (backend: ${planoLocal.backendId}) atualizado com sucesso`);
          
          // Atualizar status de sincronização
          planoLocal.synchronizationStatus = {
            synced: true,
            lastSyncedAt: new Date().toISOString(),
            syncFailed: false
          };
          
          // Remover da fila de atualização
          removerFilaSincronizacao('update', localId);
          
          atualizadosNoBackend++;
        } else {
          console.error(`Erro ao atualizar plano ${localId} no backend:`, response.error);
          
          // Marcar como falha de sincronização
          planoLocal.synchronizationStatus = {
            synced: false,
            lastSyncedAt: planoLocal.synchronizationStatus.lastSyncedAt,
            syncFailed: true,
            errorMessage: response.error
          };
          
          erros.push(`Erro ao atualizar plano ${localId}: ${response.error}`);
        }
      } catch (error) {
        console.error(`Erro ao processar atualização do plano ${localId}:`, error);
        
        const planoLocal = planosLocais.find(p => p.id === localId);
        if (planoLocal) {
          planoLocal.synchronizationStatus = {
            synced: false,
            lastSyncedAt: planoLocal.synchronizationStatus.lastSyncedAt,
            syncFailed: true,
            errorMessage: String(error)
          };
        }
        
        erros.push(`Erro ao atualizar plano ${localId}: ${error}`);
      }
    }
    
    // 3. Verificar planos do backend que não existem localmente ou estão desatualizados
    for (const planoBackend of planosBackend) {
      // Verificar se o plano já existe localmente pelo ID do backend
      const planoLocal = planosLocais.find(p => p.backendId === planoBackend.Id);
      
      if (!planoLocal) {
        // O plano não existe localmente
        console.log(`Plano com backend ID ${planoBackend.Id} não encontrado localmente. Obtendo detalhes...`);
        
        try {
          // Obter detalhes do plano
          const response = await apiGetStudyPlanDetails(planoBackend.Id);
          
          if (response.success && response.plan) {
            // Converter formato do backend para local
            const novoPlanoLocal = converterPlanoDaAPI(response.plan);
            
            // Adicionar à lista local
            planosLocais.push(novoPlanoLocal);
            
            atualizadosLocalmente++;
            console.log(`Plano com backend ID ${planoBackend.Id} adicionado localmente`);
          } else {
            console.error(`Erro ao obter detalhes do plano ${planoBackend.Id}:`, response.error);
            erros.push(`Erro ao obter detalhes do plano ${planoBackend.Id}: ${response.error}`);
          }
        } catch (error) {
          console.error(`Erro ao processar detalhes do plano ${planoBackend.Id}:`, error);
          erros.push(`Erro ao obter detalhes do plano ${planoBackend.Id}: ${error}`);
        }
      } else {
        // O plano existe localmente, verificar se precisa ser atualizado
        // Comparar datas de atualização
        const dataBackend = new Date(planoBackend.UpdatedAt);
        const dataLocal = new Date(planoLocal.updatedAt);
        
        // Se o plano no backend é mais recente e não está na fila de atualização
        if (dataBackend > dataLocal && !filas.update.includes(planoLocal.id)) {
          console.log(`Plano com backend ID ${planoBackend.Id} desatualizado localmente. Obtendo detalhes...`);
          
          try {
            // Obter detalhes do plano
            const response = await apiGetStudyPlanDetails(planoBackend.Id);
            
            if (response.success && response.plan) {
              // Converter formato do backend para local
              const planoAtualizado = converterPlanoDaAPI(response.plan);
              
              // Preservar o ID local
              planoAtualizado.id = planoLocal.id;
              
              // Atualizar o plano na lista
              const indice = planosLocais.findIndex(p => p.id === planoLocal.id);
              if (indice !== -1) {
                planosLocais[indice] = planoAtualizado;
              }
              
              atualizadosLocalmente++;
              console.log(`Plano com backend ID ${planoBackend.Id} atualizado localmente`);
            } else {
              console.error(`Erro ao obter detalhes do plano ${planoBackend.Id}:`, response.error);
              erros.push(`Erro ao obter detalhes do plano ${planoBackend.Id}: ${response.error}`);
            }
          } catch (error) {
            console.error(`Erro ao processar detalhes do plano ${planoBackend.Id}:`, error);
            erros.push(`Erro ao obter detalhes do plano ${planoBackend.Id}: ${error}`);
          }
        }
      }
    }
    
    // Salvar planos locais atualizados
    salvarPlanosLocais(planosLocais);
    
    // Salvar filas de sincronização atualizadas
    salvarFilasSincronizacao(filas);
    
    console.log(`Sincronização concluída: ${criadosNoBackend} criados, ${atualizadosNoBackend} atualizados, ${atualizadosLocalmente} atualizados localmente, ${removidosDoBackend} removidos`);
    
    _syncInProgress = false;
    
    return {
      success: erros.length === 0,
      errors: erros.length ? erros : undefined,
      plansCreated: criadosNoBackend,
      plansUpdated: atualizadosNoBackend,
      plansDeleted: removidosDoBackend
    };
  } catch (error) {
    console.error('Erro durante sincronização:', error);
    _syncInProgress = false;
    
    return {
      success: false,
      errors: [`Erro durante sincronização: ${error}`],
      plansCreated: 0,
      plansUpdated: 0,
      plansDeleted: 0
    };
  }
}

/**
 * Converte um plano do formato local para o formato da API
 */
export function converterPlanoParaAPI(plano: StudyPlan): StudyPlanCreate {
  try {
    return {
      name: plano.name,
      description: plano.description,
      startDate: plano.startDate,
      endDate: plano.endDate,
      status: plano.status,
      disciplines: plano.disciplines.map(d => ({
        id: d.id,
        priority: d.priority,
        subjects: d.subjects.map(s => ({
          id: s.id,
          hours: s.hours,
          priority: s.priority
        }))
      }))
    };
  } catch (error) {
    console.error('Erro ao converter plano para formato da API:', error);
    
    // Retornar um objeto mínimo válido para evitar falha completa
    return {
      name: plano.name || 'Plano sem nome',
      disciplines: []
    };
  }
}

/**
 * Converte um plano do formato da API para o formato local
 */
export function converterPlanoDaAPI(planoAPI: any): StudyPlan {
  try {
    // Gerar um ID local
    const id = uuidv4();
    
    // Construir o plano local
    return {
      id,
      backendId: planoAPI.Id,
      name: planoAPI.Name,
      description: planoAPI.Description || '',
      startDate: planoAPI.StartDate,
      endDate: planoAPI.EndDate,
      status: planoAPI.Status as PlanStatus,
      disciplines: planoAPI.disciplines?.map((d: any) => ({
        id: d.Id,
        name: d.Name || '',
        priority: d.Priority || 'média',
        subjects: d.subjects?.map((s: any) => ({
          id: s.Id,
          name: s.Name || '',
          hours: s.Hours || 1,
          priority: s.Priority || 'média',
          completed: s.Completed || false,
          progress: s.Progress || 0
        })) || []
      })) || [],
      schedule: planoAPI.schedule ? {
        sessions: planoAPI.schedule.sessions?.map((s: any) => ({
          id: s.Id || uuidv4(),
          disciplineId: s.DisciplineId,
          subjectId: s.SubjectId,
          date: s.date,
          duration: s.duration,
          completed: s.completed || false,
          actualDuration: s.actualDuration,
          notes: s.notes
        })) || []
      } : undefined,
      synchronizationStatus: {
        synced: true,
        lastSyncedAt: new Date().toISOString(),
        syncFailed: false
      },
      createdAt: planoAPI.CreatedAt,
      updatedAt: planoAPI.UpdatedAt
    };
  } catch (error) {
    console.error('Erro ao converter plano da API para formato local:', error);
    
    // Retornar um plano mínimo válido
    return {
      id: uuidv4(),
      backendId: planoAPI.Id,
      name: planoAPI.Name || 'Plano sem nome',
      description: '',
      status: 'ativo',
      disciplines: [],
      synchronizationStatus: {
        synced: false,
        syncFailed: true,
        errorMessage: `Erro na conversão: ${error}`
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

/**
 * Valida um plano de estudos
 */
export function validarPlano(plano: StudyPlan): { valido: boolean, mensagem?: string } {
  // Verificar campos obrigatórios
  if (!plano.name || plano.name.trim() === '') {
    return { valido: false, mensagem: 'Nome do plano é obrigatório' };
  }
  
  // Verificar se há pelo menos uma disciplina
  if (!plano.disciplines || plano.disciplines.length === 0) {
    return { valido: false, mensagem: 'É necessário incluir pelo menos uma disciplina no plano' };
  }
  
  // Verificar se cada disciplina tem ID
  for (const disciplina of plano.disciplines) {
    if (!disciplina.id) {
      return { valido: false, mensagem: 'Todas as disciplinas devem ter um ID válido' };
    }
  }
  
  return { valido: true };
}

/**
 * Adiciona uma nova sessão de estudo a um plano
 * @param sessaoData Dados da nova sessão de estudo
 * @returns A sessão criada ou null em caso de erro
 */
export const adicionarSessaoEstudo = async (sessaoData: StudySessionCreate): Promise<StudySession | null> => {
  try {
    const planosLocais = obterPlanosLocais();
    const planoIndex = planosLocais.findIndex(p => p.id === sessaoData.studyPlanId);
    
    if (planoIndex === -1) {
      throw new Error(`Plano de estudo com ID ${sessaoData.studyPlanId} não encontrado`);
    }
    
    // Criar nova sessão
    const novaSessao: StudySession = {
      id: generateUUID(),
      ...sessaoData,
      completed: sessaoData.completed || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: {
        synced: false,
        pendingSync: true,
        lastSyncDate: null
      }
    };
    
    // Adicionar sessão ao plano
    if (!planosLocais[planoIndex].sessions) {
      planosLocais[planoIndex].sessions = [];
    }
    
    planosLocais[planoIndex].sessions?.push(novaSessao);
    
    // Atualizar status de sincronização do plano
    planosLocais[planoIndex].synchronizationStatus = {
      ...planosLocais[planoIndex].synchronizationStatus,
      pendingSync: true
    };
    
    // Salvar planos atualizados
    salvarPlanosLocais(planosLocais);
    
    // Agendar sincronização
    iniciarSincronizacao();
    
    return novaSessao;
  } catch (error) {
    console.error('Erro ao adicionar sessão de estudo:', error);
    return null;
  }
};

/**
 * Atualiza uma sessão de estudo existente
 * @param sessaoData Dados da sessão a ser atualizada
 * @returns A sessão atualizada ou null em caso de erro
 */
export const atualizarSessaoEstudo = async (sessaoData: StudySessionUpdate): Promise<StudySession | null> => {
  try {
    const planosLocais = obterPlanosLocais();
    let sessaoAtualizada: StudySession | null = null;
    
    // Percorrer os planos para encontrar a sessão
    for (let i = 0; i < planosLocais.length; i++) {
      const plano = planosLocais[i];
      
      if (plano.sessions && plano.sessions.length > 0) {
        const sessaoIndex = plano.sessions.findIndex(s => s.id === sessaoData.id);
        
        if (sessaoIndex !== -1) {
          // Atualizar sessão
          const sessao = plano.sessions[sessaoIndex];
          
          planosLocais[i].sessions![sessaoIndex] = {
            ...sessao,
            ...sessaoData,
            updatedAt: new Date().toISOString(),
            syncStatus: {
              ...sessao.syncStatus,
              pendingSync: true,
              synced: false
            }
          };
          
          // Atualizar status de sincronização do plano
          planosLocais[i].synchronizationStatus = {
            ...planosLocais[i].synchronizationStatus,
            pendingSync: true
          };
          
          sessaoAtualizada = planosLocais[i].sessions![sessaoIndex];
          break;
        }
      }
    }
    
    if (!sessaoAtualizada) {
      throw new Error(`Sessão de estudo com ID ${sessaoData.id} não encontrada`);
    }
    
    // Salvar planos atualizados
    salvarPlanosLocais(planosLocais);
    
    // Agendar sincronização
    iniciarSincronizacao();
    
    return sessaoAtualizada;
  } catch (error) {
    console.error('Erro ao atualizar sessão de estudo:', error);
    return null;
  }
};

/**
 * Exclui uma sessão de estudo
 * @param sessaoId ID da sessão a ser excluída
 * @returns true se a exclusão foi bem-sucedida, false caso contrário
 */
export const excluirSessaoEstudo = async (sessaoId: string): Promise<boolean> => {
  try {
    const planosLocais = obterPlanosLocais();
    let excluida = false;
    
    // Percorrer os planos para encontrar a sessão
    for (let i = 0; i < planosLocais.length; i++) {
      const plano = planosLocais[i];
      
      if (plano.sessions && plano.sessions.length > 0) {
        const sessaoIndex = plano.sessions.findIndex(s => s.id === sessaoId);
        
        if (sessaoIndex !== -1) {
          // Remover sessão
          plano.sessions!.splice(sessaoIndex, 1);
          
          // Atualizar status de sincronização do plano
          plano.synchronizationStatus = {
            ...plano.synchronizationStatus,
            pendingSync: true
          };
          
          excluida = true;
          break;
        }
      }
    }
    
    if (!excluida) {
      throw new Error(`Sessão de estudo com ID ${sessaoId} não encontrada`);
    }
    
    // Salvar planos atualizados
    salvarPlanosLocais(planosLocais);
    
    // Agendar sincronização
    iniciarSincronizacao();
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir sessão de estudo:', error);
    return false;
  }
};

/**
 * Obtém uma sessão de estudo específica pelo ID
 * @param sessaoId ID da sessão
 * @returns A sessão encontrada ou null
 */
export const obterSessaoEstudo = (sessaoId: string): StudySession | null => {
  try {
    const planosLocais = obterPlanosLocais();
    
    // Procurar em todos os planos
    for (const plano of planosLocais) {
      if (plano.sessions) {
        const sessao = plano.sessions.find(s => s.id === sessaoId);
        if (sessao) {
          return sessao;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao obter sessão de estudo:', error);
    return null;
  }
};

/**
 * Atualiza o status de conclusão de um assunto específico
 * @param planoId ID do plano de estudo
 * @param disciplinaId ID da disciplina
 * @param assuntoId ID do assunto
 * @param concluido Status de conclusão (true/false)
 * @returns O plano atualizado ou null em caso de erro
 */
export const atualizarStatusAssunto = (
  planoId: string,
  disciplinaId: number,
  assuntoId: number,
  concluido: boolean
): StudyPlan | null => {
  try {
    const planosLocais = obterPlanosLocais();
    const planoIndex = planosLocais.findIndex(p => p.id === planoId);
    
    if (planoIndex === -1) {
      throw new Error(`Plano de estudo com ID ${planoId} não encontrado`);
    }
    
    const plano = planosLocais[planoIndex];
    const disciplinaIndex = plano.disciplines.findIndex(d => d.id === disciplinaId);
    
    if (disciplinaIndex === -1) {
      throw new Error(`Disciplina com ID ${disciplinaId} não encontrada no plano`);
    }
    
    const disciplina = plano.disciplines[disciplinaIndex];
    const assuntoIndex = disciplina.subjects.findIndex(s => s.id === assuntoId);
    
    if (assuntoIndex === -1) {
      throw new Error(`Assunto com ID ${assuntoId} não encontrado na disciplina`);
    }
    
    // Atualizar status do assunto
    disciplina.subjects[assuntoIndex].completed = concluido;
    
    // Atualizar progresso da disciplina
    atualizarProgressoDisciplina(plano, disciplinaIndex);
    
    // Atualizar status de sincronização do plano
    plano.synchronizationStatus = {
      ...plano.synchronizationStatus,
      synced: false,
      pendingSync: true
    };
    
    // Salvar planos atualizados
    salvarPlanosLocais(planosLocais);
    
    // Adicionar à fila de sincronização
    adicionarFilaSincronizacao('update', planoId);
    
    // Agendar sincronização
    iniciarSincronizacao();
    
    return plano;
  } catch (error) {
    console.error('Erro ao atualizar status do assunto:', error);
    return null;
  }
};

/**
 * Atualiza o progresso de uma disciplina com base nos assuntos concluídos
 * @param plano Plano de estudo a ser atualizado
 * @param disciplinaIndex Índice da disciplina no array
 */
function atualizarProgressoDisciplina(plano: StudyPlan, disciplinaIndex: number): void {
  try {
    const disciplina = plano.disciplines[disciplinaIndex];
    const totalAssuntos = disciplina.subjects.length;
    
    if (totalAssuntos === 0) {
      disciplina.progress = 0;
      return;
    }
    
    const assuntosConcluidos = disciplina.subjects.filter(s => s.completed).length;
    const progresso = Math.round((assuntosConcluidos / totalAssuntos) * 100);
    
    // Atualizar progresso da disciplina
    disciplina.progress = progresso;
    
    // Marcar disciplina como concluída se todos os assuntos estiverem concluídos
    disciplina.completed = progresso === 100;
    
    // Atualizar timestamp
    plano.updatedAt = new Date().toISOString();
  } catch (error) {
    console.error('Erro ao atualizar progresso da disciplina:', error);
  }
} 