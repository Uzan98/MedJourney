-- Primeiro, adicionar a coluna is_cloned à tabela questions se ainda não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'questions' 
        AND column_name = 'is_cloned'
    ) THEN
        ALTER TABLE questions ADD COLUMN is_cloned BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Remover o gatilho existente
DROP TRIGGER IF EXISTS trigger_questions_per_day_limit ON questions;

-- Recriar a função do gatilho para verificar a flag is_cloned
CREATE OR REPLACE FUNCTION check_questions_per_day_limit()
RETURNS TRIGGER AS $$
DECLARE
  questions_limit INTEGER;
  questions_used INTEGER;
BEGIN
  -- Se a questão foi clonada, não incrementar o contador
  IF NEW.is_cloned = TRUE THEN
    RETURN NEW;
  END IF;

  -- Busca o limite do plano do usuário
  SELECT sfa.max_usage
    INTO questions_limit
    FROM user_subscriptions us
    JOIN subscription_feature_access sfa
      ON us.tier = sfa.subscription_tier
   WHERE us.user_id = NEW.user_id
     AND sfa.feature_key = 'questions_per_day'
   LIMIT 1;

  -- Busca o uso atual
  SELECT su.questions_used_today
    INTO questions_used
    FROM subscription_usage su
   WHERE su.user_id = NEW.user_id;

  -- Se não encontrar registro de uso, considerar como 0
  IF questions_used IS NULL THEN
    questions_used := 0;
  END IF;

  IF questions_limit IS NOT NULL AND questions_used >= questions_limit THEN
    RAISE EXCEPTION 'Limite diário de criação de questões atingido para seu plano. Faça upgrade para aumentar o limite.';
  END IF;

  -- Incrementa o contador de uso diário
  UPDATE subscription_usage
     SET questions_used_today = questions_used_today + 1,
         last_usage_date = CURRENT_DATE
   WHERE user_id = NEW.user_id;
  
  -- Se não encontrou nenhum registro para atualizar, criar um novo
  IF NOT FOUND THEN
    INSERT INTO subscription_usage (
      user_id, 
      questions_used_today, 
      questions_used_week,
      last_usage_date,
      created_at,
      updated_at
    ) VALUES (
      NEW.user_id,
      1,
      1,
      CURRENT_DATE,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o gatilho
CREATE TRIGGER trigger_questions_per_day_limit
BEFORE INSERT ON questions
FOR EACH ROW
EXECUTE FUNCTION check_questions_per_day_limit();

-- Verificar se o gatilho foi criado corretamente
SELECT tgname, tgtype FROM pg_trigger WHERE tgrelid = (SELECT oid FROM pg_class WHERE relname = 'questions') AND tgname = 'trigger_questions_per_day_limit'; 