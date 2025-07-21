-- Função para atualizar o progresso do usuário em desafios
CREATE OR REPLACE FUNCTION update_challenge_progress(
  p_challenge_id UUID,
  p_user_id UUID,
  p_progress_value INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_challenge_type TEXT;
  v_goal_value INTEGER;
  v_current_value INTEGER;
  v_is_completed BOOLEAN;
BEGIN
  -- Verificar se o desafio existe e obter seu tipo e valor da meta
  SELECT challenge_type, goal_value INTO v_challenge_type, v_goal_value
  FROM community_challenges
  WHERE id = p_challenge_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Desafio não encontrado: %', p_challenge_id;
  END IF;
  
  -- Verificar se o usuário está participando do desafio
  SELECT current_value, completed_at IS NOT NULL INTO v_current_value, v_is_completed
  FROM challenge_participants
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não está participando do desafio: %', p_user_id;
  END IF;
  
  -- Se o desafio já foi concluído, não atualizar mais
  IF v_is_completed THEN
    RETURN FALSE;
  END IF;
  
  -- Atualizar o progresso
  UPDATE challenge_participants
  SET current_value = current_value + p_progress_value,
      completed_at = CASE 
                      WHEN current_value + p_progress_value >= v_goal_value THEN NOW()
                      ELSE completed_at
                     END
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar desafios de streak
CREATE OR REPLACE FUNCTION update_streak_challenges(
  p_user_id UUID,
  p_streak_value INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Obter a data atual para comparar com os desafios
  DECLARE
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
      -- Para desafios de streak, atualizamos com o valor atual da streak
      -- em vez de incrementar
      BEGIN
        UPDATE challenge_participants
        SET current_value = p_streak_value,
            completed_at = CASE 
                          WHEN p_streak_value >= (
                            SELECT goal_value 
                            FROM community_challenges 
                            WHERE id = v_challenge.id
                          ) THEN NOW()
                          ELSE completed_at
                         END
        WHERE challenge_id = v_challenge.id AND user_id = p_user_id;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Erro ao atualizar desafio de streak %: %', v_challenge.id, SQLERRM;
      END;
    END LOOP;
    
    RETURN TRUE;
  END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql; 