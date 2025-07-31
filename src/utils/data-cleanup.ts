/**
 * Utilitários para limpeza de dados do usuário
 * Usado principalmente no logout para garantir que dados de usuários anteriores não persistam
 */

/**
 * Limpa todos os dados do localStorage com prefixo @medjourney:
 */
export function clearLocalStorageData(): void {
  try {
    const keysToRemove: string[] = [];
    
    // Coletar todas as chaves que começam com @medjourney:
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('@medjourney:')) {
        keysToRemove.push(key);
      }
    }
    
    // Remover todas as chaves encontradas
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`[DataCleanup] Removido do localStorage: ${key}`);
    });
    
    console.log(`[DataCleanup] Limpeza do localStorage concluída. ${keysToRemove.length} itens removidos.`);
  } catch (error) {
    console.error('[DataCleanup] Erro ao limpar localStorage:', error);
  }
}

/**
 * Limpa todos os caches do Service Worker relacionados ao MedJourney
 */
export async function clearServiceWorkerCache(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    console.warn('[DataCleanup] Service Worker ou Cache API não disponível');
    return;
  }
  
  try {
    // Obter todas as chaves de cache
    const cacheNames = await caches.keys();
    
    // Deletar todos os caches relacionados ao MedJourney
    const deletionPromises = cacheNames.map(cacheName => {
      if (cacheName.includes('medjourney')) {
        console.log(`[DataCleanup] Removendo cache: ${cacheName}`);
        return caches.delete(cacheName);
      }
      return Promise.resolve(false);
    });
    
    await Promise.all(deletionPromises);
    
    // Enviar mensagem para o Service Worker para limpeza adicional
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_USER_DATA',
        timestamp: Date.now()
      });
    }
    
    console.log('[DataCleanup] Limpeza de cache do Service Worker concluída');
  } catch (error) {
    console.error('[DataCleanup] Erro ao limpar cache do Service Worker:', error);
  }
}

/**
 * Limpa dados do sessionStorage relacionados ao MedJourney
 */
export function clearSessionStorageData(): void {
  try {
    const keysToRemove: string[] = [];
    
    // Coletar todas as chaves que começam com @medjourney:
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('@medjourney:')) {
        keysToRemove.push(key);
      }
    }
    
    // Remover todas as chaves encontradas
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`[DataCleanup] Removido do sessionStorage: ${key}`);
    });
    
    console.log(`[DataCleanup] Limpeza do sessionStorage concluída. ${keysToRemove.length} itens removidos.`);
  } catch (error) {
    console.error('[DataCleanup] Erro ao limpar sessionStorage:', error);
  }
}

/**
 * Executa limpeza completa de todos os dados do usuário
 * Inclui localStorage, sessionStorage e cache do Service Worker
 */
export async function performCompleteDataCleanup(): Promise<void> {
  console.log('[DataCleanup] Iniciando limpeza completa de dados...');
  
  // Executar limpezas em paralelo quando possível
  const cleanupPromises = [
    clearServiceWorkerCache(),
    Promise.resolve(clearLocalStorageData()),
    Promise.resolve(clearSessionStorageData())
  ];
  
  try {
    await Promise.all(cleanupPromises);
    console.log('[DataCleanup] Limpeza completa de dados concluída com sucesso');
  } catch (error) {
    console.error('[DataCleanup] Erro durante limpeza completa:', error);
    throw error;
  }
}

/**
 * Força um redirecionamento limpo para a página de login
 * Usado após logout para garantir que não há dados residuais
 */
export function forceCleanRedirect(targetUrl: string = '/auth/login'): void {
  try {
    // Usar replace para não manter histórico
    window.location.replace(targetUrl);
  } catch (error) {
    console.error('[DataCleanup] Erro no redirecionamento, tentando reload:', error);
    // Fallback: reload completo
    window.location.reload();
  }
}

/**
 * Verifica se há dados residuais do MedJourney no armazenamento local
 * Útil para debugging e verificação de limpeza
 */
export function checkForResidualData(): {
  localStorage: string[];
  sessionStorage: string[];
} {
  const localStorageKeys: string[] = [];
  const sessionStorageKeys: string[] = [];
  
  // Verificar localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('@medjourney:')) {
      localStorageKeys.push(key);
    }
  }
  
  // Verificar sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('@medjourney:')) {
      sessionStorageKeys.push(key);
    }
  }
  
  const result = {
    localStorage: localStorageKeys,
    sessionStorage: sessionStorageKeys
  };
  
  if (localStorageKeys.length > 0 || sessionStorageKeys.length > 0) {
    console.warn('[DataCleanup] Dados residuais encontrados:', result);
  } else {
    console.log('[DataCleanup] Nenhum dado residual encontrado');
  }
  
  return result;
}