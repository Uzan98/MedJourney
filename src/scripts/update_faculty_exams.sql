-- Adicionar novos campos à tabela faculty_exams
ALTER TABLE public.faculty_exams
ADD COLUMN IF NOT EXISTS external_exam_id INTEGER,
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS disciplina VARCHAR(255),
ADD COLUMN IF NOT EXISTS periodo INTEGER;

-- Criar índice para melhorar a performance de consultas por external_exam_id
CREATE INDEX IF NOT EXISTS idx_faculty_exams_external_exam_id ON public.faculty_exams(external_exam_id);

-- Atualizar políticas de segurança para faculty_exams
DROP POLICY IF EXISTS "Exames visíveis para membros" ON public.faculty_exams;
CREATE POLICY "Exames visíveis para membros" ON public.faculty_exams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = faculty_exams.faculty_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Membros podem criar exames" ON public.faculty_exams;
CREATE POLICY "Membros podem criar exames" ON public.faculty_exams
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = faculty_exams.faculty_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Criadores e admins podem editar exames" ON public.faculty_exams;
CREATE POLICY "Criadores e admins podem editar exames" ON public.faculty_exams
  FOR UPDATE USING (
    creator_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = faculty_exams.faculty_id AND user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Criadores e admins podem excluir exames" ON public.faculty_exams;
CREATE POLICY "Criadores e admins podem excluir exames" ON public.faculty_exams
  FOR DELETE USING (
    creator_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = faculty_exams.faculty_id AND user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  ); 