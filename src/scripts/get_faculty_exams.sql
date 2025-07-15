-- Função para obter os simulados compartilhados de uma faculdade
CREATE OR REPLACE FUNCTION public.get_faculty_exams(
  p_faculty_id INT,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário tem acesso à faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_id = p_faculty_id 
    AND user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM faculties
    WHERE id = p_faculty_id
    AND is_public = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado à faculdade';
  END IF;
  
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', fe.id,
    'faculty_id', fe.faculty_id,
    'creator_id', fe.creator_id,
    'title', fe.title,
    'description', fe.description,
    'scheduled_date', fe.scheduled_date,
    'duration_minutes', fe.duration_minutes,
    'max_score', fe.max_score,
    'is_published', fe.is_published,
    'external_exam_id', fe.external_exam_id,
    'category', fe.category,
    'disciplina', fe.disciplina,
    'periodo', fe.periodo,
    'created_at', fe.created_at,
    'updated_at', fe.updated_at,
    'user_name', u.name,
    'user_email', u.email,
    'user_avatar_url', u.avatar_url
  )
  FROM faculty_exams fe
  LEFT JOIN users u ON fe.creator_id = u.id
  WHERE fe.faculty_id = p_faculty_id
  ORDER BY fe.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$; 