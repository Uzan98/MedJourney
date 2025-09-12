-- Configuração do bucket de armazenamento para imagens de questões

-- Criar bucket se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'question-images') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('question-images', 'question-images', true);
    RAISE NOTICE 'Bucket question-images criado com sucesso';
  ELSE
    RAISE NOTICE 'Bucket question-images já existe';
  END IF;
END $$;

-- Políticas de acesso para o bucket question-images

-- Política para visualização (público)
DROP POLICY IF EXISTS "Question images are publicly viewable" ON storage.objects;
CREATE POLICY "Question images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'question-images');

-- Política para upload (usuários autenticados)
DROP POLICY IF EXISTS "Question images are uploadable by authenticated users" ON storage.objects;
CREATE POLICY "Question images are uploadable by authenticated users"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'question-images' AND
    auth.role() = 'authenticated'
  );

-- Política para atualização (apenas proprietário)
DROP POLICY IF EXISTS "Question images are updatable by owner" ON storage.objects;
CREATE POLICY "Question images are updatable by owner"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'question-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'question-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política para exclusão (apenas proprietário)
DROP POLICY IF EXISTS "Question images are deletable by owner" ON storage.objects;
CREATE POLICY "Question images are deletable by owner"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'question-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Comentários para documentação
COMMENT ON TABLE storage.objects IS 'Armazena objetos de storage incluindo imagens de questões';

-- Verificar se as políticas foram criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%Question images%';

RAISE NOTICE 'Configuração do bucket question-images concluída!';