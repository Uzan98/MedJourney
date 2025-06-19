-- Remover a política de segurança restritiva
DROP POLICY IF EXISTS "Usuários podem criar suas próprias conquistas" ON study_group_achievements;

-- Criar uma política mais permissiva para testes
CREATE POLICY "Qualquer usuário pode criar conquistas (teste)" ON study_group_achievements
  FOR INSERT
  WITH CHECK (true);

-- Verificar as políticas atualizadas
SELECT * FROM pg_policies
WHERE tablename = 'study_group_achievements'; 