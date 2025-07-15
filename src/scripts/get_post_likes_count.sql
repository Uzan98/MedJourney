-- Função para obter a contagem de curtidas de um post e se o usuário atual curtiu
CREATE OR REPLACE FUNCTION public.get_post_likes_count(p_post_id INT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_user_liked BOOLEAN;
  v_result JSON;
BEGIN
  -- Obter a contagem total de curtidas
  SELECT COUNT(*) INTO v_count
  FROM faculty_post_likes
  WHERE post_id = p_post_id;
  
  -- Verificar se o usuário atual curtiu
  SELECT EXISTS (
    SELECT 1
    FROM faculty_post_likes
    WHERE post_id = p_post_id
    AND user_id = auth.uid()
  ) INTO v_user_liked;
  
  -- Construir o resultado JSON
  v_result := json_build_object(
    'count', v_count,
    'user_liked', v_user_liked
  );
  
  RETURN v_result;
END;
$$; 