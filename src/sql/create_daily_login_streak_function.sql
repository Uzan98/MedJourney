-- Função para calcular streak baseado apenas em login diário
CREATE OR REPLACE FUNCTION get_daily_login_streak(p_user_id UUID)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  total_days INTEGER,
  streak_dates DATE[]
) AS $$
DECLARE
  current_streak_count INTEGER := 0;
  longest_streak_count INTEGER := 0;
  total_days_count INTEGER := 0;
  dates_array DATE[] := ARRAY[]::DATE[];
  current_date DATE := CURRENT_DATE;
  prev_date DATE := NULL;
  day_gap INTEGER := 0;
  temp_streak INTEGER := 1;
BEGIN
  -- Preencher o array com datas de login diário distintas, ordenadas do mais recente ao mais antigo
  SELECT ARRAY_AGG(DISTINCT activity_date ORDER BY activity_date DESC)
  INTO dates_array
  FROM study_activity
  WHERE user_id = p_user_id AND activity_type = 'daily_login';
  
  -- Calcular total de dias com login
  total_days_count := ARRAY_LENGTH(dates_array, 1);
  
  -- Se não houver datas, retornar zeros
  IF total_days_count IS NULL THEN
    current_streak_count := 0;
    longest_streak_count := 0;
    total_days_count := 0;
    RETURN QUERY SELECT current_streak_count, longest_streak_count, total_days_count, dates_array;
    RETURN;
  END IF;
  
  -- Calcular sequência atual
  IF dates_array[1] = current_date OR dates_array[1] = current_date - INTERVAL '1 day' THEN
    current_streak_count := 1;
    
    -- Verificar quantos dias consecutivos na sequência atual
    FOR i IN 2..total_days_count LOOP
      day_gap := dates_array[i-1] - dates_array[i];
      IF day_gap = 1 THEN
        current_streak_count := current_streak_count + 1;
      ELSE
        EXIT;
      END IF;
    END LOOP;
  ELSE
    current_streak_count := 0;
  END IF;
  
  -- Calcular sequência mais longa
  longest_streak_count := 1;
  temp_streak := 1;
  
  FOR i IN 2..total_days_count LOOP
    day_gap := dates_array[i-1] - dates_array[i];
    
    IF day_gap = 1 THEN
      -- Continuar a sequência atual
      temp_streak := temp_streak + 1;
      longest_streak_count := GREATEST(longest_streak_count, temp_streak);
    ELSE
      -- Reiniciar sequência
      temp_streak := 1;
    END IF;
  END LOOP;
  
  -- Retornar resultados
  RETURN QUERY SELECT current_streak_count, longest_streak_count, total_days_count, dates_array;
END;
$$ LANGUAGE plpgsql;