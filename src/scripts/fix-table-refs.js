// Script para adicionar suporte temporário ao mapeamento entre nomes de tabelas

/**
 * Este script deve ser incluído no projeto para garantir que todas as 
 * referências à tabela StudySessions sejam corretamente mapeadas para study_sessions
 */

// Função para mapear os nomes das tabelas
function mapTableName(tableName) {
  const tableMap = {
    'StudySessions': 'study_sessions',
    'StudyActivity': 'study_activity',
    // Adicione outros mapeamentos conforme necessário
  };
  
  return tableMap[tableName] || tableName;
}

// Patch para o objeto Supabase
if (typeof window !== 'undefined') {
  if (window.supabase) {
    // Guarda a referência original
    const originalFrom = window.supabase.from;
    
    // Substitui com nossa versão que faz o mapeamento
    window.supabase.from = function(table) {
      const mappedTable = mapTableName(table);
      console.log(`Supabase table reference: ${table} -> ${mappedTable}`);
      return originalFrom.call(this, mappedTable);
    };
  }
}

// Exportar para uso em componentes específicos se necessário
export { mapTableName };

// Instruções de uso:
/*
1. Importe este script no seu _app.tsx ou página principal:
   import '../scripts/fix-table-refs';

2. Alternativamente, use a função mapTableName em componentes específicos:
   import { mapTableName } from '../scripts/fix-table-refs';
   
   // Então use:
   const table = mapTableName('StudySessions');
   supabase.from(table)...
*/ 