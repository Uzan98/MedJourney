// Arquivo gerado automaticamente - NÃO EDITAR MANUALMENTE
// Última atualização: 2025-10-02T21:05:22.986Z

export const APP_VERSION = '2025.10.02.1805';
export const BUILD_TIMESTAMP = 1759439122986;
export const BUILD_DATE = '2025-10-02T21:05:22.986Z';

// Função para verificar se uma nova versão está disponível
export function isNewerVersion(currentVersion: string, newVersion: string): boolean {
  // Para versões baseadas em timestamp, comparar numericamente
  if (currentVersion.includes('.') && newVersion.includes('.')) {
    const currentParts = currentVersion.split('.').map(Number);
    const newParts = newVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, newParts.length); i++) {
      const current = currentParts[i] || 0;
      const newer = newParts[i] || 0;
      
      if (newer > current) return true;
      if (newer < current) return false;
    }
  }
  
  return false;
}

// Função para formatar versão para exibição
export function formatVersion(version: string): string {
  return version;
}
