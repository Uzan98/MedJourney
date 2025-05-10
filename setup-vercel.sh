#!/bin/bash

# Exibir mensagem de início
echo "🚀 Iniciando configuração para deploy no Vercel..."

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

echo "✅ Estrutura do projeto verificada!"

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependências..."
  npm install --legacy-peer-deps
fi

echo "🔧 Configuração concluída com sucesso!"
echo "⚡ Pronto para build!"
exit 0 