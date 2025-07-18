# Integração Direta com o Stripe (Sem CLI)

Vejo que você está tendo problemas com o `stripe login`. Não se preocupe, podemos implementar a integração sem precisar usar a CLI do Stripe. Vamos usar uma abordagem direta que funciona perfeitamente para testes e produção.

## 1. Configuração Inicial

Já verificamos sua conta Stripe e vimos que você já tem produtos configurados:
- **Genoma Pro** (R$25,99/mês)
- **Genoma Pro+** (R$49,90/mês)

Isso é ótimo! Podemos usar esses produtos existentes em vez de criar novos.

## 2. Atualizar IDs no Banco de Dados

Vamos atualizar os IDs dos produtos e preços no banco de dados:

```sql
-- Atualizar o ID do preço do plano Pro
UPDATE subscription_plans 
SET stripe_price_id = 'price_1RNmKkPDAWBZddLb0MrUHu6r' 
WHERE name = 'Pro Mensal';

-- Atualizar o ID do preço do plano Pro+
UPDATE subscription_plans 
SET stripe_price_id = 'price_1Rlx2tPDAWBZddLbYu1N1Syl' 
WHERE name = 'Pro+ Mensal';
```

## 3. Implementar o Serviço de Assinaturas

Crie ou edite o arquivo `src/services/subscription.service.ts`:

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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      throw new Error('Usuário não autenticado');
    }
    
    const userEmail = session.user.email;
    
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
        email: userEmail,
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

## 4. Implementar o Endpoint de API para Assinaturas

Crie ou edite o arquivo `src/app/api/subscription/route.ts`:

```typescript
// src/app/api/subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { SubscriptionService } from '../../../services/subscription.service';

/**
 * POST /api/subscription
 * Create a checkout session for a subscription plan
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Get the plan ID from the request body
    const { planId } = await request.json();
    
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }
    
    // Create a checkout session
    const checkoutSession = await SubscriptionService.createCheckoutSession(userId, planId);
    
    return NextResponse.json(checkoutSession);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/subscription
 * Cancel the current user's subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Cancel the subscription
    const result = await SubscriptionService.cancelSubscription(userId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

## 5. Implementar o Webhook sem CLI

Crie ou edite o arquivo `src/app/api/webhook/stripe/route.ts`:

```typescript
// src/app/api/webhook/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase-server';
import { SubscriptionStatus } from '../../../../types/subscription';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // Opcional para testes

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    let event;
    
    if (webhookSecret && signature) {
      // Verificar assinatura se o segredo estiver disponível
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
      }
    } else {
      // Para testes, podemos aceitar o evento sem verificação
      event = JSON.parse(body);
      console.warn('Webhook signature not verified - use only in development');
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

// Implementações básicas para outros eventos
async function handleInvoicePaid(invoice: any) {
  console.log('Invoice paid:', invoice);
}

async function handleInvoicePaymentFailed(invoice: any) {
  console.log('Invoice payment failed:', invoice);
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('Subscription updated:', subscription);
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription);
}
```

## 6. Configurar o Webhook no Dashboard do Stripe

Em vez de usar a CLI do Stripe, vamos configurar o webhook diretamente no Dashboard do Stripe:

1. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com/webhooks)
2. Clique em "Add endpoint"
3. Insira a URL do seu webhook: `https://seu-site.com/api/webhook/stripe` (ou `http://localhost:3000/api/webhook/stripe` para testes locais com um túnel como ngrok)
4. Selecione os eventos a serem ouvidos:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Clique em "Add endpoint"
6. Copie o "Signing Secret" e adicione-o ao seu arquivo `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## 7. Testar Localmente com Ngrok (Opcional)

Para testar webhooks localmente sem a CLI do Stripe:

1. Instale o Ngrok:
   ```bash
   npm install -g ngrok
   ```

2. Inicie o Ngrok apontando para sua porta local:
   ```bash
   ngrok http 3000
   ```

3. Copie a URL fornecida pelo Ngrok (algo como `https://abc123.ngrok.io`)

4. Configure essa URL como seu endpoint de webhook no Dashboard do Stripe:
   `https://abc123.ngrok.io/api/webhook/stripe`

## 8. Testar a Integração

1. Inicie seu servidor Next.js:
   ```bash
   npm run dev
   ```

2. Acesse a página de assinatura e teste o fluxo completo:
   - Escolha um plano
   - Complete o checkout com um cartão de teste
   - Verifique se o webhook processa o evento corretamente

3. Cartões de teste do Stripe:
   - Pagamento bem-sucedido: 4242 4242 4242 4242
   - Pagamento que requer autenticação: 4000 0025 0000 3155
   - Pagamento recusado: 4000 0000 0000 9995

## 9. Verificar o Dashboard do Stripe

Após testar, verifique no Dashboard do Stripe:
- Clientes criados
- Assinaturas ativas
- Eventos recebidos
- Webhooks entregues

Esta abordagem elimina a necessidade de usar a CLI do Stripe, tornando a integração mais direta e fácil de configurar. 