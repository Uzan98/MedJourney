import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/subscription/initialize-usage
 * Inicializa o registro de subscription_usage para o usuário atual
 */
export async function POST(request: NextRequest) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
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
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Usar service role key para operações administrativas
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verificar se já existe um registro de subscription_usage
    const { data: existingUsage } = await adminClient
      .from('subscription_usage')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (existingUsage) {
      return NextResponse.json({ 
        message: 'Subscription usage already exists',
        user_id: userId 
      });
    }

    // Criar registro inicial de subscription_usage
    const { data: newUsage, error: insertError } = await adminClient
      .from('subscription_usage')
      .insert({
        user_id: userId,
        disciplines_count: 0,
        subjects_per_discipline_count: 0,
        study_sessions_today: 0,
        flashcard_decks_count: 0,
        flashcards_per_deck_count: 0,
        questions_used_week: 0,
        questions_used_today: 0,
        simulados_created_week: 0,
        simulados_questions_count: 0,
        study_groups_created: 0,
        faculty_groups_created: 0,
        last_usage_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        last_week_reset: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao criar subscription_usage:', insertError);
      return NextResponse.json({ 
        error: 'Failed to initialize subscription usage',
        details: insertError.message 
      }, { status: 500 });
    }

    console.log('Subscription usage inicializado para usuário:', userId);
    return NextResponse.json({ 
      message: 'Subscription usage initialized successfully',
      user_id: userId,
      data: newUsage
    });

  } catch (error) {
    console.error('Erro no endpoint initialize-usage:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}