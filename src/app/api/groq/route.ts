import { NextRequest, NextResponse } from 'next/server';
import { createRequestSupabaseClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionService } from '@/services/subscription.service';
import { SubscriptionTier } from '@/types/subscription';
import Groq from 'groq-sdk';

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ message: 'Build mode: no data' }, { status: 200 });
  }

  try {
    let supabase;
    let session;
    
    // Tentar autenticação via token Bearer primeiro
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Criar cliente Supabase com o token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
      
      // Verificar se o token é válido
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return NextResponse.json(
          { error: 'Token de acesso inválido' },
          { status: 401 }
        );
      }
      
      session = { user };
    } else {
      // Fallback para autenticação via cookies
      supabase = createRequestSupabaseClient(request);
      const { data: { session: cookieSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !cookieSession) {
        return NextResponse.json(
          { error: 'Você precisa estar logado para gerar questões com IA' },
          { status: 401 }
        );
      }
      
      session = cookieSession;
    }
    
    if (!session) {
      return NextResponse.json(
        { error: 'Você precisa estar logado para gerar questões com IA' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Verificar se o usuário tem plano Pro ou Pro+
    const userSubscription = await SubscriptionService.getUserSubscription(userId, supabase);
    
    if (!userSubscription) {
      return NextResponse.json({ 
        error: 'A geração de questões por IA é exclusiva para usuários Pro e Pro+. Faça upgrade do seu plano para acessar este recurso.',
        requiresUpgrade: true,
        requiredTier: 'pro'
      }, { status: 403 });
    }

    const userTier = userSubscription.tier as SubscriptionTier;
    const isProOrHigher = [SubscriptionTier.PRO, SubscriptionTier.PRO_PLUS].includes(userTier);
    
    if (!isProOrHigher) {
      return NextResponse.json({ 
        error: 'A geração de questões por IA é exclusiva para usuários Pro e Pro+. Faça upgrade do seu plano para acessar este recurso.',
        requiresUpgrade: true,
        requiredTier: 'pro'
      }, { status: 403 });
    }

    // Verificar limite diário de questões
    console.log('Verificando limites para usuário:', userId, 'tier:', userTier);
    
    // Obter limites detalhados para debug
    const limits = await SubscriptionService.getUserSubscriptionLimits(userId, supabase);
    console.log('Limites do usuário:', {
      tier: limits.tier,
      questionsUsedToday: limits.questionsUsedToday,
      questionsLimitPerDay: limits.questionsLimitPerDay
    });
    
    const hasReachedLimit = await SubscriptionService.hasReachedFeatureLimit(userId, 'questionsPerDay', supabase);
    console.log('Atingiu limite?', hasReachedLimit);
    
    if (hasReachedLimit) {
      return NextResponse.json({ 
        error: 'Você atingiu o limite diário de questões. Tente novamente amanhã ou faça upgrade para o plano Pro+ para questões ilimitadas.',
        limitReached: true,
        debug: {
          tier: limits.tier,
          questionsUsedToday: limits.questionsUsedToday,
          questionsLimitPerDay: limits.questionsLimitPerDay
        }
      }, { status: 429 });
    }

    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt é obrigatório.' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Chave da API Groq não configurada no servidor.' }, { status: 500 });
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em educação médica que cria questões de alta qualidade para estudantes de medicina. Crie questões claras, precisas e educativas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      return NextResponse.json({ error: `Erro na API Groq: ${errorData}` }, { status: 500 });
    }

    const data = await groqResponse.json();
    return NextResponse.json({ result: data.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro desconhecido' }, { status: 500 });
  }
}