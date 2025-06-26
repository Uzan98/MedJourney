-- Corrigir o sistema de XP para atribuir pontos quando um participante completa um desafio
-- em vez de esperar que o desafio seja marcado como inativo

-- Remover o trigger antigo que não estava funcionando
DROP TRIGGER IF EXISTS award_challenge_winners_xp_trigger ON public.community_challenges;

-- Criar uma nova função para atribuir XP quando um participante completa um desafio
CREATE OR REPLACE FUNCTION public.award_challenge_completion_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_xp_amount INTEGER := 50; -- XP padrão para completar um desafio
BEGIN
    -- Só executar quando um participante completa o desafio (completed_at é atualizado de NULL para um valor)
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        -- Adicionar XP ao usuário
        PERFORM public.add_user_xp(NEW.user_id, v_xp_amount);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Criar trigger para atribuir XP quando um participante completa um desafio
CREATE TRIGGER award_challenge_completion_xp_trigger
AFTER UPDATE ON public.challenge_participants
FOR EACH ROW
EXECUTE FUNCTION public.award_challenge_completion_xp();

-- Adicionar XP para os participantes que já completaram desafios
DO $$
DECLARE
    v_participant RECORD;
    v_xp_amount INTEGER := 50; -- XP padrão para completar um desafio
BEGIN
    FOR v_participant IN (
        SELECT user_id
        FROM public.challenge_participants
        WHERE completed_at IS NOT NULL
    ) LOOP
        PERFORM public.add_user_xp(v_participant.user_id, v_xp_amount);
    END LOOP;
END;
$$;

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
        
        -- Adicionar XP para participantes que completaram desafios
        UPDATE public.user_xp xp
        SET xp_amount = xp_amount + 50
        WHERE EXISTS (
            SELECT 1 
            FROM public.challenge_participants cp
            WHERE cp.user_id = xp.user_id
            AND cp.completed_at IS NOT NULL
        );
    END IF;
END;
$$; 