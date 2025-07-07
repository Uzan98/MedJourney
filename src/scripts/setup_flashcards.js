const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupFlashcards() {
  try {
    console.log('Iniciando configuração das tabelas de flashcards...');

    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, '../sql/flashcards_setup.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Dividir o conteúdo em comandos SQL individuais
    // Esta é uma abordagem simplificada e pode não funcionar para todos os casos
    const sqlCommands = sqlContent
      .split(';')
      .map(command => command.trim())
      .filter(command => command.length > 0);

    console.log(`Encontrados ${sqlCommands.length} comandos SQL para executar.`);

    // Executar cada comando SQL
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      console.log(`Executando comando ${i + 1}/${sqlCommands.length}...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: command + ';' });
        
        if (error) {
          console.error(`Erro ao executar comando ${i + 1}:`, error);
        }
      } catch (err) {
        console.error(`Exceção ao executar comando ${i + 1}:`, err);
      }
    }

    console.log('Configuração das tabelas de flashcards concluída!');
  } catch (error) {
    console.error('Erro ao configurar tabelas de flashcards:', error);
  }
}

setupFlashcards(); 