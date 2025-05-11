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

// Para cada arquivo de rota, aplicaremos uma solução completa e robusta
routeFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let needsUpdate = false;
    
    // Verificar se precisamos corrigir este arquivo (remove e reinsere todas as diretivas)
    if (content.includes('export const dynamic') || 
        content.includes('export const maxDuration') ||
        content.includes('// Configurar esta rota como dinâmica') || 
        content.includes('// Limitar duração máxima')) {
      
      // 1. Remover completamente todas as diretivas de exportação existentes
      const lines = content.split('\n');
      const cleanedLines = lines.filter(line => {
        return !line.includes('export const dynamic =') && 
               !line.includes('export const maxDuration =') &&
               !line.includes('// Configurar esta rota como dinâmica') &&
               !line.includes('// Limitar duração máxima');
      });
      
      // 2. Remover linhas em branco extras no início
      while (cleanedLines.length > 0 && cleanedLines[0].trim() === '') {
        cleanedLines.shift();
      }
      
      // 3. Adicionar diretivas corretas no início, após os imports
      // Encontrar onde terminam os imports
      let lastImportIndex = -1;
      for (let i = 0; i < cleanedLines.length; i++) {
        if (cleanedLines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      // Se não encontrou imports, insere no início
      const insertIndex = lastImportIndex !== -1 ? lastImportIndex + 1 : 0;
      
      // Prepara as diretivas a serem inseridas
      const directives = [
        '',
        '// Configurar esta rota como dinâmica para evitar erros de renderização estática',
        "export const dynamic = 'force-dynamic';",
        '',
        '// Limitar duração máxima para o plano gratuito da Vercel',
        'export const maxDuration = 5;',
        ''
      ];
      
      // Inserir as diretivas após o último import ou no início
      cleanedLines.splice(insertIndex, 0, ...directives);
      
      // 4. Reescrever o arquivo com o conteúdo corrigido
      const correctedContent = cleanedLines.join('\n');
      fs.writeFileSync(file, correctedContent);
      
      console.log(`✅ Corrigido arquivo: ${file}`);
      fixedCount++;
      needsUpdate = true;
    }
    
    // Se o arquivo não precisava de atualização, podemos garantir que as diretivas existam
    if (!needsUpdate && 
        (!content.includes('export const dynamic = \'force-dynamic\'') || 
         !content.includes('export const maxDuration = 5'))) {
      
      // Encontrar onde terminam os imports
      const lines = content.split('\n');
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      // Prepara as diretivas a serem inseridas
      const directives = [
        '',
        '// Configurar esta rota como dinâmica para evitar erros de renderização estática',
        "export const dynamic = 'force-dynamic';",
        '',
        '// Limitar duração máxima para o plano gratuito da Vercel',
        'export const maxDuration = 5;',
        ''
      ];
      
      // Inserir as diretivas após o último import ou no início
      const insertIndex = lastImportIndex !== -1 ? lastImportIndex + 1 : 0;
      lines.splice(insertIndex, 0, ...directives);
      
      // Reescrever o arquivo
      fs.writeFileSync(file, lines.join('\n'));
      console.log(`✅ Adicionadas diretivas ao arquivo: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`❌ Erro ao processar arquivo ${file}:`, error);
  }
});

console.log(`🔧 Correção de rotas API concluída - ${fixedCount} arquivos corrigidos.`);

// Agora vamos verificar especificamente os dois arquivos problemáticos mencionados nos logs
const specificFiles = [
  path.join(process.cwd(), 'src/app/api/disciplines/[id]/subjects/route.ts'),
  path.join(process.cwd(), 'src/app/api/subjects/route.ts')
];

specificFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      console.log(`🔍 Verificação adicional do arquivo problemático: ${file}`);
      const content = fs.readFileSync(file, 'utf8');
      
      // Procurar por diretivas no meio de objetos ou blocos de código
      const lines = content.split('\n');
      let inBlock = false;
      let blockIndentation = '';
      let blocksWithIssues = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detectar início de bloco
        if (line.endsWith('{')) {
          inBlock = true;
          blockIndentation = lines[i].match(/^\s*/)[0];
        }
        
        // Verificar se há diretivas dentro do bloco
        if (inBlock && 
            (line.includes('export const dynamic =') || 
             line.includes('export const maxDuration ='))) {
          blocksWithIssues.push({start: i-5, end: i+5}); // Capturar contexto
        }
        
        // Detectar fim de bloco
        if (inBlock && line === '}') {
          inBlock = false;
        }
      }
      
      // Se encontrou problemas, reconstruir o arquivo completamente
      if (blocksWithIssues.length > 0) {
        console.log(`⚠️ Encontrados problemas no arquivo ${file}, aplicando correção completa`);
        
        // Extrair todos os imports
        const importLines = [];
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('import ')) {
            importLines.push(lines[i]);
          }
        }
        
        // Recriar o conteúdo removendo todas as diretivas export const dynamic/maxDuration
        const cleanedLines = lines.filter(line => {
          return !line.includes('export const dynamic =') && 
                 !line.includes('export const maxDuration =') &&
                 !line.includes('// Configurar esta rota como dinâmica') &&
                 !line.includes('// Limitar duração máxima');
        });
        
        // Reconstruir com os imports, diretivas e o resto do conteúdo limpo
        const newContent = [
          ...importLines,
          '',
          '// Configurar esta rota como dinâmica para evitar erros de renderização estática',
          "export const dynamic = 'force-dynamic';",
          '',
          '// Limitar duração máxima para o plano gratuito da Vercel',
          'export const maxDuration = 5;',
          '',
          ...cleanedLines.filter(line => !line.trim().startsWith('import '))
        ].join('\n');
        
        fs.writeFileSync(file, newContent);
        console.log(`🛠️ Aplicada correção especial ao arquivo: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao verificar arquivo específico ${file}:`, error);
    }
  } else {
    console.log(`⚠️ Arquivo específico não encontrado: ${file}`);
  }
});

console.log('✅ Verificação e correção de arquivos específicos concluída!'); 