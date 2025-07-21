import Stripe from 'stripe';
import { createServerSupabaseClient } from '../lib/supabase-server';
import { SubscriptionTier, SubscriptionStatus } from '../types/subscription';
import { SupabaseClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class SubscriptionService {
  /**
   * Cria uma sessão de checkout para assinatura
   */
  static async createCheckoutSession(userId: string, planId: string, supabaseClient?: SupabaseClient) {
    const supabase = supabaseClient || createServerSupabaseClient();
    
    // Obter informações do plano
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();
    
    if (!plan) {
      throw new Error('Plano não encontrado');
    }
    
    // Buscar o email do usuário na view 'user_emails'
    let userEmail = '';
    if (supabase && userId) {
      const { data: userAuth, error: userAuthError } = await supabase
        .from('user_emails')
        .select('email')
        .eq('id', userId)
        .single();
      if (userAuthError || !userAuth) {
        throw new Error('Não foi possível obter o email do usuário');
      }
      userEmail = userAuth.email;
    } else {
      throw new Error('Usuário não autenticado');
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
        email: userEmail,
        metadata: {
          userId: userId
        }
      });
      stripeCustomerId = customer.id;
    }
    
    // Criar checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
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
    
    return { url: checkoutSession.url };
  }

  /**
   * Cancela a assinatura do usuário
   */
  static async cancelSubscription(userId: string, supabaseClient?: SupabaseClient) {
    const supabase = supabaseClient || createServerSupabaseClient();
    
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

  /**
   * Obtém os limites de assinatura do usuário
   */
  static async getUserSubscriptionLimits(userId: string, supabaseClient?: SupabaseClient) {
    const supabase = supabaseClient || createServerSupabaseClient();
    
    // Obter assinatura do usuário
    const { data: userSubscription } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans:plan_id(*)
      `)
      .eq('user_id', userId)
      .single();
    
    // Obter uso atual
    const { data: usage } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Se não encontrar assinatura ou uso, retorna limites do plano gratuito
    if (!userSubscription || !usage) {
      const { data: freePlan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('tier', 'free')
        .single();
      
      const defaultFeatures = freePlan?.features || {
        maxDisciplines: 5,
        maxFlashcardDecks: 2,
        maxQuestionsPerWeek: 10,
        aiPlanningAccess: false,
        communityFeaturesAccess: true,
        facultyFeaturesAccess: true,
        advancedAnalytics: false,
        prioritySupport: false
      };
      
      return {
        tier: SubscriptionTier.FREE,
        disciplinesUsed: 0,
        disciplinesLimit: defaultFeatures.maxDisciplines,
        flashcardDecksUsed: 0,
        flashcardDecksLimit: defaultFeatures.maxFlashcardDecks,
        questionsUsedToday: 0,
        questionsLimitPerDay: defaultFeatures.maxQuestionsPerWeek / 7, // Aproximação
        hasAiPlanningAccess: defaultFeatures.aiPlanningAccess,
        hasCommunityAccess: defaultFeatures.communityFeaturesAccess,
        hasFacultyAccess: defaultFeatures.facultyFeaturesAccess,
        hasAdvancedAnalytics: defaultFeatures.advancedAnalytics,
        hasPrioritySupport: defaultFeatures.prioritySupport,
      };
    }
    
    // Extrair features do plano
    const features = userSubscription.subscription_plans.features;
    
    return {
      tier: userSubscription.tier as SubscriptionTier,
      disciplinesUsed: usage.disciplines_count || 0,
      disciplinesLimit: features.maxDisciplines,
      flashcardDecksUsed: usage.flashcard_decks_count || 0,
      flashcardDecksLimit: features.maxFlashcardDecks,
      questionsUsedToday: usage.questions_used_week || 0,
      questionsLimitPerDay: features.maxQuestionsPerWeek,
      hasAiPlanningAccess: features.aiPlanningAccess,
      hasCommunityAccess: features.communityFeaturesAccess,
      hasFacultyAccess: features.facultyFeaturesAccess,
      hasAdvancedAnalytics: features.advancedAnalytics,
      hasPrioritySupport: features.prioritySupport,
    };
  }
} 