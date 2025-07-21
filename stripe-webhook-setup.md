# Configuração do Webhook do Stripe

Ótimo! Você já tem o webhook signing secret do Stripe. Aqui estão os próximos passos para configurar corretamente o webhook:

## 1. Adicionar o Webhook Secret ao arquivo .env.local

Adicione a seguinte linha ao seu arquivo `.env.local`:

```
STRIPE_WEBHOOK_SECRET=whsec_b858b47e3daba72714949c163ee34f28a853ff3fd639ea37b0dbf8d786bc4183
```

## 2. Verificar a configuração do Webhook no Stripe Dashboard

1. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com/webhooks)
2. Verifique se o endpoint está configurado corretamente:
   - Para desenvolvimento local: `http://localhost:3000/api/webhook/stripe`
   - Para produção: `https://seu-site.com/api/webhook/stripe`
3. Certifique-se de que os seguintes eventos estão sendo escutados:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## 3. Testar o Webhook Localmente

Para testar o webhook localmente, você pode usar a CLI do Stripe que já está configurada:

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

Este comando encaminhará os eventos do Stripe para seu endpoint local.

## 4. Atualizar os IDs dos Preços no Banco de Dados

Execute o script SQL que criamos para atualizar os IDs dos preços do Stripe no banco de dados:

```bash
psql -h sua_host -d seu_banco -U seu_usuario -f update-stripe-price-ids.sql
```

## 5. Testar a Integração Completa

1. Inicie seu servidor Next.js:
   ```bash
   npm run dev
   ```

2. Em outro terminal, inicie o encaminhamento de webhook do Stripe:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook/stripe
   ```

3. Acesse a página de assinatura e teste o fluxo completo:
   - Escolha um plano
   - Complete o checkout com um cartão de teste
   - Verifique se o webhook processa o evento corretamente

4. Cartões de teste do Stripe:
   - Pagamento bem-sucedido: 4242 4242 4242 4242
   - Pagamento que requer autenticação: 4000 0025 0000 3155
   - Pagamento recusado: 4000 0000 0000 9995

## 6. Verificar o Funcionamento

Após o teste, verifique:

1. No terminal onde o comando `stripe listen` está sendo executado:
   - Deve mostrar eventos sendo enviados e recebidos com sucesso

2. No console do seu aplicativo:
   - Deve mostrar logs de eventos processados pelo webhook

3. No banco de dados:
   - Verifique se os registros foram criados/atualizados corretamente:
   ```sql
   SELECT * FROM user_subscriptions;
   SELECT * FROM subscription_usage;
   ```

4. No Dashboard do Stripe:
   - Verifique se o cliente foi criado
   - Verifique se a assinatura foi criada
   - Verifique se o pagamento foi processado

## Observações Importantes

- O webhook signing secret que você recebeu ( é específico para o ambiente de teste.
- Quando for para produção, você precisará de um novo signing secret.
- Mantenha esse secret seguro e nunca o compartilhe publicamente.

Com essas configurações, seu sistema de assinaturas com Stripe deve estar funcionando corretamente para testes! 