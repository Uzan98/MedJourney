import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createRequestSupabaseClient } from '../../../lib/supabase-server';
import { SubscriptionService } from '../../../services/subscription.service';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Estas variáveis de ambiente são necessárias para criar o cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * GET /api/subscription
 * Get the current user's subscription information
 */
export async function GET(request: NextRequest) {
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
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      // Autentica o usuário pelo token JWT
      const { data: userData, error } = await supabase.auth.getUser(token);
      if (error || !userData?.user) {
        console.error('Erro ao verificar token:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const userId = userData.user.id;
      const { planId } = await request.json();
      if (!planId) {
        return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
      }
      const checkoutSession = await SubscriptionService.createCheckoutSession(userId, planId, supabase);
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
  try {
    const supabase = createRequestSupabaseClient(request);
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('Sessão não encontrada na requisição DELETE');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Cancel the subscription
    const result = await SubscriptionService.cancelSubscription(userId, supabase);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 