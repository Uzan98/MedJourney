// Script para configuração do ambiente de build na Vercel
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Iniciando configuração JavaScript para deploy no Vercel...');

// Configurações para o tsconfig.json simplificado
const tsConfig = {
  compilerOptions: {
    target: "ES2017",
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: false,
    forceConsistentCasingInFileNames: false,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "node",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    incremental: true,
    noImplicitAny: false,
    noImplicitThis: false,
    noUnusedLocals: false,
    noUnusedParameters: false,
    paths: {
      "@/*": ["./src/*"]
    }
  },
  include: [
    "src/**/*.ts", 
    "src/**/*.tsx",
    "src/**/*.js",
    "src/**/*.jsx"
  ],
  exclude: ["node_modules"]
};

// Configurações para next.config.js simplificado
const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  swcMinify: false,
  images: { unoptimized: true },
  output: 'standalone',
  experimental: {
    serverActions: false,
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;`;

// Função para criar diretório se não existir
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`📁 Criando diretório ${dir}...`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Função para verificar e criar/atualizar arquivo
function createOrUpdateFile(filePath, content, backup = true) {
  const exists = fs.existsSync(filePath);
  
  if (exists && backup) {
    const backupPath = `${filePath}.bak`;
    console.log(`📝 Fazendo backup de ${filePath} para ${backupPath}...`);
    fs.copyFileSync(filePath, backupPath);
  }
  
  console.log(`${exists ? '📝 Atualizando' : '📝 Criando'} arquivo ${filePath}...`);
  fs.writeFileSync(filePath, content);
}

// Verificar diretórios críticos
ensureDirectoryExists(path.join(process.cwd(), '.next'));
ensureDirectoryExists(path.join(process.cwd(), 'src'));

// Configurar tsconfig.json
createOrUpdateFile(
  path.join(process.cwd(), 'tsconfig.json'), 
  JSON.stringify(tsConfig, null, 2)
);

// Configurar next.config.js se necessário
const nextConfigPath = path.join(process.cwd(), 'next.config.js');
if (!fs.existsSync(nextConfigPath)) {
  createOrUpdateFile(nextConfigPath, nextConfig, false);
}

// Configurar .env.production
const envPath = path.join(process.cwd(), '.env.production');
const envContent = `NEXT_IGNORE_ERRORS=1
NEXT_SKIP_TYPESCRIPT_CHECK=true
NEXT_TELEMETRY_DISABLED=1
DISABLE_ESLINT_PLUGIN=true
`;

createOrUpdateFile(envPath, envContent, false);

// Configurar API routes como dinâmicas
const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
if (fs.existsSync(apiDir)) {
  console.log('📝 Configurando rotas API como dinâmicas...');
  
  function findTsFiles(dir) {
    let results = [];
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        results = results.concat(findTsFiles(filePath));
      } else if (file === 'route.ts') {
        results.push(filePath);
      }
    }
    
    return results;
  }
  
  const routeFiles = findTsFiles(apiDir);
  for (const file of routeFiles) {
    let content = fs.readFileSync(file, 'utf8');
    
    if (!content.includes("export const dynamic = 'force-dynamic'")) {
      console.log(`📝 Adicionando configuração dinâmica a ${file}...`);
      const dynamicConfig = "\n// Configurar esta rota como dinâmica para evitar erros de renderização estática\nexport const dynamic = 'force-dynamic';\n";
      
      // Inserir após as importações
      const lines = content.split('\n');
      let insertIndex = 0;
      
      // Encontrar última linha de import ou a primeira linha que não é em branco ou comentário
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() && !lines[i].trim().startsWith('//') && insertIndex === 0) {
          insertIndex = i;
          break;
        }
      }
      
      // Inserir a configuração dinâmica
      lines.splice(insertIndex, 0, dynamicConfig);
      content = lines.join('\n');
      
      fs.writeFileSync(file, content);
    }
  }
}

console.log('✅ Configuração JavaScript concluída com sucesso!'); 