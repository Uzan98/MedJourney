/**
 * Configuração de conexão com Azure SQL Database
 * Usa dotenv para carregar variáveis de ambiente do arquivo .env.local
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Obter o diretório atual do módulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar o dotenv para carregar o arquivo .env.local
const envPath = join(dirname(dirname(__dirname)), '.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`Aviso: Erro ao carregar arquivo .env.local: ${result.error.message}`);
  console.warn('Usando valores padrão para conexão com o banco de dados.');
}

// Exibir as variáveis de ambiente carregadas (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  console.log('Configurações do banco de dados:');
  console.log(`- Servidor: ${process.env.AZURE_SQL_SERVER || 'não definido'}`);
  console.log(`- Banco: ${process.env.AZURE_SQL_DATABASE || 'não definido'}`);
  console.log(`- Usuário: ${process.env.AZURE_SQL_USER || 'não definido'}`);
  console.log(`- Porta: ${process.env.AZURE_SQL_PORT || '1433'}`);
}

// Criando uma configuração no formato correto para Azure SQL
const server = process.env.AZURE_SQL_SERVER || 'genoma.database.windows.net';
const database = process.env.AZURE_SQL_DATABASE || 'MedJourney';
const userWithoutServer = process.env.AZURE_SQL_USER || 'CloudSA612d7ac6';
// No Azure SQL Database, às vezes é necessário usar o formato username@server
const user = `${userWithoutServer}@${server.split('.')[0]}`;
const password = process.env.AZURE_SQL_PASSWORD || '07091998Sasa*';

// Exibir as configurações completas para debug
console.log('Configurações do banco de dados:');
console.log(`- Servidor: ${server}`);
console.log(`- Banco: ${database}`);
console.log(`- Usuário: ${user}`);
console.log(`- Usuário Original: ${userWithoutServer}`);

// Configuração para o driver mssql
const dbConfig = {
  server: server,
  database: database,
  // Usando o formato user@server que o Azure SQL exige
  user: user,
  password: password,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000
  }
};

// Configuração alternativa usando string de conexão direta
// const connectionString = `Server=tcp:${server},1433;Database=${database};User ID=${user}@${server};Password=${password};Encrypt=true;TrustServerCertificate=False;Connection Timeout=30;`;

console.log('Tentando conectar usando o formato adequado para Azure SQL...');

export default dbConfig; 