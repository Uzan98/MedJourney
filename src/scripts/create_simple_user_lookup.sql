-- Função simplificada para buscar dados de usuários
-- Esta versão tem menos campos e usa tipos mais básicos

CREATE OR REPLACE FUNCTION public.get_user_info(user_ids uuid[])
RETURNS TABLE (
  id uuid,
  email text,
  name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    (u.raw_user_meta_data->>'name')::text as name
  FROM
    auth.users u
  WHERE
    u.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão para todos os usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_user_info TO authenticated; 