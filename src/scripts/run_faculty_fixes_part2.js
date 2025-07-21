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
    
    // Extrai apenas a segunda parte (a partir da linha com "-- ETAPA 2")
    const parts = sqlContent.split('-- ETAPA 2');
    if (parts.length < 2) {
      console.error('Erro: Não foi possível encontrar a seção "-- ETAPA 2" no arquivo SQL.');
      process.exit(1);
    }
    
    const part2 = parts[1];
    
    console.log('Executando a Etapa 2: Criação das novas políticas...');
    
    // Executa o SQL (apenas a segunda parte)
    const { error } = await supabase.rpc('exec_sql', { sql_query: part2 });
    
    if (error) {
      console.error('Erro ao executar o SQL:', error);
      process.exit(1);
    }
    
    console.log('Etapa 2 concluída com sucesso! Novas políticas criadas.');
    console.log('A correção das políticas RLS foi concluída. O problema de recursão infinita deve estar resolvido.');
    
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

runSqlFixes(); 