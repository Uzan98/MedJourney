import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface Achievement {
  id: number;
  title: string;
  description: string;
  code: string;
  icon: string;
  category: string;
  rarity: string;
}

interface UserAchievement {
  achievement_id: number;
  earned_at: string;
}

// Rota para obter todas as conquistas disponíveis no sistema
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

    // Obter todas as conquistas disponíveis
    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .order('category')
      .order('rarity');

    if (achievementsError) {
      console.error('Erro ao buscar conquistas:', achievementsError);
      return NextResponse.json(
        { error: 'Erro ao buscar conquistas' },
        { status: 500 }
      );
    }

    // Obter conquistas do usuário para verificar quais ele já possui
    const { data: userAchievements, error: userAchievementsError } = await supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', userId);

    if (userAchievementsError) {
      console.error('Erro ao buscar conquistas do usuário:', userAchievementsError);
      return NextResponse.json(
        { error: 'Erro ao buscar conquistas do usuário' },
        { status: 500 }
      );
    }

    // Criar um mapa das conquistas do usuário para facilitar a verificação
    const userAchievementsMap = new Map<number, string>();
    userAchievements?.forEach((ua: UserAchievement) => {
      userAchievementsMap.set(ua.achievement_id, ua.earned_at);
    });

    // Adicionar informação de conquista ao resultado
    const enhancedAchievements = achievements?.map((achievement: Achievement) => ({
      ...achievement,
      earned: userAchievementsMap.has(achievement.id),
      earned_at: userAchievementsMap.get(achievement.id) || null
    }));

    return NextResponse.json(enhancedAchievements || []);
  } catch (error) {
    console.error('Erro interno na API de conquistas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 