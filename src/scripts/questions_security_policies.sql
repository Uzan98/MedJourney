-- Habilitar RLS para a tabela questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Política para permitir que todos os usuários leiam questões públicas
CREATE POLICY "Questões públicas são visíveis para todos" ON questions
FOR SELECT USING (is_public = true);

-- Política para permitir que os usuários leiam suas próprias questões
CREATE POLICY "Usuários podem ler suas próprias questões" ON questions
FOR SELECT USING (auth.uid() = user_id);

-- Política para permitir que apenas os proprietários insiram novas questões
CREATE POLICY "Usuários só podem inserir suas próprias questões" ON questions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para permitir que apenas os proprietários atualizem suas questões
CREATE POLICY "Usuários só podem atualizar suas próprias questões" ON questions
FOR UPDATE USING (auth.uid() = user_id);

-- Política para permitir que apenas os proprietários excluam suas questões
CREATE POLICY "Usuários só podem excluir suas próprias questões" ON questions
FOR DELETE USING (auth.uid() = user_id);

-- Habilitar RLS para a tabela answer_options
ALTER TABLE answer_options ENABLE ROW LEVEL SECURITY;

-- Política para permitir que todos os usuários leiam opções de respostas para questões públicas
CREATE POLICY "Opções de resposta para questões públicas são visíveis para todos" ON answer_options
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM questions
    WHERE questions.id = answer_options.question_id
    AND questions.is_public = true
  )
);

-- Política para permitir que os usuários leiam opções de resposta das suas próprias questões
CREATE POLICY "Usuários podem ler opções de resposta das suas próprias questões" ON answer_options
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  )
);

-- Política para permitir que apenas os proprietários insiram novas opções de resposta
CREATE POLICY "Usuários só podem inserir opções para suas próprias questões" ON answer_options
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  )
);

-- Política para permitir que apenas os proprietários atualizem opções de resposta
CREATE POLICY "Usuários só podem atualizar opções das suas próprias questões" ON answer_options
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  )
);

-- Política para permitir que apenas os proprietários excluam opções de resposta
CREATE POLICY "Usuários só podem excluir opções das suas próprias questões" ON answer_options
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  )
);

-- Verificar se as políticas foram criadas corretamente
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('questions', 'answer_options')
ORDER BY tablename, policyname; 