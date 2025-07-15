-- Configuração do bucket de armazenamento para materiais da faculdade
DO $$
BEGIN
    -- Criar bucket se não existir
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'faculty_materials') THEN
        INSERT INTO storage.buckets (id, name)
        VALUES ('faculty_materials', 'Materiais das Faculdades')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Bucket faculty_materials criado com sucesso';
    ELSE
        RAISE NOTICE 'Bucket faculty_materials já existe';
    END IF;
    
    -- Criar tabela de materiais se não existir
    CREATE TABLE IF NOT EXISTS faculty_materials (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        faculty_id INTEGER NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        periodo INTEGER CHECK (periodo >= 1 AND periodo <= 12),
        disciplina TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Adicionar colunas se não existirem
    -- Adicionar coluna periodo se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'faculty_materials' AND column_name = 'periodo'
    ) THEN
        ALTER TABLE faculty_materials ADD COLUMN periodo INTEGER CHECK (periodo >= 1 AND periodo <= 12);
        RAISE NOTICE 'Coluna periodo adicionada à tabela faculty_materials';
    ELSE
        RAISE NOTICE 'Coluna periodo já existe na tabela faculty_materials';
    END IF;
    
    -- Adicionar coluna disciplina se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'faculty_materials' AND column_name = 'disciplina'
    ) THEN
        ALTER TABLE faculty_materials ADD COLUMN disciplina TEXT;
        RAISE NOTICE 'Coluna disciplina adicionada à tabela faculty_materials';
    ELSE
        RAISE NOTICE 'Coluna disciplina já existe na tabela faculty_materials';
    END IF;
    
    -- Criar políticas para a tabela faculty_materials
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'faculty_materials' AND policyname = 'Membros podem visualizar materiais') THEN
        CREATE POLICY "Membros podem visualizar materiais"
        ON faculty_materials
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM faculty_members
                WHERE faculty_members.faculty_id = faculty_materials.faculty_id
                AND faculty_members.user_id = auth.uid()
            )
        );
        RAISE NOTICE 'Política "Membros podem visualizar materiais" criada para faculty_materials';
    ELSE
        RAISE NOTICE 'Política "Membros podem visualizar materiais" já existe para faculty_materials';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'faculty_materials' AND policyname = 'Membros podem adicionar materiais') THEN
        CREATE POLICY "Membros podem adicionar materiais"
        ON faculty_materials
        FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM faculty_members
                WHERE faculty_members.faculty_id = faculty_materials.faculty_id
                AND faculty_members.user_id = auth.uid()
            )
        );
        RAISE NOTICE 'Política "Membros podem adicionar materiais" criada para faculty_materials';
    ELSE
        RAISE NOTICE 'Política "Membros podem adicionar materiais" já existe para faculty_materials';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'faculty_materials' AND policyname = 'Proprietários e admins podem excluir materiais') THEN
        CREATE POLICY "Proprietários e admins podem excluir materiais"
        ON faculty_materials
        FOR DELETE
        TO authenticated
        USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM faculty_members
                WHERE faculty_members.faculty_id = faculty_materials.faculty_id
                AND faculty_members.user_id = auth.uid()
                AND faculty_members.role IN ('admin', 'moderator')
            )
        );
        RAISE NOTICE 'Política "Proprietários e admins podem excluir materiais" criada para faculty_materials';
    ELSE
        RAISE NOTICE 'Política "Proprietários e admins podem excluir materiais" já existe para faculty_materials';
    END IF;
    
    -- Habilitar RLS para a tabela faculty_materials
    ALTER TABLE faculty_materials ENABLE ROW LEVEL SECURITY;
    
    -- Verificar e criar políticas para o bucket storage.objects
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Membros podem fazer upload de materiais') THEN
        CREATE POLICY "Membros podem fazer upload de materiais"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'faculty_materials' AND
            EXISTS (
                SELECT 1 FROM faculty_members
                WHERE faculty_members.faculty_id = (storage.foldername(name))[1]::integer
                AND faculty_members.user_id = auth.uid()
            )
        );
        RAISE NOTICE 'Política "Membros podem fazer upload de materiais" criada para storage.objects';
    ELSE
        RAISE NOTICE 'Política "Membros podem fazer upload de materiais" já existe para storage.objects';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Membros podem visualizar materiais') THEN
        CREATE POLICY "Membros podem visualizar materiais"
        ON storage.objects
        FOR SELECT
        TO authenticated
        USING (
            bucket_id = 'faculty_materials' AND
            EXISTS (
                SELECT 1 FROM faculty_members
                WHERE faculty_members.faculty_id = (storage.foldername(name))[1]::integer
                AND faculty_members.user_id = auth.uid()
            )
        );
        RAISE NOTICE 'Política "Membros podem visualizar materiais" criada para storage.objects';
    ELSE
        RAISE NOTICE 'Política "Membros podem visualizar materiais" já existe para storage.objects';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Proprietários e admins podem excluir materiais') THEN
        CREATE POLICY "Proprietários e admins podem excluir materiais"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'faculty_materials' AND
            (
                auth.uid()::text = (storage.foldername(name))[2] OR
                EXISTS (
                    SELECT 1 FROM faculty_members
                    WHERE faculty_members.faculty_id = (storage.foldername(name))[1]::integer
                    AND faculty_members.user_id = auth.uid()
                    AND faculty_members.role IN ('admin', 'moderator')
                )
            )
        );
        RAISE NOTICE 'Política "Proprietários e admins podem excluir materiais" criada para storage.objects';
    ELSE
        RAISE NOTICE 'Política "Proprietários e admins podem excluir materiais" já existe para storage.objects';
    END IF;
    
END $$;

-- Criar função para excluir material e arquivo associado
CREATE OR REPLACE FUNCTION delete_faculty_material(material_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _file_path TEXT;
    _faculty_id INTEGER;
    _user_id UUID;
    _is_admin BOOLEAN;
BEGIN
    -- Obter informações do material
    SELECT 
        file_path, 
        faculty_id, 
        user_id 
    INTO 
        _file_path, 
        _faculty_id, 
        _user_id 
    FROM 
        faculty_materials 
    WHERE 
        id = material_id;
    
    -- Verificar se o material existe
    IF _file_path IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se o usuário é o proprietário ou admin/moderador
    _is_admin := EXISTS (
        SELECT 1 
        FROM faculty_members 
        WHERE faculty_id = _faculty_id 
        AND user_id = auth.uid() 
        AND role IN ('admin', 'moderator')
    );
    
    IF auth.uid() <> _user_id AND NOT _is_admin THEN
        RETURN FALSE;
    END IF;
    
    -- Excluir o arquivo do storage
    DELETE FROM storage.objects WHERE name = _file_path;
    
    -- Excluir o registro do material
    DELETE FROM faculty_materials WHERE id = material_id;
    
    RETURN TRUE;
END;
$$;

-- Verificar se a função get_faculty_materials existe e excluí-la antes de criar a nova versão
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'get_faculty_materials'
    AND n.nspname = current_schema()
  ) THEN
    DROP FUNCTION IF EXISTS get_faculty_materials(INTEGER, INTEGER, INTEGER);
    RAISE NOTICE 'Função get_faculty_materials removida para atualização';
  END IF;
END $$;

-- Função para listar materiais de uma faculdade
CREATE OR REPLACE FUNCTION get_faculty_materials(
  p_faculty_id INTEGER,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id INTEGER,
  faculty_id INTEGER,
  user_id UUID,
  title VARCHAR,
  description TEXT,
  file_url TEXT,
  file_type VARCHAR,
  file_size INTEGER,
  periodo INTEGER,
  disciplina TEXT,
  created_at TIMESTAMPTZ,
  download_count INTEGER,
  user_name TEXT,
  user_email VARCHAR,
  user_avatar_url TEXT,
  user_role VARCHAR
) AS $$
BEGIN
  -- Verificar se o usuário é membro da faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_members.faculty_id = p_faculty_id AND faculty_members.user_id = auth.uid()
  ) THEN
    -- Verificar se a faculdade é pública
    IF NOT EXISTS (
      SELECT 1 FROM faculties
      WHERE faculties.id = p_faculty_id AND faculties.is_public = TRUE
    ) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    fm.id,
    fm.faculty_id,
    fm.user_id,
    fm.title,
    fm.description,
    fm.file_url,
    fm.file_type,
    fm.file_size,
    fm.periodo,
    fm.disciplina,
    fm.created_at,
    fm.download_count,
    COALESCE(u.raw_user_meta_data->>'name', u.email) AS user_name,
    u.email AS user_email,
    COALESCE(u.raw_user_meta_data->>'avatar_url', '') AS user_avatar_url,
    fmem.role AS user_role
  FROM 
    faculty_materials fm
    JOIN auth.users u ON fm.user_id = u.id
    JOIN faculty_members fmem ON fm.user_id = fmem.user_id AND fmem.faculty_id = fm.faculty_id
  WHERE 
    fm.faculty_id = p_faculty_id
  ORDER BY 
    fm.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar se a função create_faculty_material existe e excluí-la antes de criar a nova versão
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'create_faculty_material'
    AND n.nspname = current_schema()
  ) THEN
    DROP FUNCTION IF EXISTS create_faculty_material(INTEGER, VARCHAR, TEXT, TEXT, VARCHAR, INTEGER);
    DROP FUNCTION IF EXISTS create_faculty_material(INTEGER, VARCHAR, TEXT, TEXT, VARCHAR, INTEGER, INTEGER, TEXT);
    RAISE NOTICE 'Função create_faculty_material removida para atualização';
  END IF;
END $$;

-- Função para adicionar um novo material
CREATE OR REPLACE FUNCTION create_faculty_material(
  p_faculty_id INTEGER,
  p_title VARCHAR,
  p_description TEXT,
  p_file_url TEXT,
  p_file_type VARCHAR,
  p_file_size INTEGER,
  p_periodo INTEGER DEFAULT NULL,
  p_disciplina TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_material_id INTEGER;
BEGIN
  -- Verificar se o usuário é membro da faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_members.faculty_id = p_faculty_id AND faculty_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Usuário não é membro desta faculdade';
  END IF;

  -- Verificar se o período está dentro do intervalo válido
  IF p_periodo IS NOT NULL AND (p_periodo < 1 OR p_periodo > 12) THEN
    RAISE EXCEPTION 'Período deve estar entre 1 e 12';
  END IF;

  -- Inserir o material
  INSERT INTO faculty_materials (
    faculty_id,
    user_id,
    title,
    description,
    file_url,
    file_type,
    file_size,
    periodo,
    disciplina
  ) VALUES (
    p_faculty_id,
    auth.uid(),
    p_title,
    p_description,
    p_file_url,
    p_file_type,
    p_file_size,
    p_periodo,
    p_disciplina
  ) RETURNING id INTO v_material_id;

  RETURN v_material_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para incrementar o contador de downloads
CREATE OR REPLACE FUNCTION increment_material_download_count(
  p_material_id INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE faculty_materials
  SET download_count = download_count + 1
  WHERE id = p_material_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

-- Conceder permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION increment_material_download_count(INTEGER) TO authenticated; 