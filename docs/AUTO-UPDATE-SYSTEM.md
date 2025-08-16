# Sistema de Atualização Automática do Service Worker

Este documento explica como funciona o sistema de atualização automática implementado para forçar atualizações do service worker sempre que uma nova versão da aplicação for deployada.

## 🎯 Problema Resolvido

Antes da implementação deste sistema, era necessário limpar o cache manualmente a cada nova versão para que as atualizações fossem aplicadas. Agora, o sistema detecta automaticamente novas versões e força a atualização.

## 🏗️ Arquitetura do Sistema

### 1. Geração Automática de Versão

**Arquivo:** `scripts/update-version.js`

- Gera versões baseadas em timestamp (formato: `YYYY.MM.DD.HHMM`)
- Cria o arquivo `src/lib/version.ts` com a versão atual
- Atualiza o `package.json` automaticamente
- Suporta versionamento semântico como alternativa

**Uso:**
```bash
# Versão baseada em timestamp (padrão)
node scripts/update-version.js

# Versão semântica (incrementa patch)
node scripts/update-version.js --semantic

# Atualizar package.json também
node scripts/update-version.js --update-package
```

### 2. Build com Versionamento

**Arquivo:** `scripts/build-with-version.js`

- Atualiza a versão antes de cada build
- Sincroniza a versão no service worker
- Executa o build do Next.js
- Funciona tanto para desenvolvimento quanto produção

**Comandos disponíveis:**
```bash
# Build para produção
npm run build

# Desenvolvimento com versionamento
npm run dev

# Comandos originais (sem versionamento)
npm run build:original
npm run dev:original
```

### 3. Service Worker Inteligente

**Arquivo:** `public/sw.js`

- Versão do cache baseada em timestamp para garantir unicidade
- Responde a mensagens para verificação de versão
- Suporta atualização forçada via `postMessage`
- Limpa caches antigos automaticamente

**Funcionalidades:**
- `getVersion`: Retorna a versão atual
- `forceUpdate`: Força atualização e recarrega a página
- Cache automático com limpeza de versões antigas

### 4. Sistema de Detecção e Notificação

**Arquivo:** `src/lib/utils/offline.ts`

- Verifica atualizações a cada 30 segundos
- Força atualização quando nova versão é detectada
- Gerencia o ciclo de vida do service worker
- Dispara eventos para notificar a UI

**Funções principais:**
- `forceServiceWorkerUpdate()`: Força atualização imediata
- `checkForUpdates()`: Verifica se há atualizações
- `getCurrentServiceWorkerVersion()`: Obtém versão atual

### 5. Interface de Usuário

**Arquivo:** `src/components/ui/update-notification.tsx`

- Componente React para notificar sobre atualizações
- Permite ao usuário escolher quando atualizar
- Mostra versão atual e progresso da atualização
- Integrado automaticamente no layout principal

## 🚀 Fluxo de Atualização

1. **Deploy/Build:**
   - Script gera nova versão baseada em timestamp
   - Service worker é atualizado com nova versão
   - Aplicação é buildada e deployada

2. **Detecção no Cliente:**
   - Sistema verifica atualizações a cada 30 segundos
   - Compara versão local com versão do servidor
   - Detecta quando nova versão está disponível

3. **Notificação ao Usuário:**
   - Componente de notificação aparece na tela
   - Usuário pode escolher atualizar agora ou depois
   - Mostra versão atual para referência

4. **Atualização Forçada:**
   - Service worker antigo é terminado
   - Novo service worker é ativado imediatamente
   - Cache antigo é limpo
   - Página é recarregada automaticamente

## 📋 Scripts Disponíveis

### Versionamento
```bash
# Atualizar versão (timestamp)
npm run version:update

# Atualizar versão (timestamp explícito)
npm run version:timestamp

# Atualizar versão (semântica)
npm run version:semantic
```

### Build e Desenvolvimento
```bash
# Desenvolvimento com versionamento automático
npm run dev

# Build para produção com versionamento
npm run build

# Comandos originais (sem versionamento)
npm run dev:original
npm run build:original
```

## 🔧 Configuração

### Intervalo de Verificação

Para alterar o intervalo de verificação de atualizações, edite a constante em `src/lib/utils/offline.ts`:

```typescript
const VERSION_CHECK_INTERVAL = 30000; // 30 segundos
```

### Formato de Versão

O formato padrão é timestamp (`YYYY.MM.DD.HHMM`), mas pode ser alterado no arquivo `scripts/update-version.js`:

```javascript
function generateVersion() {
  // Personalizar formato aqui
  return `${year}.${month}.${day}.${hour}${minute}`;
}
```

### Desabilitar Verificação Automática

Para desabilitar a verificação automática, comente a chamada em `src/lib/utils/offline.ts`:

```typescript
// startVersionCheck(); // Comentar esta linha
```

## 🐛 Troubleshooting

### Service Worker não atualiza

1. Verificar se o arquivo `src/lib/version.ts` existe
2. Confirmar que a versão no `sw.js` foi atualizada
3. Verificar console do navegador para erros
4. Limpar cache manualmente como último recurso

### Notificação não aparece

1. Verificar se o componente está importado no layout
2. Confirmar que o evento `serviceWorkerUpdateAvailable` está sendo disparado
3. Verificar se há erros no console

### Build falha

1. Verificar se o Node.js tem permissões para escrever arquivos
2. Confirmar que o diretório `scripts/` existe
3. Verificar se todas as dependências estão instaladas

## 📈 Benefícios

- ✅ **Atualizações automáticas**: Usuários sempre têm a versão mais recente
- ✅ **Experiência suave**: Notificação não intrusiva com opção de escolha
- ✅ **Cache inteligente**: Limpeza automática de versões antigas
- ✅ **Desenvolvimento facilitado**: Versionamento automático em builds
- ✅ **Monitoramento**: Logs detalhados para debugging
- ✅ **Flexibilidade**: Suporte a diferentes estratégias de versionamento

## 🔄 Próximos Passos

- [ ] Implementar rollback automático em caso de erro
- [ ] Adicionar métricas de atualização
- [ ] Suporte a atualizações em background
- [ ] Notificações push para atualizações críticas
- [ ] Dashboard de versões deployadas