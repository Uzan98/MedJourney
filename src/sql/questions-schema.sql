-- Tabela de Questões
CREATE TABLE IF NOT EXISTS public.questions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline_id BIGINT REFERENCES public.disciplines(id) ON DELETE SET NULL,
  subject_id BIGINT REFERENCES public.subjects(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  explanation TEXT,
  difficulty TEXT CHECK (difficulty IN ('baixa', 'média', 'alta')) NOT NULL DEFAULT 'média',
  question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'essay')) NOT NULL,
  correct_answer TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de Opções de Resposta
CREATE TABLE IF NOT EXISTS public.answer_options (
  id UUID PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Função para atualizar automaticamente o updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para questions
DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;
CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Trigger para answer_options
DROP TRIGGER IF EXISTS update_answer_options_updated_at ON public.answer_options;
CREATE TRIGGER update_answer_options_updated_at
BEFORE UPDATE ON public.answer_options
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Política RLS para questões (somente o proprietário pode manipular)
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Questions are viewable by owner" ON public.questions;
CREATE POLICY "Questions are viewable by owner"
  ON public.questions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Questions are insertable by owner" ON public.questions;
CREATE POLICY "Questions are insertable by owner"
  ON public.questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Questions are updatable by owner" ON public.questions;
CREATE POLICY "Questions are updatable by owner"
  ON public.questions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Questions are deletable by owner" ON public.questions;
CREATE POLICY "Questions are deletable by owner"
  ON public.questions FOR DELETE
  USING (auth.uid() = user_id);

-- Política RLS para opções de resposta
ALTER TABLE public.answer_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Answer options are viewable by question owner" ON public.answer_options;
CREATE POLICY "Answer options are viewable by question owner"
  ON public.answer_options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Answer options are insertable by question owner" ON public.answer_options;
CREATE POLICY "Answer options are insertable by question owner"
  ON public.answer_options FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Answer options are updatable by question owner" ON public.answer_options;
CREATE POLICY "Answer options are updatable by question owner"
  ON public.answer_options FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Answer options are deletable by question owner" ON public.answer_options;
CREATE POLICY "Answer options are deletable by question owner"
  ON public.answer_options FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  ));

-- Índices para melhorar o desempenho
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON public.questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_discipline_id ON public.questions(discipline_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_question_type ON public.questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_answer_options_question_id ON public.answer_options(question_id); 