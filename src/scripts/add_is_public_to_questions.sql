-- Adicionar campo is_public à tabela questions
ALTER TABLE IF EXISTS questions 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_questions_is_public ON questions(is_public);

-- Atualizar política RLS para permitir que qualquer usuário veja questões públicas
DROP POLICY IF EXISTS "Usuários podem ver suas próprias questões" ON questions;
CREATE POLICY "Usuários podem ver suas próprias questões ou questões públicas" ON questions
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

-- Manter as políticas existentes para modificação
DROP POLICY IF EXISTS "Usuários podem criar suas próprias questões" ON questions;
CREATE POLICY "Usuários podem criar suas próprias questões" ON questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias questões" ON questions;
CREATE POLICY "Usuários podem atualizar suas próprias questões" ON questions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem excluir suas próprias questões" ON questions;
CREATE POLICY "Usuários podem excluir suas próprias questões" ON questions
  FOR DELETE USING (auth.uid() = user_id);

-- Garantir que RLS está habilitado
ALTER TABLE questions ENABLE ROW LEVEL SECURITY; 