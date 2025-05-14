const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Mapeamento de todos os componentes UI para seus nomes padronizados em kebab-case
const componentMap = {
  // Componentes principais que estavam causando problemas
  'Button': 'button',
  'Card': 'card',
  'Tabs': 'tabs',
  'Toast': 'toast',
  'DropdownMenu': 'dropdown-menu',
  'Badge': 'badge', 
  'Modal': 'modal',
  'ThemeComponents': 'theme-components',
  'SubjectCard': 'subject-card',
  'Loader': 'loader',
  'Skeleton': 'skeleton',
  
  // Outros componentes possíveis
  'Dialog': 'dialog',
  'Input': 'input',
  'Label': 'label',
  'Select': 'select',
  'Textarea': 'textarea',
  'Checkbox': 'checkbox',
  'RadioGroup': 'radio-group',
  'Popover': 'popover',
  'Calendar': 'calendar',
};

// Lista de pastas a ignorar
const ignoreDirectories = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'out'
];

// Função para verificar se um diretório deve ser ignorado
function shouldIgnoreDirectory(dirPath) {
  return ignoreDirectories.some(dir => dirPath.includes(dir));
}

// Função para encontrar todos os arquivos do projeto
async function findAllFiles(dir, fileList = []) {
  if (shouldIgnoreDirectory(dir)) {
    return fileList;
  }

  try {
    const files = await readdir(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) {
        fileList = await findAllFiles(filePath, fileList);
      } else if (
        file.endsWith('.tsx') || 
        file.endsWith('.ts') || 
        file.endsWith('.jsx') || 
        file.endsWith('.js')
      ) {
        fileList.push(filePath);
      }
    }
  } catch (error) {
    console.error(`Erro ao ler diretório ${dir}: ${error.message}`);
  }
  
  return fileList;
}

// Função para atualizar todas as importações em um arquivo
async function updateImportsInFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;

    // Procurar por todos os padrões de importação possíveis
    for (const [oldName, newName] of Object.entries(componentMap)) {
      // Lista de padrões de importação
      const patterns = [
        // @/components/ui/XXX - caminho absoluto com alias
        new RegExp(`@/components/ui/${oldName}(['"])`, 'g'),
        
        // ../ui/XXX - caminho relativo um nível acima
        new RegExp(`\\.\\./ui/${oldName}(['"])`, 'g'),
        
        // ../../components/ui/XXX - caminho relativo dois níveis acima
        new RegExp(`\\.\\./../components/ui/${oldName}(['"])`, 'g'),
        
        // ../../../components/ui/XXX - caminho relativo três níveis acima
        new RegExp(`\\.\\./\\.\\./../components/ui/${oldName}(['"])`, 'g'),
        
        // ../components/ui/XXX - caminho relativo específico
        new RegExp(`\\.\\./components/ui/${oldName}(['"])`, 'g'),
        
        // ../../components/ui/XXX - outro formato
        new RegExp(`'\\.\\./.\\./components/ui/${oldName}(['"])`, 'g'),
        
        // ./components/ui/XXX - caminho relativo a partir do atual
        new RegExp(`\\./components/ui/${oldName}(['"])`, 'g'),
      ];

      // Testar todos os padrões e fazer substituições
      for (const pattern of patterns) {
        if (pattern.test(updatedContent)) {
          const originalContent = updatedContent;
          updatedContent = updatedContent.replace(pattern, (match, quote) => {
            const replacementPath = match.replace(`/${oldName}${quote}`, `/${newName}${quote}`);
            return replacementPath;
          });
          
          if (originalContent !== updatedContent) {
            hasChanges = true;
            console.log(`Substituição em ${filePath}: ${oldName} → ${newName}`);
          }
        }
      }
    }

    // Se o conteúdo foi alterado, salvar as mudanças
    if (hasChanges) {
      await writeFile(filePath, updatedContent, 'utf8');
      console.log(`✅ Arquivo atualizado: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}: ${error.message}`);
    return false;
  }
}

// Verifica se um componente UI existe no diretório ui e corrige problemas de casing
async function verifyAndFixUIComponentsFiles() {
  console.log('🔍 Verificando e corrigindo arquivos de componentes UI...');
  
  const uiDirPath = path.resolve('./src/components/ui');
  try {
    const files = await readdir(uiDirPath);
    
    // Verificar arquivos existentes e garantir que estejam em kebab-case
    for (const file of files) {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const baseNameWithoutExt = path.basename(file, path.extname(file));
        
        // Se o nome do arquivo contiver maiúsculas
        if (baseNameWithoutExt !== baseNameWithoutExt.toLowerCase()) {
          const kebabCaseName = baseNameWithoutExt
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .toLowerCase() + path.extname(file);
          
          const oldPath = path.join(uiDirPath, file);
          const newPath = path.join(uiDirPath, kebabCaseName);
          
          // Renomear o arquivo
          fs.renameSync(oldPath, newPath);
          console.log(`🔄 Renomeado: ${file} → ${kebabCaseName}`);
        }
      }
    }
    
    // Verificar se os componentes mapeados existem e criar links se necessário
    for (const [oldName, newName] of Object.entries(componentMap)) {
      const oldFilePath = path.join(uiDirPath, `${oldName}.tsx`);
      const newFilePath = path.join(uiDirPath, `${newName}.tsx`);
      
      // Se o arquivo com nome kebab-case existir
      if (fs.existsSync(newFilePath)) {
        // Garantir que o arquivo com o nome camelCase não existe
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath); // Remover o arquivo antigo
          console.log(`🗑️ Removido arquivo duplicado: ${oldName}.tsx`);
        }
      }
      // Se o arquivo no formato kebab-case não existir, mas o camelCase sim
      else if (fs.existsSync(oldFilePath)) {
        // Renomear para kebab-case
        fs.renameSync(oldFilePath, newFilePath);
        console.log(`🔄 Renomeado: ${oldName}.tsx → ${newName}.tsx`);
      }
    }
    
    console.log('✅ Verificação de arquivos UI concluída!');
  } catch (error) {
    console.error(`❌ Erro ao verificar componentes UI: ${error.message}`);
  }
}

// Função principal
async function main() {
  try {
    console.log('🚀 Iniciando correção de importações para Vercel...');
    
    // Verificar e corrigir arquivos de componentes UI
    await verifyAndFixUIComponentsFiles();
    
    // Encontrar todos os arquivos .ts e .tsx no projeto
    console.log('🔍 Procurando arquivos para atualizar importações...');
    const files = await findAllFiles('./src');
    console.log(`📂 Encontrados ${files.length} arquivos`);
    
    // Atualizar importações em todos os arquivos encontrados
    let updatedFilesCount = 0;
    for (const file of files) {
      const isUpdated = await updateImportsInFile(file);
      if (isUpdated) updatedFilesCount++;
    }
    
    console.log(`🎉 Concluído! ${updatedFilesCount} arquivos foram atualizados.`);
    
    // Aviso importante para o usuário
    console.log('\n⚠️ IMPORTANTE: Após executar este script, você deve:');
    console.log('1. Fazer commit das alterações');
    console.log('2. Enviar as alterações para o repositório remoto');
    console.log('3. Iniciar um novo deploy no Vercel');
    
  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
  }
}

// Executar o script
main().catch(console.error); 