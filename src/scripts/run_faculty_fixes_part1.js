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

async function runSqlFixes() {
  try {
    // Lê o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'fix_faculty_policies.sql');
    let sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Extrai apenas a primeira parte (até a linha com "-- ETAPA 2")
    const parts = sqlContent.split('-- ETAPA 2');
    const part1 = parts[0];
    
    console.log('Executando a Etapa 1: Remoção das políticas existentes...');
    
    // Executa o SQL (apenas a primeira parte)
    const { error } = await supabase.rpc('exec_sql', { sql_query: part1 });
    
    if (error) {
      console.error('Erro ao executar o SQL:', error);
      process.exit(1);
    }
    
    console.log('Etapa 1 concluída com sucesso! Políticas antigas removidas.');
    console.log('Agora execute o script run_faculty_fixes_part2.js para criar as novas políticas.');
    
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

runSqlFixes(); 