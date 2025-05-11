// serverless-check.js
// Script para verificar e configurar as rotas API para o ambiente serverless da Vercel
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configurações serverless para Vercel...');

// Diretório das API routes
const API_DIR = path.join(process.cwd(), 'src', 'app', 'api');

// Verifica se existe o diretório de API
if (!fs.existsSync(API_DIR)) {
  console.log('⚠️ Diretório de API não encontrado, nada a fazer.');
  process.exit(0);
}

// Função para buscar todos os arquivos de rota recursivamente
function findRouteFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      results = results.concat(findRouteFiles(fullPath));
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      results.push(fullPath);
    }
  }
  
  return results;
}

// Encontrar todos os arquivos de rota
const routeFiles = findRouteFiles(API_DIR);
console.log(`📁 Encontrados ${routeFiles.length} arquivos de rota API.`);

// Contador de modificações
let modifiedCount = 0;

// Para cada arquivo de rota
routeFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Verificar se as diretivas já existem
    const hasDynamic = content.includes("export const dynamic = 'force-dynamic'");
    const hasMaxDuration = content.includes('export const maxDuration');
    
    // Se qualquer diretiva estiver faltando, vamos adicionar ambas no início do arquivo
    if (!hasDynamic || !hasMaxDuration) {
      console.log(`📝 Adicionando configurações ao arquivo ${file}`);
      
      // Primeiro, remover qualquer diretiva existente para evitar duplicação
      let lines = content.split('\n');
      lines = lines.filter(line => 
        !line.includes("export const dynamic =") && 
        !line.includes("export const maxDuration =") &&
        !line.includes("// Configurar esta rota como dinâmica") &&
        !line.includes("// Limitar duração máxima para o plano gratuito da Vercel")
      );
      
      // Encontrar onde terminam os imports para inserir as diretivas
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      // Preparar as diretivas
      const directives = [
        '',
        '// Configurar esta rota como dinâmica para evitar erros de renderização estática',
        "export const dynamic = 'force-dynamic';",
        '',
        '// Limitar duração máxima para o plano gratuito da Vercel',
        'export const maxDuration = 5;',
        ''
      ];
      
      // Inserir no início ou após os imports
      const insertIndex = lastImportIndex >= 0 ? lastImportIndex + 1 : 0;
      lines.splice(insertIndex, 0, ...directives);
      
      // Reconstruir o conteúdo e salvar
      content = lines.join('\n');
      fs.writeFileSync(file, content);
      modifiedCount++;
      modified = true;
    }
    
    if (!modified) {
      console.log(`ℹ️ Arquivo ${file} já possui as configurações necessárias.`);
    }
  } catch (error) {
    console.error(`❌ Erro ao processar arquivo ${file}:`, error);
  }
});

// Verificar o arquivo vercel.json e remover a configuração de regions
const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
if (fs.existsSync(vercelJsonPath)) {
  let vercelConfig;
  try {
    vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    let modified = false;
    
    // Remover propriedade regions
    if (vercelConfig.regions) {
      delete vercelConfig.regions;
      modified = true;
      console.log('🔧 Removida configuração de regions do vercel.json');
    }
    
    // Verificar e ajustar configuração de functions
    if (vercelConfig.functions) {
      for (const funcPattern in vercelConfig.functions) {
        const funcConfig = vercelConfig.functions[funcPattern];
        
        // Ajustar memory e maxDuration para plano gratuito
        if (funcConfig.memory && funcConfig.memory > 256) {
          funcConfig.memory = 256;
          modified = true;
          console.log(`🔧 Ajustado limite de memória para ${funcPattern} para 256MB`);
        }
        
        if (funcConfig.maxDuration && funcConfig.maxDuration > 5) {
          funcConfig.maxDuration = 5;
          modified = true;
          console.log(`🔧 Ajustado limite de duração para ${funcPattern} para 5 segundos`);
        }
        
        // Remover configuração de regions específica de functions
        if (funcConfig.regions) {
          delete funcConfig.regions;
          modified = true;
          console.log(`🔧 Removida configuração de regions para ${funcPattern}`);
        }
      }
    }
    
    // Salvar vercel.json se modificado
    if (modified) {
      fs.writeFileSync(vercelJsonPath, JSON.stringify(vercelConfig, null, 2));
    }
  } catch (error) {
    console.error('❌ Erro ao processar vercel.json:', error);
  }
}

console.log(`✅ Configuração serverless concluída - ${modifiedCount} arquivos modificados.`);
console.log('ℹ️ As configurações foram ajustadas para serem compatíveis com o plano gratuito da Vercel.'); 