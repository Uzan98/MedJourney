const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createExecSqlFunction() {
  try {
    console.log('Criando função exec_sql...');
    
    const sqlPath = path.join(__dirname, 'create_exec_sql_function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar SQL diretamente
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // Se a função não existe ainda, executamos o SQL diretamente
      const { error: directError } = await supabase.from('_exec_sql').select('*').limit(1).then(() => {
        console.log('Função exec_sql já existe.');
        return { error: null };
      }).catch(async () => {
        console.log('Criando função exec_sql diretamente...');
        const { error } = await supabase.sql(sql);
        return { error };
      });
      
      if (directError) {
        throw directError;
      }
    } else {
      console.log('Função exec_sql já existe.');
    }
  } catch (error) {
    console.error('Erro ao criar função exec_sql:', error);
    throw error;
  }
}

async function fixFlashcardsView() {
  try {
    console.log('Corrigindo view flashcard_deck_stats...');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'fix_flashcards_view.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar o SQL no Supabase
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      // Tentar executar diretamente se a função não existir
      const { error: directError } = await supabase.sql(sql);
      if (directError) {
        throw directError;
      }
    }
    
    console.log('View flashcard_deck_stats corrigida com sucesso!');
  } catch (error) {
    console.error('Erro ao corrigir view flashcard_deck_stats:', error);
  }
}

async function main() {
  try {
    await createExecSqlFunction();
    await fixFlashcardsView();
  } catch (error) {
    console.error('Erro durante a execução:', error);
  }
}

main(); 