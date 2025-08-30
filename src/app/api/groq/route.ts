import { NextRequest, NextResponse } from 'next/server';
import { createRequestSupabaseClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionService } from '@/services/subscription.service';
import { SubscriptionTier } from '@/types/subscription';
import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    // --- autenticação ---
    let supabase;
    let session;

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      session = { user };
    } else {
      supabase = createRequestSupabaseClient(request);
      const { data: { session: cookieSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !cookieSession) return NextResponse.json({ error: 'Faça login para usar a IA' }, { status: 401 });
      session = cookieSession;
    }

    const userId = session.user.id;

    // --- verificação de plano ---
    const userSubscription = await SubscriptionService.getUserSubscription(userId, supabase);
    const userTier = userSubscription?.tier as SubscriptionTier;
    if (![SubscriptionTier.PRO, SubscriptionTier.PRO_PLUS].includes(userTier)) {
      return NextResponse.json({
        error: 'Somente usuários Pro/Pro+ podem gerar questões.',
        requiresUpgrade: true,
        requiredTier: 'pro'
      }, { status: 403 });
    }

    // --- verificação de limite diário ---
    const hasReachedLimit = await SubscriptionService.hasReachedFeatureLimit(userId, 'questionsPerDay', supabase);
    if (hasReachedLimit) {
      return NextResponse.json({
        error: 'Você atingiu o limite diário de questões. Tente novamente amanhã ou faça upgrade para Pro+.',
        limitReached: true
      }, { status: 429 });
    }

    const { prompt } = await request.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 });

    // --- chamada Groq com timeout ---
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000); // 55s, menor que o limite Pro (60s)

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'Você é especialista em educação de todas as áreas que existem. Crie questões claras e precisas.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_completion_tokens: 2000
      }, { signal: controller.signal });
    } catch (err: any) {
      if (err.name === 'AbortError') return NextResponse.json({ error: 'A requisição demorou demais. Tente novamente.' }, { status: 504 });
      if (err?.message?.includes('rate_limit_exceeded')) return NextResponse.json({ error: 'Limite diário da Groq atingido. Tente mais tarde.' }, { status: 429 });
      return NextResponse.json({ error: err.message || 'Erro desconhecido na Groq' }, { status: 500 });
    } finally {
      clearTimeout(timeout);
    }

    const result = completion.choices[0]?.message?.content || '';
    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro desconhecido' }, { status: 500 });
  }
}
