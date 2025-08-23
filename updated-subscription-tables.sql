-- Subscription tables for MedJourney app - Updated with new plan features

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

-- Subscription usage table - Expanded with additional counters
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  disciplines_count INTEGER NOT NULL DEFAULT 0,
  subjects_per_discipline_count INTEGER NOT NULL DEFAULT 0,
  study_sessions_today INTEGER NOT NULL DEFAULT 0,
  flashcard_decks_count INTEGER NOT NULL DEFAULT 0,
  flashcards_per_deck_count INTEGER NOT NULL DEFAULT 0,
  questions_used_week INTEGER NOT NULL DEFAULT 0,
  simulados_created_week INTEGER NOT NULL DEFAULT 0,
  simulados_questions_count INTEGER NOT NULL DEFAULT 0,
  study_groups_created INTEGER NOT NULL DEFAULT 0,
  faculty_groups_created INTEGER NOT NULL DEFAULT 0,
  last_usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_week_reset DATE NOT NULL DEFAULT date_trunc('week', CURRENT_DATE),
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

-- Subscription feature access table - Expanded with additional features
CREATE TABLE IF NOT EXISTS subscription_feature_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_tier TEXT NOT NULL CHECK (subscription_tier IN ('free', 'pro', 'pro_plus')),
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
    SELECT 1 FROM profiles 
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
    SELECT 1 FROM profiles 
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
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create policies for subscription_feature_access
CREATE POLICY "Allow public read access to subscription_feature_access" 
ON subscription_feature_access FOR SELECT 
USING (true);

-- Insert default subscription plans with updated features
INSERT INTO subscription_plans (name, description, tier, period, price_cents, stripe_price_id, features)
VALUES 
  ('Free', 'Plano gratuito com recursos básicos', 'free', 'monthly', 0, 'price_free', '{
    "maxDisciplines": 5,
    "maxSubjectsPerDiscipline": 5,
    "maxStudySessionsPerDay": 3,
    "maxFlashcardDecks": 1,
    "maxFlashcardsPerDeck": 30,
    "maxQuestionsPerWeek": 10,
    "maxSimuladosPerWeek": 1,
    "maxQuestionsPerSimulado": 30,
    "maxStudyGroups": 0,
    "maxFacultyGroups": 0,
    "aiPlanningAccess": false,
    "communityFeaturesAccess": true,
    "facultyFeaturesAccess": true,
    "advancedAnalytics": false,
    "prioritySupport": false,
    "bulkImport": false,
    "gradesAndAttendanceTracking": false
  }'::jsonb),
  
  ('Pro Mensal', 'Acesso a recursos avançados', 'pro', 'monthly', 2990, 'price_pro_monthly', '{
    "maxDisciplines": -1,
    "maxSubjectsPerDiscipline": -1,
    "maxStudySessionsPerDay": -1,
    "maxFlashcardDecks": 50,
    "maxFlashcardsPerDeck": -1,
    "maxQuestionsPerWeek": -1,
    "maxSimuladosPerMonth": 30,
    "maxQuestionsPerSimulado": 50,
    "maxStudyGroups": 5,
    "maxFacultyGroups": 1,
    "aiPlanningAccess": true,
    "communityFeaturesAccess": true,
    "facultyFeaturesAccess": true,
    "advancedAnalytics": true,
    "prioritySupport": false,
    "bulkImport": true,
    "gradesAndAttendanceTracking": true
  }'::jsonb),
  
  ('Pro Anual', 'Acesso a recursos avançados com desconto anual', 'pro', 'annual', 29900, 'price_pro_annual', '{
    "maxDisciplines": -1,
    "maxSubjectsPerDiscipline": -1,
    "maxStudySessionsPerDay": -1,
    "maxFlashcardDecks": 50,
    "maxFlashcardsPerDeck": -1,
    "maxQuestionsPerWeek": -1,
    "maxSimuladosPerMonth": 30,
    "maxQuestionsPerSimulado": 50,
    "maxStudyGroups": 5,
    "maxFacultyGroups": 1,
    "aiPlanningAccess": true,
    "communityFeaturesAccess": true,
    "facultyFeaturesAccess": true,
    "advancedAnalytics": true,
    "prioritySupport": false,
    "bulkImport": true,
    "gradesAndAttendanceTracking": true
  }'::jsonb),
  
  ('Pro+ Mensal', 'Acesso ilimitado a todos os recursos', 'pro_plus', 'monthly', 4990, 'price_pro_plus_monthly', '{
    "maxDisciplines": -1,
    "maxSubjectsPerDiscipline": -1,
    "maxStudySessionsPerDay": -1,
    "maxFlashcardDecks": -1,
    "maxFlashcardsPerDeck": -1,
    "maxQuestionsPerWeek": -1,
    "maxSimuladosPerMonth": -1,
    "maxQuestionsPerSimulado": -1,
    "maxStudyGroups": -1,
    "maxFacultyGroups": -1,
    "aiPlanningAccess": true,
    "communityFeaturesAccess": true,
    "facultyFeaturesAccess": true,
    "advancedAnalytics": true,
    "prioritySupport": true,
    "bulkImport": true,
    "gradesAndAttendanceTracking": true
  }'::jsonb),
  
  ('Pro+ Anual', 'Acesso ilimitado a todos os recursos com desconto anual', 'pro_plus', 'annual', 49900, 'price_pro_plus_annual', '{
    "maxDisciplines": -1,
    "maxSubjectsPerDiscipline": -1,
    "maxStudySessionsPerDay": -1,
    "maxFlashcardDecks": -1,
    "maxFlashcardsPerDeck": -1,
    "maxQuestionsPerWeek": -1,
    "maxSimuladosPerMonth": -1,
    "maxQuestionsPerSimulado": -1,
    "maxStudyGroups": -1,
    "maxFacultyGroups": -1,
    "aiPlanningAccess": true,
    "communityFeaturesAccess": true,
    "facultyFeaturesAccess": true,
    "advancedAnalytics": true,
    "prioritySupport": true,
    "bulkImport": true,
    "gradesAndAttendanceTracking": true
  }'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Insert expanded feature access
INSERT INTO subscription_feature_access (subscription_tier, feature_key, has_access, max_usage)
VALUES
  -- Free tier
  ('free', 'disciplines', true, 5),
  ('free', 'subjects_per_discipline', true, 5),
  ('free', 'study_sessions_per_day', true, 3),
  ('free', 'flashcard_decks', true, 1),
  ('free', 'flashcards_per_deck', true, 30),
  ('free', 'questions_per_week', true, 10),
  ('free', 'simulados_per_week', true, 1),
  ('free', 'questions_per_simulado', true, 30),
  ('free', 'study_groups', false, 0),
  ('free', 'faculty_groups', false, 0),
  ('free', 'ai_planning', false, null),
  ('free', 'community_features', true, null),
  ('free', 'faculty_features', true, null),
  ('free', 'advanced_analytics', false, null),
  ('free', 'priority_support', false, null),
  ('free', 'bulk_import', false, null),
  ('free', 'grades_attendance_tracking', false, null),
  
  -- Pro tier
  ('pro', 'disciplines', true, null),
  ('pro', 'subjects_per_discipline', true, null),
  ('pro', 'study_sessions_per_day', true, null),
  ('pro', 'flashcard_decks', true, 50),
  ('pro', 'flashcards_per_deck', true, null),
  ('pro', 'questions_per_week', true, null),
  ('pro', 'simulados_per_month', true, 30),
  ('pro', 'questions_per_simulado', true, 50),
  ('pro', 'study_groups', true, 5),
  ('pro', 'faculty_groups', true, 1),
  ('pro', 'ai_planning', true, null),
  ('pro', 'community_features', true, null),
  ('pro', 'faculty_features', true, null),
  ('pro', 'advanced_analytics', true, null),
  ('pro', 'priority_support', false, null),
  ('pro', 'bulk_import', true, null),
  ('pro', 'grades_attendance_tracking', true, null),
  
  -- Pro+ tier
  ('pro_plus', 'disciplines', true, null),
  ('pro_plus', 'subjects_per_discipline', true, null),
  ('pro_plus', 'study_sessions_per_day', true, null),
  ('pro_plus', 'flashcard_decks', true, null),
  ('pro_plus', 'flashcards_per_deck', true, null),
  ('pro_plus', 'questions_per_week', true, null),
  ('pro_plus', 'simulados_per_month', true, null),
  ('pro_plus', 'questions_per_simulado', true, null),
  ('pro_plus', 'study_groups', true, null),
  ('pro_plus', 'faculty_groups', true, null),
  ('pro_plus', 'ai_planning', true, null),
  ('pro_plus', 'community_features', true, null),
  ('pro_plus', 'faculty_features', true, null),
  ('pro_plus', 'advanced_analytics', true, null),
  ('pro_plus', 'priority_support', true, null),
  ('pro_plus', 'bulk_import', true, null),
  ('pro_plus', 'grades_attendance_tracking', true, null)
ON CONFLICT (subscription_tier, feature_key) DO NOTHING;

-- Create function to reset daily and weekly usage
CREATE OR REPLACE FUNCTION reset_usage_counters()
RETURNS void AS $$
BEGIN
  -- Reset daily counters
  UPDATE subscription_usage
  SET study_sessions_today = 0,
      last_usage_date = CURRENT_DATE
  WHERE last_usage_date < CURRENT_DATE;
  
  -- Reset weekly counters
  UPDATE subscription_usage
  SET questions_used_week = 0,
      simulados_created_week = 0,
      last_week_reset = date_trunc('week', CURRENT_DATE)
  WHERE last_week_reset < date_trunc('week', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: A parte abaixo requer a extensão pg_cron, que pode não estar disponível no seu ambiente Supabase.
-- Se você estiver usando Supabase, pode configurar um job externo (como um cron job no servidor)
-- ou usar o Supabase Edge Functions com agendamento para chamar a função reset_usage_counters.

-- Verifique se a extensão pg_cron está disponível
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
  ) THEN
    -- Tente criar a extensão se ela não existir
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    
    -- Tente agendar o job
    PERFORM cron.schedule(
      'reset-usage-counters',
      '0 0 * * *', -- Run at midnight every day
      'SELECT reset_usage_counters()'
    );
    
    RAISE NOTICE 'Job de reset de contadores agendado com sucesso usando pg_cron';
  ELSE
    RAISE NOTICE 'A extensão pg_cron não está disponível. Você precisará configurar um job externo para resetar os contadores diariamente.';
    RAISE NOTICE 'Você pode usar Supabase Edge Functions com agendamento ou um serviço externo como o cron-job.org';
  END IF;
END $$;