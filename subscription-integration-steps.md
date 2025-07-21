# Passos para Integração do Sistema de Assinaturas com Stripe

## 1. Configuração Inicial do Stripe

1. **Criar conta no Stripe** (caso ainda não tenha)
   - Acesse [dashboard.stripe.com](https://dashboard.stripe.com) e crie uma conta
   - Complete a verificação da conta para processar pagamentos reais

2. **Obter chaves de API**
   - No Dashboard do Stripe, vá para Developers > API keys
   - Guarde a chave pública (`pk_`) e a chave secreta (`sk_`)
   - Use as chaves de teste (`pk_test_` e `sk_test_`) para desenvolvimento

3. **Configurar variáveis de ambiente**
   ```
   STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## 2. Configuração dos Produtos e Preços no Stripe

1. **Criar produtos para cada plano**
   - No Dashboard do Stripe, vá para Products
   - Crie produtos para "Free", "Pro" e "Pro+"
   - Para cada produto, adicione os preços (mensal e anual)
   - Anote os IDs dos preços (`price_...`)

2. **Atualizar IDs no banco de dados**
   ```sql
   -- Atualizar os IDs dos preços do Stripe na tabela subscription_plans
   UPDATE subscription_plans SET stripe_price_id = 'price_id_do_stripe' WHERE name = 'Pro Mensal';
   UPDATE subscription_plans SET stripe_price_id = 'price_id_do_stripe' WHERE name = 'Pro Anual';
   UPDATE subscription_plans SET stripe_price_id = 'price_id_do_stripe' WHERE name = 'Pro+ Mensal';
   UPDATE subscription_plans SET stripe_price_id = 'price_id_do_stripe' WHERE name = 'Pro+ Anual';
   ```

## 3. Implementação do Serviço de Assinaturas

1. **Completar o método de criação de checkout session**
   ```typescript
   // Em src/services/subscription.service.ts
   
   static async createCheckoutSession(userId: string, planId: string) {
     const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
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
     const { data: user } = await supabase.auth.admin.getUserById(userId);
     
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
         email: user.user.email,
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
   ```

2. **Implementar cancelamento de assinatura**
   ```typescript
   // Em src/services/subscription.service.ts
   
   static async cancelSubscription(userId: string) {
     const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
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
   ```

## 4. Configuração do Webhook do Stripe

1. **Instalar CLI do Stripe para testes locais**
   ```bash
   npm install -g stripe-cli
   stripe login
   ```

2. **Configurar webhook local para testes**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook/stripe
   ```

3. **Completar implementação do webhook**
   ```typescript
   // Em src/app/api/webhook/stripe/route.ts
   
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
   
   // Implementar funções de manipulação de eventos
   // ...
   ```

## 5. Atualização do Frontend

1. **Atualizar componente de planos para usar o Stripe**
   ```typescript
   // Em src/components/subscription/SubscriptionPlans.tsx
   
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

2. **Adicionar página de sucesso/cancelamento**
   ```typescript
   // Em src/app/perfil/assinatura/page.tsx
   
   'use client';
   
   import { useSearchParams } from 'next/navigation';
   import { useEffect } from 'react';
   import { useSubscription } from '../../../contexts/SubscriptionContext';
   
   export default function SubscriptionPage() {
     const searchParams = useSearchParams();
     const { refreshLimits } = useSubscription();
     
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
     
     // Resto do componente...
   }
   ```

## 6. Testes e Validação

1. **Testar fluxo completo de assinatura**
   - Criar uma assinatura com cartão de teste
   - Verificar se o webhook processa o evento
   - Confirmar que o banco de dados é atualizado

2. **Testar cenários de falha**
   - Pagamento recusado
   - Cancelamento de assinatura
   - Atualização de assinatura

3. **Cartões de teste do Stripe**
   - Pagamento bem-sucedido: 4242 4242 4242 4242
   - Pagamento que requer autenticação: 4000 0025 0000 3155
   - Pagamento recusado: 4000 0000 0000 9995

## 7. Implementação de Recursos Adicionais

1. **Portal de gerenciamento de assinatura**
   - Implementar portal do cliente do Stripe para autogerenciamento
   - Adicionar opção para atualizar método de pagamento

2. **Notificações por email**
   - Configurar emails para assinaturas novas, renovações e falhas
   - Usar templates personalizados do Stripe

3. **Relatórios e análises**
   - Implementar dashboard para administradores
   - Monitorar métricas de assinatura (MRR, churn, etc.)

## 8. Deploy para Produção

1. **Atualizar para chaves de produção do Stripe**
   - Substituir chaves de teste por chaves de produção
   - Configurar webhook de produção

2. **Configurar monitoramento**
   - Adicionar logs para eventos importantes
   - Configurar alertas para falhas de pagamento

3. **Documentar o sistema**
   - Criar documentação para o time de suporte
   - Documentar processos de troubleshooting 