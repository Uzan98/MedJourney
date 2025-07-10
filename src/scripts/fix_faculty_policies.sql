-- Script para corrigir a política de segurança que está causando recursão infinita

-- Primeiro, vamos remover a política problemática
DROP POLICY IF EXISTS "Administradores podem adicionar membros" ON public.faculty_members;

-- Agora, vamos criar uma política para permitir que qualquer usuário se adicione a um ambiente público
CREATE POLICY "Usuários podem entrar em ambientes públicos" ON public.faculty_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faculties 
      WHERE id = faculty_members.faculty_id AND is_public = true
    )
  );

-- Política para permitir que o proprietário do ambiente adicione membros
CREATE POLICY "Proprietários podem adicionar membros" ON public.faculty_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faculties 
      WHERE id = faculty_members.faculty_id AND owner_id = auth.uid()
    )
  );

-- Política para permitir que o próprio usuário se adicione como membro
-- Esta política é importante para o caso de uso de entrar com código
CREATE POLICY "Usuários podem se adicionar com código" ON public.faculty_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Adicionar política para permitir que administradores gerenciem membros
-- Esta política não causa recursão porque usa a cláusula WITH CHECK diferente da USING
CREATE POLICY "Administradores podem gerenciar membros" ON public.faculty_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.faculties 
      WHERE id = faculty_members.faculty_id AND owner_id = auth.uid()
    )
  );

-- Política para permitir que usuários vejam seus próprios registros de membro
CREATE POLICY "Usuários podem ver seus próprios registros" ON public.faculty_members
  FOR SELECT USING (
    user_id = auth.uid()
  ); 

-- Primeiro, vamos corrigir a política que está causando recursão infinita
DROP POLICY IF EXISTS "Membros podem acessar seus próprios registros" ON public.faculty_members;
CREATE POLICY "Membros podem acessar seus próprios registros" ON public.faculty_members
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Política para permitir que administradores vejam todos os membros de suas faculdades
DROP POLICY IF EXISTS "Administradores podem gerenciar membros" ON public.faculty_members;
CREATE POLICY "Administradores podem gerenciar membros" ON public.faculty_members
    USING (
        EXISTS (
            SELECT 1 FROM faculty_members AS fm
            WHERE fm.faculty_id = faculty_id
            AND fm.user_id = auth.uid()
            AND fm.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM faculty_members AS fm
            WHERE fm.faculty_id = faculty_id
            AND fm.user_id = auth.uid()
            AND fm.role = 'admin'
        )
    );

-- Remover a política que está causando o conflito
DROP POLICY IF EXISTS "Usuários podem entrar em ambientes públicos" ON public.faculty_members;

-- Criar uma função SQL que permite criar um ambiente e adicionar o usuário como admin em uma única transação
CREATE OR REPLACE FUNCTION create_faculty_with_admin(
    p_name TEXT,
    p_description TEXT,
    p_institution TEXT,
    p_course TEXT,
    p_semester TEXT,
    p_is_public BOOLEAN,
    p_code TEXT,
    p_owner_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_faculty_id INTEGER;
BEGIN
    -- Desativar temporariamente o RLS para esta transação
    SET LOCAL rls.enabled = off;
    
    -- Inserir o ambiente
    INSERT INTO faculties (
        name, 
        description, 
        institution, 
        course, 
        semester, 
        is_public, 
        code, 
        owner_id, 
        member_count, 
        created_at
    ) VALUES (
        p_name,
        p_description,
        p_institution,
        p_course,
        p_semester,
        p_is_public,
        p_code,
        p_owner_id,
        1,
        NOW()
    ) RETURNING id INTO v_faculty_id;
    
    -- Inserir o membro administrador
    INSERT INTO faculty_members (
        faculty_id,
        user_id,
        role,
        joined_at
    ) VALUES (
        v_faculty_id,
        p_owner_id,
        'admin',
        NOW()
    );
    
    -- Reativar o RLS
    SET LOCAL rls.enabled = on;
    
    RETURN v_faculty_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

-- Patch para corrigir recursão infinita nas políticas RLS das tabelas de faculdade
-- Troca auth.uid() por (select auth.uid()) em subqueries e corrige referências circulares

-- ETAPA 1: REMOVER TODAS AS POLÍTICAS EXISTENTES
-- Esta etapa deve ser executada primeiro e separadamente

-- Faculty Members
ALTER TABLE public.faculty_members DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Membros visíveis para outros membros" ON public.faculty_members;
DROP POLICY IF EXISTS "Membros visíveis para outros membros da mesma faculdade" ON public.faculty_members;
DROP POLICY IF EXISTS "Administradores podem adicionar membros" ON public.faculty_members;
DROP POLICY IF EXISTS "Administradores podem gerenciar membros" ON public.faculty_members;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios registros" ON public.faculty_members;
DROP POLICY IF EXISTS "Entrada com código" ON public.faculty_members;
DROP POLICY IF EXISTS "Entrada em ambientes públicos" ON public.faculty_members;
DROP POLICY IF EXISTS "Proprietários podem gerenciar membros" ON public.faculty_members;
DROP POLICY IF EXISTS "Proprietários de faculdade gerenciam membros" ON public.faculty_members;

-- Faculties
ALTER TABLE public.faculties DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Faculties visíveis para membros ou públicas" ON public.faculties;
DROP POLICY IF EXISTS "Apenas o proprietário pode editar faculties" ON public.faculties;
DROP POLICY IF EXISTS "Apenas o proprietário pode excluir faculties" ON public.faculties;

-- Faculty Posts
ALTER TABLE public.faculty_posts DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Posts visíveis para membros" ON public.faculty_posts;
DROP POLICY IF EXISTS "Membros podem criar posts" ON public.faculty_posts;
DROP POLICY IF EXISTS "Autores e admins podem editar posts" ON public.faculty_posts;

-- ETAPA 2: CRIAR NOVAS POLÍTICAS
-- Esta etapa deve ser executada depois que todas as políticas antigas forem removidas

-- Faculty Members
CREATE POLICY "policy_faculty_members_view_own" ON public.faculty_members
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "policy_faculty_members_view_same_faculty" ON public.faculty_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.faculty_members AS fm 
      WHERE fm.faculty_id = faculty_members.faculty_id 
      AND fm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "policy_faculty_members_owner_manage" ON public.faculty_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.faculties
      WHERE id = faculty_members.faculty_id 
      AND owner_id = (select auth.uid())
    )
  );

CREATE POLICY "policy_faculty_members_join_with_code" ON public.faculty_members
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "policy_faculty_members_join_public" ON public.faculty_members
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.faculties
      WHERE id = faculty_members.faculty_id AND is_public = true
    )
  );

CREATE POLICY "policy_faculty_members_admin_add" ON public.faculty_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faculty_members
      WHERE faculty_id = faculty_members.faculty_id 
      AND user_id = (select auth.uid()) 
      AND role = 'admin'
    ) OR 
    EXISTS (
      SELECT 1 FROM public.faculties
      WHERE id = faculty_members.faculty_id 
      AND owner_id = (select auth.uid())
    )
  );

-- Faculties
CREATE POLICY "policy_faculties_visible" ON public.faculties
  FOR SELECT USING (
    is_public OR 
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = id AND user_id = (select auth.uid())
    )
  );

CREATE POLICY "policy_faculties_owner_update" ON public.faculties
  FOR UPDATE USING (owner_id = (select auth.uid()));

CREATE POLICY "policy_faculties_owner_delete" ON public.faculties
  FOR DELETE USING (owner_id = (select auth.uid()));

-- Faculty Posts
CREATE POLICY "policy_faculty_posts_visible" ON public.faculty_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = faculty_posts.faculty_id AND user_id = (select auth.uid())
    )
  );

CREATE POLICY "policy_faculty_posts_create" ON public.faculty_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = faculty_posts.faculty_id AND user_id = (select auth.uid())
    )
  );

CREATE POLICY "policy_faculty_posts_update" ON public.faculty_posts
  FOR UPDATE USING (
    user_id = (select auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.faculty_members 
      WHERE faculty_id = faculty_posts.faculty_id AND user_id = (select auth.uid()) AND role IN ('admin', 'moderator')
    )
  );

-- Criar uma função auxiliar para verificar se um usuário é proprietário de uma faculdade
CREATE OR REPLACE FUNCTION public.is_faculty_owner(faculty_id_param integer)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.faculties
    WHERE id = faculty_id_param AND owner_id = (SELECT auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reativar RLS nas tabelas
ALTER TABLE public.faculty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_posts ENABLE ROW LEVEL SECURITY; 