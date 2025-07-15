-- Script de configuração para o recurso "Minha Faculdade"

-- Tabela principal para os ambientes de faculdade
CREATE TABLE IF NOT EXISTS public.faculties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  institution VARCHAR(255),
  course VARCHAR(255),
  semester VARCHAR(100),
  is_public BOOLEAN DEFAULT FALSE,
  code VARCHAR(20) NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Tabela para membros dos ambientes
CREATE TABLE IF NOT EXISTS public.faculty_members (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(faculty_id, user_id)
);

-- Tabela para posts nos ambientes
CREATE TABLE IF NOT EXISTS public.faculty_posts (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('announcement', 'material', 'question', 'event', 'exam')),
  attachment_url TEXT,
  attachment_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0
);

-- Tabela para comentários nos posts
CREATE TABLE IF NOT EXISTS public.faculty_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES public.faculty_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Tabela para materiais compartilhados
CREATE TABLE IF NOT EXISTS public.faculty_materials (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0
);

-- Tabela para exames e avaliações
CREATE TABLE IF NOT EXISTS public.faculty_exams (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  max_score INTEGER,
  is_published BOOLEAN DEFAULT FALSE,
  external_exam_id INTEGER,
  category VARCHAR(100),
  disciplina VARCHAR(255),
  periodo INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Políticas de segurança RLS (Row Level Security)

-- Habilitar RLS para todas as tabelas
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_exams ENABLE ROW LEVEL SECURITY;

-- Políticas para faculties
CREATE POLICY "Faculties visíveis para membros ou públicas" ON public.faculties
  FOR SELECT USING (
    is_public OR 
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Apenas o proprietário pode editar faculties" ON public.faculties
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Apenas o proprietário pode excluir faculties" ON public.faculties
  FOR DELETE USING (owner_id = auth.uid());

-- Políticas para faculty_members
CREATE POLICY "Membros visíveis para outros membros" ON public.faculty_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = faculty_members.faculty_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Administradores podem adicionar membros" ON public.faculty_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = faculty_members.faculty_id AND user_id = auth.uid() AND role = 'admin'
    ) OR 
    EXISTS (
      SELECT 1 FROM public.faculties 
      WHERE id = faculty_members.faculty_id AND owner_id = auth.uid()
    )
  );

-- Políticas para faculty_posts
CREATE POLICY "Posts visíveis para membros" ON public.faculty_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = faculty_posts.faculty_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Membros podem criar posts" ON public.faculty_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = faculty_posts.faculty_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Autores e admins podem editar posts" ON public.faculty_posts
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = faculty_posts.faculty_id AND user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_faculty_members_faculty_id ON public.faculty_members(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_members_user_id ON public.faculty_members(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_posts_faculty_id ON public.faculty_posts(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_posts_user_id ON public.faculty_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_comments_post_id ON public.faculty_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_faculty_materials_faculty_id ON public.faculty_materials(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_exams_faculty_id ON public.faculty_exams(faculty_id);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar o timestamp de updated_at
CREATE OR REPLACE TRIGGER update_faculties_updated_at
BEFORE UPDATE ON public.faculties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_faculty_posts_updated_at
BEFORE UPDATE ON public.faculty_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_faculty_comments_updated_at
BEFORE UPDATE ON public.faculty_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_faculty_materials_updated_at
BEFORE UPDATE ON public.faculty_materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_faculty_exams_updated_at
BEFORE UPDATE ON public.faculty_exams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 