const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql() {
  try {
    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'fix_faculty_ban_constraint.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Executando SQL para corrigir a restrição de banimento...');

    // Executar o SQL
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
      console.error('Erro ao executar SQL:', error);
      process.exit(1);
    }

    console.log('Restrição de banimento corrigida com sucesso!');
  } catch (error) {
    console.error('Erro ao executar o script:', error);
    process.exit(1);
  }
}

// Executar o script
executeSql(); 