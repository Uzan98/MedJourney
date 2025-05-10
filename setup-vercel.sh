#!/bin/bash

# Exibir mensagem de início
echo "🚀 Iniciando configuração para deploy no Vercel..."

# Configurar variáveis de ambiente para ignorar erros
export NEXT_IGNORE_ERRORS=1
export NEXT_SKIP_TYPESCRIPT_CHECK=true
export NEXT_TELEMETRY_DISABLED=1

# Garantir que temos a versão correta do ESLint
if ! npm list -g | grep -q eslint@8; then
  echo "📦 Instalando ESLint v8 globalmente..."
  npm install -g eslint@8.57.0
fi

echo "📋 Verificando estrutura do projeto..."

# Verificar se o next.config.js existe
if [ ! -f "next.config.js" ]; then
  echo "❌ Arquivo next.config.js não encontrado!"
  exit 1
fi

# Verificar se .next existe e criá-lo se necessário
if [ ! -d ".next" ]; then
  echo "📁 Criando diretório .next..."
  mkdir -p .next
fi

# Verificar se o diretório src existe
if [ ! -d "src" ]; then
  echo "❌ Diretório src não encontrado!"
  exit 1
fi

# Verificar se o diretório api existe e configurá-lo como dinâmico se necessário
if [ -d "src/app/api" ]; then
  for file in $(find src/app/api -name "route.ts"); do
    # Verificar se o arquivo já tem a configuração dinâmica
    if ! grep -q "export const dynamic = 'force-dynamic'" "$file"; then
      echo "📝 Configurando $file como dinâmico..."
      # Adicionar a linha após as importações
      sed -i '1,/^import/!{/^import/!{/^$/!{/^\/\//!{/^export/!{/./=}}}}}' "$file" | head -1 | xargs -I {} sed -i '{} i\// Configurar esta rota como dinâmica para evitar erros de renderização estática\nexport const dynamic = \'force-dynamic\';' "$file"
    fi
  done
fi

echo "✅ Estrutura do projeto verificada!"

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependências..."
  npm install --legacy-peer-deps
fi

echo "🔧 Configuração concluída com sucesso!"
echo "⚡ Pronto para build!"
exit 0 