-- Script para corrigir definitivamente a função register_study_time_in_challenges
-- Primeiro, remover completamente a função existente
DROP FUNCTION IF EXISTS register_study_time_in_challenges(UUID, INTEGER);

-- Criar uma nova versão da função que não faz referência à tabela user_levels
CREATE OR REPLACE FUNCTION register_study_time_in_challenges(p_user_id UUID, p_duration_minutes INTEGER)
RETURNS void AS $$
BEGIN
    -- Atualizar desafios de tempo de estudo
    UPDATE challenge_participants cp
    SET current_value = current_value + p_duration_minutes
    FROM community_challenges cc
    WHERE cp.challenge_id = cc.id
    AND cp.user_id = p_user_id
    AND cc.challenge_type = 'study_time'
    AND cc.is_active = true
    AND cc.end_date >= CURRENT_DATE;
    
    -- Registrar que a função foi chamada
    RAISE NOTICE 'Função register_study_time_in_challenges atualizada para usuário % com duração %', p_user_id, p_duration_minutes;
END;
$$ LANGUAGE plpgsql; 