-- Habilitar RLS na tabela community_challenges
ALTER TABLE community_challenges ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Permitir leitura pública de desafios" ON community_challenges;
DROP POLICY IF EXISTS "Permitir administradores gerenciar desafios" ON community_challenges;

-- Criar política para permitir que qualquer usuário autenticado possa visualizar desafios
CREATE POLICY "Permitir leitura pública de desafios"
ON community_challenges
FOR SELECT
USING (true);

-- Garantir que a tabela admin_users exista
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar o usuário específico como administrador
INSERT INTO admin_users (user_id)
VALUES ('9e959500-f290-4457-a5d7-2a81c496d123')
ON CONFLICT (user_id) DO NOTHING;

-- Criar política para permitir que administradores possam gerenciar desafios
CREATE POLICY "Permitir administradores gerenciar desafios"
ON community_challenges
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM admin_users
  )
); 