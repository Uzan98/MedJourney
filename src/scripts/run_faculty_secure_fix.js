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

async function runSecureFix() {
  try {
    // Lê o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'fix_faculty_policies_secure.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Aplicando correções de segurança para as políticas RLS do módulo "Minha Faculdade"...');
    
    // Executa o SQL usando a função exec_sql
    const { error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
    
    if (error) {
      console.error('Erro ao executar o SQL:', error);
      process.exit(1);
    }
    
    console.log('Correções aplicadas com sucesso!');
    console.log('As políticas RLS foram otimizadas com uma abordagem de defesa em profundidade.');
    console.log('O problema de recursão infinita deve estar resolvido.');
    
    // Verificar se as funções foram criadas corretamente
    const { data: functions, error: funcError } = await supabase
      .rpc('exec_sql_select', { 
        sql_query: "SELECT proname FROM pg_proc WHERE proname IN ('is_faculty_member', 'is_faculty_owner', 'is_faculty_admin')" 
      });
    
    if (funcError) {
      console.error('Erro ao verificar funções:', funcError);
    } else {
      console.log('Funções de segurança criadas:', functions);
    }
    
    // Verificar se as políticas foram criadas corretamente
    const { data: policies, error: polError } = await supabase
      .rpc('exec_sql_select', { 
        sql_query: "SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('faculty_members', 'faculties', 'faculty_posts')" 
      });
    
    if (polError) {
      console.error('Erro ao verificar políticas:', polError);
    } else {
      console.log('Políticas RLS criadas:', policies);
    }
    
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

runSecureFix(); 