#!/usr/bin/env node

/**
 * Script para testar a autenticação do Supabase via CLI
 * 
 * Uso: 
 * - Instale o dotenv e o @supabase/supabase-js: npm install dotenv @supabase/supabase-js
 * - Certifique-se de ter um arquivo .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - Rode o script: node test-auth.js login email@example.com senha123
 */

// Importando dependências
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuração do cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não definidas.');
  console.error('Certifique-se de que o arquivo .env.local existe e contém essas variáveis.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Funções de autenticação
async function login(email, password) {
  console.log(`Tentando fazer login com: ${email}`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Erro ao fazer login:', error.message);
    return false;
  }
  
  console.log('Login bem-sucedido!');
  console.log('Informações do usuário:');
  console.log(JSON.stringify(data.user, null, 2));
  console.log('\nInformações da sessão:');
  console.log(JSON.stringify(data.session, null, 2));
  
  return true;
}

async function signup(email, password, name) {
  console.log(`Tentando criar conta com: ${email}`);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      }
    }
  });
  
  if (error) {
    console.error('Erro ao criar conta:', error.message);
    return false;
  }
  
  console.log('Conta criada com sucesso!');
  console.log('Informações do usuário:');
  console.log(JSON.stringify(data.user, null, 2));
  
  return true;
}

async function getSession() {
  console.log('Verificando sessão atual...');
  
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Erro ao obter sessão:', error.message);
    return;
  }
  
  if (data.session) {
    console.log('Sessão ativa encontrada:');
    console.log(JSON.stringify(data.session, null, 2));
  } else {
    console.log('Nenhuma sessão ativa encontrada.');
  }
}

// Processamento de argumentos da linha de comando
const [,, command, ...args] = process.argv;

async function main() {
  if (!command) {
    console.log(`
Uso: node test-auth.js <comando> [argumentos]

Comandos disponíveis:
  login <email> <senha>           - Testa o login com email e senha
  signup <email> <senha> <nome>   - Testa a criação de uma nova conta
  session                         - Verifica se há uma sessão ativa
    `);
    return;
  }

  switch (command.toLowerCase()) {
    case 'login':
      if (args.length < 2) {
        console.error('Erro: Você precisa fornecer email e senha.');
        console.error('Uso: node test-auth.js login <email> <senha>');
        return;
      }
      await login(args[0], args[1]);
      break;
      
    case 'signup':
      if (args.length < 3) {
        console.error('Erro: Você precisa fornecer email, senha e nome.');
        console.error('Uso: node test-auth.js signup <email> <senha> <nome>');
        return;
      }
      await signup(args[0], args[1], args[2]);
      break;
      
    case 'session':
      await getSession();
      break;
      
    default:
      console.error(`Comando desconhecido: ${command}`);
      console.error('Use "node test-auth.js" sem argumentos para ver a ajuda.');
  }
}

main().catch(err => {
  console.error('Erro inesperado:', err);
  process.exit(1);
}); 