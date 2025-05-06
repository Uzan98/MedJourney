/**
 * Script para testar a conexão com o Supabase
 * Execute com: node scripts/test-supabase.js
 */

// Carregar variáveis de ambiente do arquivo .env.local
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Configurar dotenv
config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('\n===== TESTE DE CONEXÃO SUPABASE =====\n');

  // Verificar variáveis de ambiente
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('Verificando variáveis de ambiente:');
  console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey ? '✅ Configurado' : '❌ Não configurado'}`);

  if (!supabaseUrl || !supabaseKey) {
    console.error('\n❌ ERRO: Variáveis de ambiente não configuradas corretamente.');
    console.log('\nVerifique se o arquivo .env.local contém as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY corretamente.');
    process.exit(1);
  }

  try {
    console.log('\nCriando cliente Supabase...');
    console.log(`URL: ${supabaseUrl}`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Testando conexão com o banco de dados...');
    
    // Testar a tabela users
    console.log('\n1. Verificando tabela "users"...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error(`❌ Erro ao acessar a tabela "users": ${usersError.message}`);
    } else {
      console.log(`✅ Tabela "users" acessada com sucesso! ${usersData.length} registros retornados.`);
    }

    // Testar a tabela disciplines
    console.log('\n2. Verificando tabela "disciplines"...');
    const { data: disciplinesData, error: disciplinesError } = await supabase
      .from('disciplines')
      .select('*')
      .limit(1);
    
    if (disciplinesError) {
      console.error(`❌ Erro ao acessar a tabela "disciplines": ${disciplinesError.message}`);
    } else {
      console.log(`✅ Tabela "disciplines" acessada com sucesso! ${disciplinesData.length} registros retornados.`);
    }

    // Testar a tabela subjects
    console.log('\n3. Verificando tabela "subjects"...');
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .limit(1);
    
    if (subjectsError) {
      console.error(`❌ Erro ao acessar a tabela "subjects": ${subjectsError.message}`);
    } else {
      console.log(`✅ Tabela "subjects" acessada com sucesso! ${subjectsData.length} registros retornados.`);
    }

    // Resumo do teste
    console.log('\n===== RESUMO DO TESTE =====');
    
    const testsPass = !usersError && !disciplinesError && !subjectsError;
    
    if (testsPass) {
      console.log('✅ SUCESSO: A conexão com o Supabase está funcionando corretamente!');
    } else {
      console.error('❌ FALHA: Foram encontrados problemas na conexão com o Supabase.');
      console.log('\nVerifique:');
      console.log('1. Se as credenciais estão corretas no arquivo .env.local');
      console.log('2. Se o projeto Supabase está ativo e acessível');
      console.log('3. Se as tabelas necessárias foram criadas no banco de dados');
    }

  } catch (error) {
    console.error('\n❌ ERRO FATAL AO CONECTAR COM SUPABASE:');
    console.error(error);
    process.exit(1);
  }
}

// Executar o teste
testSupabaseConnection(); 