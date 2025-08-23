-- Subscription tables for MedJourney app

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'pro_plus')),
  period TEXT NOT NULL CHECK (period IN ('monthly', 'annual')),
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'pro_plus')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Subscription usage table
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  disciplines_count INTEGER NOT NULL DEFAULT 0,
  flashcard_decks_count INTEGER NOT NULL DEFAULT 0,
  questions_used_today INTEGER NOT NULL DEFAULT 0,
  last_usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Subscription transactions table
CREATE TABLE IF NOT EXISTS subscription_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed')),
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Subscription feature access table
CREATE TABLE IF NOT EXISTS subscription_feature_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'pro_plus')),
  feature_key TEXT NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT false,
  max_usage INTEGER, -- NULL means unlimited
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(subscription_tier, feature_key)
);

-- Create RLS policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_feature_access ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription_plans
CREATE POLICY "Allow public read access to subscription_plans" 
ON subscription_plans FOR SELECT 
USING (true);

-- Create policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON user_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all subscriptions" 
ON user_subscriptions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create policies for subscription_usage
CREATE POLICY "Users can view their own usage" 
ON subscription_usage FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all usage" 
ON subscription_usage FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create policies for subscription_transactions
CREATE POLICY "Users can view their own transactions" 
ON subscription_transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all transactions" 
ON subscription_transactions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create policies for subscription_feature_access
CREATE POLICY "Allow public read access to subscription_feature_access" 
ON subscription_feature_access FOR SELECT 
USING (true);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, tier, period, price_cents, stripe_price_id, features)
VALUES 
  ('Free', 'Plano gratuito com recursos básicos', 'free', 'monthly', 0, 'price_free', '{"maxDisciplines": 5, "maxFlashcardDecks": 2, "maxQuestionsPerDay": 10, "aiPlanningAccess": false, "communityFeaturesAccess": true, "facultyFeaturesAccess": false, "advancedAnalytics": false, "prioritySupport": false}'::jsonb),
  ('Pro Mensal', 'Acesso a recursos avançados', 'pro', 'monthly', 2990, 'price_pro_monthly', '{"maxDisciplines": 15, "maxFlashcardDecks": 10, "maxQuestionsPerDay": 100, "aiPlanningAccess": true, "communityFeaturesAccess": true, "facultyFeaturesAccess": true, "advancedAnalytics": false, "prioritySupport": false}'::jsonb),
  ('Pro Anual', 'Acesso a recursos avançados com desconto anual', 'pro', 'annual', 29900, 'price_pro_annual', '{"maxDisciplines": 15, "maxFlashcardDecks": 10, "maxQuestionsPerDay": 100, "aiPlanningAccess": true, "communityFeaturesAccess": true, "facultyFeaturesAccess": true, "advancedAnalytics": false, "prioritySupport": false}'::jsonb),
  ('Pro+ Mensal', 'Acesso ilimitado a todos os recursos', 'pro_plus', 'monthly', 4990, 'price_pro_plus_monthly', '{"maxDisciplines": -1, "maxFlashcardDecks": -1, "maxQuestionsPerDay": -1, "aiPlanningAccess": true, "communityFeaturesAccess": true, "facultyFeaturesAccess": true, "advancedAnalytics": true, "prioritySupport": true}'::jsonb),
  ('Pro+ Anual', 'Acesso ilimitado a todos os recursos com desconto anual', 'pro_plus', 'annual', 49900, 'price_pro_plus_annual', '{"maxDisciplines": -1, "maxFlashcardDecks": -1, "maxQuestionsPerDay": -1, "aiPlanningAccess": true, "communityFeaturesAccess": true, "facultyFeaturesAccess": true, "advancedAnalytics": true, "prioritySupport": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert default feature access
INSERT INTO subscription_feature_access (subscription_tier, feature_key, has_access, max_usage)
VALUES
  ('free', 'disciplines', true, 5),
  ('free', 'flashcard_decks', true, 2),
  ('free', 'questions_per_day', true, 10),
  ('free', 'ai_planning', false, null),
  ('free', 'community_features', true, null),
  ('free', 'faculty_features', false, null),
  ('free', 'advanced_analytics', false, null),
  ('free', 'priority_support', false, null),
  
  ('pro', 'disciplines', true, 15),
  ('pro', 'flashcard_decks', true, 10),
  ('pro', 'questions_per_day', true, 100),
  ('pro', 'ai_planning', true, null),
  ('pro', 'community_features', true, null),
  ('pro', 'faculty_features', true, null),
  ('pro', 'advanced_analytics', false, null),
  ('pro', 'priority_support', false, null),
  
  ('pro_plus', 'disciplines', true, null),
  ('pro_plus', 'flashcard_decks', true, null),
  ('pro_plus', 'questions_per_day', true, null),
  ('pro_plus', 'ai_planning', true, null),
  ('pro_plus', 'community_features', true, null),
  ('pro_plus', 'faculty_features', true, null),
  ('pro_plus', 'advanced_analytics', true, null),
  ('pro_plus', 'priority_support', true, null)
ON CONFLICT (subscription_tier, feature_key) DO NOTHING;

-- Create function to automatically create free subscription for new users
CREATE OR REPLACE FUNCTION create_free_subscription_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Get the free plan ID
  SELECT id INTO free_plan_id FROM subscription_plans WHERE tier = 'free' LIMIT 1;
  
  -- Create a subscription for the new user
  INSERT INTO user_subscriptions (
    user_id, 
    plan_id, 
    tier, 
    status, 
    current_period_start, 
    current_period_end, 
    cancel_at_period_end
  )
  VALUES (
    NEW.id, 
    free_plan_id, 
    'free', 
    'active', 
    NOW(), 
    NOW() + INTERVAL '100 years', 
    false
  );
  
  -- Create initial usage record
  INSERT INTO subscription_usage (
    user_id,
    subscription_id,
    disciplines_count,
    flashcard_decks_count,
    questions_used_today,
    last_usage_date
  )
  VALUES (
    NEW.id,
    (SELECT id FROM user_subscriptions WHERE user_id = NEW.id),
    0,
    0,
    0,
    CURRENT_DATE
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create free subscription for new users
DROP TRIGGER IF EXISTS create_free_subscription_trigger ON auth.users;
CREATE TRIGGER create_free_subscription_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_free_subscription_for_new_user();

-- Create function to reset daily question usage
CREATE OR REPLACE FUNCTION reset_daily_question_usage()
RETURNS void AS $$
BEGIN
  UPDATE subscription_usage
  SET questions_used_today = 0,
      last_usage_date = CURRENT_DATE
  WHERE last_usage_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cron job to reset daily question usage
SELECT cron.schedule(
  'reset-daily-question-usage',
  '0 0 * * *', -- Run at midnight every day
  $$SELECT reset_daily_question_usage()$$
);