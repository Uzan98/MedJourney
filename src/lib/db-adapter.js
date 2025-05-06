/**
 * Adaptador para Supabase que fornece uma API similar ao antigo módulo db.js
 * Isso facilita a migração dos endpoints sem precisar reescrever toda a lógica
 */

import { supabase } from './supabase';

/**
 * Executa uma consulta no Supabase
 * Esta função é um adaptador para o executeQuery do mssql
 * @param {string} query - Consulta SQL em formato string
 * @param {object} params - Parâmetros nomeados para a consulta
 * @returns {Promise<any[]>} Resultado da consulta
 */
export async function executeQuery(query, params = {}) {
  console.log('[db-adapter] Executando consulta', { 
    query: query.substring(0, 100) + '...', 
    params: JSON.stringify(params)
  });
  
  // Converter a consulta SQL em chamadas do Supabase
  if (query.trim().toUpperCase().startsWith('SELECT')) {
    return handleSelect(query, params);
  } else if (query.trim().toUpperCase().startsWith('INSERT')) {
    return handleInsert(query, params);
  } else if (query.trim().toUpperCase().startsWith('UPDATE')) {
    return handleUpdate(query, params);
  } else if (query.trim().toUpperCase().startsWith('DELETE')) {
    return handleDelete(query, params);
  } else {
    console.warn('[db-adapter] Tipo de consulta não suportado:', query.trim().split(' ')[0]);
    return [];
  }
}

/**
 * Executa uma consulta no Supabase e retorna apenas o primeiro resultado
 * @param {string} query - Consulta SQL em formato string
 * @param {object} params - Parâmetros nomeados para a consulta
 * @returns {Promise<any>} Primeiro resultado da consulta ou null
 */
export async function executeQuerySingle(query, params = {}) {
  try {
    const results = await executeQuery(query, params);
    return results && results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('[db-adapter] Erro ao executar consulta single:', error);
    return null;
  }
}

/**
 * Processa consulta SELECT
 * @private
 */
async function handleSelect(query, params) {
  try {
    // Extrai o nome da tabela da consulta SQL
    const tableMatch = query.match(/FROM\s+([^\s,]+)/i);
    if (!tableMatch || !tableMatch[1]) {
      throw new Error('Não foi possível extrair o nome da tabela da consulta SELECT');
    }
    
    const tableName = tableMatch[1].toLowerCase().replace(/[\[\]"'`]/g, '');
    
    // Extrai cláusula WHERE da consulta, se existir
    const whereClause = query.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|\s*$)/i);
    const whereConditions = whereClause && whereClause[1] ? parseWhereClause(whereClause[1], params) : null;
    
    // Consulta Supabase
    let supabaseQuery = supabase.from(tableName).select('*');
    
    // Aplicar filtros se houver condições WHERE
    if (whereConditions) {
      for (const condition of whereConditions) {
        if (condition.operator === '=') {
          supabaseQuery = supabaseQuery.eq(condition.column, condition.value);
        } else if (condition.operator === '<>') {
          supabaseQuery = supabaseQuery.neq(condition.column, condition.value);
        } else if (condition.operator === '>') {
          supabaseQuery = supabaseQuery.gt(condition.column, condition.value);
        } else if (condition.operator === '<') {
          supabaseQuery = supabaseQuery.lt(condition.column, condition.value);
        } else if (condition.operator === 'LIKE') {
          // Para LIKE, usamos .ilike no Supabase
          const likeValue = condition.value.replace(/%/g, '*');
          supabaseQuery = supabaseQuery.ilike(condition.column, likeValue);
        } else if (condition.operator === 'IN') {
          supabaseQuery = supabaseQuery.in(condition.column, condition.value);
        }
      }
    }
    
    // Extrair e aplicar a ordenação, se existir
    const orderMatch = query.match(/ORDER\s+BY\s+(.+?)(?:\s+LIMIT|\s*$)/i);
    if (orderMatch && orderMatch[1]) {
      const orderParts = orderMatch[1].split(',').map(part => part.trim());
      for (const orderPart of orderParts) {
        const [column, direction = 'asc'] = orderPart.split(/\s+/);
        const cleanColumn = column.replace(/[\[\]"'`]/g, '');
        const isAscending = direction.toLowerCase() !== 'desc';
        
        supabaseQuery = supabaseQuery.order(cleanColumn, { ascending: isAscending });
      }
    }
    
    // Executar a consulta
    const { data, error } = await supabaseQuery;
    
    if (error) {
      console.error('[db-adapter] Erro no SELECT Supabase:', error);
      throw error;
    }
    
    // Converter nomes de campos para o formato esperado (Pascal Case)
    return convertToPascalCase(data);
  } catch (error) {
    console.error('[db-adapter] Erro ao processar SELECT:', error);
    return [];
  }
}

/**
 * Processa consulta INSERT
 * @private
 */
async function handleInsert(query, params) {
  try {
    // Extrai o nome da tabela da consulta SQL
    const tableMatch = query.match(/INTO\s+([^\s(]+)/i);
    if (!tableMatch || !tableMatch[1]) {
      throw new Error('Não foi possível extrair o nome da tabela da consulta INSERT');
    }
    
    const tableName = tableMatch[1].toLowerCase().replace(/[\[\]"'`]/g, '');
    
    // Prepara os dados para inserção
    const insertData = {};
    
    // Extrair colunas da consulta INSERT
    const columnsMatch = query.match(/\(([^)]+)\)/);
    if (columnsMatch && columnsMatch[1]) {
      const columns = columnsMatch[1].split(',').map(col => col.trim().replace(/[\[\]"'`]/g, ''));
      
      // Verificar se há OUTPUT INSERTED
      const outputMatch = query.match(/OUTPUT\s+INSERTED\..+?VALUES/i);
      const hasOutput = !!outputMatch;
      
      // Extrair valores do INSERT
      const valuesMatch = query.match(/VALUES\s*\(([^)]+)\)/i);
      if (valuesMatch && valuesMatch[1]) {
        const values = valuesMatch[1].split(',').map(val => val.trim());
        
        for (let i = 0; i < columns.length; i++) {
          const columnName = columns[i].toLowerCase();
          const paramMatch = values[i].match(/@(\w+)/);
          
          if (paramMatch && paramMatch[1] && params[paramMatch[1]] !== undefined) {
            insertData[columnName] = params[paramMatch[1]];
          }
        }
      } else {
        // Se não conseguir extrair valores, usar todos os parâmetros
        for (const key in params) {
          insertData[key.toLowerCase()] = params[key];
        }
      }
    } else {
      // Se não conseguir extrair colunas, usar todos os parâmetros
      for (const key in params) {
        insertData[key.toLowerCase()] = params[key];
      }
    }
    
    // Executar a inserção
    const { data, error } = await supabase
      .from(tableName)
      .insert(insertData)
      .select();
    
    if (error) {
      console.error('[db-adapter] Erro no INSERT Supabase:', error);
      throw error;
    }
    
    // Retornar o registro inserido
    return convertToPascalCase(data);
  } catch (error) {
    console.error('[db-adapter] Erro ao processar INSERT:', error);
    throw error;
  }
}

/**
 * Processa consulta UPDATE
 * @private
 */
async function handleUpdate(query, params) {
  try {
    // Extrai o nome da tabela da consulta SQL
    const tableMatch = query.match(/UPDATE\s+([^\s]+)/i);
    if (!tableMatch || !tableMatch[1]) {
      throw new Error('Não foi possível extrair o nome da tabela da consulta UPDATE');
    }
    
    const tableName = tableMatch[1].toLowerCase().replace(/[\[\]"'`]/g, '');
    
    // Extrai SET da consulta
    const setMatch = query.match(/SET\s+(.+?)(?:\s+WHERE|\s*$)/i);
    if (!setMatch || !setMatch[1]) {
      throw new Error('Não foi possível extrair a cláusula SET da consulta UPDATE');
    }
    
    // Prepara os dados para atualização
    const updateData = {};
    const setParts = setMatch[1].split(',').map(part => part.trim());
    
    for (const setPart of setParts) {
      const [column, value] = setPart.split('=').map(item => item.trim());
      const cleanColumn = column.replace(/[\[\]"'`]/g, '').toLowerCase();
      
      // Verifica se o valor é um parâmetro
      const paramMatch = value.match(/@(\w+)/);
      if (paramMatch && paramMatch[1] && params[paramMatch[1]] !== undefined) {
        updateData[cleanColumn] = params[paramMatch[1]];
      }
    }
    
    // Extrai cláusula WHERE da consulta
    const whereClause = query.match(/WHERE\s+(.+?)(?:\s*$)/i);
    const whereConditions = whereClause && whereClause[1] ? parseWhereClause(whereClause[1], params) : null;
    
    // Consulta Supabase
    let supabaseQuery = supabase.from(tableName).update(updateData);
    
    // Aplicar filtros se houver condições WHERE
    if (whereConditions) {
      for (const condition of whereConditions) {
        if (condition.operator === '=') {
          supabaseQuery = supabaseQuery.eq(condition.column, condition.value);
        } else if (condition.operator === '<>') {
          supabaseQuery = supabaseQuery.neq(condition.column, condition.value);
        } else if (condition.operator === '>') {
          supabaseQuery = supabaseQuery.gt(condition.column, condition.value);
        } else if (condition.operator === '<') {
          supabaseQuery = supabaseQuery.lt(condition.column, condition.value);
        } else if (condition.operator === 'LIKE') {
          const likeValue = condition.value.replace(/%/g, '*');
          supabaseQuery = supabaseQuery.ilike(condition.column, likeValue);
        }
      }
    }
    
    // Executar a atualização e retornar os registros atualizados
    const { data, error } = await supabaseQuery.select();
    
    if (error) {
      console.error('[db-adapter] Erro no UPDATE Supabase:', error);
      throw error;
    }
    
    return convertToPascalCase(data);
  } catch (error) {
    console.error('[db-adapter] Erro ao processar UPDATE:', error);
    return [];
  }
}

/**
 * Processa consulta DELETE
 * @private
 */
async function handleDelete(query, params) {
  try {
    // Extrai o nome da tabela da consulta SQL
    const tableMatch = query.match(/FROM\s+([^\s]+)/i);
    if (!tableMatch || !tableMatch[1]) {
      throw new Error('Não foi possível extrair o nome da tabela da consulta DELETE');
    }
    
    const tableName = tableMatch[1].toLowerCase().replace(/[\[\]"'`]/g, '');
    
    // Extrai cláusula WHERE da consulta
    const whereClause = query.match(/WHERE\s+(.+?)(?:\s*$)/i);
    const whereConditions = whereClause && whereClause[1] ? parseWhereClause(whereClause[1], params) : null;
    
    // Consulta Supabase
    let supabaseQuery = supabase.from(tableName).delete();
    
    // Aplicar filtros se houver condições WHERE
    if (whereConditions) {
      for (const condition of whereConditions) {
        if (condition.operator === '=') {
          supabaseQuery = supabaseQuery.eq(condition.column, condition.value);
        } else if (condition.operator === '<>') {
          supabaseQuery = supabaseQuery.neq(condition.column, condition.value);
        } else if (condition.operator === '>') {
          supabaseQuery = supabaseQuery.gt(condition.column, condition.value);
        } else if (condition.operator === '<') {
          supabaseQuery = supabaseQuery.lt(condition.column, condition.value);
        } else if (condition.operator === 'LIKE') {
          const likeValue = condition.value.replace(/%/g, '*');
          supabaseQuery = supabaseQuery.ilike(condition.column, likeValue);
        }
      }
    }
    
    // Executar a exclusão
    const { data, error } = await supabaseQuery.select();
    
    if (error) {
      console.error('[db-adapter] Erro no DELETE Supabase:', error);
      throw error;
    }
    
    return convertToPascalCase(data);
  } catch (error) {
    console.error('[db-adapter] Erro ao processar DELETE:', error);
    return [];
  }
}

/**
 * Analisa uma cláusula WHERE SQL e extrai condições
 * @private
 */
function parseWhereClause(whereClause, params) {
  try {
    // Expressão regular para identificar condições na cláusula WHERE
    const conditions = [];
    
    // Identificar condições com operadores comuns (=, <>, >, <, LIKE, IN)
    const conditionRegex = /([^\s]+)\s*(=|<>|>|<|LIKE|IN)\s*([^\s]+|'[^']*'|\([^)]*\))/gi;
    
    let match;
    while ((match = conditionRegex.exec(whereClause)) !== null) {
      const column = match[1].replace(/[\[\]"'`]/g, '').toLowerCase();
      const operator = match[2].toUpperCase();
      let value = match[3];
      
      // Se o valor é um parâmetro, usar o valor do parâmetro
      const paramMatch = value.match(/@(\w+)/);
      if (paramMatch && paramMatch[1] && params[paramMatch[1]] !== undefined) {
        value = params[paramMatch[1]];
      } else if (value.startsWith("'") && value.endsWith("'")) {
        // Se é uma string literal, remover aspas
        value = value.substring(1, value.length - 1);
      } else if (operator === 'IN' && value.startsWith('(') && value.endsWith(')')) {
        // Se é uma cláusula IN, extrair os valores
        const inValues = value.substring(1, value.length - 1).split(',').map(v => {
          v = v.trim();
          if (v.startsWith("'") && v.endsWith("'")) {
            return v.substring(1, v.length - 1);
          }
          return v;
        });
        value = inValues;
      }
      
      conditions.push({ column, operator, value });
    }
    
    return conditions;
  } catch (error) {
    console.error('[db-adapter] Erro ao analisar cláusula WHERE:', error);
    return [];
  }
}

/**
 * Converte nomes de campos para PascalCase para compatibilidade com o código existente
 * @private
 */
function convertToPascalCase(data) {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => {
      const pascalCaseItem = {};
      for (const key in item) {
        const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
        pascalCaseItem[pascalKey] = item[key];
      }
      return pascalCaseItem;
    });
  } else {
    const pascalCaseItem = {};
    for (const key in data) {
      const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
      pascalCaseItem[pascalKey] = data[key];
    }
    return pascalCaseItem;
  }
} 