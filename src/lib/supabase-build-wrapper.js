// src/lib/supabase-build-wrapper.js
// Wrapper para o Supabase durante o build que retorna dados mockados
import { tableMapping, safeSqlQuery } from './db-tables-mock';

// Importação dinâmica dos mocks para evitar erros em fase de compilação
let dbMocks;
try {
  dbMocks = require('../mocks/db-mocks');
} catch (e) {
  console.log('[Build] Não foi possível carregar os mocks do banco de dados:', e.message);
  // Criamos um objeto vazio com a mesma interface se não conseguirmos importar
  dbMocks = {
    tasksMock: { completedTasks: 0, pendingTasks: 0, totalTasks: 0, completionRate: 0 },
    studyStatsMock: { totalMinutes: 0, studyStreak: 0, focusScore: 0 },
    performanceMock: { weeklyProgress: [], subjectPerformance: [] },
    calendarMock: { events: [] },
    mockDbQuery: () => Promise.resolve({ message: 'Mock data not available' })
  };
}

/**
 * Cria um cliente mockado que imita o comportamento do Supabase
 * para uso durante o build, retornando dados falsos ou vazios
 */
export function createBuildSupabaseClient() {
  return {
    from: (tableName) => {
      const normalizedTable = tableMapping[tableName] || tableName;
      
      return {
        select: (columns) => {
          console.log(`[Build] SELECT ${columns || '*'} FROM ${normalizedTable}`);
          
          // Retorna um objeto com a mesma API do Supabase, mas com dados mockados
          return {
            eq: (column, value) => {
              console.log(`[Build] WHERE ${column} = ${value}`);
              return {
                single: () => {
                  // Retornar item único mockado dependendo da tabela
                  switch (normalizedTable) {
                    case 'users':
                      return Promise.resolve({ id: 1, email: 'user@example.com', name: 'User Test' });
                    case 'tasks':
                      return Promise.resolve({ id: 1, title: 'Task Test', status: 'pending' });
                    default:
                      return Promise.resolve(null);
                  }
                },
                order: () => ({
                  limit: () => Promise.resolve([])
                }),
                limit: () => Promise.resolve([])
              };
            },
            in: () => ({
              data: [],
              error: null
            }),
            gte: () => ({
              lte: () => ({
                data: [],
                error: null
              })
            }),
            neq: () => ({
              data: [],
              error: null
            }),
            is: () => ({
              data: [],
              error: null
            }),
            order: () => ({
              limit: () => Promise.resolve([])
            }),
            limit: () => Promise.resolve([])
          };
        },
        insert: (data) => {
          console.log(`[Build] INSERT INTO ${normalizedTable}`, data);
          return Promise.resolve({
            data: { ...data, id: 999 },
            error: null
          });
        },
        update: (data) => {
          console.log(`[Build] UPDATE ${normalizedTable}`, data);
          return Promise.resolve({
            data,
            error: null
          });
        },
        delete: () => {
          console.log(`[Build] DELETE FROM ${normalizedTable}`);
          return {
            eq: () => Promise.resolve({
              data: null,
              error: null
            })
          };
        },
        upsert: (data) => {
          console.log(`[Build] UPSERT ${normalizedTable}`, data);
          return Promise.resolve({
            data: { ...data, id: 999 },
            error: null
          });
        }
      };
    },
    auth: {
      getSession: () => Promise.resolve({ 
        data: { session: null }, 
        error: null 
      }),
      getUser: () => Promise.resolve({
        data: { user: null },
        error: null
      }),
      signInWithPassword: () => Promise.resolve({
        data: { user: { id: 1, email: 'user@example.com' }, session: { access_token: 'mock-token' } },
        error: null
      }),
      signUp: () => Promise.resolve({
        data: { user: { id: 2, email: 'new@example.com' }, session: null },
        error: null
      }),
      signOut: () => Promise.resolve({ error: null }),
      setSession: () => Promise.resolve({ data: { session: {} }, error: null })
    },
    rpc: (procedure, params) => {
      console.log(`[Build] EXECUTE PROCEDURE ${procedure}`, params);
      
      // Retornar dados mockados dependendo do procedimento
      switch (procedure) {
        case 'get_user_tasks_summary':
          return Promise.resolve(dbMocks.tasksMock);
        case 'get_study_stats':
          return Promise.resolve(dbMocks.studyStatsMock);
        case 'get_performance_metrics':
          return Promise.resolve(dbMocks.performanceMock);
        default:
          return Promise.resolve({ message: 'Mock procedure data not available' });
      }
    },
    storage: {
      from: (bucket) => ({
        upload: () => Promise.resolve({ data: { path: `/${bucket}/file.pdf` }, error: null }),
        list: () => Promise.resolve({ data: [], error: null }),
        remove: () => Promise.resolve({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: `https://example.com/${bucket}/file.pdf` } })
      })
    }
  };
}

// Utilitário para verificar se estamos no ambiente de build/server
export const isBuildEnvironment = () => {
  return (
    process.env.NODE_ENV === 'production' && 
    (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') &&
    typeof window === 'undefined'
  );
};

// Utilitário para determinar se devemos usar o cliente real ou o mockado
export function getSupabaseClient(realClient) {
  if (isBuildEnvironment()) {
    console.log('[Build] Usando cliente Supabase mockado para ambiente de build');
    return createBuildSupabaseClient();
  }
  
  return realClient;
} 