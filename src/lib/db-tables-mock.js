// src/lib/db-tables-mock.js
// Define a estrutura básica das tabelas usadas no aplicativo para ambiente de build

/**
 * Mapeamento entre nomes de tabelas usadas na aplicação
 * e seus equivalentes no Supabase
 */
export const tableMapping = {
  // Converte nomes PascalCase para snake_case conforme necessário
  Users: 'users',
  Tasks: 'tasks',
  StudySessions: 'study_sessions',
  Notes: 'notes',
  Subjects: 'subjects',
  FlashCards: 'flash_cards',
  ExamResults: 'exam_results',
  Schedules: 'schedules',
  StudyPlans: 'study_plans',
  Resources: 'resources',
  // Adicione mais mapeamentos conforme necessário
};

/**
 * Estrutura básica das tabelas para uso em verificações
 */
export const tableStructure = {
  users: {
    columns: ['id', 'email', 'name', 'role', 'created_at', 'updated_at'],
    primaryKey: 'id'
  },
  tasks: {
    columns: ['id', 'title', 'description', 'status', 'priority', 'due_date', 'user_id', 'created_at', 'updated_at'],
    primaryKey: 'id',
    foreignKeys: {
      user_id: 'users.id'
    }
  },
  study_sessions: {
    columns: ['id', 'subject', 'start_time', 'end_time', 'actual_duration', 'planned_duration', 'user_id', 'created_at'],
    primaryKey: 'id',
    foreignKeys: {
      user_id: 'users.id'
    }
  },
  notes: {
    columns: ['id', 'title', 'content', 'subject_id', 'user_id', 'created_at', 'updated_at'],
    primaryKey: 'id',
    foreignKeys: {
      user_id: 'users.id',
      subject_id: 'subjects.id'
    }
  },
  subjects: {
    columns: ['id', 'name', 'description', 'color', 'user_id', 'created_at', 'updated_at'],
    primaryKey: 'id',
    foreignKeys: {
      user_id: 'users.id'
    }
  }
};

/**
 * Função para verificar se uma tabela existe na estrutura
 */
export function tableExists(tableName) {
  // Converte o nome da tabela para snake_case se estiver em PascalCase
  const normalizedName = tableMapping[tableName] || tableName.toLowerCase();
  return !!tableStructure[normalizedName];
}

/**
 * Função para verificar se uma coluna existe em uma tabela
 */
export function columnExists(tableName, columnName) {
  const normalizedName = tableMapping[tableName] || tableName.toLowerCase();
  const table = tableStructure[normalizedName];
  
  if (!table) return false;
  
  return table.columns.includes(columnName.toLowerCase());
}

/**
 * Função para criar uma consulta SQL segura baseada em uma tabela que pode não existir
 * Retorna um objeto com métodos para garantir acesso seguro a tabelas e colunas
 */
export function safeSqlQuery(tableName) {
  const normalizedName = tableMapping[tableName] || tableName.toLowerCase();
  
  return {
    /**
     * Executa uma consulta SELECT segura, retornando resultados mock se a tabela não existe
     */
    select: (columns = '*', whereClause = '') => {
      if (!tableExists(normalizedName)) {
        console.log(`[Mock] Tabela ${normalizedName} não existe, retornando mock`);
        return Promise.resolve({ rows: [] });
      }
      
      // Gerar SQL seguro
      const sql = `SELECT ${columns} FROM ${normalizedName} ${whereClause}`;
      return { 
        sql,
        params: {},
        execute: () => Promise.resolve({ rows: [] }) 
      };
    },
    
    /**
     * Verifica se uma coluna existe na tabela
     */
    hasColumn: (columnName) => {
      return columnExists(normalizedName, columnName);
    }
  };
} 