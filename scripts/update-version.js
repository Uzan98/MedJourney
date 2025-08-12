#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Caminho para o arquivo de versão
const versionFilePath = path.join(__dirname, '..', 'src', 'lib', 'version.ts');
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Função para gerar uma nova versão baseada em timestamp
function generateVersion() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}.${month}.${day}.${hour}${minute}`;
}

// Função para incrementar versão semântica
function incrementSemVersion(currentVersion) {
  const parts = currentVersion.split('.');
  const patch = parseInt(parts[2] || '0') + 1;
  
  return `${parts[0]}.${parts[1]}.${patch}`;
}

// Função para obter versão atual do package.json
function getCurrentVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || '1.0.0';
  } catch (error) {
    console.warn('Não foi possível ler package.json, usando versão padrão');
    return '1.0.0';
  }
}

// Função para atualizar package.json
function updatePackageJson(newVersion) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ package.json atualizado para versão ${newVersion}`);
  } catch (error) {
    console.warn('⚠️  Não foi possível atualizar package.json:', error.message);
  }
}

// Função principal
function updateVersion() {
  const args = process.argv.slice(2);
  const useTimestamp = args.includes('--timestamp');
  const useSemantic = args.includes('--semantic');
  
  let newVersion;
  
  if (useTimestamp) {
    newVersion = generateVersion();
    console.log('📅 Usando versão baseada em timestamp');
  } else if (useSemantic) {
    const currentVersion = getCurrentVersion();
    newVersion = incrementSemVersion(currentVersion);
    console.log('🔢 Incrementando versão semântica');
  } else {
    // Padrão: usar timestamp para builds automáticos
    newVersion = generateVersion();
    console.log('📅 Usando versão baseada em timestamp (padrão)');
  }
  
  // Criar conteúdo do arquivo de versão
  const versionFileContent = `// Arquivo gerado automaticamente - NÃO EDITAR MANUALMENTE
// Última atualização: ${new Date().toISOString()}

export const APP_VERSION = '${newVersion}';
export const BUILD_TIMESTAMP = ${Date.now()};
export const BUILD_DATE = '${new Date().toISOString()}';

// Função para verificar se uma nova versão está disponível
export function isNewerVersion(currentVersion: string, newVersion: string): boolean {
  // Para versões baseadas em timestamp, comparar numericamente
  if (currentVersion.includes('.') && newVersion.includes('.')) {
    const currentParts = currentVersion.split('.').map(Number);
    const newParts = newVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, newParts.length); i++) {
      const current = currentParts[i] || 0;
      const newer = newParts[i] || 0;
      
      if (newer > current) return true;
      if (newer < current) return false;
    }
  }
  
  return false;
}

// Função para formatar versão para exibição
export function formatVersion(version: string): string {
  return version;
}
`;
  
  // Criar diretório se não existir
  const versionDir = path.dirname(versionFilePath);
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }
  
  // Escrever arquivo de versão
  fs.writeFileSync(versionFilePath, versionFileContent);
  console.log(`✅ Versão atualizada para: ${newVersion}`);
  console.log(`📁 Arquivo criado: ${versionFilePath}`);
  
  // Atualizar package.json se solicitado
  if (args.includes('--update-package')) {
    updatePackageJson(newVersion);
  }
  
  return newVersion;
}

// Executar se chamado diretamente
if (require.main === module) {
  try {
    const newVersion = updateVersion();
    console.log(`\n🚀 Nova versão: ${newVersion}`);
    console.log('\n💡 Dicas:');
    console.log('  --timestamp     : Usar versão baseada em timestamp');
    console.log('  --semantic      : Incrementar versão semântica');
    console.log('  --update-package: Atualizar package.json também');
  } catch (error) {
    console.error('❌ Erro ao atualizar versão:', error.message);
    process.exit(1);
  }
}

module.exports = { updateVersion, generateVersion, incrementSemVersion };