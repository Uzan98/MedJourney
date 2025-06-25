-- Script para remover o trigger que está causando o erro
-- Problema: O trigger session_challenges_trigger está chamando a função update_session_challenges
-- que faz referência à tabela user_challenges que não existe mais

-- Remover o trigger que está causando o erro
DROP TRIGGER IF EXISTS session_challenges_trigger ON study_sessions;

-- Também vamos atualizar a função process_study_session_completion para garantir que ela não tenha problemas
-- (esta função já parece estar correta, mas vamos garantir que ela esteja atualizada)
CREATE OR REPLACE FUNCTION process_study_session_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_challenge RECORD;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Só executa se a sessão foi marcada como concluída
    IF NEW.completed = TRUE AND (OLD.completed = FALSE OR OLD.completed IS NULL) THEN
        -- Atualizar desafios de tempo de estudo
        -- Iterar sobre todos os desafios ativos do tipo 'study_time'
        FOR v_challenge IN 
          SELECT c.id
          FROM community_challenges c
          JOIN challenge_participants p ON c.id = p.challenge_id
          WHERE c.challenge_type = 'study_time'
            AND c.is_active = TRUE
            AND c.start_date <= v_today
            AND c.end_date >= v_today
            AND p.user_id = NEW.user_id
            AND p.completed_at IS NULL
        LOOP
          -- Atualizar o progresso do desafio para este usuário
          BEGIN
            PERFORM update_challenge_progress(v_challenge.id, NEW.user_id, COALESCE(NEW.actual_duration_minutes, NEW.duration_minutes));
          EXCEPTION
            WHEN OTHERS THEN
              -- Log do erro e continuar com o próximo desafio
              RAISE NOTICE 'Erro ao atualizar desafio %: %', v_challenge.id, SQLERRM;
          END;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 