-- Tabela para armazenar imagens das questões de provas completas
CREATE TABLE IF NOT EXISTS public.complete_exam_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complete_exam_question_id BIGINT NOT NULL REFERENCES public.complete_exam_questions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INTEGER DEFAULT 1,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Índices para melhorar o desempenho
CREATE INDEX IF NOT EXISTS idx_complete_exam_images_question_id ON public.complete_exam_images(complete_exam_question_id);
CREATE INDEX IF NOT EXISTS idx_complete_exam_images_position ON public.complete_exam_images(complete_exam_question_id, position);

-- Política RLS para imagens de questões de provas completas
ALTER TABLE public.complete_exam_images ENABLE ROW LEVEL SECURITY;

-- Política para visualização (provas públicas aprovadas ou do próprio usuário)
DROP POLICY IF EXISTS "Complete exam images are viewable by exam owner or public approved" ON public.complete_exam_images;
CREATE POLICY "Complete exam images are viewable by exam owner or public approved"
  ON public.complete_exam_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.complete_exam_questions ceq
    JOIN public.complete_exams ce ON ce.id = ceq.complete_exam_id
    WHERE ceq.id = complete_exam_images.complete_exam_question_id
    AND (ce.user_id = auth.uid() OR (ce.is_public = true AND ce.is_approved = true))
  ));

-- Política para inserção (apenas proprietário da prova)
DROP POLICY IF EXISTS "Complete exam images are insertable by exam owner" ON public.complete_exam_images;
CREATE POLICY "Complete exam images are insertable by exam owner"
  ON public.complete_exam_images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.complete_exam_questions ceq
    JOIN public.complete_exams ce ON ce.id = ceq.complete_exam_id
    WHERE ceq.id = complete_exam_images.complete_exam_question_id
    AND ce.user_id = auth.uid()
  ));

-- Política para atualização (apenas proprietário da prova)
DROP POLICY IF EXISTS "Complete exam images are updatable by exam owner" ON public.complete_exam_images;
CREATE POLICY "Complete exam images are updatable by exam owner"
  ON public.complete_exam_images FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.complete_exam_questions ceq
    JOIN public.complete_exams ce ON ce.id = ceq.complete_exam_id
    WHERE ceq.id = complete_exam_images.complete_exam_question_id
    AND ce.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.complete_exam_questions ceq
    JOIN public.complete_exams ce ON ce.id = ceq.complete_exam_id
    WHERE ceq.id = complete_exam_images.complete_exam_question_id
    AND ce.user_id = auth.uid()
  ));

-- Política para exclusão (apenas proprietário da prova)
DROP POLICY IF EXISTS "Complete exam images are deletable by exam owner" ON public.complete_exam_images;
CREATE POLICY "Complete exam images are deletable by exam owner"
  ON public.complete_exam_images FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.complete_exam_questions ceq
    JOIN public.complete_exams ce ON ce.id = ceq.complete_exam_id
    WHERE ceq.id = complete_exam_images.complete_exam_question_id
    AND ce.user_id = auth.uid()
  ));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_complete_exam_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_complete_exam_images_updated_at_trigger ON public.complete_exam_images;
CREATE TRIGGER update_complete_exam_images_updated_at_trigger
  BEFORE UPDATE ON public.complete_exam_images
  FOR EACH ROW
  EXECUTE FUNCTION update_complete_exam_images_updated_at();