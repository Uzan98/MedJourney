import Stripe from 'stripe';
import { createServerSupabaseClient } from '../lib/supabase-server';
import { SubscriptionTier, SubscriptionStatus } from '../types/subscription';
import { SupabaseClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class SubscriptionService {
  /**
   * Cria uma sessão de checkout para assinatura
   */
  static async createCheckoutSession(userId: string, planId: string, supabaseClient?: SupabaseClient, userEmail?: string) {
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
    
    // Buscar o email do usuário
    let finalUserEmail = '';
    if (userEmail) {
      // Usar email fornecido como parâmetro
      finalUserEmail = userEmail;
    } else if (supabase && userId) {
      // Fallback: tentar buscar email usando função RPC
      const { data: userAuth, error: userAuthError } = await supabase
        .rpc('get_user_email', { user_id_param: userId });
      if (userAuthError || !userAuth || userAuth.length === 0) {
        throw new Error('Não foi possível obter o email do usuário');
      }
      finalUserEmail = userAuth[0].email;
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
        email: finalUserEmail,
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
      allow_promotion_codes: true,
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
    // Logar variáveis de ambiente para depuração
    console.log('SUPABASE_URL em uso:', process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
    console.log('SUPABASE_SERVICE_ROLE_KEY em uso:', process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Usar supabaseAdmin para garantir acesso com service_role
    let supabase;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('Variáveis de ambiente do Supabase não encontradas');
        throw new Error('Configuração do Supabase incompleta');
      }
      
      // Criar cliente com service_role key
      supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    } catch (error) {
      console.error('Erro ao criar cliente Supabase Admin:', error);
      // Fallback para o cliente fornecido
      supabase = supabaseClient;
    }
    
    if (!supabase) {
      throw new Error('Cliente Supabase não disponível');
    }
    
    // Logar o userId recebido
    console.log('CancelSubscription chamado para user_id:', userId);
    // Obter assinatura do usuário
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single();
    
    // Logar o resultado da consulta e possível erro
    console.log('Resultado da consulta user_subscriptions:', subscription);
    if (subscriptionError) {
      console.error('Erro ao buscar assinatura:', subscriptionError);
    }
    
    if (!subscription?.stripe_subscription_id) {
      throw new Error('Assinatura não encontrada');
    }
    
    // Logar o id da assinatura antes de chamar o Stripe
    console.log('Cancelando assinatura Stripe:', subscription.stripe_subscription_id);
    
    // Cancelar assinatura no Stripe
    try {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true
      });
    } catch (err: any) {
      console.error('Erro ao cancelar no Stripe:', err);
      throw new Error('Erro ao cancelar no Stripe: ' + (err?.message || err));
    }
    
    // Atualizar status no banco de dados
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: true
      })
      .eq('user_id', userId);
      
    if (updateError) {
      console.error('Erro ao atualizar status da assinatura no banco:', updateError);
    }
    
    return { success: true };
  }

  /**
   * Obtém a assinatura do usuário
   */
  static async getUserSubscription(userId: string, supabaseClient?: SupabaseClient) {
    const supabase = supabaseClient || createServerSupabaseClient();
    
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    if (error) {
      console.error('Erro ao buscar assinatura:', error);
      return null;
    }
    
    return subscription;
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
    
    // Se não encontrar assinatura, retorna limites do plano gratuito
    if (!userSubscription) {
      const { data: freePlan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('tier', 'free')
        .single();
      
      const defaultFeatures = freePlan?.features || {
        maxDisciplines: 5,
        maxFlashcardDecks: 2,
        maxQuestionsPerDay: 10,
        aiPlanningAccess: false,
        communityFeaturesAccess: true,
        facultyFeaturesAccess: true,
        advancedAnalytics: false,
        prioritySupport: false
      };
      
      return {
        tier: SubscriptionTier.FREE,
        disciplinesUsed: usage?.disciplines_count || 0,
        disciplinesLimit: defaultFeatures.maxDisciplines,
        flashcardDecksUsed: usage?.flashcard_decks_count || 0,
        flashcardDecksLimit: defaultFeatures.maxFlashcardDecks,
        questionsUsedToday: usage?.questions_used_today || 0,
        questionsLimitPerDay: defaultFeatures.maxQuestionsPerDay || 10,
        hasAiPlanningAccess: defaultFeatures.aiPlanningAccess,
        hasCommunityAccess: defaultFeatures.communityFeaturesAccess,
        hasFacultyAccess: defaultFeatures.facultyFeaturesAccess,
        hasAdvancedAnalytics: defaultFeatures.advancedAnalytics,
        hasPrioritySupport: defaultFeatures.prioritySupport,
        maxSubjectsPerDiscipline: defaultFeatures.maxSubjectsPerDiscipline || 5,
        maxStudySessionsPerDay: defaultFeatures.maxStudySessionsPerDay || 3,
        studySessionsUsedToday: usage?.study_sessions_used_today || 0,
        maxSimuladosPerWeek: defaultFeatures.maxSimuladosPerWeek || 1,
        simuladosUsedThisWeek: usage?.simulados_used_this_week || 0,
        maxSimuladosPerMonth: defaultFeatures.maxSimuladosPerMonth || 4,
        simuladosUsedThisMonth: usage?.simulados_used_this_month || 0,
        maxExamAttemptsPerWeek: defaultFeatures.maxExamAttemptsPerWeek || 1,
        examAttemptsUsedThisWeek: usage?.exam_attempts_used_this_week || 0,
        maxExamAttemptsPerMonth: defaultFeatures.maxExamAttemptsPerMonth || 4,
        examAttemptsUsedThisMonth: usage?.exam_attempts_used_this_month || 0,
        maxQuestionsPerSimulado: defaultFeatures.maxQuestionsPerSimulado || 30,
        maxFlashcardsPerDeck: defaultFeatures.maxFlashcardsPerDeck || 30,
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
      questionsUsedToday: usage.questions_used_today || 0,
      questionsLimitPerDay: features.maxQuestionsPerDay || 10,
      hasAiPlanningAccess: features.aiPlanningAccess,
      hasCommunityAccess: features.communityFeaturesAccess,
      hasFacultyAccess: features.facultyFeaturesAccess,
      hasAdvancedAnalytics: features.advancedAnalytics,
      hasPrioritySupport: features.prioritySupport,
      maxSubjectsPerDiscipline: features.maxSubjectsPerDiscipline || 5,
      maxStudySessionsPerDay: features.maxStudySessionsPerDay || 3,
      studySessionsUsedToday: usage.study_sessions_used_today || 0,
      maxSimuladosPerWeek: features.maxSimuladosPerWeek || 1,
      simuladosUsedThisWeek: usage.simulados_used_this_week || 0,
      maxSimuladosPerMonth: features.maxSimuladosPerMonth || 4,
      simuladosUsedThisMonth: usage.simulados_used_this_month || 0,
      maxExamAttemptsPerWeek: features.maxExamAttemptsPerWeek || 1,
      examAttemptsUsedThisWeek: usage.exam_attempts_used_this_week || 0,
      maxExamAttemptsPerMonth: features.maxExamAttemptsPerMonth || 4,
      examAttemptsUsedThisMonth: usage.exam_attempts_used_this_month || 0,
      maxQuestionsPerSimulado: features.maxQuestionsPerSimulado || 30,
      maxFlashcardsPerDeck: features.maxFlashcardsPerDeck || 30,
    };
  }

  /**
   * Verifica se o usuário atingiu o limite de uma funcionalidade específica
   */
  static async hasReachedFeatureLimit(
    userId: string, 
    feature: 'disciplines' | 'flashcardDecks' | 'questionsPerDay',
    supabaseClient?: SupabaseClient
  ): Promise<boolean> {
    const limits = await this.getUserSubscriptionLimits(userId, supabaseClient);
    
    switch (feature) {
      case 'disciplines':
        // Se o limite é -1, significa ilimitado (Pro+)
        if (limits.disciplinesLimit === -1) return false;
        return limits.disciplinesUsed >= limits.disciplinesLimit;
      case 'flashcardDecks':
        // Se o limite é -1, significa ilimitado (Pro+)
        if (limits.flashcardDecksLimit === -1) return false;
        return limits.flashcardDecksUsed >= limits.flashcardDecksLimit;
      case 'questionsPerDay':
        // Se o limite é -1, significa ilimitado (Pro+)
        if (limits.questionsLimitPerDay === -1) return false;
        return limits.questionsUsedToday >= limits.questionsLimitPerDay;
      default:
        return false;
    }
  }

  /**
   * Verifica se o usuário tem acesso a uma funcionalidade específica
   */
  static async hasFeatureAccess(
    userId: string,
    feature: 'aiPlanning' | 'community' | 'faculty' | 'advancedAnalytics' | 'prioritySupport',
    supabaseClient?: SupabaseClient
  ): Promise<boolean> {
    const limits = await this.getUserSubscriptionLimits(userId, supabaseClient);
    
    switch (feature) {
      case 'aiPlanning':
        return limits.hasAiPlanningAccess;
      case 'community':
        return limits.hasCommunityAccess;
      case 'faculty':
        return limits.hasFacultyAccess;
      case 'advancedAnalytics':
        return limits.hasAdvancedAnalytics;
      case 'prioritySupport':
        return limits.hasPrioritySupport;
      default:
        return false;
    }
  }
}