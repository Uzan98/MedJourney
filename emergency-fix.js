// emergency-fix.js
// Script de emergência para corrigir os arquivos problemáticos
// que estão causando erros no build

const fs = require('fs');
const path = require('path');

// Arquivos problemáticos identificados nos logs
const problemFiles = [
  path.join(process.cwd(), 'src/app/api/disciplines/[id]/subjects/route.ts'),
  path.join(process.cwd(), 'src/app/api/subjects/route.ts')
];

console.log('🔥 CORREÇÃO DE EMERGÊNCIA: Iniciando reparo de arquivos problemáticos...');

problemFiles.forEach(file => {
  try {
    if (!fs.existsSync(file)) {
      console.log(`⚠️ Arquivo não encontrado: ${file}`);
      return;
    }

    console.log(`🔧 Reparando arquivo: ${file}`);
    
    // Ler o conteúdo do arquivo
    const content = fs.readFileSync(file, 'utf8');
    
    // Extrair todas as importações
    const importLines = [];
    const contentLines = content.split('\n');
    
    for (let i = 0; i < contentLines.length; i++) {
      if (contentLines[i].trim().startsWith('import ')) {
        importLines.push(contentLines[i]);
      }
    }
    
    // Remover todas as diretivas de configuração e suas linhas de comentário
    const cleanedLines = contentLines.filter(line => {
      return !line.includes('export const dynamic =') && 
             !line.includes('export const maxDuration =') &&
             !line.includes('// Configurar esta rota como dinâmica') &&
             !line.includes('// Limitar duração máxima');
    });
    
    // Criar um novo conteúdo com as diretivas no local correto (após as importações)
    const finalContent = [
      // Importações originais
      ...importLines,
      
      // Adicionar as diretivas após as importações
      '',
      '// Configurar esta rota como dinâmica para evitar erros de renderização estática',
      "export const dynamic = 'force-dynamic';",
      '',
      '// Limitar duração máxima para o plano gratuito da Vercel',
      'export const maxDuration = 5;',
      '',
      
      // Resto do conteúdo, excluindo as importações já incluídas
      ...cleanedLines.filter(line => !line.trim().startsWith('import '))
    ].join('\n');
    
    // Fazer backup do arquivo original
    fs.writeFileSync(`${file}.bak`, content);
    console.log(`📦 Backup criado: ${file}.bak`);
    
    // Escrever o novo conteúdo
    fs.writeFileSync(file, finalContent);
    console.log(`✅ Arquivo reparado: ${file}`);
  } catch (error) {
    console.error(`❌ Erro ao reparar arquivo ${file}:`, error);
  }
});

console.log('🏁 Correção de emergência concluída!');
console.log('⚠️ Execute o build novamente para verificar se os erros foram resolvidos.'); 