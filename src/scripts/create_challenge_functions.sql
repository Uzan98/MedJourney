-- Função para registrar tempo de estudo em desafios ativos
CREATE OR REPLACE FUNCTION register_study_time_in_challenges(
  p_user_id UUID,
  p_duration_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_challenge RECORD;
  v_result BOOLEAN;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Iterar sobre todos os desafios ativos do tipo 'study_time'
  FOR v_challenge IN 
    SELECT c.id
    FROM community_challenges c
    JOIN challenge_participants p ON c.id = p.challenge_id
    WHERE c.challenge_type = 'study_time'
      AND c.is_active = TRUE
      AND c.start_date <= v_today
      AND c.end_date >= v_today
      AND p.user_id = p_user_id
      AND p.completed_at IS NULL
  LOOP
    -- Atualizar o progresso do desafio para este usuário
    BEGIN
      PERFORM update_challenge_progress(v_challenge.id, p_user_id, p_duration_minutes);
    EXCEPTION
      WHEN OTHERS THEN
        -- Log do erro e continuar com o próximo desafio
        RAISE NOTICE 'Erro ao atualizar desafio %: %', v_challenge.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao registrar tempo de estudo em desafios: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar desafios de streak
CREATE OR REPLACE FUNCTION update_streak_challenges(
  p_user_id UUID,
  p_streak_value INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_challenge RECORD;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Iterar sobre todos os desafios ativos do tipo 'study_streak'
  FOR v_challenge IN 
    SELECT c.id
    FROM community_challenges c
    JOIN challenge_participants p ON c.id = p.challenge_id
    WHERE c.challenge_type = 'study_streak'
      AND c.is_active = TRUE
      AND c.start_date <= v_today
      AND c.end_date >= v_today
      AND p.user_id = p_user_id
      AND p.completed_at IS NULL
  LOOP
    -- Atualizar o progresso do desafio para este usuário
    BEGIN
      PERFORM update_challenge_progress(v_challenge.id, p_user_id, p_streak_value);
    EXCEPTION
      WHEN OTHERS THEN
        -- Log do erro e continuar com o próximo desafio
        RAISE NOTICE 'Erro ao atualizar desafio de streak %: %', v_challenge.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao atualizar desafios de streak: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 