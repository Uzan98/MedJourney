const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuração do cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupQueue() {
  try {
    console.log('Iniciando configuração da fila e funções PGMQ (emulação)...');

    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, '../sql/queue_setup.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Dividir conteúdo em comandos SQL individuais
    const sqlCommands = sqlContent
      .split(';')
      .map(command => command.trim())
      .filter(command => command.length > 0);

    console.log(`Encontrados ${sqlCommands.length} comandos SQL para executar.`);

    // Garantir que a função exec_sql existe
    try {
      await supabase.rpc('exec_sql', { sql_query: 'SELECT 1;' });
    } catch (err) {
      console.warn('Função exec_sql pode não existir ainda. Considere executar src/scripts/create_exec_sql_function.sql primeiro.');
    }

    // Executar cada comando SQL
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i] + ';';
      console.log(`Executando comando ${i + 1}/${sqlCommands.length}...`);
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: command });
        if (error) {
          console.error(`Erro ao executar comando ${i + 1}:`, error);
        }
      } catch (err) {
        console.error(`Exceção ao executar comando ${i + 1}:`, err);
      }
    }

    console.log('Configuração da fila concluída!');
  } catch (error) {
    console.error('Erro ao configurar fila:', error);
  }
}

setupQueue();