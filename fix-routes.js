// fix-routes.js
// Script para corrigir os arquivos de rota API que foram modificados incorretamente
const fs = require('fs');
const path = require('path');

console.log('🔧 Iniciando correção das rotas API...');

// Diretório das API routes
const API_DIR = path.join(process.cwd(), 'src', 'app', 'api');

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

// Contador de correções
let fixedCount = 0;

// Para cada arquivo de rota
routeFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Verificar se existem marcadores de maxDuration no meio do arquivo
    if (content.includes('// Limitar duração máxima para o plano gratuito da Vercel')) {
      // Remover todas as ocorrências incorretas de maxDuration no meio do arquivo
      let lines = content.split('\n');
      let newLines = [];
      let skipNext = false;
      let hasDynamicExport = false;
      let hasMaxDurationExport = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detectar exportações existentes
        if (line.includes("export const dynamic = 'force-dynamic'")) {
          hasDynamicExport = true;
        }
        if (line.includes('export const maxDuration = 5')) {
          hasMaxDurationExport = true;
        }
        
        // Pular linhas com comentários de duração máxima no meio do arquivo
        if (line.includes('// Limitar duração máxima para o plano gratuito da Vercel')) {
          skipNext = true;
          continue;
        }
        
        // Pular a linha export const maxDuration = 5 incorreta
        if (skipNext && line.includes('export const maxDuration = 5')) {
          skipNext = false;
          continue;
        }
        
        newLines.push(line);
      }
      
      // Reconstruir o conteúdo do arquivo
      content = newLines.join('\n');
      
      // Adicionar as exportações corretas no início do arquivo se não existirem
      let prefix = '';
      if (!hasDynamicExport) {
        prefix += "// Configurar rota como dinâmica para o ambiente serverless\nexport const dynamic = 'force-dynamic';\n";
      }
      if (!hasMaxDurationExport) {
        prefix += "// Limitar duração máxima para o plano gratuito da Vercel\nexport const maxDuration = 5;\n";
      }
      
      if (prefix) {
        prefix += '\n';
        content = prefix + content;
      }
      
      // Salvar o arquivo corrigido
      fs.writeFileSync(file, content);
      console.log(`✅ Corrigido arquivo: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`❌ Erro ao processar arquivo ${file}:`, error);
  }
});

console.log(`🔧 Correção de rotas API concluída - ${fixedCount} arquivos corrigidos.`); 