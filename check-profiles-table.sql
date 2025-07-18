-- Script para verificar a estrutura da tabela profiles e adicionar a coluna 'role' se necessário

-- Verificar se a tabela profiles existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    RAISE EXCEPTION 'A tabela profiles não existe!';
  END IF;
END $$;

-- Verificar se a coluna role existe na tabela profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    -- Adicionar a coluna role se ela não existir
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
    RAISE NOTICE 'Coluna role adicionada à tabela profiles com valor padrão "user"';
  ELSE
    RAISE NOTICE 'A coluna role já existe na tabela profiles';
  END IF;
END $$;

-- Adicionar um usuário admin se não existir
DO $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE role = 'admin'
  ) INTO admin_exists;
  
  IF NOT admin_exists THEN
    RAISE NOTICE 'Não existe nenhum usuário admin. Você deve criar um manualmente.';
    RAISE NOTICE 'Execute o comando: UPDATE profiles SET role = ''admin'' WHERE id = ''seu_id_de_usuario'';';
  ELSE
    RAISE NOTICE 'Pelo menos um usuário admin já existe no sistema';
  END IF;
END $$;

-- Exibir a estrutura atual da tabela profiles
SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position; 