# Guia de Configuração do Sistema de Assinaturas

## Pré-requisitos

- Acesso ao banco de dados Supabase
- Conta no Stripe (pode ser uma conta de teste)
- Node.js instalado para executar scripts

## Passo 1: Preparar o banco de dados

1. **Verificar e configurar a tabela profiles**

   Execute o script `check-profiles-table.sql` para verificar se a tabela profiles existe e tem a coluna 'role':

   ```bash
   psql -h sua_host -d seu_banco -U seu_usuario -f check-profiles-table.sql
   ```

   A saída mostra que a tabela profiles já possui a coluna 'role', então podemos prosseguir.

2. **Criar um usuário admin**

   Execute o script `create-admin-user.sql` para listar os usuários e promover um para admin:

   ```bash
   psql -h sua_host -d seu_banco -U seu_usuario -f create-admin-user.sql
   ```

   Escolha um usuário da lista e execute o comando UPDATE para promovê-lo a admin.

3. **Remover configurações anteriores de assinatura**

   Execute o script `revoke-previous-subscription-changes.sql` para remover as alterações anteriores:

   ```bash
   psql -h sua_host -d seu_banco -U seu_usuario -f revoke-previous-subscription-changes.sql
   ```

4. **Criar a estrutura de assinaturas**

   Execute o script `updated-subscription-tables.sql` para criar todas as tabelas necessárias:

   ```bash
   psql -h sua_host -d seu_banco -U seu_usuario -f updated-subscription-tables.sql
   ```

## Passo 2: Configurar o Stripe

1. **Configurar variáveis de ambiente**

   Crie um arquivo `.env` baseado no exemplo `stripe-env-example.txt`:

   ```bash
   cp stripe-env-example.txt .env
   # Edite o arquivo .env com suas credenciais
   ```

2. **Instalar dependências**

   ```bash
   npm install stripe dotenv @supabase/supabase-js
   ```

3. **Criar produtos e preços no Stripe**

   Execute o script `stripe-setup.js`:

   ```bash
   node stripe-setup.js
   ```

   Este script criará os produtos e preços no Stripe e atualizará os IDs no banco de dados.

## Passo 3: Implementar o backend

1. **Implementar o serviço de assinaturas**

   Siga o guia em `subscription-integration-steps.md` para implementar:
   
   - O método `createCheckoutSession` para criar sessões de checkout
   - O método `cancelSubscription` para cancelar assinaturas
   - O webhook para processar eventos do Stripe

2. **Configurar webhook para testes locais**

   Instale a CLI do Stripe:

   ```bash
   npm install -g stripe-cli
   stripe login
   stripe listen --forward-to localhost:3000/api/webhook/stripe
   ```

   Guarde o webhook signing secret fornecido e adicione-o ao seu arquivo `.env`.

## Passo 4: Implementar o frontend

1. **Implementar componentes de UI**

   Siga o guia em `subscription-integration-steps.md` para implementar:
   
   - O componente `SubscriptionPlans` para exibir e assinar planos
   - A página de assinatura para mostrar o status atual
   - Tratamento de sucesso/cancelamento após checkout

2. **Testar o fluxo completo**

   - Teste a criação de uma assinatura usando cartões de teste do Stripe
   - Teste o cancelamento de assinaturas
   - Verifique se os limites são aplicados corretamente

## Passo 5: Deploy para produção

1. **Atualizar para chaves de produção**

   Edite o arquivo `.env` para usar as chaves de produção do Stripe.

2. **Configurar webhook de produção**

   No dashboard do Stripe, configure o endpoint do webhook para apontar para sua URL de produção:
   
   ```
   https://seu-app.com/api/webhook/stripe
   ```

3. **Monitorar e testar em produção**

   - Faça um teste completo em produção com um cartão real
   - Configure alertas para falhas de pagamento
   - Monitore os logs para detectar problemas

## Próximos passos

- Implementar o portal do cliente do Stripe para autogerenciamento
- Configurar emails de notificação para assinaturas, renovações e falhas
- Criar um dashboard administrativo para monitorar assinaturas e receitas 