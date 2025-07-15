-- Função para compartilhar um simulado com uma faculdade
CREATE OR REPLACE FUNCTION public.share_faculty_exam(
  p_faculty_id INT,
  p_external_exam_id INT,
  p_title VARCHAR,
  p_description TEXT DEFAULT NULL,
  p_category VARCHAR DEFAULT NULL,
  p_disciplina VARCHAR DEFAULT NULL,
  p_periodo INT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exam_id INT;
BEGIN
  -- Verificar se o usuário tem acesso à faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_id = p_faculty_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Acesso negado à faculdade';
  END IF;
  
  -- Inserir o exame compartilhado
  INSERT INTO faculty_exams (
    faculty_id,
    creator_id,
    title,
    description,
    external_exam_id,
    category,
    disciplina,
    periodo
  ) VALUES (
    p_faculty_id,
    auth.uid(),
    p_title,
    p_description,
    p_external_exam_id,
    p_category,
    p_disciplina,
    p_periodo
  )
  RETURNING id INTO v_exam_id;
  
  RETURN v_exam_id;
END;
$$; 