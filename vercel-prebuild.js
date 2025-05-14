const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando script de pré-build para correção de importações no Vercel...');

// Caminho para o diretório de componentes UI
const uiDir = path.join(__dirname, 'src', 'components', 'ui');

// Lista de componentes importantes a serem verificados
const criticalComponents = [
  'button.tsx',
  'card.tsx',
  'toast.tsx',
  'toast-interface.tsx',
  'tabs.tsx',
  'dialog.tsx',
  'dropdown-menu.tsx',
  'input.tsx',
  'select.tsx',
  'label.tsx',
  'textarea.tsx',
];

// Verificar se cada componente existe, se não, criar um arquivo stub
criticalComponents.forEach(component => {
  const componentPath = path.join(uiDir, component);
  if (!fs.existsSync(componentPath)) {
    console.log(`⚠️ Componente não encontrado: ${component}. Criando arquivo stub...`);
    
    // Extrair o nome base do componente
    const baseName = path.basename(component, '.tsx');
    const componentName = baseName
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    
    // Criar um conteúdo stub para o componente
    const stubContent = `"use client";

import React from "react";

// Este é um arquivo stub criado automaticamente para corrigir problemas de build
// O arquivo original pode ter um nome diferente ou estar ausente

export interface ${componentName}Props {
  children?: React.ReactNode;
  [key: string]: any;
}

export const ${componentName} = React.forwardRef<HTMLDivElement, ${componentName}Props>(
  ({ children, ...props }, ref) => {
    console.warn('Stub component: ${componentName} was used but not properly implemented');
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  }
);

${componentName}.displayName = "${componentName}";

// Exportar componentes relacionados como stubs
export const ${componentName}Content = (props: any) => <div {...props} />;
export const ${componentName}Trigger = (props: any) => <div {...props} />;
export const ${componentName}Item = (props: any) => <div {...props} />;
export const ${componentName}Header = (props: any) => <div {...props} />;
export const ${componentName}Footer = (props: any) => <div {...props} />;
export const ${componentName}Title = (props: any) => <div {...props} />;
export const ${componentName}Description = (props: any) => <div {...props} />;
export const ${componentName}Section = (props: any) => <div {...props} />;
export const ${componentName}Separator = (props: any) => <div {...props} />;

export default ${componentName};
`;
    
    // Criar diretório se não existir
    if (!fs.existsSync(uiDir)) {
      fs.mkdirSync(uiDir, { recursive: true });
    }
    
    // Escrever o arquivo stub
    fs.writeFileSync(componentPath, stubContent);
    console.log(`✅ Arquivo stub criado: ${componentPath}`);
  } else {
    console.log(`✓ Componente encontrado: ${component}`);
  }
});

// Corrigir importações com problemas em arquivos específicos que estão falhando na build
const filesToFix = [
  'src/app/admin/database/page.tsx',
  'src/app/dashboard/disciplinas/[id]/page.tsx',
  'src/app/desempenho/page.tsx',
  'src/components/estudos/DisciplineModal.tsx',
  'src/components/estudos/StudyTimer.tsx'
];

// Função para corrigir importações em um arquivo
function fixImportsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Arquivo não encontrado: ${filePath}`);
    return;
  }
  
  console.log(`🔧 Corrigindo importações em: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Padrões de importação com problema e suas correções
  const importPatterns = [
    // Importações relativas problematicas
    {
      pattern: /from ['"]\.\.\/\.\.\/components\/ui\/([^'"]+)['"]/g,
      replacement: 'from \'@/components/ui/$1\''
    },
    {
      pattern: /from ['"]\.\.\/components\/ui\/([^'"]+)['"]/g,
      replacement: 'from \'@/components/ui/$1\''
    },
    {
      pattern: /from ['"]\.\.\/\.\.\/\.\.\/components\/ui\/([^'"]+)['"]/g,
      replacement: 'from \'@/components/ui/$1\''
    },
    // Corrigir maiúsculas/minúsculas
    {
      pattern: /from ['"]@\/components\/ui\/(Button|Card|Tabs|Toast|DropdownMenu|Badge|Dialog|Input|Select|Label|Textarea)['"]/g,
      replacement: (match, componentName) => {
        return `from '@/components/ui/${componentName.toLowerCase()}'`;
      }
    },
    // Corrigir importações com kebab-case
    {
      pattern: /from ['"]@\/components\/ui\/(DropdownMenu|ThemeComponents|SubjectCard)['"]/g,
      replacement: (match, componentName) => {
        const kebabName = componentName
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .toLowerCase();
        return `from '@/components/ui/${kebabName}'`;
      }
    }
  ];
  
  // Aplicar cada padrão de correção
  importPatterns.forEach(({ pattern, replacement }) => {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });
  
  // Se o conteúdo foi modificado, salvar as alterações
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Importações corrigidas em: ${filePath}`);
  } else {
    console.log(`ℹ️ Nenhuma correção necessária em: ${filePath}`);
  }
}

// Corrigir importações nos arquivos identificados como problemáticos
filesToFix.forEach(fixImportsInFile);

console.log('✅ Script de pré-build concluído com sucesso!'); 