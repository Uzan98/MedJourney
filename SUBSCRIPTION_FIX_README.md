# Correção do Erro 406 - Subscription Usage

Este documento descreve a solução implementada para resolver o erro 406 que ocorre ao tentar adicionar questões quando o registro de `subscription_usage` não existe para o usuário.

## 🔍 Problema Identificado

O erro 406 ocorre quando:
1. O usuário tenta adicionar uma questão
2. O trigger `check_questions_per_day_limit` é executado
3. O trigger não encontra um registro na tabela `subscription_usage` para o usuário
4. O trigger falha ao tentar incrementar `questions_used_today`

## ✅ Solução Implementada

### 1. Endpoint de Inicialização

**Arquivo:** `src/app/api/subscription/initialize-usage/route.ts`

Endpoint que cria o registro inicial de `subscription_usage` para usuários que não possuem um.

**Como usar:**
```bash
POST /api/subscription/initialize-usage
Authorization: Bearer <token>
```

### 2. Utilitários de Correção

**Arquivo:** `src/utils/subscription-fix.ts`

Contém funções utilitárias:
- `initializeSubscriptionUsage()`: Chama o endpoint para inicializar o registro
- `checkSubscriptionUsageExists()`: Verifica se o registro existe

### 3. Recuperação Automática

**Arquivo:** `src/services/questions-bank.service.ts`

As funções `addQuestion()` e `clonePublicQuestion()` foram modificadas para:
1. Detectar erros 406 automaticamente
2. Tentar inicializar o `subscription_usage`
3. Repetir a operação uma vez se a inicialização for bem-sucedida

### 4. Componente de Interface

**Arquivo:** `src/components/subscription/SubscriptionUsageFix.tsx`

Componente React que permite ao usuário:
- Verificar se o registro de uso existe
- Inicializar manualmente o registro se necessário

## 🚀 Como Usar

### Opção 1: Recuperação Automática (Recomendada)

A recuperação automática já está implementada. Quando o usuário tentar adicionar uma questão e encontrar o erro 406, o sistema tentará automaticamente:

1. Inicializar o registro de `subscription_usage`
2. Tentar adicionar a questão novamente

### Opção 2: Inicialização Manual

Se o problema persistir, você pode usar o componente `SubscriptionUsageFix`:

```tsx
import SubscriptionUsageFix from '@/components/subscription/SubscriptionUsageFix';

function MyComponent() {
  return (
    <div>
      <SubscriptionUsageFix onSuccess={() => {
        console.log('Registro inicializado com sucesso!');
      }} />
      {/* Resto do seu componente */}
    </div>
  );
}
```

### Opção 3: Chamada Direta da API

```javascript
// No frontend
import { initializeSubscriptionUsage } from '@/utils/subscription-fix';

const result = await initializeSubscriptionUsage();
if (result.success) {
  console.log('Inicializado com sucesso!');
} else {
  console.error('Erro:', result.message);
}
```

## 🧪 Teste da Solução

### Script de Teste Automático

**Arquivo:** `test-subscription-fix.js`

1. Abra o console do navegador na página da aplicação
2. Cole e execute o conteúdo do arquivo `test-subscription-fix.js`
3. O script verificará:
   - Se o usuário está autenticado
   - Se o registro de `subscription_usage` existe
   - Se consegue inicializar o registro via API
   - Se consegue adicionar uma questão de teste

### Teste Manual

1. Faça login na aplicação
2. Tente adicionar uma questão
3. Se ocorrer erro 406, o sistema deve automaticamente:
   - Mostrar uma mensagem no console sobre a tentativa de inicialização
   - Tentar novamente a operação
   - Mostrar sucesso ou erro final

## 🔧 Correção Definitiva (Recomendada)

### Migração SQL

**Arquivo:** `fix_questions_limit_trigger.sql`

Para uma correção definitiva, execute a migração SQL que:

1. Adiciona coluna `is_cloned` à tabela `questions`
2. Corrige o trigger `check_questions_per_day_limit` para:
   - Lidar com registros inexistentes em `subscription_usage`
   - Buscar limites corretamente em `subscription_plans`
   - Inserir registro inicial se necessário
3. Inicializa registros para usuários existentes

**Como aplicar:**

1. Acesse o painel do Supabase
2. Vá para SQL Editor
3. Cole o conteúdo do arquivo `fix_questions_limit_trigger.sql`
4. Execute a migração

## 📋 Verificação Pós-Correção

### 1. Verificar Registros de Usuários

```sql
-- Verificar se todos os usuários têm subscription_usage
SELECT 
  u.id as user_id,
  u.email,
  CASE WHEN su.user_id IS NOT NULL THEN 'Sim' ELSE 'Não' END as tem_subscription_usage
FROM auth.users u
LEFT JOIN subscription_usage su ON u.id = su.user_id
ORDER BY u.created_at DESC;
```

### 2. Testar Adição de Questão

```sql
-- Testar trigger manualmente
INSERT INTO questions (
  user_id, 
  content, 
  question_type, 
  difficulty,
  created_at,
  updated_at
) VALUES (
  'seu-user-id-aqui',
  'Questão de teste',
  'multiple_choice',
  'baixa',
  NOW(),
  NOW()
);
```

## 🚨 Troubleshooting

### Erro: "permission denied for table subscription_usage"

**Causa:** O usuário não tem permissão para inserir diretamente na tabela.

**Solução:** Use o endpoint `/api/subscription/initialize-usage` que usa service role key.

### Erro persiste após inicialização

**Causa:** O trigger ainda não foi corrigido.

**Solução:** Execute a migração SQL `fix_questions_limit_trigger.sql`.

### Usuário com plano Pro+ ainda encontra limite

**Causa:** Trigger não está lendo corretamente o valor `-1` (ilimitado).

**Solução:** A migração SQL corrige essa lógica.

## 📞 Suporte

Se o problema persistir após seguir estas instruções:

1. Verifique os logs do console do navegador
2. Verifique os logs do Supabase
3. Execute o script de teste para diagnóstico detalhado
4. Considere executar a migração SQL para correção definitiva

## 📝 Arquivos Modificados/Criados

- ✅ `src/app/api/subscription/initialize-usage/route.ts` (já existia)
- ✅ `src/utils/subscription-fix.ts` (criado)
- ✅ `src/services/questions-bank.service.ts` (modificado)
- ✅ `src/components/subscription/SubscriptionUsageFix.tsx` (criado)
- ✅ `fix_questions_limit_trigger.sql` (criado anteriormente)
- ✅ `test-subscription-fix.js` (criado)
- ✅ `SUBSCRIPTION_FIX_README.md` (este arquivo)