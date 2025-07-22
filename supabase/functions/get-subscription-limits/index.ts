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

    // Default limits for FREE tier
    const defaultLimits = {
      tier: 'FREE',
      disciplinesUsed: disciplinesCount || 0,
      disciplinesLimit: 5,
      flashcardDecksUsed: flashcardDecksCount || 0,
      flashcardDecksLimit: 2,
      questionsUsedToday: usageData?.questions_used_week || 0,
      questionsLimitPerDay: 20,
      hasAiPlanningAccess: false,
      hasCommunityAccess: true,
      hasFacultyAccess: false,
      hasAdvancedAnalytics: false,
      hasPrioritySupport: false,
    };

    // If no subscription found, use FREE tier defaults
    if (!userSubscription) {
      console.log('No subscription found, using FREE tier defaults');
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
      tier: userSubscription.tier || 'FREE',
      disciplinesUsed: disciplinesCount || 0,
      disciplinesLimit: features.maxDisciplines || 5,
      flashcardDecksUsed: flashcardDecksCount || 0,
      flashcardDecksLimit: features.maxFlashcardDecks || 2,
      questionsUsedToday: usageData?.questions_used_week || 0,
      questionsLimitPerDay: features.maxQuestionsPerDay || 20,
      hasAiPlanningAccess: features.aiPlanningAccess || false,
      hasCommunityAccess: features.communityFeaturesAccess || true,
      hasFacultyAccess: features.facultyFeaturesAccess || false,
      hasAdvancedAnalytics: features.advancedAnalytics || false,
      hasPrioritySupport: features.prioritySupport || false,
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