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

async function createSimpleUserLookup() {
  try {
    // Lê o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'create_simple_user_lookup.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Criando função simplificada de busca de usuários...');
    
    // Executa o SQL usando a função exec_sql
    const { error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
    
    if (error) {
      console.error('Erro ao executar o SQL:', error);
      process.exit(1);
    }
    
    console.log('Função get_user_info criada com sucesso!');
    
    // Testar a função com um usuário aleatório
    console.log('Testando a função...');
    
    const { data: testUser, error: testError } = await supabase
      .rpc('exec_sql_select', { 
        sql_query: `
          SELECT id FROM auth.users LIMIT 1;
        `
      });
    
    if (testError) {
      console.error('Erro ao buscar usuário de teste:', testError);
    } else if (testUser && testUser.length > 0) {
      const userId = testUser[0].id;
      
      const { data: userInfo, error: infoError } = await supabase
        .rpc('get_user_info', { user_ids: [userId] });
      
      if (infoError) {
        console.error('Erro ao testar função get_user_info:', infoError);
      } else {
        console.log('Resultado do teste:', userInfo);
      }
    }
    
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

createSimpleUserLookup(); 