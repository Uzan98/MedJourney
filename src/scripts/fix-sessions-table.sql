-- Script para corrigir problemas com as tabelas de sessões de estudo
-- Executa este script no console SQL do Supabase

-- 1. Verificar se a tabela 'studysessions' existe (sem underscore)
SELECT EXISTS (
   SELECT FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename = 'studysessions'
);

-- 2. Verificar se a tabela 'study_sessions' existe (com underscore)
SELECT EXISTS (
   SELECT FROM pg_tables
   WHERE schemaname = 'public'
   AND tablename = 'study_sessions'
);

-- 3. Se a tabela 'studysessions' existir, vamos remapeá-la para 'study_sessions'
-- NOTA: Se você tem dados importantes nela, faça um backup antes!
/*
DROP TABLE IF EXISTS public.study_sessions CASCADE;

CREATE TABLE public.study_sessions AS 
SELECT * FROM public.studysessions;

-- Adicionar a coluna de ID serial se não existir
ALTER TABLE public.study_sessions 
ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY;

-- Adicionar constraint de usuário se não existir
ALTER TABLE public.study_sessions
ADD CONSTRAINT study_sessions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remover a tabela antiga após migração
DROP TABLE IF EXISTS public.studysessions CASCADE;
*/

-- 4. Se a tabela 'study_sessions' não existir, criá-la
CREATE TABLE IF NOT EXISTS study_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline_id INTEGER, -- ID da disciplina associada
  subject_id INTEGER, -- ID do assunto associado (opcional)
  title VARCHAR(255) NOT NULL,
  scheduled_date TIMESTAMPTZ, -- Data e hora agendada (pode ser nulo para sessões não agendadas)
  duration_minutes INTEGER NOT NULL DEFAULT 0, -- Duração planejada em minutos
  actual_duration_minutes INTEGER, -- Duração real (após conclusão)
  notes TEXT, -- Notas sobre a sessão
  completed BOOLEAN NOT NULL DEFAULT false, -- Indica se a sessão foi concluída
  status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- 'pendente', 'agendada', 'em-andamento', 'concluida', 'cancelada'
  type VARCHAR(20), -- 'new-content', 'revision', 'practice', 'exam-prep'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Garantir que a segurança por linhas (RLS) está habilitada
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Recria as políticas RLS para garantir acesso adequado
DROP POLICY IF EXISTS "Users can view their own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can insert their own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can update their own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can delete their own study sessions" ON study_sessions;

-- Recria as políticas
CREATE POLICY "Users can view their own study sessions"
  ON study_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions"
  ON study_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions"
  ON study_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study sessions"
  ON study_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Recria os índices
DROP INDEX IF EXISTS idx_study_sessions_user_id;
DROP INDEX IF EXISTS idx_study_sessions_discipline_id;
DROP INDEX IF EXISTS idx_study_sessions_scheduled_date;
DROP INDEX IF EXISTS idx_study_sessions_status;
DROP INDEX IF EXISTS idx_study_sessions_completed;

CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_discipline_id ON study_sessions(discipline_id);
CREATE INDEX idx_study_sessions_scheduled_date ON study_sessions(scheduled_date);
CREATE INDEX idx_study_sessions_status ON study_sessions(status);
CREATE INDEX idx_study_sessions_completed ON study_sessions(completed);

-- 8. Adicionar trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_sessions_updated_at
BEFORE UPDATE ON study_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 9. Inserir alguns dados de exemplo para testar
INSERT INTO study_sessions (
  user_id, 
  title, 
  scheduled_date, 
  duration_minutes, 
  completed,
  status
) 
SELECT 
  auth.uid(),
  'Sessão de Estudo Teste',
  CURRENT_TIMESTAMP + INTERVAL '1 day',
  60,
  false,
  'agendada'
WHERE NOT EXISTS (
  SELECT 1 FROM study_sessions WHERE title = 'Sessão de Estudo Teste' AND user_id = auth.uid()
);

-- 10. Verificar quantas sessões foram criadas
SELECT count(*) FROM study_sessions WHERE user_id = auth.uid(); 