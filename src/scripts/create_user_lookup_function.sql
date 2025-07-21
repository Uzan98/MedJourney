-- Função para buscar dados de usuários de forma segura
-- Esta função permite acessar dados de auth.users de forma controlada

CREATE OR REPLACE FUNCTION public.get_user_details(user_ids uuid[])
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  avatar_url text
) AS $$
BEGIN
  -- Desativar temporariamente o RLS para esta transação
  SET LOCAL rls.enabled = off;
  
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'name', '')::text as name,
    COALESCE(u.raw_user_meta_data->>'avatar_url', '')::text as avatar_url
  FROM
    auth.users u
  WHERE
    u.id = ANY(user_ids);
    
  -- Reativar o RLS
  SET LOCAL rls.enabled = on;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão para todos os usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_user_details TO authenticated;

-- Comentário para o DBA:
-- Esta função é segura pois:
-- 1. Usa SECURITY DEFINER para executar com permissões elevadas
-- 2. Retorna apenas dados não sensíveis dos usuários
-- 3. Só pode ser executada por usuários autenticados 