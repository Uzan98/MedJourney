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
    
    // Verificar e adicionar export const dynamic = 'force-dynamic'
    if (!content.includes("export const dynamic = 'force-dynamic'")) {
      console.log(`📝 Adicionando configuração dynamic a ${file}`);
      // Adicionar no início do arquivo
      const dynamicConfig = "// Configurar rota como dinâmica para o ambiente serverless\nexport const dynamic = 'force-dynamic';\n\n";
      content = dynamicConfig + content;
      modified = true;
    }
    
    // Verificar e adicionar maxDuration como uma exportação no começo do arquivo
    if (!content.includes('export const maxDuration')) {
      console.log(`📝 Adicionando configuração maxDuration a ${file}`);
      
      // Se já adicionamos o dynamic, adicionamos o maxDuration logo abaixo
      if (content.includes("export const dynamic = 'force-dynamic'")) {
        content = content.replace(
          "export const dynamic = 'force-dynamic';", 
          "export const dynamic = 'force-dynamic';\n// Limitar duração máxima para o plano gratuito da Vercel\nexport const maxDuration = 5;"
        );
      } else {
        // Caso contrário, adicionamos no início do arquivo
        const durationConfig = "// Limitar duração máxima para o plano gratuito da Vercel\nexport const maxDuration = 5;\n\n";
        content = durationConfig + content;
      }
      modified = true;
    }
    
    // Salvar arquivo se modificado
    if (modified) {
      fs.writeFileSync(file, content);
      modifiedCount++;
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