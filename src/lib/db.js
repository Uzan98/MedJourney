import sql from 'mssql';
import dbConfig from './db-config.js';

// Pool de conexão para reutilização eficiente
let pool = null;

/**
 * Obtém uma conexão com o banco de dados
 * Reutiliza a conexão quando possível
 */
export async function getConnection() {
  try {
    if (pool) {
      return pool;
    }
    
    pool = await sql.connect(dbConfig);
    console.log("Conexão com SQL Server estabelecida");
    return pool;
  } catch (err) {
    console.error("Erro ao conectar ao SQL Server:", err);
    pool = null;
    throw err;
  }
}

/**
 * Executa uma query SQL com parâmetros opcionais
 * @param {string} query - A query SQL a ser executada
 * @param {Object} params - Objeto com parâmetros nomeados para a query
 * @returns {Promise<Array>} - Array com os resultados da query
 */
export async function executeQuery(query, params = {}) {
  try {
    const conn = await getConnection();
    const request = conn.request();
    
    // Adicionar parâmetros à query
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(query);
    return result.recordset || [];
  } catch (err) {
    console.error("Erro ao executar query:", err);
    throw err;
  }
}

/**
 * Executa uma query SQL com parâmetros e retorna um único resultado
 * @param {string} query - A query SQL a ser executada
 * @param {Object} params - Objeto com parâmetros nomeados para a query
 * @returns {Promise<Object>} - Objeto com o resultado da query
 */
export async function executeQuerySingle(query, params = {}) {
  const results = await executeQuery(query, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Testa a conexão com o banco de dados
 * @returns {Promise<boolean>} - true se a conexão foi estabelecida com sucesso
 */
export async function testConnection() {
  try {
    const conn = await getConnection();
    const result = await conn.request().query('SELECT 1 as test');
    console.log("Teste de conexão bem-sucedido:", result.recordset[0].test);
    return true;
  } catch (err) {
    console.error("Teste de conexão falhou:", err);
    return false;
  }
}

/**
 * Fecha todas as conexões abertas
 */
export async function closePool() {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log("Pool de conexões fechado");
    }
  } catch (err) {
    console.error("Erro ao fechar pool de conexões:", err);
    throw err;
  }
} 