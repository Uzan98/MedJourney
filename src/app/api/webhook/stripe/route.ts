import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionStatus } from '../../../../types/subscription';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET; // Opcional para testes

// Use Service Role Key para garantir permissões totais
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    console.log('Stripe webhook received:', event.type, event.data?.object);
    
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
      default:
        console.log(`Unhandled event type: ${event.type}`);
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
  
  console.log('Metadata:', { userId, planId });
  
  if (!userId || !planId) {
    console.error('No user ID or plan ID found in session metadata', { userId, planId });
    return;
  }
  
  // 3. Get the plan details
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();
  
  if (planError) {
    console.error('Error fetching plan:', planError);
  }
  
  console.log('Fetched plan:', plan);
  
  if (!plan) {
    console.error('Plan not found:', planId);
    return;
  }
  
  // 4. Check if user already has a subscription
  const { data: existingSubscription, error: existingSubError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (existingSubError) {
    console.error('Error fetching existing subscription:', existingSubError);
  }
  
  console.log('Existing subscription:', existingSubscription);
  
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
    } else {
      console.log('Subscription updated successfully for user:', userId);
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
    } else {
      console.log('Subscription created successfully for user:', userId);
      // Create initial usage record
      const { error: usageError } = await supabase
        .from('subscription_usage')
        .insert({
          user_id: userId,
          subscription_id: subscriptionId,
          disciplines_count: 0,
          subjects_per_discipline_count: 0,
          study_sessions_today: 0,
          flashcard_decks_count: 0,
          flashcards_per_deck_count: 0,
          questions_used_week: 0,
          simulados_created_week: 0,
          simulados_questions_count: 0,
          study_groups_created: 0,
          faculty_groups_created: 0,
          last_usage_date: new Date().toISOString(),
          last_week_reset: new Date().toISOString(),
        });
      
      if (usageError) {
        console.error('Error creating usage record:', usageError);
      } else {
        console.log('Usage record created for user:', userId);
      }
    }
  }
}

/**
 * Handle invoice.paid event
 */
async function handleInvoicePaid(invoice: any) {
  console.log('Invoice paid:', invoice);
  
  // 1. Get the subscription ID
  const subscriptionId = invoice.subscription;
  
  if (!subscriptionId) {
    console.error('No subscription ID found in invoice');
    return;
  }
  
  // 2. Update the subscription status in the database
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: SubscriptionStatus.ACTIVE,
    })
    .eq('stripe_subscription_id', subscriptionId);
  
  if (error) {
    console.error('Error updating subscription status:', error);
  }
  
  // 3. Record the transaction
  const { error: transactionError } = await supabase
    .from('subscription_transactions')
    .insert({
      user_id: invoice.customer, // This is not the user ID, but we'll fix it in the real implementation
      subscription_id: subscriptionId,
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      status: 'succeeded',
      stripe_invoice_id: invoice.id,
      payment_method: invoice.payment_method_types?.[0] || null,
    });
  
  if (transactionError) {
    console.error('Error recording transaction:', transactionError);
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: any) {
  console.log('Invoice payment failed:', invoice);
  
  // 1. Get the subscription ID
  const subscriptionId = invoice.subscription;
  
  if (!subscriptionId) {
    console.error('No subscription ID found in invoice');
    return;
  }
  
  // 2. Update the subscription status in the database
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: SubscriptionStatus.PAST_DUE,
    })
    .eq('stripe_subscription_id', subscriptionId);
  
  if (error) {
    console.error('Error updating subscription status:', error);
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: any) {
  console.log('Subscription updated:', subscription);
  
  // 1. Get the subscription ID
  const subscriptionId = subscription.id;
  
  if (!subscriptionId) {
    console.error('No subscription ID found');
    return;
  }
  
  // 2. Map Stripe status to our status
  let status: SubscriptionStatus;
  switch (subscription.status) {
    case 'active':
      status = SubscriptionStatus.ACTIVE;
      break;
    case 'canceled':
      status = SubscriptionStatus.CANCELED;
      break;
    case 'past_due':
      status = SubscriptionStatus.PAST_DUE;
      break;
    case 'unpaid':
      status = SubscriptionStatus.UNPAID;
      break;
    case 'incomplete':
      status = SubscriptionStatus.INCOMPLETE;
      break;
    case 'incomplete_expired':
      status = SubscriptionStatus.INCOMPLETE_EXPIRED;
      break;
    case 'trialing':
      status = SubscriptionStatus.TRIALING;
      break;
    default:
      console.error('Unknown subscription status:', subscription.status);
      return;
  }
  
  // 3. Update the subscription status in the database
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status,
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscriptionId);
  
  if (error) {
    console.error('Error updating subscription status:', error);
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription);
  
  // 1. Get the subscription ID
  const subscriptionId = subscription.id;
  
  if (!subscriptionId) {
    console.error('No subscription ID found');
    return;
  }
  
  // 2. Update the subscription status in the database
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: SubscriptionStatus.CANCELED,
      cancel_at_period_end: false,
    })
    .eq('stripe_subscription_id', subscriptionId);
  
  if (error) {
    console.error('Error updating subscription status:', error);
  }
} 