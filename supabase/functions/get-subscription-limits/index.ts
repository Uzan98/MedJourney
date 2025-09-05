import { serve } from 'https://deno.land/std@0.181.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    });
  }

  try {
    // Get request body
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user subscription
    const { data: userSubscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans:plan_id(*)
      `)
      .eq('user_id', userId)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subscriptionError);
    }

    // Get usage data
    const { data: usageData, error: usageError } = await supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error fetching usage data:', usageError);
    }

    // Count disciplines
    const { count: disciplinesCount, error: disciplinesError } = await supabase
      .from('disciplines')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (disciplinesError) {
      console.error('Error counting disciplines:', disciplinesError);
    }

    // Count flashcard decks
    const { count: flashcardDecksCount, error: flashcardDecksError } = await supabase
      .from('flashcard_decks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (flashcardDecksError) {
      console.error('Error counting flashcard decks:', flashcardDecksError);
    }

    // Count study sessions used today
    const today = new Date().toISOString().split('T')[0];
    const { count: studySessionsToday, error: studySessionsError } = await supabase
      .from('study_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today);

    if (studySessionsError) {
      console.error('Error counting study sessions:', studySessionsError);
    }

    // Count simulados used this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    
    const { count: simuladosThisMonth, error: simuladosMonthError } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', firstDayOfMonth.toISOString());

    if (simuladosMonthError) {
      console.error('Error counting simulados this month:', simuladosMonthError);
    }

    // Count simulados used this week
    const firstDayOfWeek = new Date();
    const day = firstDayOfWeek.getDay();
    const diff = firstDayOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    firstDayOfWeek.setDate(diff);
    firstDayOfWeek.setHours(0, 0, 0, 0);
    
    const { count: simuladosThisWeek, error: simuladosWeekError } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', firstDayOfWeek.toISOString());

    if (simuladosWeekError) {
      console.error('Error counting simulados this week:', simuladosWeekError);
    }

    // If no subscription found OR subscription is canceled, use FREE tier from the database
    if (!userSubscription || userSubscription.status === 'canceled') {
      // Busca o plano Free do banco
      const { data: freePlan, error: freePlanError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('tier', 'free')
        .single();

      if (freePlanError || !freePlan) {
        console.error('Erro ao buscar plano Free:', freePlanError);
        return new Response(JSON.stringify({ error: 'Plano Free não encontrado' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
          },
        });
      }
      const features = freePlan.features || {};
      const defaultLimits = {
        tier: 'free',
        disciplinesUsed: disciplinesCount || 0,
        disciplinesLimit: features.maxDisciplines || 5,
        flashcardDecksUsed: flashcardDecksCount || 0,
        flashcardDecksLimit: features.maxFlashcardDecks || 1,
        questionsUsedToday: usageData?.questions_used_today || 0,
        questionsLimitPerDay: Number(features.maxQuestionsPerDay) || 10,
        hasAiPlanningAccess: features.aiPlanningAccess || false,
        hasCommunityAccess: features.communityFeaturesAccess || true,
        hasFacultyAccess: features.facultyFeaturesAccess || true,
        hasAdvancedAnalytics: features.advancedAnalytics || false,
        hasPrioritySupport: features.prioritySupport || false,
        maxSubjectsPerDiscipline: features.maxSubjectsPerDiscipline || 5,
        maxStudySessionsPerDay: features.maxStudySessionsPerDay || 3,
        studySessionsUsedToday: studySessionsToday || 0,
        maxSimuladosPerWeek: features.maxSimuladosPerWeek || 1,
        simuladosUsedThisWeek: simuladosThisWeek || 0,
        maxSimuladosPerMonth: features.maxSimuladosPerMonth || 4,
        simuladosUsedThisMonth: simuladosThisMonth || 0,
        maxExamAttemptsPerWeek: features.maxExamAttemptsPerWeek || 1,
        examAttemptsUsedThisWeek: usageData?.exam_attempts_used_this_week || 0,
        maxExamAttemptsPerMonth: features.maxExamAttemptsPerMonth || 4,
        examAttemptsUsedThisMonth: usageData?.exam_attempts_used_this_month || 0,
        maxQuestionsPerSimulado: features.maxQuestionsPerSimulado || 30,
        maxFlashcardsPerDeck: features.maxFlashcardsPerDeck || 30,
      };
      console.log('Returning subscription limits (default Free):', defaultLimits);
      return new Response(JSON.stringify(defaultLimits), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
        },
      });
    }

    // Extract features from the plan
    const plan = userSubscription.subscription_plans;
    const features = plan?.features || {};

    // Build limits object based on subscription
    const limits = {
      tier: userSubscription.tier || 'free',
      disciplinesUsed: disciplinesCount || 0,
      disciplinesLimit: features.maxDisciplines || 5,
      flashcardDecksUsed: flashcardDecksCount || 0,
      flashcardDecksLimit: features.maxFlashcardDecks || 1,
      questionsUsedToday: usageData?.questions_used_today || 0,
      questionsLimitPerDay: Number(features.maxQuestionsPerDay) || 10,
      hasAiPlanningAccess: features.aiPlanningAccess || false,
      hasCommunityAccess: features.communityFeaturesAccess || true,
      hasFacultyAccess: features.facultyFeaturesAccess || true,
      hasAdvancedAnalytics: features.advancedAnalytics || false,
      hasPrioritySupport: features.prioritySupport || false,
      maxSubjectsPerDiscipline: features.maxSubjectsPerDiscipline || 5,
      maxStudySessionsPerDay: features.maxStudySessionsPerDay || 3,
      studySessionsUsedToday: studySessionsToday || 0,
      maxSimuladosPerMonth: features.maxSimuladosPerMonth || undefined,
      maxSimuladosPerWeek: features.maxSimuladosPerWeek || 1,
      simuladosUsedThisMonth: simuladosThisMonth || 0,
      simuladosUsedThisWeek: simuladosThisWeek || 0,
      maxExamAttemptsPerWeek: features.maxExamAttemptsPerWeek || 1,
      examAttemptsUsedThisWeek: usageData?.exam_attempts_used_this_week || 0,
      maxExamAttemptsPerMonth: features.maxExamAttemptsPerMonth || 4,
      examAttemptsUsedThisMonth: usageData?.exam_attempts_used_this_month || 0,
      maxQuestionsPerSimulado: features.maxQuestionsPerSimulado || 30,
      maxFlashcardsPerDeck: features.maxFlashcardsPerDeck || 30,
    };

    console.log('Returning subscription limits:', limits);
    return new Response(JSON.stringify(limits), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    });
  } catch (error) {
    console.error('Error in get-subscription-limits function:', error);
    
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
    },
  });
  }
});