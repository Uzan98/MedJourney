const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Mapeamento dos nomes para kebab-case
const componentNameMap = {
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
  'Skeleton': 'skeleton'
};

// Lista de arquivos a serem ignorados
const ignoreDirectories = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build'
];

// Função para verificar se um diretório deve ser ignorado
function shouldIgnoreDirectory(dirPath) {
  return ignoreDirectories.some(dir => dirPath.includes(dir));
}

// Função para encontrar todos os arquivos TypeScript/JavaScript no projeto
async function findFiles(dir, fileList = []) {
  if (shouldIgnoreDirectory(dir)) {
    return fileList;
  }

  const files = await readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const fileStat = await stat(filePath);
    
    if (fileStat.isDirectory()) {
      fileList = await findFiles(filePath, fileList);
    } else if (
      file.endsWith('.tsx') || 
      file.endsWith('.ts') || 
      file.endsWith('.jsx') || 
      file.endsWith('.js')
    ) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// Função para atualizar importações em um arquivo
async function updateImports(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;

    // Procurar por padrões de importação e substituir
    for (const [oldName, newName] of Object.entries(componentNameMap)) {
      // Padrões diferentes de importação
      const patterns = [
        // @/components/ui/XXX
        new RegExp(`@/components/ui/${oldName}(['"])`, 'g'),
        // ../ui/XXX
        new RegExp(`\\.\\./ui/${oldName}(['"])`, 'g'),
        // ../../components/ui/XXX
        new RegExp(`\\.\\./../components/ui/${oldName}(['"])`, 'g'),
        // ../../../components/ui/XXX
        new RegExp(`\\.\\./\\.\\./../components/ui/${oldName}(['"])`, 'g'),
        // '../components/ui/XXX
        new RegExp(`'\\../components/ui/${oldName}(['"])`, 'g'),
        // "./components/ui/XXX
        new RegExp(`\\./components/ui/${oldName}(['"])`, 'g'),
      ];

      for (const pattern of patterns) {
        if (pattern.test(updatedContent)) {
          hasChanges = true;
          updatedContent = updatedContent.replace(pattern, (match, quote) => {
            return `@/components/ui/${newName}${quote}`;
          });
        }
      }
    }

    // Se houver mudanças, atualiza o arquivo
    if (hasChanges) {
      await writeFile(filePath, updatedContent, 'utf8');
      console.log(`Atualizado: ${filePath}`);
    }
  } catch (error) {
    console.error(`Erro ao processar ${filePath}:`, error);
  }
}

// Função principal
async function main() {
  try {
    console.log('Procurando arquivos...');
    const files = await findFiles(path.resolve('./src'));
    console.log(`Encontrados ${files.length} arquivos.`);
    
    for (const file of files) {
      await updateImports(file);
    }
    
    console.log('Concluído!');
  } catch (error) {
    console.error('Erro:', error);
  }
}

main(); 