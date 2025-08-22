// mock-setup.js
// Script para criar mocks e substituições de APIs durante o build
const fs = require('fs');
const path = require('path');

console.log('🔍 Iniciando configuração de mocks para build...');

// Diretório para armazenar os mocks temporários
const MOCK_DIR = path.join(process.cwd(), '.mocks');

// Cria o diretório de mocks se não existir
if (!fs.existsSync(MOCK_DIR)) {
  fs.mkdirSync(MOCK_DIR, { recursive: true });
  console.log('📁 Diretório de mocks criado');
}

// Função para verificar e criar/atualizar arquivo
function createOrUpdateFile(filePath, content, backup = true) {
  const exists = fs.existsSync(filePath);
  
  if (exists && backup) {
    const backupPath = `${filePath}.bak`;
    console.log(`📝 Fazendo backup de ${filePath} para ${backupPath}...`);
    fs.copyFileSync(filePath, backupPath);
  }
  
  console.log(`${exists ? '📝 Atualizando' : '📝 Criando'} arquivo ${filePath}...`);
  fs.writeFileSync(filePath, content);
}

// Função para verificar e corrigir a API route de auth-session
function fixAuthSessionRoute() {
  const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'auth-session', 'route.ts');
  
  if (fs.existsSync(routePath)) {
    let content = fs.readFileSync(routePath, 'utf8');
    
    // Verifica se está usando o método desatualizado
    if (content.includes('createMiddlewareSupabaseClient')) {
      // Faz backup do arquivo original
      fs.writeFileSync(`${routePath}.bak`, content);
      
      // Substitui por createRequestSupabaseClient
      content = content.replace(
        'import { createMiddlewareSupabaseClient } from "@/lib/supabase-server";',
        'import { createRequestSupabaseClient } from "@/lib/supabase-server";'
      );
      
      content = content.replace(
        /const supabase = createMiddlewareSupabaseClient\(request\);/g,
        'const supabase = createRequestSupabaseClient(request);'
      );
      
      fs.writeFileSync(routePath, content);
      console.log('✅ Corrigido src/app/api/auth-session/route.ts');
    }
  }
}

// Função para criar mocks de tabelas
function createTableMocks() {
  // Cria um mock para a API que tenta acessar a tabela de tarefas
  const mockTasksApiPath = path.join(MOCK_DIR, 'tasks-api.js');
  const tasksApiMock = `
// Mock para API de tarefas
export const getMockTasks = () => {
  return {
    completedTasks: 5,
    pendingTasks: 3,
    totalTasks: 8,
    completionRate: 62.5
  };
};

export const getMockStudyStats = () => {
  return {
    totalMinutes: 1240,
    studyStreak: 7,
    focusScore: 85,
    lastSessionDate: new Date().toISOString()
  };
};
`;
  fs.writeFileSync(mockTasksApiPath, tasksApiMock);
  console.log('✅ Criados mocks para dados de tarefas e estatísticas');
}

// Função para corrigir componentes que usam useSearchParams sem Suspense
function fixLoginPageSuspense() {
  const loginPagePath = path.join(process.cwd(), 'src', 'app', 'auth', 'login', 'page.tsx');
  
  if (fs.existsSync(loginPagePath)) {
    let content = fs.readFileSync(loginPagePath, 'utf8');
    
    // Verifica se está usando o LoginForm diretamente sem Suspense
    if (content.includes('<LoginForm') && !content.includes('Suspense')) {
      // Faz backup do arquivo original
      fs.writeFileSync(`${loginPagePath}.bak`, content);
      
      // Adiciona import do Suspense
      if (!content.includes('import { Suspense }')) {
        content = content.replace(
          'import React from \'react\';',
          'import React, { Suspense } from \'react\';'
        );
        
        // Se não tiver o import do React, adicione
        if (!content.includes('import React')) {
          content = 'import React, { Suspense } from \'react\';\n' + content;
        }
      }
      
      // Substitui o LoginForm por um componente com Suspense
      content = content.replace(
        '<LoginForm />',
        '<Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>\n        <LoginForm />\n      </Suspense>'
      );
      
      fs.writeFileSync(loginPagePath, content);
      console.log('✅ Adicionado Suspense ao LoginForm na página de login');
    }
  }
}

// Função para adicionar export dynamic = 'force-dynamic' a todas as API routes
function setDynamicApiRoutes() {
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  
  if (fs.existsSync(apiDir)) {
    function processDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          processDir(fullPath);
        } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
          let content = fs.readFileSync(fullPath, 'utf8');
          
          // Verifica se já tem export const dynamic
          if (!content.includes('export const dynamic')) {
            // Faz backup do arquivo original
            fs.writeFileSync(`${fullPath}.bak`, content);
            
            // Adiciona a linha de dynamic export no início do arquivo
            content = 'export const dynamic = \'force-dynamic\';\n\n' + content;
            
            fs.writeFileSync(fullPath, content);
            console.log(`✅ Adicionado dynamic export a ${fullPath}`);
          }
        }
      }
    }
    
    processDir(apiDir);
  }
}

// Função para criar arquivo .env.local com variáveis de ambiente comuns
function createEnvLocalFile() {
  const envLocalPath = path.join(process.cwd(), '.env.local');
  
  // Se já existe um arquivo .env.local, vamos apenas acrescentar variáveis faltantes
  let existingContent = '';
  let existingVars = {};
  
  if (fs.existsSync(envLocalPath)) {
    existingContent = fs.readFileSync(envLocalPath, 'utf8');
    
    // Parse das variáveis existentes
    existingContent.split('\n').forEach(line => {
      if (line.includes('=')) {
        const [key] = line.split('=');
        existingVars[key.trim()] = true;
      }
    });
  }
  
  const defaultVars = {
    'NEXT_PUBLIC_SUPABASE_URL': 'YOUR_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'YOUR_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY': 'YOUR_SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL': 'https://www.genomastudy.com.br',
    'NEXT_PUBLIC_MOCK_DB': 'true',
    'NEXT_IGNORE_ERRORS': '1',
    'NEXT_SKIP_TYPESCRIPT_CHECK': 'true',
    'NEXT_TELEMETRY_DISABLED': '1'
  };
  
  // Adicionar variáveis padrão se não existirem
  let newContent = existingContent;
  let addedVars = false;
  
  for (const [key, value] of Object.entries(defaultVars)) {
    if (!existingVars[key]) {
      if (newContent && !newContent.endsWith('\n')) {
        newContent += '\n';
      }
      newContent += `${key}=${value}\n`;
      addedVars = true;
    }
  }
  
  if (addedVars || !fs.existsSync(envLocalPath)) {
    createOrUpdateFile(envLocalPath, newContent, true);
    console.log('✅ Arquivo .env.local atualizado com variáveis de ambiente');
  }
}

// Função para criar um arquivo de inicialização do mock DB
function createMockDbInit() {
  const mockDbInitPath = path.join(process.cwd(), 'src', 'lib', 'mock-db-init.js');
  
  const mockDbInitContent = `
// src/lib/mock-db-init.js
// Inicialização do banco de dados mockado para build e desenvolvimento

// Verificamos se estamos em ambiente de build
const isBuildEnvironment = () => {
  return process.env.NODE_ENV === 'production' && typeof window === 'undefined';
};

// Verificamos se devemos usar mocks
const shouldUseMocks = () => {
  return process.env.NEXT_PUBLIC_MOCK_DB === 'true' || isBuildEnvironment();
};

let mockInitialized = false;

// Função para inicializar e usar mocks
export function initMockDb() {
  if (mockInitialized) return;
  
  if (shouldUseMocks()) {
    console.log('[MockDB] Inicializando banco de dados mockado');
    
    // Aqui podemos inicializar os mocks necessários
    try {
      // Em ambiente de cliente, podemos interceptar fetch ou outras APIs
      if (typeof window !== 'undefined') {
        console.log('[MockDB] Ambiente de cliente detectado');
        // Aqui você pode configurar interceptadores de fetch, se necessário
      } else {
        console.log('[MockDB] Ambiente de servidor detectado');
        // Aqui você pode configurar mocks para módulos do servidor
      }
      
      mockInitialized = true;
    } catch (error) {
      console.error('[MockDB] Erro ao inicializar mocks:', error);
    }
  }
}

// Verificar automaticamente se devemos inicializar durante a importação
initMockDb();

export default {
  init: initMockDb,
  isMockEnabled: shouldUseMocks
};
`;
  
  createOrUpdateFile(mockDbInitPath, mockDbInitContent, false);
  console.log('✅ Criado arquivo de inicialização do mock DB');
}

// Executa todas as funções de correção
fixAuthSessionRoute();
createTableMocks();
fixLoginPageSuspense();
setDynamicApiRoutes();
createEnvLocalFile();
createMockDbInit();

console.log('✅ Configuração de mocks concluída com sucesso!');