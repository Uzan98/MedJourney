-- Script para corrigir a tabela de perfis removendo a coluna user_id redundante

-- Remover o índice se existir
DROP INDEX IF EXISTS idx_profiles_user_id;

-- Remover a coluna user_id se existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE profiles DROP COLUMN user_id;
    END IF;
END $$;

-- Garantir que a tabela profiles tenha as políticas corretas
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON profiles;
CREATE POLICY "Usuários podem ver todos os perfis" ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Usuários podem editar seus próprios perfis" ON profiles;
CREATE POLICY "Usuários podem editar seus próprios perfis" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem inserir seus próprios perfis" ON profiles;
CREATE POLICY "Usuários podem inserir seus próprios perfis" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Remover entradas duplicadas se existirem
CREATE TEMP TABLE IF NOT EXISTS unique_profiles AS
SELECT DISTINCT ON (id) *
FROM profiles;

TRUNCATE profiles;

INSERT INTO profiles
SELECT * FROM unique_profiles;

DROP TABLE IF EXISTS unique_profiles;

-- Verificar se há perfis faltando para usuários existentes
INSERT INTO profiles (id, username, created_at, updated_at)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', SPLIT_PART(email, '@', 1)), 
  created_at,
  created_at
FROM 
  auth.users
WHERE 
  id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

RAISE NOTICE 'Correção da tabela profiles concluída com sucesso'; 