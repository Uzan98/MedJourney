-- Criar tabela para armazenar o XP dos usuários
CREATE TABLE IF NOT EXISTS public.user_xp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    xp_amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_user_xp_user_id ON public.user_xp(user_id);

-- Criar função para adicionar XP a um usuário
CREATE OR REPLACE FUNCTION public.add_user_xp(
    p_user_id UUID,
    p_xp_amount INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Verificar se o usuário já tem registro de XP
    SELECT EXISTS(SELECT 1 FROM public.user_xp WHERE user_id = p_user_id) INTO v_exists;
    
    IF v_exists THEN
        -- Atualizar o XP existente
        UPDATE public.user_xp
        SET xp_amount = xp_amount + p_xp_amount,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSE
        -- Criar novo registro de XP
        INSERT INTO public.user_xp (user_id, xp_amount)
        VALUES (p_user_id, p_xp_amount);
    END IF;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Criar função para atribuir XP aos vencedores de um desafio
CREATE OR REPLACE FUNCTION public.award_challenge_winners_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    first_place_xp INTEGER := 100;
    second_place_xp INTEGER := 50;
    third_place_xp INTEGER := 25;
    v_user_id UUID;
    v_challenge_id UUID;
    v_rank INTEGER;
    v_participants RECORD;
BEGIN
    -- Só executar quando um desafio é concluído
    IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
        v_challenge_id := NEW.id;
        
        -- Buscar os três primeiros colocados
        FOR v_participants IN (
            SELECT 
                user_id,
                RANK() OVER (ORDER BY current_value DESC) as rank
            FROM public.challenge_participants
            WHERE challenge_id = v_challenge_id
            ORDER BY current_value DESC
            LIMIT 3
        ) LOOP
            v_user_id := v_participants.user_id;
            v_rank := v_participants.rank;
            
            -- Atribuir XP com base na colocação
            IF v_rank = 1 THEN
                PERFORM public.add_user_xp(v_user_id, first_place_xp);
            ELSIF v_rank = 2 THEN
                PERFORM public.add_user_xp(v_user_id, second_place_xp);
            ELSIF v_rank = 3 THEN
                PERFORM public.add_user_xp(v_user_id, third_place_xp);
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Criar trigger para atribuir XP quando um desafio é concluído
DROP TRIGGER IF EXISTS award_challenge_winners_xp_trigger ON public.community_challenges;

CREATE TRIGGER award_challenge_winners_xp_trigger
AFTER UPDATE ON public.community_challenges
FOR EACH ROW
EXECUTE FUNCTION public.award_challenge_winners_xp();

-- Criar política de segurança para a tabela de XP
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

-- Permitir que todos os usuários possam visualizar o XP de qualquer usuário
CREATE POLICY "Anyone can view user XP"
ON public.user_xp
FOR SELECT
USING (true);

-- Usuários só podem modificar seu próprio XP (através das funções)
CREATE POLICY "Users can modify their own XP"
ON public.user_xp
FOR UPDATE
USING (auth.uid() = user_id);

-- Apenas administradores podem inserir ou deletar registros de XP
CREATE POLICY "Admin users can manage all XP"
ON public.user_xp
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.user_id = auth.uid()
    )
);

-- Criar função para obter o ranking global de XP
CREATE OR REPLACE FUNCTION public.get_global_xp_ranking(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    avatar_url TEXT,
    total_xp INTEGER,
    rank INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        xp.user_id,
        p.full_name AS username,
        p.avatar_url,
        xp.xp_amount AS total_xp,
        RANK() OVER (ORDER BY xp.xp_amount DESC) AS rank
    FROM public.user_xp xp
    JOIN public.profiles p ON xp.user_id = p.id
    ORDER BY xp.xp_amount DESC
    LIMIT p_limit;
END;
$$; 