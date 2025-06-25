-- Script para corrigir a função process_study_session_completion
-- Remove referências à tabela user_challenges inexistente e remove código obsoleto de gamificação

CREATE OR REPLACE FUNCTION process_study_session_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Criar ou recriar o trigger para a função
DROP TRIGGER IF EXISTS study_session_completion_trigger ON study_sessions;
CREATE TRIGGER study_session_completion_trigger
AFTER UPDATE OF completed ON study_sessions
FOR EACH ROW
WHEN (NEW.completed = TRUE AND (OLD.completed = FALSE OR OLD.completed IS NULL))
EXECUTE FUNCTION process_study_session_completion();

-- Verificar se o trigger foi criado corretamente
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name = 'study_session_completion_trigger'; 