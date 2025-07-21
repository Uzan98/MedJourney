-- Script para configurar o fórum de dúvidas da faculdade

-- Tabela para tópicos do fórum
CREATE TABLE IF NOT EXISTS public.faculty_forum_topics (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para respostas do fórum
CREATE TABLE IF NOT EXISTS public.faculty_forum_replies (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES public.faculty_forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para votos em tópicos e respostas
CREATE TABLE IF NOT EXISTS public.faculty_forum_votes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES public.faculty_forum_topics(id) ON DELETE CASCADE,
  reply_id INTEGER REFERENCES public.faculty_forum_replies(id) ON DELETE CASCADE,
  vote_type SMALLINT NOT NULL, -- 1 para upvote, -1 para downvote
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_target_only CHECK (
    (topic_id IS NULL AND reply_id IS NOT NULL) OR 
    (topic_id IS NOT NULL AND reply_id IS NULL)
  ),
  UNIQUE(user_id, topic_id, reply_id)
);

-- Tabela para tags do fórum
CREATE TABLE IF NOT EXISTS public.faculty_forum_tags (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20) DEFAULT '#3b82f6', -- cor padrão azul
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(faculty_id, name)
);

-- Tabela de relação entre tópicos e tags
CREATE TABLE IF NOT EXISTS public.faculty_forum_topic_tags (
  topic_id INTEGER NOT NULL REFERENCES public.faculty_forum_topics(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES public.faculty_forum_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (topic_id, tag_id)
);

-- Habilitar RLS para todas as tabelas
ALTER TABLE public.faculty_forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_forum_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_forum_topic_tags ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- Tópicos: membros da faculdade podem ver, apenas o autor e admins podem editar/excluir
DROP POLICY IF EXISTS "Membros podem ver tópicos" ON public.faculty_forum_topics;
CREATE POLICY "Membros podem ver tópicos" ON public.faculty_forum_topics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.faculty_members fm
      WHERE fm.faculty_id = faculty_forum_topics.faculty_id AND fm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Autores e admins podem editar tópicos" ON public.faculty_forum_topics;
CREATE POLICY "Autores e admins podem editar tópicos" ON public.faculty_forum_topics
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.faculty_members fm
      WHERE fm.faculty_id = faculty_forum_topics.faculty_id AND fm.user_id = auth.uid() AND fm.role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Autores e admins podem excluir tópicos" ON public.faculty_forum_topics;
CREATE POLICY "Autores e admins podem excluir tópicos" ON public.faculty_forum_topics
  FOR DELETE USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.faculty_members fm
      WHERE fm.faculty_id = faculty_forum_topics.faculty_id AND fm.user_id = auth.uid() AND fm.role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Membros podem criar tópicos" ON public.faculty_forum_topics;
CREATE POLICY "Membros podem criar tópicos" ON public.faculty_forum_topics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faculty_members fm
      WHERE fm.faculty_id = faculty_forum_topics.faculty_id AND fm.user_id = auth.uid()
    )
  );

-- Respostas: membros da faculdade podem ver, apenas o autor e admins podem editar/excluir
DROP POLICY IF EXISTS "Membros podem ver respostas" ON public.faculty_forum_replies;
CREATE POLICY "Membros podem ver respostas" ON public.faculty_forum_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.faculty_forum_topics fft
      JOIN public.faculty_members fm ON fft.faculty_id = fm.faculty_id
      WHERE fft.id = faculty_forum_replies.topic_id AND fm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Autores e admins podem editar respostas" ON public.faculty_forum_replies;
CREATE POLICY "Autores e admins podem editar respostas" ON public.faculty_forum_replies
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.faculty_forum_topics fft
      JOIN public.faculty_members fm ON fft.faculty_id = fm.faculty_id
      WHERE fft.id = faculty_forum_replies.topic_id AND fm.user_id = auth.uid() AND fm.role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Autores e admins podem excluir respostas" ON public.faculty_forum_replies;
CREATE POLICY "Autores e admins podem excluir respostas" ON public.faculty_forum_replies
  FOR DELETE USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.faculty_forum_topics fft
      JOIN public.faculty_members fm ON fft.faculty_id = fm.faculty_id
      WHERE fft.id = faculty_forum_replies.topic_id AND fm.user_id = auth.uid() AND fm.role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Membros podem criar respostas" ON public.faculty_forum_replies;
CREATE POLICY "Membros podem criar respostas" ON public.faculty_forum_replies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faculty_forum_topics fft
      JOIN public.faculty_members fm ON fft.faculty_id = fm.faculty_id
      WHERE fft.id = faculty_forum_replies.topic_id AND fm.user_id = auth.uid()
    )
  );

-- Função para criar um tópico no fórum
CREATE OR REPLACE FUNCTION create_faculty_forum_topic(
  p_faculty_id INTEGER,
  p_title VARCHAR(255),
  p_content TEXT,
  p_tags INTEGER[] DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_topic_id INTEGER;
  v_tag_id INTEGER;
BEGIN
  -- Verificar se o usuário é membro da faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_members.faculty_id = p_faculty_id AND faculty_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Usuário não é membro desta faculdade';
  END IF;

  -- Inserir o tópico
  INSERT INTO faculty_forum_topics (
    faculty_id,
    user_id,
    title,
    content
  ) VALUES (
    p_faculty_id,
    auth.uid(),
    p_title,
    p_content
  ) RETURNING id INTO v_topic_id;

  -- Adicionar tags se fornecidas
  IF p_tags IS NOT NULL THEN
    FOREACH v_tag_id IN ARRAY p_tags LOOP
      -- Verificar se a tag pertence à faculdade
      IF EXISTS (
        SELECT 1 FROM faculty_forum_tags
        WHERE id = v_tag_id AND faculty_id = p_faculty_id
      ) THEN
        INSERT INTO faculty_forum_topic_tags (topic_id, tag_id)
        VALUES (v_topic_id, v_tag_id);
      END IF;
    END LOOP;
  END IF;

  RETURN v_topic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar tópicos do fórum
CREATE OR REPLACE FUNCTION get_faculty_forum_topics(
  p_faculty_id INTEGER,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_tag_id INTEGER DEFAULT NULL,
  p_is_resolved BOOLEAN DEFAULT NULL,
  p_search TEXT DEFAULT NULL
) RETURNS TABLE (
  id INTEGER,
  faculty_id INTEGER,
  user_id UUID,
  title VARCHAR,
  content TEXT,
  is_resolved BOOLEAN,
  is_pinned BOOLEAN,
  view_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_name TEXT,
  user_email VARCHAR,
  user_avatar_url TEXT,
  user_role VARCHAR,
  replies_count INTEGER,
  votes_count INTEGER,
  tags JSONB
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
  WITH topic_replies AS (
    SELECT 
      topic_id, 
      COUNT(*) AS count 
    FROM faculty_forum_replies 
    GROUP BY topic_id
  ),
  topic_votes AS (
    SELECT 
      topic_id, 
      SUM(vote_type) AS count 
    FROM faculty_forum_votes 
    WHERE topic_id IS NOT NULL 
    GROUP BY topic_id
  ),
  topic_tags AS (
    SELECT 
      ftt.topic_id,
      jsonb_agg(
        jsonb_build_object(
          'id', ft.id,
          'name', ft.name,
          'color', ft.color
        )
      ) AS tags
    FROM faculty_forum_topic_tags ftt
    JOIN faculty_forum_tags ft ON ftt.tag_id = ft.id
    GROUP BY ftt.topic_id
  )
  SELECT 
    fft.id,
    fft.faculty_id,
    fft.user_id,
    fft.title,
    fft.content,
    fft.is_resolved,
    fft.is_pinned,
    fft.view_count,
    fft.created_at,
    fft.updated_at,
    COALESCE(u.raw_user_meta_data->>'name', u.email) AS user_name,
    u.email AS user_email,
    COALESCE(u.raw_user_meta_data->>'avatar_url', '') AS user_avatar_url,
    fm.role AS user_role,
    COALESCE(tr.count, 0) AS replies_count,
    COALESCE(tv.count, 0) AS votes_count,
    COALESCE(tt.tags, '[]'::jsonb) AS tags
  FROM 
    faculty_forum_topics fft
    JOIN auth.users u ON fft.user_id = u.id
    JOIN faculty_members fm ON fft.user_id = fm.user_id AND fm.faculty_id = fft.faculty_id
    LEFT JOIN topic_replies tr ON fft.id = tr.topic_id
    LEFT JOIN topic_votes tv ON fft.id = tv.topic_id
    LEFT JOIN topic_tags tt ON fft.id = tt.topic_id
  WHERE 
    fft.faculty_id = p_faculty_id
    AND (p_tag_id IS NULL OR EXISTS (
      SELECT 1 FROM faculty_forum_topic_tags ftt
      WHERE ftt.topic_id = fft.id AND ftt.tag_id = p_tag_id
    ))
    AND (p_is_resolved IS NULL OR fft.is_resolved = p_is_resolved)
    AND (p_search IS NULL OR fft.title ILIKE '%' || p_search || '%' OR fft.content ILIKE '%' || p_search || '%')
  ORDER BY 
    fft.is_pinned DESC,
    fft.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para adicionar uma resposta a um tópico
CREATE OR REPLACE FUNCTION create_faculty_forum_reply(
  p_topic_id INTEGER,
  p_content TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_reply_id INTEGER;
  v_faculty_id INTEGER;
BEGIN
  -- Obter o ID da faculdade do tópico
  SELECT faculty_id INTO v_faculty_id
  FROM faculty_forum_topics
  WHERE id = p_topic_id;
  
  IF v_faculty_id IS NULL THEN
    RAISE EXCEPTION 'Tópico não encontrado';
  END IF;

  -- Verificar se o usuário é membro da faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_members.faculty_id = v_faculty_id AND faculty_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Usuário não é membro desta faculdade';
  END IF;

  -- Inserir a resposta
  INSERT INTO faculty_forum_replies (
    topic_id,
    user_id,
    content
  ) VALUES (
    p_topic_id,
    auth.uid(),
    p_content
  ) RETURNING id INTO v_reply_id;

  RETURN v_reply_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar respostas de um tópico
CREATE OR REPLACE FUNCTION get_faculty_forum_replies(
  p_topic_id INTEGER,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  id INTEGER,
  topic_id INTEGER,
  user_id UUID,
  content TEXT,
  is_solution BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_name TEXT,
  user_email VARCHAR,
  user_avatar_url TEXT,
  user_role VARCHAR,
  votes_count INTEGER
) AS $$
DECLARE
  v_faculty_id INTEGER;
BEGIN
  -- Obter o ID da faculdade do tópico
  SELECT faculty_id INTO v_faculty_id
  FROM faculty_forum_topics
  WHERE id = p_topic_id;
  
  IF v_faculty_id IS NULL THEN
    RAISE EXCEPTION 'Tópico não encontrado';
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
  WITH reply_votes AS (
    SELECT 
      reply_id, 
      SUM(vote_type) AS count 
    FROM faculty_forum_votes 
    WHERE reply_id IS NOT NULL 
    GROUP BY reply_id
  )
  SELECT 
    ffr.id,
    ffr.topic_id,
    ffr.user_id,
    ffr.content,
    ffr.is_solution,
    ffr.created_at,
    ffr.updated_at,
    COALESCE(u.raw_user_meta_data->>'name', u.email) AS user_name,
    u.email AS user_email,
    COALESCE(u.raw_user_meta_data->>'avatar_url', '') AS user_avatar_url,
    fm.role AS user_role,
    COALESCE(rv.count, 0) AS votes_count
  FROM 
    faculty_forum_replies ffr
    JOIN auth.users u ON ffr.user_id = u.id
    JOIN faculty_members fm ON ffr.user_id = fm.user_id AND fm.faculty_id = v_faculty_id
    LEFT JOIN reply_votes rv ON ffr.id = rv.reply_id
  WHERE 
    ffr.topic_id = p_topic_id
  ORDER BY 
    ffr.is_solution DESC,
    rv.count DESC NULLS LAST,
    ffr.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para votar em um tópico ou resposta
CREATE OR REPLACE FUNCTION vote_faculty_forum_item(
  p_topic_id INTEGER DEFAULT NULL,
  p_reply_id INTEGER DEFAULT NULL,
  p_vote_type SMALLINT DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  v_faculty_id INTEGER;
BEGIN
  -- Verificar se pelo menos um ID foi fornecido
  IF p_topic_id IS NULL AND p_reply_id IS NULL THEN
    RAISE EXCEPTION 'É necessário fornecer um ID de tópico ou resposta';
  END IF;
  
  -- Verificar se apenas um ID foi fornecido
  IF p_topic_id IS NOT NULL AND p_reply_id IS NOT NULL THEN
    RAISE EXCEPTION 'Forneça apenas um ID de tópico ou resposta, não ambos';
  END IF;
  
  -- Obter o ID da faculdade
  IF p_topic_id IS NOT NULL THEN
    SELECT faculty_id INTO v_faculty_id
    FROM faculty_forum_topics
    WHERE id = p_topic_id;
  ELSE
    SELECT fft.faculty_id INTO v_faculty_id
    FROM faculty_forum_replies ffr
    JOIN faculty_forum_topics fft ON ffr.topic_id = fft.id
    WHERE ffr.id = p_reply_id;
  END IF;
  
  IF v_faculty_id IS NULL THEN
    RAISE EXCEPTION 'Item não encontrado';
  END IF;

  -- Verificar se o usuário é membro da faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_members.faculty_id = v_faculty_id AND faculty_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Usuário não é membro desta faculdade';
  END IF;

  -- Verificar se o usuário já votou neste item
  IF EXISTS (
    SELECT 1 FROM faculty_forum_votes
    WHERE user_id = auth.uid()
      AND (topic_id = p_topic_id OR reply_id = p_reply_id)
  ) THEN
    -- Remover o voto existente
    DELETE FROM faculty_forum_votes
    WHERE user_id = auth.uid()
      AND (topic_id = p_topic_id OR reply_id = p_reply_id);
    
    -- Se o voto anterior for igual ao novo, retornar falso (toggle off)
    IF EXISTS (
      SELECT 1 FROM faculty_forum_votes
      WHERE user_id = auth.uid()
        AND (topic_id = p_topic_id OR reply_id = p_reply_id)
        AND vote_type = p_vote_type
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Adicionar o novo voto
  INSERT INTO faculty_forum_votes (
    user_id,
    topic_id,
    reply_id,
    vote_type
  ) VALUES (
    auth.uid(),
    p_topic_id,
    p_reply_id,
    p_vote_type
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar uma resposta como solução
CREATE OR REPLACE FUNCTION mark_forum_reply_as_solution(
  p_reply_id INTEGER,
  p_is_solution BOOLEAN DEFAULT TRUE
) RETURNS BOOLEAN AS $$
DECLARE
  v_topic_id INTEGER;
  v_topic_author_id UUID;
BEGIN
  -- Obter o ID do tópico e o autor do tópico
  SELECT ffr.topic_id, fft.user_id INTO v_topic_id, v_topic_author_id
  FROM faculty_forum_replies ffr
  JOIN faculty_forum_topics fft ON ffr.topic_id = fft.id
  WHERE ffr.id = p_reply_id;
  
  IF v_topic_id IS NULL THEN
    RAISE EXCEPTION 'Resposta não encontrada';
  END IF;

  -- Verificar se o usuário é o autor do tópico ou um admin/moderador
  IF auth.uid() != v_topic_author_id AND NOT EXISTS (
    SELECT 1 FROM faculty_forum_topics fft
    JOIN faculty_members fm ON fft.faculty_id = fm.faculty_id
    WHERE fft.id = v_topic_id AND fm.user_id = auth.uid() AND fm.role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Apenas o autor do tópico ou administradores podem marcar uma resposta como solução';
  END IF;

  -- Se estamos marcando como solução, primeiro desmarcamos qualquer solução existente
  IF p_is_solution THEN
    UPDATE faculty_forum_replies
    SET is_solution = FALSE
    WHERE topic_id = v_topic_id AND is_solution = TRUE;
    
    -- Marcar o tópico como resolvido
    UPDATE faculty_forum_topics
    SET is_resolved = TRUE
    WHERE id = v_topic_id;
  ELSE
    -- Se não houver outras soluções, marcar o tópico como não resolvido
    IF NOT EXISTS (
      SELECT 1 FROM faculty_forum_replies
      WHERE topic_id = v_topic_id AND is_solution = TRUE AND id != p_reply_id
    ) THEN
      UPDATE faculty_forum_topics
      SET is_resolved = FALSE
      WHERE id = v_topic_id;
    END IF;
  END IF;

  -- Atualizar a resposta
  UPDATE faculty_forum_replies
  SET is_solution = p_is_solution
  WHERE id = p_reply_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para incrementar a contagem de visualizações de um tópico
CREATE OR REPLACE FUNCTION increment_forum_topic_view_count(
  p_topic_id INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE faculty_forum_topics
  SET view_count = view_count + 1
  WHERE id = p_topic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar uma tag
CREATE OR REPLACE FUNCTION create_faculty_forum_tag(
  p_faculty_id INTEGER,
  p_name VARCHAR(50),
  p_color VARCHAR(20) DEFAULT '#3b82f6'
) RETURNS INTEGER AS $$
DECLARE
  v_tag_id INTEGER;
BEGIN
  -- Verificar se o usuário é admin ou moderador da faculdade
  IF NOT EXISTS (
    SELECT 1 FROM faculty_members 
    WHERE faculty_members.faculty_id = p_faculty_id 
      AND faculty_members.user_id = auth.uid()
      AND faculty_members.role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Apenas administradores e moderadores podem criar tags';
  END IF;

  -- Inserir a tag
  INSERT INTO faculty_forum_tags (
    faculty_id,
    name,
    color
  ) VALUES (
    p_faculty_id,
    p_name,
    p_color
  ) RETURNING id INTO v_tag_id;

  RETURN v_tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar tags de uma faculdade
CREATE OR REPLACE FUNCTION get_faculty_forum_tags(
  p_faculty_id INTEGER
) RETURNS TABLE (
  id INTEGER,
  faculty_id INTEGER,
  name VARCHAR,
  color VARCHAR,
  created_at TIMESTAMPTZ,
  topic_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fft.id,
    fft.faculty_id,
    fft.name,
    fft.color,
    fft.created_at,
    COUNT(fftt.topic_id)::BIGINT AS topic_count
  FROM 
    faculty_forum_tags fft
    LEFT JOIN faculty_forum_topic_tags fftt ON fft.id = fftt.tag_id
  WHERE 
    fft.faculty_id = p_faculty_id
  GROUP BY 
    fft.id
  ORDER BY 
    fft.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar tabelas ao Realtime
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE faculty_forum_topics;
        ALTER PUBLICATION supabase_realtime ADD TABLE faculty_forum_replies;
        ALTER PUBLICATION supabase_realtime ADD TABLE faculty_forum_votes;
    END IF;
END
$$; 