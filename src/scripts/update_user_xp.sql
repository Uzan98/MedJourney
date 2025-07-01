-- Script para adicionar XP a usuários que completaram desafios
-- Verificar se existem usuários na tabela user_xp
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.user_xp;
    
    IF v_count = 0 THEN
        RAISE NOTICE 'Nenhum usuário encontrado na tabela user_xp. Adicionando XP para participantes existentes...';
        
        -- Inserir registros para todos os usuários que participaram de desafios
        INSERT INTO public.user_xp (user_id, xp_amount)
        SELECT DISTINCT user_id, 0
        FROM public.challenge_participants
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_xp WHERE user_xp.user_id = challenge_participants.user_id
        );
    END IF;
    
    -- Adicionar 50 XP para cada desafio completado
    UPDATE public.user_xp xp
    SET xp_amount = (
        SELECT COUNT(*) * 50
        FROM public.challenge_participants cp
        WHERE cp.user_id = xp.user_id
        AND cp.completed_at IS NOT NULL
    )
    WHERE EXISTS (
        SELECT 1 
        FROM public.challenge_participants cp
        WHERE cp.user_id = xp.user_id
        AND cp.completed_at IS NOT NULL
    );
    
    RAISE NOTICE 'XP atualizado com sucesso para usuários que completaram desafios.';
END;
$$; 