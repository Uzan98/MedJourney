import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Rota para recuperar streaks perdidas usando MedCoins
export async function POST(request: Request) {
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
    
    // Obter dados do corpo da requisição
    const { days_to_recover } = await request.json();
    
    if (!days_to_recover || days_to_recover < 1 || days_to_recover > 3) {
      return NextResponse.json(
        { error: 'Número de dias inválido. Deve ser entre 1 e 3.' },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem MedCoins suficientes
    const { data: userCoins, error: coinsError } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (coinsError) {
      console.error('Erro ao verificar saldo de MedCoins:', coinsError);
      return NextResponse.json(
        { error: 'Erro ao verificar saldo de MedCoins' },
        { status: 500 }
      );
    }

    // Calcular custo da recuperação
    let cost = 0;
    switch (days_to_recover) {
      case 1:
        cost = 50;
        break;
      case 2:
        cost = 150;
        break;
      case 3:
        cost = 350;
        break;
      default:
        cost = 50;
    }

    // Verificar se o usuário tem saldo suficiente
    if (!userCoins || userCoins.balance < cost) {
      return NextResponse.json(
        { 
          error: 'Saldo insuficiente de MedCoins', 
          required: cost, 
          available: userCoins?.balance || 0 
        },
        { status: 400 }
      );
    }

    // Chamar a função do banco de dados para recuperar streak
    const { data: result, error: recoverError } = await supabase
      .rpc('recover_study_streak', {
        p_user_id: userId,
        p_days_to_recover: days_to_recover
      });

    if (recoverError) {
      console.error('Erro ao recuperar streak:', recoverError);
      return NextResponse.json(
        { error: recoverError.message || 'Erro ao recuperar streak' },
        { status: 500 }
      );
    }

    // Obter dados atualizados da streak
    const { data: updatedStreak, error: streakError } = await supabase
      .from('study_streaks')
      .select('current_streak, longest_streak, last_study_date')
      .eq('user_id', userId)
      .single();

    if (streakError) {
      console.error('Erro ao buscar streak atualizada:', streakError);
      return NextResponse.json(
        { success: true, message: 'Streak recuperada com sucesso, mas não foi possível obter os dados atualizados' }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Streak recuperada com sucesso! ${days_to_recover} dia(s) adicionado(s).`,
      cost,
      streak: updatedStreak
    });
  } catch (error) {
    console.error('Erro interno na API de recuperação de streak:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 