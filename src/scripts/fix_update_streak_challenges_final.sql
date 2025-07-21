-- Script para corrigir definitivamente a função update_streak_challenges
-- Primeiro, remover completamente a função existente
DROP FUNCTION IF EXISTS update_streak_challenges(UUID, INTEGER);

-- Criar uma nova versão da função que não faz referência à tabela user_levels
CREATE OR REPLACE FUNCTION update_streak_challenges(p_user_id UUID, p_streak_value INTEGER)
RETURNS void AS $$
BEGIN
    -- Verificar se o usuário está participando de algum desafio de streak
    UPDATE challenge_participants cp
    SET current_value = p_streak_value
    FROM community_challenges cc
    WHERE cp.challenge_id = cc.id
    AND cp.user_id = p_user_id
    AND cc.challenge_type = 'study_streak'
    AND cc.is_active = true
    AND cc.end_date >= CURRENT_DATE;
    
    -- Registrar que a função foi chamada
    RAISE NOTICE 'Função update_streak_challenges atualizada para usuário % com valor %', p_user_id, p_streak_value;
END;
$$ LANGUAGE plpgsql; 