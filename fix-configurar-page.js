// Arquivo de correção para o problema no arquivo page.tsx
const fs = require('fs');
const path = require('path');

// Ler o arquivo original
const filePath = path.join(__dirname, 'src', 'app', 'plano', 'configurar', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Obter as linhas do arquivo
const lines = content.split('\n');

// Corrigir as linhas 665-667
if (lines.length > 667) {
  // O problema está nesta região - vamos corrigir diretamente as linhas
  if (lines[665].trim().startsWith('</div>') && 
      lines[666].trim().startsWith('))') &&
      lines[667].trim().startsWith(')}')) {
    
    // Corrigir a sintaxe
    lines[666] = '                  ))}';
  }
}

// Corrigir o problema no final do arquivo (AppLayout não fechado)
let lastLines = [];
for (let i = lines.length - 1; i >= lines.length - 10; i--) {
  lastLines.unshift(lines[i]);
}

const lastLinesStr = lastLines.join('\n');
// Verificar se o padrão problemático está presente
if (lastLinesStr.includes('</div>') && 
    !lastLinesStr.includes('</AppLayout>') && 
    lastLinesStr.includes(');')) {
  
  // Corrigir o final do arquivo
  lines[lines.length - 3] = '      </div>';
  lines[lines.length - 2] = '    </AppLayout>';
  lines[lines.length - 1] = '  );';
  lines.push('}');
}

// Juntar as linhas novamente
const correctedContent = lines.join('\n');

// Escrever o arquivo corrigido
fs.writeFileSync(filePath, correctedContent, 'utf8');
console.log('Arquivo corrigido com sucesso!'); 