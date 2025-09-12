-- Tabela para armazenar imagens das questões
CREATE TABLE IF NOT EXISTS public.exam_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id BIGINT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INTEGER DEFAULT 1,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Índices para melhorar o desempenho
CREATE INDEX IF NOT EXISTS idx_exam_images_question_id ON public.exam_images(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_images_position ON public.exam_images(question_id, position);

-- Política RLS para imagens de questões
ALTER TABLE public.exam_images ENABLE ROW LEVEL SECURITY;

-- Política para visualização (questões públicas ou do próprio usuário)
DROP POLICY IF EXISTS "Exam images are viewable by question owner or public" ON public.exam_images;
CREATE POLICY "Exam images are viewable by question owner or public"
  ON public.exam_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.questions
    WHERE questions.id = exam_images.question_id
    AND (questions.user_id = auth.uid() OR questions.is_public = true)
  ));

-- Política para inserção (apenas proprietário da questão)
DROP POLICY IF EXISTS "Exam images are insertable by question owner" ON public.exam_images;
CREATE POLICY "Exam images are insertable by question owner"
  ON public.exam_images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.questions
    WHERE questions.id = exam_images.question_id
    AND questions.user_id = auth.uid()
  ));

-- Política para atualização (apenas proprietário da questão)
DROP POLICY IF EXISTS "Exam images are updatable by question owner" ON public.exam_images;
CREATE POLICY "Exam images are updatable by question owner"
  ON public.exam_images FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.questions
    WHERE questions.id = exam_images.question_id
    AND questions.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.questions
    WHERE questions.id = exam_images.question_id
    AND questions.user_id = auth.uid()
  ));

-- Política para exclusão (apenas proprietário da questão)
DROP POLICY IF EXISTS "Exam images are deletable by question owner" ON public.exam_images;
CREATE POLICY "Exam images are deletable by question owner"
  ON public.exam_images FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.questions
    WHERE questions.id = exam_images.question_id
    AND questions.user_id = auth.uid()
  ));

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_exam_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_exam_images_updated_at ON public.exam_images;
CREATE TRIGGER update_exam_images_updated_at
    BEFORE UPDATE ON public.exam_images
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_images_updated_at();

-- Comentários da tabela
COMMENT ON TABLE public.exam_images IS 'Armazena imagens associadas às questões';
COMMENT ON COLUMN public.exam_images.id IS 'ID único da imagem';
COMMENT ON COLUMN public.exam_images.question_id IS 'ID da questão à qual a imagem pertence';
COMMENT ON COLUMN public.exam_images.image_url IS 'URL pública da imagem no Supabase Storage';
COMMENT ON COLUMN public.exam_images.position IS 'Posição da imagem na questão (para ordenação)';
COMMENT ON COLUMN public.exam_images.description IS 'Descrição opcional da imagem';
COMMENT ON COLUMN public.exam_images.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN public.exam_images.updated_at IS 'Data da última atualização do registro';