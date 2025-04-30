import { StudyMetrics, StudySession, Task, Note } from './types/dashboard';

// Interface para resposta da API
interface ApiResponse<T> {
  success: boolean;
  error?: string;
  [key: string]: any; // Para outros campos de resposta
}

// Função genérica para fazer requisições à API
async function fetchApi<T>(
  url: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Garantir que estamos usando a URL correta para API
  // As URLs das APIs devem começar com /api/
  let fullUrl = url;
  
  if (!url.startsWith('http')) {
    // Verificar se é uma URL de API e corrigir se necessário
    if (!url.startsWith('/api') && !url.startsWith('/')) {
      fullUrl = `/api/${url}`;
    } else if (!url.startsWith('/api') && url.startsWith('/')) {
      fullUrl = `/api${url}`;
    }
    
    // Adicionar o origin para ter URL completa
    fullUrl = `${window.location.origin}${fullUrl}`;
  }
  
  console.log(`Fazendo requisição para: ${fullUrl}`);
  
  // Verificar se o usuário está offline antes de tentar fazer a requisição
  if (!navigator.onLine) {
    console.log(`Usuário está offline. Não foi possível acessar ${fullUrl}`);
    return {
      success: false,
      error: 'Você está offline. Usando dados armazenados localmente.',
      offline: true
    };
  }

  try {
    // Adicionar timeout para evitar que a requisição fique pendente por muito tempo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout (aumentado)
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal
    });

    // Limpar o timeout se a requisição foi concluída
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.warn(`Resposta não-OK: ${response.status} ${response.statusText}`);
      return {
        success: false,
        error: data.error || `Erro ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      ...data,
    };
  } catch (error) {
    // Verificar se é um erro de abortar (timeout)
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`Timeout ao acessar ${fullUrl}`);
      
      // Não disparar evento offline automaticamente, apenas retornar o erro
      // Isso pode estar causando falsos positivos de detecção offline
      return {
        success: false,
        error: 'Tempo limite de conexão excedido. Usando dados locais.',
        timeout: true
      };
    }
    
    // Verificar se é um erro de rede (failed to fetch)
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network'))) {
      console.error(`Erro de rede ao acessar ${fullUrl}: ${error.message}`);
      
      return {
        success: false,
        error: 'Não foi possível conectar ao servidor. Usando dados armazenados localmente.',
        networkError: true
      };
    }
    
    // Outro tipo de erro
    console.error(`Erro ao acessar ${fullUrl}:`, error);
    return {
      success: false,
      error: 'Erro ao se comunicar com o servidor',
    };
  }
}

// Função para salvar métricas recentes no localStorage
const saveLocalMetrics = (metrics: StudyMetrics) => {
  try {
    localStorage.setItem('@medjourney:recent_metrics', JSON.stringify({
      metrics,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Erro ao salvar métricas localmente:', error);
  }
};

// Função para obter métricas do localStorage
const getLocalMetrics = (): { metrics: StudyMetrics | null, timestamp: string | null } => {
  try {
    const data = localStorage.getItem('@medjourney:recent_metrics');
    if (!data) return { metrics: null, timestamp: null };
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao obter métricas locais:', error);
    return { metrics: null, timestamp: null };
  }
};

// Função para inicializar métricas padrão se não existirem
const initializeDefaultMetrics = (): StudyMetrics => {
  try {
    // Verificar se já existem métricas salvas
    const existingData = localStorage.getItem('@medjourney:recent_metrics');
    if (existingData) {
      const parsed = JSON.parse(existingData);
      return parsed.metrics;
    }
    
      console.log('Inicializando métricas padrão');
      // Criar métricas padrão
      const defaultMetrics: StudyMetrics = {
        hoursToday: 0,
        hoursThisWeek: 0,
        hoursChange: 0,
        completedTasks: 0,
        totalTasksCompleted: 0,
        totalTasksPending: 0,
        tasksChange: 0,
        streak: 0,
        streakChange: 0,
        focusScore: 85, // Valor padrão
        efficiencyRate: 78 // Valor padrão
      };

      // Salvar métricas padrão
      saveLocalMetrics(defaultMetrics);
    return defaultMetrics;
  } catch (error) {
    console.error('Erro ao inicializar métricas padrão:', error);
    // Retornar objeto padrão mesmo em caso de erro
    return {
      hoursToday: 0,
      hoursThisWeek: 0,
      hoursChange: 0,
      completedTasks: 0,
      totalTasksCompleted: 0,
      totalTasksPending: 0,
      tasksChange: 0,
      streak: 0,
      streakChange: 0,
      focusScore: 85,
      efficiencyRate: 78
    };
  }
};

// Inicializar métricas padrão quando estamos no navegador
if (typeof window !== 'undefined') {
  initializeDefaultMetrics();
}

// Função para salvar sessões localmente
const saveLocalSessions = (sessions: StudySession[]) => {
  try {
    localStorage.setItem('@medjourney:study_sessions', JSON.stringify(sessions));
  } catch (error) {
    console.error('Erro ao salvar sessões localmente:', error);
  }
};

// Função para obter sessões locais
const getLocalSessions = (): StudySession[] => {
  try {
    const data = localStorage.getItem('@medjourney:study_sessions');
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao obter sessões locais:', error);
    return [];
  }
};

// Função para verificar se o servidor está acessível
async function isServerAvailable(): Promise<boolean> {
  try {
    // Usar o nosso novo endpoint de health check
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // timeout mais curto
    
    const response = await fetch(`${window.location.origin}/api/health`, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('Servidor não está acessível:', error);
    return false;
  }
}

// ==============================
// Métricas de estudo
// ==============================

export async function getStudyMetrics(): Promise<ApiResponse<StudyMetrics>> {
  try {
    // Apenas verificar se estamos offline pelo navegador
    if (!navigator.onLine) {
      console.log('Modo offline detectado. Priorizando dados locais.');
      // Obter métricas locais
      const localData = getLocalMetrics();
      
      // Se temos dados locais, usar eles imediatamente
      if (localData.metrics) {
        console.log('Usando métricas armazenadas localmente');
        return {
          success: true,
          metrics: localData.metrics,
          fromCache: true,
          offline: true,
          timestamp: localData.timestamp
        };
      }
    }
    
    // Se chegamos aqui, tentar obter dados do servidor
    console.log('Tentando obter métricas do servidor...');
    
    try {
      const response = await fetchApi<StudyMetrics>('/api/metrics');
      
      // Se a resposta foi bem-sucedida, salvar métricas localmente e retornar
      if (response.success && response.metrics) {
        saveLocalMetrics(response.metrics);
        return response;
      }
      
      // Se a requisição falhou, verificar dados locais
      console.log('Falha ao obter métricas do servidor. Verificando dados locais...');
      const localData = getLocalMetrics();
      
      if (localData.metrics) {
        return {
          success: true,
          metrics: localData.metrics,
          fromCache: true,
          timestamp: localData.timestamp
        };
      }
      
      // Se não temos dados locais nem do servidor, tentar recalcular
      console.log('Tentando recalcular métricas com dados locais...');
      const recalculatedMetrics = await recalcularMetricas();
      
      if (recalculatedMetrics.success && recalculatedMetrics.metrics) {
        return {
          ...recalculatedMetrics,
          fromCache: true
        };
      }
      
      // Se ainda não temos métricas, usar valores padrão
      console.log('Usando métricas padrão');
      const defaultMetrics = initializeDefaultMetrics();
      
      return {
        success: true,
        metrics: defaultMetrics,
        fromDefault: true
      };
    } catch (fetchError) {
      console.error('Erro na requisição:', fetchError);
      
      // Verificar dados locais
      const localData = getLocalMetrics();
      
      if (localData.metrics) {
        return {
          success: true,
          metrics: localData.metrics,
          fromCache: true,
          timestamp: localData.timestamp
        };
      }
    
      // Se não temos dados locais, usar valores padrão
      const defaultMetrics = initializeDefaultMetrics();
      
      return {
        success: true,
        metrics: defaultMetrics,
        fromDefault: true
      };
    }
  } catch (error) {
    console.error('Erro ao obter métricas de estudo:', error);
    
    // Em qualquer caso de erro, tentar usar métricas locais
    const localData = getLocalMetrics();
    
    if (localData.metrics) {
      return {
        success: true,
        metrics: localData.metrics,
        fromCache: true,
        timestamp: localData.timestamp
      };
    }
    
    // Se não temos dados locais, usar valores padrão
    const defaultMetrics = initializeDefaultMetrics();
    
    return {
      success: true,
      metrics: defaultMetrics,
      fromDefault: true
    };
  }
}

// ==============================
// Sessões de estudo
// ==============================

export async function getStudySessions(
  params: { 
    completed?: boolean;
    upcoming?: boolean;
    limit?: number;
  } = {}
): Promise<ApiResponse<StudySession[]>> {
  try {
    // Construir URL com parâmetros de consulta
    const url = new URL('/api/study-sessions', window.location.origin);
    
    // Adicionar parâmetros à URL
    if (params.completed !== undefined) {
      url.searchParams.append('completed', params.completed.toString());
    }
    
    if (params.upcoming !== undefined) {
      url.searchParams.append('upcoming', params.upcoming.toString());
    }
    
    if (params.limit !== undefined) {
      url.searchParams.append('limit', params.limit.toString());
    }
    
    const response = await fetchApi<StudySession[]>(url.toString());
    
    // Se a resposta foi bem-sucedida, salvar as sessões localmente
    if (response.success && response.sessions) {
      // Atualizar apenas o armazenamento local se não estamos carregando um subconjunto específico de sessões
      if (params.completed === undefined && params.upcoming === undefined) {
        saveLocalSessions(response.sessions);
      }
    } 
    // Se offline ou falhou, usar dados locais
    else if (response.offline || !response.success) {
      console.log('Usando sessões de estudo armazenadas localmente');
      
      let localSessions = getLocalSessions();
      
      // Aplicar filtros às sessões locais
      if (params.completed !== undefined) {
        localSessions = localSessions.filter(s => s.completed === params.completed);
      }
      
      if (params.upcoming) {
        const now = new Date();
        localSessions = localSessions.filter(s => {
          const sessionDate = new Date(s.scheduledDate);
          return !s.completed && sessionDate >= now;
        });
      }
      
      // Aplicar limite se necessário
      if (params.limit !== undefined && params.limit > 0) {
        localSessions = localSessions.slice(0, params.limit);
      }
      
      return {
        success: true,
        sessions: localSessions,
        fromCache: true
      };
    }
    
    return response;
  } catch (error) {
    console.error('Erro ao buscar sessões de estudo:', error);
    
    // Em caso de erro, tentar usar dados locais
    try {
      let localSessions = getLocalSessions();
      
      // Aplicar filtros
      if (params.completed !== undefined) {
        localSessions = localSessions.filter(s => s.completed === params.completed);
      }
      
      if (params.upcoming) {
        const now = new Date();
        localSessions = localSessions.filter(s => {
          const sessionDate = new Date(s.scheduledDate);
          return !s.completed && sessionDate >= now;
        });
      }
      
      // Aplicar limite
      if (params.limit !== undefined && params.limit > 0) {
        localSessions = localSessions.slice(0, params.limit);
      }
      
      return {
        success: true,
        sessions: localSessions,
        fromCache: true
      };
    } catch (cacheError) {
      console.error('Erro ao acessar dados em cache:', cacheError);
      return {
        success: false,
        error: 'Erro ao obter sessões de estudo'
      };
    }
  }
}

export async function createStudySession(
  session: {
    title: string;
    disciplineName: string;
    scheduledDate: string; // ISO 8601 format
    duration: number; // minutos
    notes?: string;
  }
): Promise<ApiResponse<StudySession>> {
  return fetchApi<StudySession>('/api/study-sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  });
}

export async function completeStudySession(
  sessionId: number,
  data: {
    actualDuration: number;
    notes?: string;
  }
): Promise<ApiResponse<StudySession>> {
  try {
    const response = await fetchApi<StudySession>(`/api/study-sessions/${sessionId}/complete`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    // Se a resposta foi bem-sucedida, atualizar dados locais
    if (response.success && response.session) {
      // Atualizar a sessão nos dados locais
      const localSessions = getLocalSessions();
      
      // Verificar se a sessão já existe e atualizar
      const sessionIndex = localSessions.findIndex(s => s.id === response.session.id);
      
      if (sessionIndex >= 0) {
        localSessions[sessionIndex] = response.session;
      } else {
        localSessions.push(response.session);
      }
      
      // Salvar as sessões atualizadas
      saveLocalSessions(localSessions);
      
      // Recalcular métricas com base nos dados atualizados
      console.log('Recalculando métricas após conclusão da sessão');
      await recalcularMetricas();
    }
    
    return response;
  } catch (error) {
    console.error('Erro ao completar sessão de estudo:', error);
    
    // Tratar sessões temporárias de maneira especial quando offline
    if (sessionId === 0 && navigator.onLine === false) {
      const tempSession: StudySession = {
        id: `temp_${Date.now()}`,
        title: "Sessão rápida",
        disciplineName: "Disciplina",
        scheduledDate: new Date(),
        duration: data.actualDuration,
        completed: true,
        actualDuration: data.actualDuration,
        notes: data.notes
      };
      
      // Adicionar a sessão temporária aos dados locais
      const localSessions = getLocalSessions();
      localSessions.push(tempSession);
      saveLocalSessions(localSessions);
      
      // Recalcular métricas com base nas sessões atualizadas
      console.log('Recalculando métricas após conclusão da sessão temporária');
      await recalcularMetricas();
      
      return {
        success: true,
        session: tempSession,
        offline: true
      };
    }
    
    return {
      success: false,
      error: 'Erro ao completar sessão de estudo'
    };
  }
}

// ==============================
// Disciplinas
// ==============================

export async function getDisciplines(onlyUser: boolean = false): Promise<ApiResponse<any>> {
  // Construir URL com parâmetros de consulta
  const url = new URL('/api/disciplines', window.location.origin);
  
  // Adicionar parâmetro de filtro para apenas disciplinas do usuário
  if (onlyUser) {
    url.searchParams.append('onlyUser', 'true');
  }
  
  return fetchApi(url.toString());
}

export async function getDisciplineSubjects(disciplineId: number): Promise<ApiResponse<any>> {
  return fetchApi(`/api/disciplines/${disciplineId}/subjects`);
}

export async function createDiscipline(
  discipline: {
    name: string;
    description?: string;
    theme?: string;
  }
): Promise<ApiResponse<any>> {
  // Modificar o nome para adicionar um prefixo que identifica disciplinas criadas pelo usuário
  // Isso é útil para filtrar facilmente as disciplinas do usuário vs as disciplinas mockadas
  const modifiedDiscipline = {
    ...discipline,
    name: `User:${discipline.name}`
  };
  
  return fetchApi('/api/disciplines', {
    method: 'POST',
    body: JSON.stringify(modifiedDiscipline),
  });
}

// Função para criar um tema/assunto em uma disciplina
export async function createSubject(
  disciplineId: number,
  subject: {
    name: string;
    difficulty: 'baixa' | 'média' | 'alta';
    importance: 'baixa' | 'média' | 'alta';
    estimatedHours: number;
    description?: string;
  }
): Promise<ApiResponse<any>> {
  return fetchApi(`/api/disciplines/${disciplineId}/subjects`, {
    method: 'POST',
    body: JSON.stringify(subject),
  });
}

// Função para atualizar um tema/assunto em uma disciplina
export async function updateSubject(
  disciplineId: number,
  subjectId: number,
  subject: {
    name?: string;
    difficulty?: 'baixa' | 'média' | 'alta';
    importance?: 'baixa' | 'média' | 'alta';
    estimatedHours?: number;
    description?: string;
  }
): Promise<ApiResponse<any>> {
  return fetchApi(`/api/disciplines/${disciplineId}/subjects/${subjectId}`, {
    method: 'PUT',
    body: JSON.stringify(subject),
  });
}

// Função para obter o ID da disciplina pelo nome
export async function getDisciplineIdByName(name: string): Promise<number | null> {
  try {
    const response = await getDisciplines(true);
    
    if (response.success && response.disciplines) {
      // Encontrar a disciplina pelo nome (ignorando o prefixo User:)
      const discipline = response.disciplines.find(
        (d: {Id: number, Name: string}) => {
          const nameWithoutPrefix = d.Name.startsWith('User:') 
            ? d.Name.substring(5) 
            : d.Name;
          return nameWithoutPrefix.toLowerCase() === name.toLowerCase();
        }
      );
      
      return discipline ? Number(discipline.Id) : null;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar ID da disciplina:', error);
    return null;
  }
}

// ==============================
// Simulados
// ==============================

export async function getSimulatedTests(
  params: { 
    status?: 'criado' | 'agendado' | 'em-andamento' | 'concluido';
    limit?: number;
  } = {}
): Promise<ApiResponse<any>> {
  // Construir URL com parâmetros de consulta
  const url = new URL('/api/simulated-tests', window.location.origin);
  
  // Adicionar parâmetros à URL
  if (params.status) {
    url.searchParams.append('status', params.status);
  }
  
  if (params.limit !== undefined) {
    url.searchParams.append('limit', params.limit.toString());
  }
  
  return fetchApi(url.toString());
}

export async function getSimulatedTest(testId: number): Promise<ApiResponse<any>> {
  return fetchApi(`/api/simulated-tests/${testId}`);
}

// ==============================
// Tarefas
// ==============================

export async function getTasks(
  params: { 
    status?: 'pending' | 'in-progress' | 'completed';
    limit?: number;
  } = {}
): Promise<ApiResponse<Task[]>> {
  // Construir URL com parâmetros de consulta
  const url = new URL('/api/tasks', window.location.origin);
  
  // Adicionar parâmetros à URL
  if (params.status) {
    url.searchParams.append('status', params.status);
  }
  
  if (params.limit !== undefined) {
    url.searchParams.append('limit', params.limit.toString());
  }
  
  return fetchApi<Task[]>(url.toString());
}

// ==============================
// Notas
// ==============================

export async function getNotes(
  params: { 
    limit?: number;
    disciplineName?: string;
  } = {}
): Promise<ApiResponse<Note[]>> {
  // Construir URL com parâmetros de consulta
  const url = new URL('/api/notes', window.location.origin);
  
  // Adicionar parâmetros à URL
  if (params.disciplineName) {
    url.searchParams.append('disciplineName', params.disciplineName);
  }
  
  if (params.limit !== undefined) {
    url.searchParams.append('limit', params.limit.toString());
  }
  
  return fetchApi<Note[]>(url.toString());
}

export async function getNote(noteId: number): Promise<ApiResponse<Note>> {
  return fetchApi<Note>(`/api/notes/${noteId}`);
}

// ==============================
// Plano de Estudos
// ==============================

interface StudyPlanCreate {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  metaData?: string; // JSON stringificado com dados detalhados do plano
}

interface StudyPlanUpdate {
  id: number;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  metaData?: string; // JSON stringificado com dados detalhados do plano
}

export async function getStudyPlans(
  params: { 
    status?: 'ativo' | 'pausado' | 'concluido';
    limit?: number;
  } = {}
): Promise<ApiResponse<any>> {
  try {
    // Verificar conexão com o servidor
    const isOnline = await isServerAvailable();
    if (!isOnline) {
      return { success: false, error: 'Sem conexão com o servidor' };
    }
    
    // Construir URL com parâmetros de consulta
    const url = new URL('/api/study-plans', window.location.origin);
    
    // Adicionar parâmetros à URL
    if (params.status) {
      url.searchParams.append('status', params.status);
    }
    
    if (params.limit !== undefined) {
      url.searchParams.append('limit', params.limit.toString());
    }
    
    return await fetchApi(url.toString());
  } catch (error) {
    console.error('Erro ao obter planos de estudo:', error);
    return { success: false, error: 'Erro ao obter planos de estudo' };
  }
}

export async function getStudyPlanDetails(planId: number): Promise<ApiResponse<any>> {
  try {
    // Verificar conexão com o servidor
    const isOnline = await isServerAvailable();
    if (!isOnline) {
      return { success: false, error: 'Sem conexão com o servidor' };
    }
    
    return await fetchApi(`/api/study-plans/${planId}`);
  } catch (error) {
    console.error('Erro ao obter detalhes do plano de estudo:', error);
    return { success: false, error: 'Erro ao obter detalhes do plano de estudo' };
  }
}

export async function createStudyPlan(plan: StudyPlanCreate): Promise<ApiResponse<any>> {
  try {
    // Verificar conexão com o servidor
    const isOnline = await isServerAvailable();
    if (!isOnline) {
      return { success: false, error: 'Sem conexão com o servidor' };
    }
    
    return await fetchApi('/api/study-plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(plan)
    });
  } catch (error) {
    console.error('Erro ao criar plano de estudo:', error);
    return { success: false, error: 'Erro ao criar plano de estudo' };
  }
}

export async function updateStudyPlan(plan: StudyPlanUpdate): Promise<ApiResponse<any>> {
  try {
    // Verificar conexão com o servidor
    const isOnline = await isServerAvailable();
    if (!isOnline) {
      return { success: false, error: 'Sem conexão com o servidor' };
    }
    
    return await fetchApi('/api/study-plans', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(plan)
    });
  } catch (error) {
    console.error('Erro ao atualizar plano de estudo:', error);
    return { success: false, error: 'Erro ao atualizar plano de estudo' };
  }
}

export async function deleteStudyPlan(planId: number): Promise<ApiResponse<any>> {
  try {
    // Verificar conexão com o servidor
    const isOnline = await isServerAvailable();
    if (!isOnline) {
      return { success: false, error: 'Sem conexão com o servidor' };
    }
    
    // Construir URL com ID como parâmetro de consulta
    const url = new URL('/api/study-plans', window.location.origin);
    url.searchParams.append('id', planId.toString());
    
    return await fetchApi(url.toString(), {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Erro ao excluir plano de estudo:', error);
    return { success: false, error: 'Erro ao excluir plano de estudo' };
  }
}

// Função para recalcular métricas com base nas sessões e tarefas armazenadas localmente
export async function recalcularMetricas(): Promise<ApiResponse<StudyMetrics>> {
  try {
    // Obter sessões armazenadas localmente
    const sessions = getLocalSessions();
    
    if (!sessions.length) {
      console.log('Não há sessões locais para recalcular métricas. Usando valores padrão.');
      
      // Verificar se já temos métricas salvas
      const savedMetrics = getLocalMetrics();
      if (savedMetrics.metrics) {
        return {
          success: true,
          metrics: savedMetrics.metrics,
          recalculated: false,
          fromCache: true
        };
      }
      
      // Se não temos sessões nem métricas salvas, criar métricas padrão
      const defaultMetrics: StudyMetrics = {
        hoursToday: 0,
        hoursThisWeek: 0,
        hoursChange: 0,
        completedTasks: 0,
        totalTasksCompleted: 0,
        totalTasksPending: 0,
        tasksChange: 0,
        streak: 0,
        streakChange: 0,
        focusScore: 85, // Valor padrão
        efficiencyRate: 78 // Valor padrão
      };
      
      // Salvar métricas padrão para uso futuro
      saveLocalMetrics(defaultMetrics);
      
      return {
        success: true,
        metrics: defaultMetrics,
        recalculated: false,
        fromDefault: true
      };
    }
    
    // Filtrar sessões concluídas
    const completedSessions = sessions.filter(s => s.completed);
    
    // Definir períodos de tempo para cálculos
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // Início do dia atual
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - 6); // 7 dias atrás
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7); // 14 dias atrás
    
    // Calcular horas de estudo hoje
    const hoursToday = completedSessions
      .filter(s => {
        const sessionDate = new Date(s.scheduledDate);
        return sessionDate >= todayStart && sessionDate <= today;
      })
      .reduce((sum, s) => sum + (s.actualDuration || s.duration), 0) / 60; // Converter minutos para horas
    
    // Calcular horas de estudo esta semana
    const hoursThisWeek = completedSessions
      .filter(s => {
        const sessionDate = new Date(s.scheduledDate);
        return sessionDate >= thisWeekStart && sessionDate <= today;
      })
      .reduce((sum, s) => sum + (s.actualDuration || s.duration), 0) / 60; // Converter minutos para horas
    
    // Calcular horas de estudo na semana passada (para comparação)
    const hoursLastWeek = completedSessions
      .filter(s => {
        const sessionDate = new Date(s.scheduledDate);
        return sessionDate >= lastWeekStart && sessionDate < thisWeekStart;
      })
      .reduce((sum, s) => sum + (s.actualDuration || s.duration), 0) / 60; // Converter minutos para horas
    
    // Calcular mudança percentual em horas
    let hoursChange = 0;
    if (hoursLastWeek > 0) {
      hoursChange = Math.round(((hoursThisWeek - hoursLastWeek) / hoursLastWeek) * 100);
    }
    
    // Calcular streak de dias de estudo
    const sessionsByDate = new Map<string, boolean>();
    completedSessions.forEach(s => {
      const dateStr = new Date(s.scheduledDate).toISOString().split('T')[0];
      sessionsByDate.set(dateStr, true);
    });
    
    let streak = 0;
    let currentDate = new Date(today);
    let dateStr = currentDate.toISOString().split('T')[0];
    
    // Verificar se estudou hoje
    if (sessionsByDate.has(dateStr)) {
      streak = 1;
      
      // Verificar dias anteriores consecutivos
      let daysBack = 1;
      let continueChecking = true;
      
      while (continueChecking) {
        currentDate.setDate(currentDate.getDate() - 1);
        dateStr = currentDate.toISOString().split('T')[0];
        
        if (sessionsByDate.has(dateStr)) {
          streak++;
          daysBack++;
        } else {
          continueChecking = false;
        }
        
        // Limitar a verificação a um período razoável (30 dias)
        if (daysBack > 30) {
          continueChecking = false;
        }
      }
    }
    
    // Obter tarefas armazenadas localmente (se disponíveis)
    let completedTasks = 0;
    let totalTasksPending = 0;
    
    try {
      const tasksData = localStorage.getItem('@medjourney:tasks');
      if (tasksData) {
        const tasks = JSON.parse(tasksData);
        completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
        totalTasksPending = tasks.filter((t: any) => t.status === 'pending').length;
      }
    } catch (e) {
      console.warn('Erro ao obter tarefas do localStorage:', e);
    }
    
    // Criar objeto de métricas
    const metrics: StudyMetrics = {
      hoursToday,
      hoursThisWeek,
      hoursChange,
      completedTasks,
      totalTasksCompleted: completedTasks,
      totalTasksPending,
      tasksChange: 0, // Não temos dados históricos para tarefas
      streak,
      streakChange: 0, // Não temos dados históricos para streak
      focusScore: 85, // Valor padrão
      efficiencyRate: 78 // Valor padrão
    };
    
    // Salvar métricas recalculadas no localStorage
    saveLocalMetrics(metrics);
    
    return {
      success: true,
      metrics,
      recalculated: true
    };
  } catch (error) {
    console.error('Erro ao recalcular métricas:', error);
    return {
      success: false,
      error: 'Erro ao recalcular métricas'
    };
  }
} 