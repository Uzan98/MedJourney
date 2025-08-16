#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { updateVersion } = require('./update-version');

// Função para atualizar o service worker com a nova versão
function updateServiceWorkerVersion(version) {
  const swPath = path.join(__dirname, '..', 'public', 'sw.js');
  
  if (fs.existsSync(swPath)) {
    let swContent = fs.readFileSync(swPath, 'utf8');
    
    // Atualizar a versão no service worker
    swContent = swContent.replace(
      /const APP_VERSION = '[^']*';/,
      `const APP_VERSION = '${version}';`
    );
    
    fs.writeFileSync(swPath, swContent);
    console.log(`✅ Service Worker atualizado com versão ${version}`);
  } else {
    console.warn('⚠️  Arquivo sw.js não encontrado');
  }
}

// Função principal
function buildWithVersion() {
  const args = process.argv.slice(2);
  const isDev = args.includes('--dev');
  const isProduction = args.includes('--production');
  
  console.log('🔄 Iniciando build com atualização de versão...');
  console.log('=' .repeat(50));
  
  try {
    // 1. Atualizar versão
    console.log('📝 Atualizando versão...');
    const newVersion = updateVersion();
    
    // 2. Atualizar service worker
    console.log('🔧 Atualizando Service Worker...');
    updateServiceWorkerVersion(newVersion);
    
    // 3. Executar build
    console.log('🏗️  Executando build...');
    
    let buildCommand;
    if (isDev) {
      buildCommand = 'npm run dev';
    } else if (isProduction) {
      buildCommand = 'npm run build';
    } else {
      buildCommand = 'npm run build';
    }
    
    console.log(`📦 Comando: ${buildCommand}`);
    execSync(buildCommand, { stdio: 'inherit' });
    
    console.log('=' .repeat(50));
    console.log(`✅ Build concluído com sucesso!`);
    console.log(`🚀 Versão: ${newVersion}`);
    console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
    
  } catch (error) {
    console.error('❌ Erro durante o build:', error.message);
    process.exit(1);
  }
}

// Função para build de desenvolvimento
function devBuild() {
  console.log('🔄 Iniciando servidor de desenvolvimento...');
  
  try {
    // Atualizar versão para desenvolvimento
    const newVersion = updateVersion();
    updateServiceWorkerVersion(newVersion);
    
    console.log(`🚀 Versão de desenvolvimento: ${newVersion}`);
    
    // Iniciar servidor de desenvolvimento
    execSync('npm run dev:original', { stdio: 'inherit' });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar desenvolvimento:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('🛠️  Script de Build com Versionamento Automático');
    console.log('');
    console.log('Uso:');
    console.log('  node scripts/build-with-version.js [opções]');
    console.log('');
    console.log('Opções:');
    console.log('  --dev         Iniciar servidor de desenvolvimento');
    console.log('  --production  Build para produção');
    console.log('  --help, -h    Mostrar esta ajuda');
    console.log('');
    console.log('Exemplos:');
    console.log('  node scripts/build-with-version.js --production');
    console.log('  node scripts/build-with-version.js --dev');
    process.exit(0);
  }
  
  if (args.includes('--dev')) {
    devBuild();
  } else {
    buildWithVersion();
  }
}

module.exports = { buildWithVersion, devBuild, updateServiceWorkerVersion };