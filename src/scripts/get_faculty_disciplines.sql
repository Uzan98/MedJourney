-- Função para obter as disciplinas de uma faculdade
CREATE OR REPLACE FUNCTION public.get_faculty_disciplines(
  p_faculty_id INT
)
RETURNS SETOF TEXT
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
  
  -- Retornar disciplinas únicas de materiais e exames
  RETURN QUERY
  SELECT DISTINCT disciplina
  FROM (
    -- Disciplinas dos materiais
    SELECT disciplina FROM faculty_materials
    WHERE faculty_id = p_faculty_id AND disciplina IS NOT NULL
    
    UNION
    
    -- Disciplinas dos exames
    SELECT disciplina FROM faculty_exams
    WHERE faculty_id = p_faculty_id AND disciplina IS NOT NULL
  ) AS all_disciplines
  WHERE disciplina != ''
  ORDER BY disciplina;
END;
$$; 