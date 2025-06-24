import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface RankingParams {
  type?: string;
  period?: string;
  discipline_id?: string;
  limit?: string;
}

// Rota para obter rankings globais
export async function GET(request: Request) {
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

    // Obter parâmetros da URL
    const { searchParams } = new URL(request.url);
    const params: RankingParams = {
      type: searchParams.get('type') || 'global_xp',
      period: searchParams.get('period') || 'all_time',
      discipline_id: searchParams.get('discipline_id') || undefined,
      limit: searchParams.get('limit') || '10'
    };

    // Construir a consulta base
    let query = supabase
      .from('rankings')
      .select(`
        id,
        user_id,
        rank_type,
        period,
        discipline_id,
        score,
        position,
        updated_at,
        users:user_id (
          id,
          email,
          display_name:raw(metadata->>'display_name'),
          avatar_url:raw(metadata->>'avatar_url')
        )
      `)
      .eq('rank_type', params.type)
      .order('score', { ascending: false })
      .limit(parseInt(params.limit, 10));

    // Adicionar filtros opcionais
    if (params.period && params.period !== 'all_time') {
      query = query.eq('period', params.period);
    }
    
    if (params.discipline_id) {
      query = query.eq('discipline_id', params.discipline_id);
    }

    // Executar a consulta
    const { data: rankings, error: rankingsError } = await query;

    if (rankingsError) {
      console.error('Erro ao buscar rankings:', rankingsError);
      return NextResponse.json(
        { error: 'Erro ao buscar rankings' },
        { status: 500 }
      );
    }

    // Obter a posição do usuário atual no ranking
    const { data: userRanking, error: userRankingError } = await supabase
      .from('rankings')
      .select('score, position')
      .eq('user_id', session.user.id)
      .eq('rank_type', params.type)
      .maybeSingle();

    if (userRankingError && userRankingError.code !== 'PGRST116') {
      console.error('Erro ao buscar ranking do usuário:', userRankingError);
      return NextResponse.json(
        { error: 'Erro ao buscar ranking do usuário' },
        { status: 500 }
      );
    }

    // Calcular as posições no ranking (começando em 1)
    const rankedList = rankings?.map((rank, index) => ({
      ...rank,
      position: index + 1
    }));

    return NextResponse.json({
      rankings: rankedList || [],
      user_ranking: userRanking || { score: 0, position: null }
    });
  } catch (error) {
    console.error('Erro interno na API de rankings:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 