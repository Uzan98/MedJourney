// Backup Database Script
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// Configurações
const backupDir = path.join(__dirname, '../backups');
const dateFormat = new Date().toISOString().replace(/[:.]/g, '-');
const fileName = `medjourney-backup-${dateFormat}.sql`;
const fullPath = path.join(backupDir, fileName);

// Criar diretório de backup se não existir
if (!fs.existsSync(backupDir)) {
  console.log(`Criando diretório de backup: ${backupDir}`);
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('Iniciando backup da base de dados...');
console.log(`Arquivo de saída: ${fullPath}`);

// Instruções para o usuário
console.log('\nIMPORTANTE: Para usar este script, você precisa:');
console.log('1. Ter instalado o cliente psql ou pg_dump');
console.log('2. Configurar as variáveis de ambiente com as credenciais do Supabase');
console.log('   - SUPABASE_DB_HOST');
console.log('   - SUPABASE_DB_NAME');
console.log('   - SUPABASE_DB_USER');
console.log('   - SUPABASE_DB_PASSWORD');
console.log('   - SUPABASE_DB_PORT (opcional, padrão: 5432)\n');

// Exemplo de comando (substituir com o real quando as variáveis estiverem disponíveis)
console.log('Exemplo de comando pg_dump:');
console.log('pg_dump -h <host> -U <user> -d <database> -p <port> -F p -f <arquivo_saida>\n');

console.log('Para restaurar o backup:');
console.log('psql -h <host> -U <user> -d <database> -p <port> -f <arquivo_backup>\n');

// O comando real seria como este (precisaria das variáveis de ambiente configuradas)
// const command = `pg_dump -h ${process.env.SUPABASE_DB_HOST} -U ${process.env.SUPABASE_DB_USER} -d ${process.env.SUPABASE_DB_NAME} -p ${process.env.SUPABASE_DB_PORT || 5432} -F p -f ${fullPath}`;
// exec(command, (error, stdout, stderr) => { ... });

console.log('Configure as variáveis de ambiente e descomente o código de execução para realizar o backup automaticamente.'); 