-- Adiciona a coluna questions_used_today à tabela subscription_usage
ALTER TABLE subscription_usage 
ADD COLUMN IF NOT EXISTS questions_used_today INTEGER DEFAULT 0;

-- Adiciona um trigger para resetar o contador diariamente
CREATE OR REPLACE FUNCTION reset_daily_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a data da última atualização for diferente da data atual, resetar contadores diários
  IF NEW.last_usage_date IS DISTINCT FROM CURRENT_DATE THEN
    NEW.questions_used_today := 0;
    NEW.study_sessions_today := 0;
    NEW.last_usage_date := CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar ou substituir o trigger
DROP TRIGGER IF EXISTS reset_daily_counters_trigger ON subscription_usage;
CREATE TRIGGER reset_daily_counters_trigger
BEFORE UPDATE ON subscription_usage
FOR EACH ROW
EXECUTE FUNCTION reset_daily_counters();

-- Inicializar os valores da coluna questions_used_today com os valores de questions_used_week
UPDATE subscription_usage SET questions_used_today = questions_used_week;

-- Atualizar a data de uso para hoje
UPDATE subscription_usage SET last_usage_date = CURRENT_DATE; 