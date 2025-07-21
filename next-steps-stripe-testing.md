# Próximos Passos para Testar a Integração com Stripe

Agora que você já configurou o banco de dados e adicionou as chaves de API do Stripe ao seu arquivo `.env.local`, vamos prosseguir com os passos para testar a integração.

## 1. Configurar os Produtos e Preços no Stripe

Primeiro, vamos configurar os produtos e preços no Stripe e atualizar os IDs no banco de dados:

```bash
# Instale as dependências necessárias
npm install stripe dotenv @supabase/supabase-js

# Execute o script de configuração do Stripe
node stripe-setup.js
```

Este script criará os produtos e preços no Stripe e atualizará os IDs no banco de dados.

## 2. Implementar o Serviço de Assinaturas

Agora, vamos implementar o serviço de assinaturas conforme o guia `subscription-integration-steps.md`:

1. **Completar a implementação do `SubscriptionService`**

   Edite o arquivo `src/services/subscription.service.ts` para implementar:
   - O método `createCheckoutSession`
   - O método `cancelSubscription`

   Se o arquivo não existir, crie-o com o seguinte conteúdo:

   ```typescript
   // src/services/subscription.service.ts
   import Stripe from 'stripe';
   import { createServerSupabaseClient } from '../lib/supabase-server';
   import { SubscriptionTier, SubscriptionStatus } from '../types/subscription';

   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

   export class SubscriptionService {
     /**
      * Cria uma sessão de checkout para assinatura
      */
     static async createCheckoutSession(userId: string, planId: string) {
       const supabase = createServerSupabaseClient();
       
       // Obter informações do plano
       const { data: plan } = await supabase
         .from('subscription_plans')
         .select('*')
         .eq('id', planId)
         .single();
       
       if (!plan) {
         throw new Error('Plano não encontrado');
       }
       
       // Obter informações do usuário
       const { data: { user } } = await supabase.auth.admin.getUserById(userId);
       
       if (!user) {
         throw new Error('Usuário não encontrado');
       }
       
       // Criar ou obter cliente no Stripe
       let stripeCustomerId = '';
       const { data: subscription } = await supabase
         .from('user_subscriptions')
         .select('stripe_customer_id')
         .eq('user_id', userId)
         .single();
       
       if (subscription?.stripe_customer_id) {
         stripeCustomerId = subscription.stripe_customer_id;
       } else {
         const customer = await stripe.customers.create({
           email: user.email,
           metadata: {
             userId: userId
           }
         });
         stripeCustomerId = customer.id;
       }
       
       // Criar checkout session
       const session = await stripe.checkout.sessions.create({
         customer: stripeCustomerId,
         line_items: [
           {
             price: plan.stripe_price_id,
             quantity: 1,
           },
         ],
         mode: 'subscription',
         success_url: `${process.env.NEXT_PUBLIC_APP_URL}/perfil/assinatura?success=true`,
         cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/perfil/assinatura?canceled=true`,
         metadata: {
           userId: userId,
           planId: planId
         }
       });
       
       return { url: session.url };
     }

     /**
      * Cancela a assinatura do usuário
      */
     static async cancelSubscription(userId: string) {
       const supabase = createServerSupabaseClient();
       
       // Obter assinatura do usuário
       const { data: subscription } = await supabase
         .from('user_subscriptions')
         .select('stripe_subscription_id')
         .eq('user_id', userId)
         .single();
       
       if (!subscription?.stripe_subscription_id) {
         throw new Error('Assinatura não encontrada');
       }
       
       // Cancelar assinatura no Stripe
       await stripe.subscriptions.update(subscription.stripe_subscription_id, {
         cancel_at_period_end: true
       });
       
       // Atualizar status no banco de dados
       await supabase
         .from('user_subscriptions')
         .update({
           cancel_at_period_end: true
         })
         .eq('user_id', userId);
       
       return { success: true };
     }
   }
   ```

## 3. Implementar o Webhook do Stripe

Vamos configurar o webhook para processar eventos do Stripe:

1. **Instalar a CLI do Stripe para testes locais**

   ```bash
   npm install -g stripe-cli
   stripe login
   ```

2. **Iniciar o webhook local**

   ```bash
   stripe listen --forward-to localhost:3000/api/webhook/stripe
   ```

   Guarde o webhook signing secret fornecido e adicione-o ao seu arquivo `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Implementar o endpoint do webhook**

   Edite o arquivo `src/app/api/webhook/stripe/route.ts`:

   ```typescript
   // src/app/api/webhook/stripe/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { createServerSupabaseClient } from '../../../../lib/supabase-server';
   import { SubscriptionStatus } from '../../../../types/subscription';
   import Stripe from 'stripe';

   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
   const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

   export async function POST(request: NextRequest) {
     try {
       const body = await request.text();
       const signature = request.headers.get('stripe-signature')!;
       
       let event;
       try {
         event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
       } catch (err: any) {
         console.error('Webhook signature verification failed:', err.message);
         return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
       }
       
       // Processar evento
       switch (event.type) {
         case 'checkout.session.completed':
           await handleCheckoutSessionCompleted(event.data.object);
           break;
         case 'invoice.paid':
           await handleInvoicePaid(event.data.object);
           break;
         case 'invoice.payment_failed':
           await handleInvoicePaymentFailed(event.data.object);
           break;
         case 'customer.subscription.updated':
           await handleSubscriptionUpdated(event.data.object);
           break;
         case 'customer.subscription.deleted':
           await handleSubscriptionDeleted(event.data.object);
           break;
       }
       
       return NextResponse.json({ received: true });
     } catch (error) {
       console.error('Error handling webhook:', error);
       return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
     }
   }

   /**
    * Handle checkout.session.completed event
    */
   async function handleCheckoutSessionCompleted(session: any) {
     console.log('Checkout session completed:', session);
     
     // 1. Get the customer and subscription IDs
     const customerId = session.customer;
     const subscriptionId = session.subscription;
     
     // 2. Get the user ID from the metadata
     const userId = session.metadata?.userId;
     const planId = session.metadata?.planId;
     
     if (!userId || !planId) {
       console.error('No user ID or plan ID found in session metadata');
       return;
     }
     
     const supabase = createServerSupabaseClient();
     
     // 3. Get the plan details
     const { data: plan } = await supabase
       .from('subscription_plans')
       .select('*')
       .eq('id', planId)
       .single();
     
     if (!plan) {
       console.error('Plan not found:', planId);
       return;
     }
     
     // 4. Check if user already has a subscription
     const { data: existingSubscription } = await supabase
       .from('user_subscriptions')
       .select('*')
       .eq('user_id', userId)
       .single();
     
     if (existingSubscription) {
       // Update existing subscription
       const { error } = await supabase
         .from('user_subscriptions')
         .update({
           plan_id: planId,
           tier: plan.tier,
           status: SubscriptionStatus.ACTIVE,
           stripe_customer_id: customerId,
           stripe_subscription_id: subscriptionId,
           current_period_start: new Date(),
           current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days as placeholder
           cancel_at_period_end: false,
         })
         .eq('user_id', userId);
       
       if (error) {
         console.error('Error updating subscription:', error);
       }
     } else {
       // Create new subscription
       const { error } = await supabase
         .from('user_subscriptions')
         .insert({
           user_id: userId,
           plan_id: planId,
           tier: plan.tier,
           status: SubscriptionStatus.ACTIVE,
           stripe_customer_id: customerId,
           stripe_subscription_id: subscriptionId,
           current_period_start: new Date(),
           current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days as placeholder
           cancel_at_period_end: false,
         });
       
       if (error) {
         console.error('Error creating subscription:', error);
       }
     }
   }

   // Implementar outras funções de manipulação de eventos...
   async function handleInvoicePaid(invoice: any) {
     // Implementação básica
     console.log('Invoice paid:', invoice);
   }

   async function handleInvoicePaymentFailed(invoice: any) {
     // Implementação básica
     console.log('Invoice payment failed:', invoice);
   }

   async function handleSubscriptionUpdated(subscription: any) {
     // Implementação básica
     console.log('Subscription updated:', subscription);
   }

   async function handleSubscriptionDeleted(subscription: any) {
     // Implementação básica
     console.log('Subscription deleted:', subscription);
   }
   ```

## 4. Implementar o Frontend

Agora, vamos implementar os componentes de frontend para exibir e gerenciar assinaturas:

1. **Atualizar o componente `SubscriptionPlans`**

   Edite o arquivo `src/components/subscription/SubscriptionPlans.tsx`:

   ```typescript
   // Adicione o método handleSubscribe no componente SubscriptionPlans
   const handleSubscribe = async (planId: string) => {
     setIsProcessing(true);
     try {
       const response = await fetch('/api/subscription', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({ planId }),
       });
   
       if (!response.ok) {
         throw new Error('Failed to create checkout session');
       }
   
       const { url } = await response.json();
       
       // Redirecionar para o checkout do Stripe
       if (url) {
         window.location.href = url;
       }
     } catch (error) {
       console.error('Error creating checkout session:', error);
       alert('Erro ao processar pagamento. Tente novamente.');
     } finally {
       setIsProcessing(false);
     }
   };
   ```

2. **Atualizar a página de assinatura**

   Edite o arquivo `src/app/perfil/assinatura/page.tsx`:

   ```typescript
   // Adicione o seguinte código no useEffect
   useEffect(() => {
     const success = searchParams.get('success');
     const canceled = searchParams.get('canceled');
     
     if (success) {
       alert('Assinatura realizada com sucesso!');
       refreshLimits();
     } else if (canceled) {
       alert('Assinatura cancelada.');
     }
   }, [searchParams, refreshLimits]);
   ```

## 5. Testar a Integração

Agora você está pronto para testar a integração com o Stripe:

1. **Iniciar o servidor de desenvolvimento**

   ```bash
   npm run dev
   ```

2. **Iniciar o webhook do Stripe**

   Em outro terminal:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook/stripe
   ```

3. **Testar o fluxo de assinatura**

   - Acesse a página de assinatura: http://localhost:3000/perfil/assinatura
   - Escolha um plano e clique em "Assinar"
   - Use um dos cartões de teste do Stripe:
     - Pagamento bem-sucedido: 4242 4242 4242 4242
     - Pagamento que requer autenticação: 4000 0025 0000 3155
     - Pagamento recusado: 4000 0000 0000 9995
   - Complete o processo de checkout
   - Verifique se o webhook recebeu e processou o evento

4. **Verificar o banco de dados**

   ```sql
   -- Verificar se a assinatura foi criada
   SELECT * FROM user_subscriptions;
   
   -- Verificar se o uso foi inicializado
   SELECT * FROM subscription_usage;
   ```

## 6. Depuração

Se encontrar problemas durante o teste:

1. **Verificar logs do webhook**
   - Observe o terminal onde o comando `stripe listen` está sendo executado
   - Procure por erros ou mensagens de falha

2. **Verificar logs do servidor**
   - Observe o terminal onde o servidor Next.js está sendo executado
   - Procure por erros relacionados ao Stripe ou Supabase

3. **Verificar o painel do Stripe**
   - Acesse o [Dashboard do Stripe](https://dashboard.stripe.com)
   - Vá para "Eventos" para ver se os eventos estão sendo gerados corretamente
   - Verifique se os clientes e assinaturas estão sendo criados

4. **Verificar o banco de dados**
   - Use o painel do Supabase para verificar se os registros estão sendo criados corretamente
   - Verifique se há erros nas tabelas de assinatura

## Próximos Passos

Após testar com sucesso a integração básica:

1. **Implementar recursos adicionais**
   - Portal do cliente do Stripe para autogerenciamento
   - Notificações por email para assinaturas, renovações e falhas
   - Dashboard administrativo para monitorar assinaturas

2. **Preparar para produção**
   - Atualizar para chaves de produção do Stripe
   - Configurar webhook de produção
   - Implementar monitoramento e alertas 