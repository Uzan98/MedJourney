-- Tabela de Simulados
CREATE TABLE IF NOT EXISTS public.exams (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit INTEGER, -- Tempo em minutos (null = sem limite)
  is_public BOOLEAN DEFAULT false,
  shuffle_questions BOOLEAN DEFAULT true,
  show_answers BOOLEAN DEFAULT true, -- Mostrar respostas corretas após conclusão
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de relacionamento entre Simulados e Questões
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id BIGSERIAL PRIMARY KEY,
  exam_id BIGINT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  position INTEGER, -- Posição da questão no simulado
  weight NUMERIC DEFAULT 1.0, -- Peso da questão (para cálculo de pontuação)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (exam_id, question_id)
);

-- Tabela de Tentativas de Simulados
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id BIGINT NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  score NUMERIC, -- Pontuação final (calculada após conclusão)
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de Respostas do Usuário
CREATE TABLE IF NOT EXISTS public.exam_answers (
  id BIGSERIAL PRIMARY KEY,
  attempt_id BIGINT NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_id BIGINT REFERENCES public.answer_options(id) ON DELETE SET NULL, -- Para múltipla escolha
  answer_text TEXT, -- Para dissertativa
  true_false_answer BOOLEAN, -- Para verdadeiro/falso
  is_correct BOOLEAN, -- Indica se a resposta está correta
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (attempt_id, question_id)
);

-- Função para atualizar automaticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para exams
DROP TRIGGER IF EXISTS update_exams_updated_at ON public.exams;
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Trigger para exam_attempts
DROP TRIGGER IF EXISTS update_exam_attempts_updated_at ON public.exam_attempts;
CREATE TRIGGER update_exam_attempts_updated_at
BEFORE UPDATE ON public.exam_attempts
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Política RLS para simulados
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exams are viewable by owner or if public" ON public.exams;
CREATE POLICY "Exams are viewable by owner or if public"
  ON public.exams FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Exams are insertable by owner" ON public.exams;
CREATE POLICY "Exams are insertable by owner"
  ON public.exams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Exams are updatable by owner" ON public.exams;
CREATE POLICY "Exams are updatable by owner"
  ON public.exams FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Exams are deletable by owner" ON public.exams;
CREATE POLICY "Exams are deletable by owner"
  ON public.exams FOR DELETE
  USING (auth.uid() = user_id);

-- Política RLS para questões do simulado
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exam questions are viewable by exam owner or if exam is public" ON public.exam_questions;
CREATE POLICY "Exam questions are viewable by exam owner or if exam is public"
  ON public.exam_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = exam_questions.exam_id
    AND (exams.user_id = auth.uid() OR exams.is_public = true)
  ));

DROP POLICY IF EXISTS "Exam questions are insertable by exam owner" ON public.exam_questions;
CREATE POLICY "Exam questions are insertable by exam owner"
  ON public.exam_questions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = exam_questions.exam_id
    AND exams.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Exam questions are updatable by exam owner" ON public.exam_questions;
CREATE POLICY "Exam questions are updatable by exam owner"
  ON public.exam_questions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = exam_questions.exam_id
    AND exams.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = exam_questions.exam_id
    AND exams.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Exam questions are deletable by exam owner" ON public.exam_questions;
CREATE POLICY "Exam questions are deletable by exam owner"
  ON public.exam_questions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.exams
    WHERE exams.id = exam_questions.exam_id
    AND exams.user_id = auth.uid()
  ));

-- Política RLS para tentativas de simulado
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exam attempts are viewable by owner" ON public.exam_attempts;
CREATE POLICY "Exam attempts are viewable by owner"
  ON public.exam_attempts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Exam attempts are insertable by authenticated users" ON public.exam_attempts;
CREATE POLICY "Exam attempts are insertable by authenticated users"
  ON public.exam_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Exam attempts are updatable by owner" ON public.exam_attempts;
CREATE POLICY "Exam attempts are updatable by owner"
  ON public.exam_attempts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Exam attempts are deletable by owner" ON public.exam_attempts;
CREATE POLICY "Exam attempts are deletable by owner"
  ON public.exam_attempts FOR DELETE
  USING (auth.uid() = user_id);

-- Política RLS para respostas do usuário
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Exam answers are viewable by attempt owner" ON public.exam_answers;
CREATE POLICY "Exam answers are viewable by attempt owner"
  ON public.exam_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.exam_attempts
    WHERE exam_attempts.id = exam_answers.attempt_id
    AND exam_attempts.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Exam answers are insertable by attempt owner" ON public.exam_answers;
CREATE POLICY "Exam answers are insertable by attempt owner"
  ON public.exam_answers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exam_attempts
    WHERE exam_attempts.id = exam_answers.attempt_id
    AND exam_attempts.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Exam answers are updatable by attempt owner" ON public.exam_answers;
CREATE POLICY "Exam answers are updatable by attempt owner"
  ON public.exam_answers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.exam_attempts
    WHERE exam_attempts.id = exam_answers.attempt_id
    AND exam_attempts.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Exam answers are deletable by attempt owner" ON public.exam_answers;
CREATE POLICY "Exam answers are deletable by attempt owner"
  ON public.exam_answers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.exam_attempts
    WHERE exam_attempts.id = exam_answers.attempt_id
    AND exam_attempts.user_id = auth.uid()
  ));

-- Índices para melhorar o desempenho
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON public.exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_question_id ON public.exam_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON public.exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt_id ON public.exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question_id ON public.exam_answers(question_id); 