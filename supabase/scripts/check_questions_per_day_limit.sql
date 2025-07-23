-- Função de trigger para limitar questões diárias por usuário
CREATE OR REPLACE FUNCTION check_questions_per_day_limit()
RETURNS TRIGGER AS $$
DECLARE
  questions_limit INTEGER;
  questions_used INTEGER;
BEGIN
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

  IF questions_limit IS NOT NULL AND questions_used >= questions_limit THEN
    RAISE EXCEPTION 'Limite diário de criação de questões atingido para seu plano. Faça upgrade para aumentar o limite.';
  END IF;

  -- Incrementa o contador de uso diário
  UPDATE subscription_usage
     SET questions_used_today = questions_used_today + 1,
         last_usage_date = CURRENT_DATE
   WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para aplicar o limite na tabela de questões
DROP TRIGGER IF EXISTS trigger_questions_per_day_limit ON public.questions;
CREATE TRIGGER trigger_questions_per_day_limit
BEFORE INSERT ON public.questions
FOR EACH ROW
EXECUTE FUNCTION check_questions_per_day_limit(); 