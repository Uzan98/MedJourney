import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Rota para obter todos os dados de gamificação do usuário atual
export async function GET() {
  try {
    // Criar cliente Supabase para o servidor
    const supabase = createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Obter nível e XP do usuário
    const { data: levelData, error: levelError } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (levelError && levelError.code !== 'PGRST116') {
      console.error('Erro ao buscar nível do usuário:', levelError);
      return NextResponse.json(
        { error: 'Erro ao buscar dados de nível' },
        { status: 500 }
      );
    }

    // Obter saldo de MedCoins do usuário
    const { data: coinsData, error: coinsError } = await supabase
      .from('user_coins')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (coinsError && coinsError.code !== 'PGRST116') {
      console.error('Erro ao buscar saldo de moedas:', coinsError);
      return NextResponse.json(
        { error: 'Erro ao buscar dados de moedas' },
        { status: 500 }
      );
    }

    // Obter conquistas do usuário
    const { data: achievementsData, error: achievementsError } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievement_id (
          id,
          title,
          description,
          code,
          icon,
          category,
          rarity
        )
      `)
      .eq('user_id', userId);

    if (achievementsError) {
      console.error('Erro ao buscar conquistas:', achievementsError);
      return NextResponse.json(
        { error: 'Erro ao buscar dados de conquistas' },
        { status: 500 }
      );
    }

    // Obter distintivos do usuário
    const { data: badgesData, error: badgesError } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badge_id (
          id,
          title,
          description,
          icon,
          category,
          rarity
        )
      `)
      .eq('user_id', userId);

    if (badgesError) {
      console.error('Erro ao buscar distintivos:', badgesError);
      return NextResponse.json(
        { error: 'Erro ao buscar dados de distintivos' },
        { status: 500 }
      );
    }

    // Obter rankings do usuário
    const { data: rankingsData, error: rankingsError } = await supabase
      .from('rankings')
      .select('*')
      .eq('user_id', userId);

    if (rankingsError) {
      console.error('Erro ao buscar rankings:', rankingsError);
      return NextResponse.json(
        { error: 'Erro ao buscar dados de rankings' },
        { status: 500 }
      );
    }

    // Obter desafios do usuário
    const { data: challengesData, error: challengesError } = await supabase
      .from('user_challenges')
      .select(`
        *,
        challenge:challenge_id (
          id,
          title,
          description,
          type,
          target_value,
          reward_xp,
          reward_coins,
          duration_days
        )
      `)
      .eq('user_id', userId)
      .eq('completed', false);

    if (challengesError) {
      console.error('Erro ao buscar desafios:', challengesError);
      return NextResponse.json(
        { error: 'Erro ao buscar dados de desafios' },
        { status: 500 }
      );
    }

    // Obter estatísticas de estudo
    const { data: streakData, error: streakError } = await supabase
      .from('study_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (streakError && streakError.code !== 'PGRST116') {
      console.error('Erro ao buscar streak de estudo:', streakError);
      return NextResponse.json(
        { error: 'Erro ao buscar dados de streak' },
        { status: 500 }
      );
    }

    // Consolidar todos os dados de gamificação
    const gamificationData = {
      level: levelData || { current_level: 1, current_xp: 0, next_level_xp: 100 },
      coins: coinsData || { balance: 0 },
      achievements: achievementsData || [],
      badges: badgesData || [],
      rankings: rankingsData || [],
      challenges: challengesData || [],
      streak: streakData || { current_streak: 0, longest_streak: 0 }
    };

    return NextResponse.json(gamificationData);
  } catch (error) {
    console.error('Erro interno na API de gamificação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 