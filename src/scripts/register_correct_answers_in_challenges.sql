-- Função para registrar respostas corretas em desafios ativos
CREATE OR REPLACE FUNCTION register_correct_answers_in_challenges(
  p_user_id UUID,
  p_correct_answers INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_challenge RECORD;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Iterar sobre todos os desafios ativos do tipo 'correct_answers'
  FOR v_challenge IN 
    SELECT c.id
    FROM community_challenges c
    JOIN challenge_participants p ON c.id = p.challenge_id
    WHERE c.challenge_type = 'correct_answers'
      AND c.is_active = TRUE
      AND c.start_date <= v_today
      AND c.end_date >= v_today
      AND p.user_id = p_user_id
      AND p.completed_at IS NULL
  LOOP
    -- Atualizar o progresso do desafio para este usuário
    BEGIN
      PERFORM update_challenge_progress(v_challenge.id, p_user_id, p_correct_answers);
    EXCEPTION
      WHEN OTHERS THEN
        -- Log do erro e continuar com o próximo desafio
        RAISE NOTICE 'Erro ao atualizar desafio %: %', v_challenge.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao registrar respostas corretas em desafios: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar desafios quando uma tentativa de simulado é concluída
CREATE OR REPLACE FUNCTION process_exam_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Só executa se a tentativa foi concluída (completed_at foi atualizado)
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL) THEN
    -- Registrar as respostas corretas nos desafios
    PERFORM register_correct_answers_in_challenges(NEW.user_id, NEW.correct_answers);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger na tabela exam_attempts
DROP TRIGGER IF EXISTS exam_completion_trigger ON exam_attempts;
CREATE TRIGGER exam_completion_trigger
AFTER UPDATE OF completed_at ON exam_attempts
FOR EACH ROW
WHEN (NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL)
EXECUTE FUNCTION process_exam_completion(); 