-- Habilitar Realtime para as tabelas relacionadas à faculdade

-- Verificar se a publicação supabase_realtime existe, caso contrário, criá-la
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

-- Habilitar Realtime para a tabela de posts
ALTER PUBLICATION supabase_realtime ADD TABLE faculty_posts;

-- Habilitar Realtime para a tabela de comentários
ALTER PUBLICATION supabase_realtime ADD TABLE faculty_comments;

-- Habilitar Realtime para a tabela de curtidas
ALTER PUBLICATION supabase_realtime ADD TABLE faculty_post_likes; 