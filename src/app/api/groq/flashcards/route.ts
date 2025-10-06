import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionService } from '@/services/subscription.service';
import { SubscriptionTier } from '@/types/subscription';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de acesso necessário' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const userId = user.id;
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 });
    }

    // Gerar ID único para a sessão
    const sessionId = randomUUID();

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

    // Disparar processamento assíncrono (NÃO aguardar a resposta do worker)
    // Preferir a origem da requisição para evitar inconsistências de host/porta
    const origin = request.nextUrl?.origin || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host') || 'localhost:3000'}`;
    const workerUrl = `${origin}/api/workers/flashcards`;

    console.log('[Flashcards API] Disparando worker (fire-and-forget):', workerUrl, 'para job:', job.id);

    // Fire-and-forget: não usamos await aqui para não bloquear esta rota
    fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ jobId: job.id })
    }).catch((error: any) => {
      console.error('[Flashcards API] Erro ao disparar worker pela origem:', error?.message || error);
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
      }).catch((fallbackError: any) => {
        console.error('[Flashcards API] Erro no fallback do worker:', fallbackError?.message || fallbackError);
      });
    });

    // Retornar resposta imediata com ID do job
    return NextResponse.json({ 
      jobId: job.id,
      status: 'processing',
      message: 'Estamos processando seus flashcards! Aguarde alguns instantes...'
    });
  } catch (error: any) {
    console.error('Erro geral na API:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}