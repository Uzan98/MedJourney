import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Estas variáveis de ambiente precisam ser configuradas no arquivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Log para depuração
console.log('Supabase URL configurado:', supabaseUrl);
console.log('Supabase Anon Key existe:', !!supabaseAnonKey);

// Verificação adicional para garantir que a URL é válida antes de criar o cliente
let supabaseClient: SupabaseClient;

// Flag para controlar o estado de conexão
let isReconnecting = false;
let wasConnected = false;

try {
  if (supabaseUrl && supabaseAnonKey) {
    // Criar e exportar o cliente com configuração para autenticação por cookies
    // De acordo com a documentação mais recente do Supabase:
    // https://supabase.com/docs/guides/auth/quickstarts/nextjs
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true, // Ativar persistência de sessão
        autoRefreshToken: true, // Renovar token automaticamente
        detectSessionInUrl: false, // Desativar detecção de sessão na URL para evitar conflitos
        flowType: 'pkce',
        // Desativar redirecionamento automático para evitar problemas com mudanças de foco
        storageKey: 'medjourney-auth-token',
      },
      global: {
        headers: {
          'X-Client-Info': 'medjourney-app'
        }
      },
      // Configuração explícita para realtime com valores mais agressivos
      realtime: {
        params: {
          eventsPerSecond: 10, // Reduzido para evitar problemas
          heartbeatIntervalMs: 30000, // Aumentado para 30s
          // Função de backoff exponencial para reconexão
          reconnectAfterMs: function(attempts: number): number {
            // Estratégia de backoff exponencial com limite máximo
            const baseDelay = 2000; // 2 segundos
            const maxDelay = 60000; // 60 segundos (1 minuto)
            const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
            console.log(`Tentando reconectar em ${delay}ms (tentativa ${attempts + 1})`);
            return delay;
          }
        }
      }
    });
    
    // Inicializar o cliente realtime explicitamente
    supabaseClient.realtime.setAuth(supabaseAnonKey);
    
    console.log('Cliente Supabase criado com sucesso para autenticação');
    console.log('Suporte a realtime habilitado com configurações otimizadas');
    
    // Adicionar listener para mudanças de conectividade
    if (typeof window !== 'undefined') {
      // Variáveis para controlar o estado da página e reconexões
      let reconnectTimeout: NodeJS.Timeout | null = null;
      let checkConnectionInterval: NodeJS.Timeout | null = null;
      let isPageVisible = true;
      
      // Monitorar visibilidade da página
      document.addEventListener('visibilitychange', () => {
        const wasVisible = isPageVisible;
        isPageVisible = document.visibilityState === 'visible';
        console.log(`Visibilidade da página alterada: ${isPageVisible ? 'visível' : 'oculta'}`);
        
        // Se a página ficou visível novamente e estava previamente conectada
        if (isPageVisible && !wasVisible && wasConnected && !supabaseClient.realtime.isConnected()) {
          console.log('Página visível novamente, verificando conexão...');
          
          // Evitar múltiplas tentativas de reconexão
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }
          
          if (!isReconnecting) {
            isReconnecting = true;
            
            reconnectTimeout = setTimeout(() => {
              if (!supabaseClient.realtime.isConnected()) {
                console.log('Reconectando após página ficar visível...');
                supabaseClient.realtime.connect();
              }
              isReconnecting = false;
            }, 3000); // Esperar 3 segundos antes de tentar reconectar
          }
        }
        
        // Se a página ficou oculta, registrar o estado atual da conexão
        if (!isPageVisible && wasVisible) {
          wasConnected = supabaseClient.realtime.isConnected();
        }
      });
      
      // Gerenciar eventos de conexão de rede
      window.addEventListener('online', () => {
        console.log('Conexão de rede restaurada, verificando conexão Supabase...');
        
        // Verificar se a conexão está realmente perdida antes de reconectar
        if (!supabaseClient.realtime.isConnected() && isPageVisible && !isReconnecting) {
          isReconnecting = true;
          
          // Usar timeout para evitar múltiplas reconexões
          setTimeout(() => {
            if (!supabaseClient.realtime.isConnected()) {
              console.log('Reconectando Supabase Realtime após restauração de rede');
        supabaseClient.realtime.connect();
            }
            isReconnecting = false;
          }, 2000);
        }
      });
      
      window.addEventListener('offline', () => {
        console.log('Conexão de rede perdida, Supabase Realtime pode ser afetado');
        // Registrar o estado atual da conexão
        wasConnected = supabaseClient.realtime.isConnected();
      });
      
      // Verificar a conexão periodicamente, mas com menos frequência
      checkConnectionInterval = setInterval(() => {
        // Só verificar se a página estiver visível e não estiver em processo de reconexão
        if (isPageVisible && !isReconnecting) {
        const isConnected = supabaseClient.realtime.isConnected();
          
          // Registrar o estado da conexão
          wasConnected = isConnected;
        
          // Reconectar apenas se estiver desconectado
        if (!isConnected) {
            console.log('Status da conexão Realtime: desconectado, tentando reconectar...');
            isReconnecting = true;
            
          supabaseClient.realtime.connect();
            
            // Resetar flag após um tempo
            setTimeout(() => {
              isReconnecting = false;
            }, 5000);
          }
        }
      }, 60000); // Verificar a cada 60 segundos
      
      // Limpar intervalos e timeouts quando a página for descarregada
      window.addEventListener('beforeunload', () => {
        if (checkConnectionInterval) clearInterval(checkConnectionInterval);
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
      });
    }
  } else {
    console.error('Não foi possível criar o cliente Supabase: URL ou chave anônima ausentes');
    // Criar um cliente mock para evitar erros de runtime
    supabaseClient = createMockClient();
  }
} catch (error) {
  console.error('Erro ao criar cliente Supabase:', error);
  // Criar um cliente mock para evitar erros de runtime
  supabaseClient = createMockClient();
}

export const supabase = supabaseClient;

// Função para criar um cliente mock que implementa a API do Supabase
function createMockClient(): SupabaseClient {
  return {
    from: () => ({
      select: () => {
        const builder: any = Promise.resolve({ data: [], error: new Error('Cliente Supabase não inicializado') });
        // Adicionar métodos de encadeamento
        builder.eq = () => builder;
        builder.limit = () => builder;
        builder.order = () => builder;
        builder.single = () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não inicializado') });
        return builder;
      },
      insert: () => {
        const builder: any = Promise.resolve({ error: new Error('Cliente Supabase não inicializado') });
        // Adicionar métodos de encadeamento
        builder.select = () => builder;
        builder.eq = () => builder;
        builder.single = () => Promise.resolve({ data: null, error: new Error('Cliente Supabase não inicializado') });
        return builder;
      },
      update: () => Promise.resolve({ error: new Error('Cliente Supabase não inicializado') }),
      delete: () => Promise.resolve({ error: new Error('Cliente Supabase não inicializado') }),
    }),
    auth: {
      signIn: () => Promise.resolve({ user: null, session: null, error: new Error('Cliente Supabase não inicializado') }),
      signOut: () => Promise.resolve({ error: new Error('Cliente Supabase não inicializado') }),
    },
    realtime: {
      setAuth: () => {},
      channel: () => ({
        on: () => ({ subscribe: () => {} }),
        subscribe: () => {}
      }),
      connect: () => {},
      disconnect: () => {},
      isConnected: () => false
    }
  } as unknown as SupabaseClient;
}

// Tipos para as tabelas do Supabase
export type User = {
  id: string;
  user_id: string; // ID do usuário (compatível com o antigo userId)
  clerk_id?: string; // ID do Clerk (opcional)
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Discipline = {
  id: number;
  name: string;
  description: string | null;
  theme: string | null;
  is_system: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type Subject = {
  id: number;
  discipline_id: number;
  user_id: string;
  
  // Campos atualizados para o novo esquema
  title: string;
  content: string | null;
  status: string; // 'pending', 'in_progress', 'completed', etc.
  due_date: string | null;
  
  // Campos legados (para compatibilidade com código existente)
  name?: string;
  description?: string | null;
  difficulty?: string;
  importance?: string;
  estimated_hours?: number | null;
  completed?: boolean;
  progress_percent?: number;
  
  created_at: string;
  updated_at: string;
}; 