import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionService } from '@/services/subscription.service';
import { SubscriptionTier } from '@/types/subscription';

export async function POST(request: NextRequest) {
  try {
    // Configuração do cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Variáveis de ambiente do Supabase não encontradas');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Validar token de autenticação
    let userId = '';
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Token extraído:', token.substring(0, 20) + '...');
      
      // Usar cliente com anon key para validar o token do usuário
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: userData, error } = await authClient.auth.getUser(token);
      
      if (error || !userData?.user) {
        console.error('Erro ao verificar token:', error);
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      }
      
      userId = userData.user.id;
      console.log('Usuário validado:', userId);
    } else {
      console.error('Token de autorização não encontrado ou formato inválido');
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Cliente com service role key para operações administrativas
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // --- verificação de plano ---
    const userSubscription = await SubscriptionService.getUserSubscription(userId, adminSupabase);
    const userTier = userSubscription?.tier as SubscriptionTier;
    if (![SubscriptionTier.PRO, SubscriptionTier.PRO_PLUS].includes(userTier)) {
      return NextResponse.json({
        error: 'Somente usuários Pro/Pro+ podem gerar flashcards.',
        requiresUpgrade: true,
        requiredTier: 'pro'
      }, { status: 403 });
    }

    // --- verificação de limite diário ---
    const hasReachedLimit = await SubscriptionService.hasReachedFeatureLimit(userId, 'flashcardsPerDay', adminSupabase);
    if (hasReachedLimit) {
      return NextResponse.json({
        error: 'Você atingiu o limite diário de flashcards. Tente novamente amanhã ou faça upgrade para Pro+.',
        requiresUpgrade: true,
        requiredTier: 'pro_plus'
      }, { status: 403 });
    }

    const { prompt } = await request.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 });

    // Validar limite de caracteres
    if (prompt.length > 80000) {
      return NextResponse.json({ 
        error: `Texto muito longo. Máximo permitido: 80000 caracteres. Atual: ${prompt.length} caracteres.` 
      }, { status: 400 });
    }

    // Criar job no Supabase para processamento assíncrono
    const { data: job, error: jobError } = await adminSupabase
      .from('flashcard_jobs')
      .insert({
        user_id: userId,
        status: 'pending',
        input_data: { prompt }
      })
      .select()
      .single();

    if (jobError) {
      console.error('Erro ao criar job:', jobError);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    // Disparar processamento assíncrono (não aguardar)
    try {
      // Preferir a origem da requisição para evitar inconsistências de host/porta
      const origin = request.nextUrl?.origin || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host') || 'localhost:3000'}`;
      const workerUrl = `${origin}/api/workers/flashcards`;

      console.log('[Flashcards API] Disparando worker:', workerUrl, 'para job:', job.id);

      await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ jobId: job.id })
      });
    } catch (workerError: any) {
      console.error('[Flashcards API] Erro ao disparar worker pela origem:', workerError?.message || workerError);
      // Fallback para variável de ambiente pública
      const fallbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/workers/flashcards`;
      console.log('[Flashcards API] Tentando fallback para worker:', fallbackUrl);
      fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ jobId: job.id })
      }).catch(error => {
        console.error('[Flashcards API] Erro no fallback do worker:', error);
      });
    }

    // Retornar resposta imediata com ID do job
    return NextResponse.json({ 
      jobId: job.id,
      status: 'processing',
      message: 'Estamos processando seus flashcards! Aguarde alguns instantes...'
    });
  } catch (error: any) {
    console.error('Erro na API de flashcards:', error);
    return NextResponse.json({ error: error.message || 'Erro desconhecido' }, { status: 500 });
  }
}