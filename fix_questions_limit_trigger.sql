-- Migração para corrigir o trigger de limite de questões diárias
-- Este arquivo corrige o problema onde usuários premium com limite -1 (ilimitado)
-- estavam sendo bloqueados ao tentar adicionar questões

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

-- Recriar a função do gatilho para verificar a flag is_cloned e usar subscription_plans
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

  -- Busca o limite do plano do usuário usando subscription_plans
  SELECT (sp.features->>'maxQuestionsPerDay')::INTEGER
    INTO questions_limit
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
   WHERE us.user_id = NEW.user_id
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

  -- Verificar limite apenas se não for -1 (ilimitado)
  IF questions_limit IS NOT NULL AND questions_limit != -1 AND questions_used >= questions_limit THEN
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
SELECT tgname, tgtype FROM pg_trigger 
WHERE tgrelid = (SELECT oid FROM pg_class WHERE relname = 'questions') 
AND tgname = 'trigger_questions_per_day_limit';

-- Criar registros de subscription_usage para usuários que não têm
INSERT INTO subscription_usage (
  user_id,
  disciplines_count,
  subjects_per_discipline_count,
  study_sessions_today,
  flashcard_decks_count,
  flashcards_per_deck_count,
  questions_used_week,
  questions_used_today,
  simulados_created_week,
  simulados_questions_count,
  study_groups_created,
  faculty_groups_created,
  last_usage_date,
  last_week_reset,
  created_at,
  updated_at
)
SELECT 
  au.id AS user_id,
  0 AS disciplines_count,
  0 AS subjects_per_discipline_count,
  0 AS study_sessions_today,
  0 AS flashcard_decks_count,
  0 AS flashcards_per_deck_count,
  0 AS questions_used_week,
  0 AS questions_used_today,
  0 AS simulados_created_week,
  0 AS simulados_questions_count,
  0 AS study_groups_created,
  0 AS faculty_groups_created,
  CURRENT_DATE AS last_usage_date,
  CURRENT_DATE AS last_week_reset,
  NOW() AS created_at,
  NOW() AS updated_at
FROM auth.users au
LEFT JOIN subscription_usage su ON au.id = su.user_id
WHERE su.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;