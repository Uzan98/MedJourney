-- Script para configurar funcionalidades do feed da faculdade

-- Drop existing functions first
DROP FUNCTION IF EXISTS create_faculty_post(INTEGER, VARCHAR(255), TEXT, VARCHAR(20), TEXT, VARCHAR(50));
DROP FUNCTION IF EXISTS get_faculty_posts(INTEGER, INTEGER, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS create_faculty_comment(INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_faculty_comments(INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS toggle_faculty_post_like(INTEGER);
DROP FUNCTION IF EXISTS has_liked_faculty_post(INTEGER);

-- Função para criar um post
CREATE OR REPLACE FUNCTION create_faculty_post(
  p_faculty_id INTEGER,
  p_title VARCHAR(255),
  p_content TEXT,
  p_type VARCHAR(20) DEFAULT 'announcement',
  p_attachment_url TEXT DEFAULT NULL,
  p_attachment_type VARCHAR(50) DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_post_id INTEGER;
BEGIN
  -- Verificar se o usuário é membro da faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_id = p_faculty_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Usuário não é membro desta faculdade';
  END IF;

  -- Inserir o post
  INSERT INTO faculty_posts (
    faculty_id, 
    user_id, 
    title, 
    content, 
    type, 
    attachment_url, 
    attachment_type
  ) VALUES (
    p_faculty_id,
    auth.uid(),
    p_title,
    p_content,
    p_type,
    p_attachment_url,
    p_attachment_type
  ) RETURNING id INTO v_post_id;

  RETURN v_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar posts de uma faculdade com paginação
CREATE OR REPLACE FUNCTION get_faculty_posts(
  p_faculty_id INTEGER,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_type VARCHAR DEFAULT NULL
) RETURNS TABLE (
  id INTEGER,
  faculty_id INTEGER,
  user_id UUID,
  title VARCHAR,
  content TEXT,
  type VARCHAR,
  attachment_url TEXT,
  attachment_type VARCHAR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  likes_count INTEGER,
  comments_count INTEGER,
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
    fp.id,
    fp.faculty_id,
    fp.user_id,
    fp.title,
    fp.content,
    fp.type,
    fp.attachment_url,
    fp.attachment_type,
    fp.created_at,
    fp.updated_at,
    fp.likes_count,
    fp.comments_count,
    COALESCE(u.raw_user_meta_data->>'name', u.email) AS user_name,
    u.email AS user_email,
    COALESCE(u.raw_user_meta_data->>'avatar_url', '') AS user_avatar_url,
    fm.role AS user_role
  FROM 
    faculty_posts fp
    JOIN auth.users u ON fp.user_id = u.id
    JOIN faculty_members fm ON fp.user_id = fm.user_id AND fp.faculty_id = fm.faculty_id
  WHERE 
    fp.faculty_id = p_faculty_id
    AND (p_type IS NULL OR fp.type = p_type)
  ORDER BY 
    fp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para adicionar um comentário a um post
CREATE OR REPLACE FUNCTION create_faculty_comment(
  p_post_id INTEGER,
  p_content TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_comment_id INTEGER;
  v_faculty_id INTEGER;
BEGIN
  -- Obter o ID da faculdade do post
  SELECT faculty_id INTO v_faculty_id
  FROM faculty_posts
  WHERE id = p_post_id;
  
  IF v_faculty_id IS NULL THEN
    RAISE EXCEPTION 'Post não encontrado';
  END IF;

  -- Verificar se o usuário é membro da faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_id = v_faculty_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Usuário não é membro desta faculdade';
  END IF;

  -- Inserir o comentário
  INSERT INTO faculty_comments (
    post_id,
    user_id,
    content
  ) VALUES (
    p_post_id,
    auth.uid(),
    p_content
  ) RETURNING id INTO v_comment_id;

  -- Atualizar o contador de comentários do post
  UPDATE faculty_posts
  SET comments_count = comments_count + 1
  WHERE id = p_post_id;

  RETURN v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar comentários de um post
CREATE OR REPLACE FUNCTION get_faculty_comments(
  p_post_id INTEGER,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id INTEGER,
  post_id INTEGER,
  user_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_name TEXT,
  user_email VARCHAR,
  user_avatar_url TEXT,
  user_role VARCHAR
) AS $$
DECLARE
  v_faculty_id INTEGER;
BEGIN
  -- Obter o ID da faculdade do post
  SELECT faculty_id INTO v_faculty_id
  FROM faculty_posts
  WHERE faculty_posts.id = p_post_id;
  
  IF v_faculty_id IS NULL THEN
    RAISE EXCEPTION 'Post não encontrado';
  END IF;

  -- Verificar se o usuário é membro da faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_members.faculty_id = v_faculty_id AND faculty_members.user_id = auth.uid()
  ) THEN
    -- Verificar se a faculdade é pública
    IF NOT EXISTS (
      SELECT 1 FROM faculties
      WHERE faculties.id = v_faculty_id AND faculties.is_public = TRUE
    ) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    fc.id,
    fc.post_id,
    fc.user_id,
    fc.content,
    fc.created_at,
    fc.updated_at,
    COALESCE(u.raw_user_meta_data->>'name', u.email) AS user_name,
    u.email AS user_email,
    COALESCE(u.raw_user_meta_data->>'avatar_url', '') AS user_avatar_url,
    fm.role AS user_role
  FROM 
    faculty_comments fc
    JOIN auth.users u ON fc.user_id = u.id
    JOIN faculty_members fm ON fc.user_id = fm.user_id AND fm.faculty_id = v_faculty_id
  WHERE 
    fc.post_id = p_post_id
  ORDER BY 
    fc.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tabela para curtidas em posts
CREATE TABLE IF NOT EXISTS public.faculty_post_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES public.faculty_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Habilitar RLS para a tabela de curtidas
ALTER TABLE public.faculty_post_likes ENABLE ROW LEVEL SECURITY;

-- Política para curtidas
DROP POLICY IF EXISTS "Membros podem curtir posts" ON public.faculty_post_likes;
CREATE POLICY "Membros podem curtir posts" ON public.faculty_post_likes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.faculty_posts fp
      JOIN public.faculty_members fm ON fp.faculty_id = fm.faculty_id
      WHERE fp.id = faculty_post_likes.post_id AND fm.user_id = auth.uid()
    )
  );

-- Função para curtir/descurtir um post
CREATE OR REPLACE FUNCTION toggle_faculty_post_like(
  p_post_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_faculty_id INTEGER;
  v_liked BOOLEAN;
BEGIN
  -- Obter o ID da faculdade do post
  SELECT faculty_id INTO v_faculty_id
  FROM faculty_posts
  WHERE id = p_post_id;
  
  IF v_faculty_id IS NULL THEN
    RAISE EXCEPTION 'Post não encontrado';
  END IF;

  -- Verificar se o usuário é membro da faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_id = v_faculty_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Usuário não é membro desta faculdade';
  END IF;

  -- Verificar se o usuário já curtiu o post
  IF EXISTS (
    SELECT 1 FROM faculty_post_likes
    WHERE post_id = p_post_id AND user_id = auth.uid()
  ) THEN
    -- Remover a curtida
    DELETE FROM faculty_post_likes
    WHERE post_id = p_post_id AND user_id = auth.uid();
    
    -- Atualizar o contador de curtidas
    UPDATE faculty_posts
    SET likes_count = likes_count - 1
    WHERE id = p_post_id;
    
    v_liked := FALSE;
  ELSE
    -- Adicionar a curtida
    INSERT INTO faculty_post_likes (post_id, user_id)
    VALUES (p_post_id, auth.uid());
    
    -- Atualizar o contador de curtidas
    UPDATE faculty_posts
    SET likes_count = likes_count + 1
    WHERE id = p_post_id;
    
    v_liked := TRUE;
  END IF;

  RETURN v_liked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário curtiu um post
CREATE OR REPLACE FUNCTION has_liked_faculty_post(
  p_post_id INTEGER
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM faculty_post_likes
    WHERE post_id = p_post_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 