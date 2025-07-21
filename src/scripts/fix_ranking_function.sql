-- Corrigir a função get_global_xp_ranking para lidar com os tipos de dados corretamente
DROP FUNCTION IF EXISTS public.get_global_xp_ranking;

CREATE FUNCTION public.get_global_xp_ranking(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    total_xp INTEGER,
    rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        xp.user_id,
        COALESCE(p.full_name, p.username)::TEXT AS username,
        p.avatar_url::TEXT,
        xp.xp_amount AS total_xp,
        RANK() OVER (ORDER BY xp.xp_amount DESC) AS rank
    FROM public.user_xp xp
    JOIN public.profiles p ON xp.user_id = p.id
    ORDER BY xp.xp_amount DESC
    LIMIT p_limit;
END;
$$; 