-- IMPORTANTE: Execute este script no console SQL do Supabase para criar a tabela de atividades de estudo
-- Acesse: https://app.supabase.com/project/seu-projeto/sql
-- Cole este script e clique em "Run"

-- Criar tabela para registrar atividades de estudo
CREATE TABLE IF NOT EXISTS study_activity (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'subject_completed', 'study_session', 'quiz_completed', etc.
  reference_id INTEGER, -- ID opcional de referência (assunto, disciplina, etc.)
  reference_type VARCHAR(50), -- 'subject', 'discipline', etc.
  duration_minutes INTEGER DEFAULT 0, -- Duração da atividade em minutos (se aplicável)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Garantir que cada usuário tenha apenas um registro por dia por tipo de atividade
  UNIQUE(user_id, activity_date, activity_type)
);

-- Adicionar políticas RLS (Row Level Security) para controle de acesso
ALTER TABLE study_activity ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas suas próprias atividades
CREATE POLICY "Users can view their own study activities"
  ON study_activity
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política para permitir que usuários insiram suas próprias atividades
CREATE POLICY "Users can insert their own study activities"
  ON study_activity
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política para permitir que usuários atualizem suas próprias atividades
CREATE POLICY "Users can update their own study activities"
  ON study_activity
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Índices para melhorar o desempenho de consultas
CREATE INDEX idx_study_activity_user_id ON study_activity(user_id);
CREATE INDEX idx_study_activity_date ON study_activity(activity_date);
CREATE INDEX idx_study_activity_user_date ON study_activity(user_id, activity_date);

-- Função para verificar streak de estudo (sequência de dias consecutivos)
CREATE OR REPLACE FUNCTION get_study_streak(p_user_id UUID)
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
BEGIN
  -- Preencher o array com datas de atividade distintas, ordenadas do mais recente ao mais antigo
  SELECT ARRAY_AGG(DISTINCT activity_date ORDER BY activity_date DESC)
  INTO dates_array
  FROM study_activity
  WHERE user_id = p_user_id;
  
  -- Calcular total de dias com atividade
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
  prev_date := dates_array[1];
  
  FOR i IN 2..total_days_count LOOP
    day_gap := prev_date - dates_array[i];
    
    IF day_gap = 1 THEN
      -- Continuar a sequência atual
      longest_streak_count := longest_streak_count + 1;
    ELSE
      -- Reiniciar sequência
      longest_streak_count := 1;
    END IF;
    
    prev_date := dates_array[i];
  END LOOP;
  
  -- Retornar resultados
  RETURN QUERY SELECT current_streak_count, longest_streak_count, total_days_count, dates_array;
END;
$$ LANGUAGE plpgsql; 