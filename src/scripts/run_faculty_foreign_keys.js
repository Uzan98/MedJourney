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

async function addForeignKeys() {
  try {
    // Lê o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'fix_faculty_foreign_keys.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Adicionando chaves estrangeiras na tabela faculty_members...');
    
    // Executa o SQL usando a função exec_sql
    const { error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
    
    if (error) {
      console.error('Erro ao executar o SQL:', error);
      process.exit(1);
    }
    
    console.log('Chaves estrangeiras adicionadas com sucesso!');
    console.log('Agora você pode usar joins implícitos nas consultas.');
    
    // Verificar se as chaves estrangeiras foram criadas
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('exec_sql_select', { 
        sql_query: `
          SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
                 ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'faculty_members';
        `
      });
    
    if (constraintsError) {
      console.error('Erro ao verificar chaves estrangeiras:', constraintsError);
    } else {
      console.log('Chaves estrangeiras existentes:', constraints);
    }
    
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

addForeignKeys(); 