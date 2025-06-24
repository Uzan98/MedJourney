import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface Challenge {
  title: string;
  description: string;
  reward_xp: number;
  reward_coins: number;
}

interface UserChallenge {
  id: number;
  challenge_id: number;
  progress: number;
  target_value: number;
  challenge: Challenge;
}

// Rota para marcar um desafio como completo e receber recompensas
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
    const { challenge_id } = await request.json();
    
    if (!challenge_id) {
      return NextResponse.json(
        { error: 'ID do desafio não informado' },
        { status: 400 }
      );
    }

    // Verificar se o desafio existe e está disponível para o usuário
    const { data, error: challengeError } = await supabase
      .from('user_challenges')
      .select(`
        id,
        challenge_id,
        progress,
        target_value,
        challenge:challenge_id (
          title,
          description,
          reward_xp,
          reward_coins
        )
      `)
      .eq('user_id', userId)
      .eq('challenge_id', challenge_id)
      .eq('completed', false)
      .single();

    // Convertendo o resultado para o tipo apropriado
    const userChallenge = data as unknown as UserChallenge;

    if (challengeError || !userChallenge) {
      console.error('Erro ao buscar desafio do usuário:', challengeError);
      return NextResponse.json(
        { error: 'Desafio não encontrado ou já completado' },
        { status: 404 }
      );
    }

    // Verificar se o desafio pode ser completado (progresso >= alvo)
    if (userChallenge.progress < userChallenge.target_value) {
      return NextResponse.json(
        { 
          error: 'Progresso insuficiente para completar o desafio', 
          current: userChallenge.progress, 
          required: userChallenge.target_value 
        },
        { status: 400 }
      );
    }

    // Iniciar uma transação para marcar o desafio como completo e conceder recompensas
    const { data: completeResult, error } = await supabase.rpc('complete_challenge', {
      p_user_challenge_id: userChallenge.id,
      p_reward_xp: userChallenge.challenge.reward_xp,
      p_reward_coins: userChallenge.challenge.reward_coins
    });

    if (error) {
      console.error('Erro ao completar desafio:', error);
      return NextResponse.json(
        { error: error.message || 'Erro ao completar desafio' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Desafio "${userChallenge.challenge.title}" completado com sucesso!`,
      rewards: {
        xp: userChallenge.challenge.reward_xp,
        coins: userChallenge.challenge.reward_coins
      }
    });
  } catch (error) {
    console.error('Erro interno na API de desafios:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 