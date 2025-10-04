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
        error: 'Somente usuários Pro/Pro+ podem gerar explicações com IA.',
        requiresUpgrade: true,
        requiredTier: 'pro'
      }, { status: 403 });
    }

    // --- verificação de limite diário ---
    // Usando o mesmo limite de questões para explicações
    const hasReachedLimit = await SubscriptionService.hasReachedFeatureLimit(userId, 'questionsPerDay', supabase);
    if (hasReachedLimit) {
      return NextResponse.json({
        error: 'Você atingiu o limite diário de explicações. Tente novamente amanhã ou faça upgrade para Pro+.',
        limitReached: true
      }, { status: 429 });
    }

    const { prompt } = await request.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 });

    // --- chamada Groq com timeout ---
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 120s para dar mais tempo à API Groq

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um professor especialista em educação médica com vasta experiência em ensino e avaliação. Sua função é criar explicações didáticas, claras e precisas para questões de medicina, sempre mantendo rigor científico e linguagem acessível aos estudantes.\n\nIMPORTANTE: Formate sua resposta usando HTML para melhor apresentação visual:\n- Use <h3> para títulos principais\n- Use <h4> para subtítulos\n- Use <p> para parágrafos\n- Use <strong> para destacar pontos importantes\n- Use <em> para ênfase\n- Use <ul> e <li> para listas\n- Use <br> para quebras de linha quando necessário\n\nEstruture a explicação de forma organizada e visualmente atrativa.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Menor temperatura para explicações mais consistentes
        max_completion_tokens: 1500 // Limite adequado para explicações detalhadas
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