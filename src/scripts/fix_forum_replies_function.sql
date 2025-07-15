-- Corrigir a função get_faculty_forum_replies para resolver ambiguidade nas colunas
CREATE OR REPLACE FUNCTION get_faculty_forum_replies(
  p_topic_id INTEGER,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id INTEGER,
  topic_id INTEGER,
  user_id UUID,
  content TEXT,
  is_solution BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_name TEXT,
  user_email VARCHAR,
  user_avatar_url TEXT,
  user_role VARCHAR,
  votes_count INTEGER
) AS $$
DECLARE
  v_faculty_id INTEGER;
BEGIN
  -- Obter o ID da faculdade do tópico
  SELECT faculty_id INTO v_faculty_id
  FROM faculty_forum_topics
  WHERE faculty_forum_topics.id = p_topic_id;
  
  IF v_faculty_id IS NULL THEN
    RAISE EXCEPTION 'Tópico não encontrado';
  END IF;

  -- Verificar se o usuário é membro da faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_members.faculty_id = v_faculty_id AND faculty_members.user_id = auth.uid()
  ) THEN
    -- Verificar se a faculdade é pública
    IF NOT EXISTS (
      SELECT 1 FROM faculties
      WHERE faculties.id = v_faculty_id AND faculties.is_public = TRUE
    ) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
  END IF;

  RETURN QUERY
  WITH reply_votes AS (
    SELECT 
      reply_id, 
      SUM(vote_type)::INTEGER AS count 
    FROM faculty_forum_votes 
    WHERE reply_id IS NOT NULL 
    GROUP BY reply_id
  )
  SELECT 
    ffr.id,
    ffr.topic_id,
    ffr.user_id,
    ffr.content,
    ffr.is_solution,
    ffr.created_at,
    ffr.updated_at,
    COALESCE(u.raw_user_meta_data->>'name', u.email) AS user_name,
    u.email AS user_email,
    COALESCE(u.raw_user_meta_data->>'avatar_url', '') AS user_avatar_url,
    fm.role AS user_role,
    COALESCE(rv.count, 0)::INTEGER AS votes_count
  FROM 
    faculty_forum_replies ffr
    JOIN auth.users u ON ffr.user_id = u.id
    JOIN faculty_members fm ON ffr.user_id = fm.user_id AND fm.faculty_id = v_faculty_id
    LEFT JOIN reply_votes rv ON ffr.id = rv.reply_id
  WHERE 
    ffr.topic_id = p_topic_id
  ORDER BY 
    ffr.is_solution DESC,
    rv.count DESC NULLS LAST,
    ffr.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 