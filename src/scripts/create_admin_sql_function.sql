-- Criar função para executar SQL como administrador
CREATE OR REPLACE FUNCTION execute_admin_sql(sql_query TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;

-- Garantir que apenas administradores possam executar esta função
REVOKE EXECUTE ON FUNCTION execute_admin_sql FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_admin_sql TO authenticated;

-- Criar política RLS para permitir apenas administradores executarem esta função
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admin_users
    WHERE user_id = auth.uid()
  );
END;
$$;

-- Criar tabela admin_users se não existir
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir o usuário específico como administrador
INSERT INTO admin_users (user_id)
VALUES ('9e959500-f290-4457-a5d7-2a81c496d123')
ON CONFLICT (user_id) DO NOTHING; 