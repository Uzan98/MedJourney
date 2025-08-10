-- Tabela de versões da Política de Privacidade
CREATE TABLE IF NOT EXISTS privacy_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(10) NOT NULL,
  effective_date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de aceitação da Política de Privacidade pelos usuários
CREATE TABLE IF NOT EXISTS user_privacy_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  privacy_policy_id uuid REFERENCES privacy_policy(id) ON DELETE CASCADE,
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, privacy_policy_id)
);