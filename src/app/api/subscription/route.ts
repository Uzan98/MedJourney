import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/subscription
 * Get the current user's subscription information
 */
export async function GET(request: NextRequest) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }
  const { createRequestSupabaseClient } = await import('../../../lib/supabase-server');
  const { SubscriptionService } = await import('../../../services/subscription.service');
  try {
    const supabase = createRequestSupabaseClient(request);
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('Sessão não encontrada na requisição GET');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    // Get the user's subscription limits
    const subscriptionLimits = await SubscriptionService.getUserSubscriptionLimits(userId, supabase);
    return NextResponse.json(subscriptionLimits);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/subscription
 * Create a checkout session for a subscription plan
 */
export async function POST(request: NextRequest) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }
  const { createRequestSupabaseClient } = await import('../../../lib/supabase-server');
  const { SubscriptionService } = await import('../../../services/subscription.service');
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  try {
    const authHeader = request.headers.get('authorization');
    console.log('Authorization header:', authHeader);
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase ANON KEY exists:', !!supabaseAnonKey);
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = createClient(supabaseUrl, supabaseAnonKey); // Use ANON KEY para autenticação de usuário
      
      // Autentica o usuário pelo token JWT
      const { data: userData, error } = await supabase.auth.getUser(token);
      if (error || !userData?.user) {
        console.error('Erro ao verificar token:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const userId = userData.user.id;
      const userEmail = userData.user.email;
      
      if (!userEmail) {
        console.error('Email não encontrado no token do usuário');
        return NextResponse.json({ error: 'User email not found' }, { status: 400 });
      }
      
      const { planId } = await request.json();
      if (!planId) {
        return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
      }
      
      // Passar o email diretamente para evitar problemas com RPC
      const checkoutSession = await SubscriptionService.createCheckoutSession(userId, planId, supabase, userEmail);
      return NextResponse.json(checkoutSession);
    } else {
      // Fallback para cookies/session
      const supabase = createRequestSupabaseClient(request);
      const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError);
      }
      if (!supabaseSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const userId = supabaseSession.user.id;
      const { planId } = await request.json();
      if (!planId) {
        return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
      }
      const checkoutSession = await SubscriptionService.createCheckoutSession(userId, planId, supabase);
      return NextResponse.json(checkoutSession);
    }
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
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }
  const { createRequestSupabaseClient } = await import('../../../lib/supabase-server');
  const { SubscriptionService } = await import('../../../services/subscription.service');
  const { createClient } = await import('@supabase/supabase-js');
  
  // Configuração do cliente com service_role para operações administrativas
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Variáveis de ambiente do Supabase não encontradas');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  
  try {
    // Primeiro autenticamos o usuário para obter seu ID
    let userId = '';
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: userData, error } = await authClient.auth.getUser(token);
      
      if (error || !userData?.user) {
        console.error('Erro ao verificar token:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = userData.user.id;
    } else {
      const supabase = createRequestSupabaseClient(request);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('Sessão não encontrada na requisição DELETE');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
    }
    
    console.log('User ID autenticado:', userId);
    
    // Agora que temos o ID do usuário, usamos o cliente com service_role para operações de banco
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const result = await SubscriptionService.cancelSubscription(userId, adminClient);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}