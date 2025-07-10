// Script para executar correções nas políticas e funções relacionadas à faculdade
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurações do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias');
  process.exit(1);
}

// Cliente Supabase com chave de serviço para acesso administrativo
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runFacultyFixes() {
  try {
    console.log('Iniciando correções nas políticas de faculdade...');

    // Ler os scripts SQL
    const policyFixesPath = path.join(__dirname, 'fix_faculty_policies.sql');
    const execSqlFunctionPath = path.join(__dirname, 'create_exec_sql_function.sql');

    if (!fs.existsSync(policyFixesPath)) {
      console.error(`Erro: Arquivo ${policyFixesPath} não encontrado`);
      process.exit(1);
    }

    if (!fs.existsSync(execSqlFunctionPath)) {
      console.error(`Erro: Arquivo ${execSqlFunctionPath} não encontrado`);
      process.exit(1);
    }

    const policyFixesSQL = fs.readFileSync(policyFixesPath, 'utf8');
    const execSqlFunctionSQL = fs.readFileSync(execSqlFunctionPath, 'utf8');

    // Executar a função SQL para criar as funções exec_sql e exec_sql_select primeiro
    console.log('Criando funções SQL auxiliares...');
    
    // Dividir o script de funções em comandos individuais
    const functionCommands = execSqlFunctionSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    // Executar cada comando separadamente
    for (const cmd of functionCommands) {
      console.log(`Executando comando: ${cmd.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql_admin', {
        sql: cmd
      }).catch(err => ({ error: err }));

      if (error) {
        console.warn(`Aviso: Erro ao executar comando: ${error.message}`);
        // Continuar mesmo com erro, pois a função pode já existir
      } else {
        console.log('Comando executado com sucesso');
      }
    }

    // Executar as correções nas políticas
    console.log('Aplicando correções nas políticas...');
    
    // Dividir o script de políticas em comandos individuais
    const policyCommands = policyFixesSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    // Executar cada comando separadamente
    for (const cmd of policyCommands) {
      console.log(`Executando comando: ${cmd.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql_admin', {
        sql: cmd
      }).catch(err => ({ error: err }));

      if (error) {
        console.warn(`Aviso: Erro ao executar comando: ${error.message}`);
        // Continuar mesmo com erro, pois a política pode já existir
      } else {
        console.log('Comando executado com sucesso');
      }
    }

    console.log('Correções aplicadas com sucesso!');

    // Verificar se as funções foram criadas corretamente
    console.log('Verificando funções criadas...');
    
    const { data: functions, error: functionsError } = await supabase
      .from('pg_proc')
      .select('proname')
      .in('proname', ['create_faculty_with_admin', 'exec_sql', 'exec_sql_select'])
      .execute();

    if (functionsError) {
      console.warn('Aviso: Não foi possível verificar as funções criadas:', functionsError);
    } else {
      console.log('Funções encontradas:', functions?.length || 0);
      functions?.forEach(fn => console.log(`- ${fn.proname}`));
    }

  } catch (error) {
    console.error('Erro durante a execução das correções:', error);
    process.exit(1);
  }
}

runFacultyFixes(); 