-- Script para corrigir recursão infinita nas políticas RLS das tabelas faculties e faculty_members

-- 1. Corrigir a política problemática na tabela faculties
DROP POLICY IF EXISTS "Faculties visíveis para membros ou públicas" ON public.faculties;
DROP POLICY IF EXISTS "policy_view_faculties" ON public.faculties;

-- Criar política correta para faculties
CREATE POLICY "Faculties visíveis para membros ou públicas" ON public.faculties
  FOR SELECT USING (
    is_public OR 
    EXISTS (
      SELECT 1 FROM faculty_members
      WHERE faculty_members.faculty_id = faculties.id AND faculty_members.user_id = auth.uid()
    )
  );

-- 2. Corrigir as políticas problemáticas na tabela faculty_members
DROP POLICY IF EXISTS "Membros visíveis para outros membros" ON public.faculty_members;
DROP POLICY IF EXISTS "Administradores podem adicionar membros" ON public.faculty_members;
DROP POLICY IF EXISTS "Administradores podem atualizar membros" ON public.faculty_members;
DROP POLICY IF EXISTS "Administradores podem remover membros" ON public.faculty_members;
DROP POLICY IF EXISTS "policy_view_same_faculty_members" ON public.faculty_members;
DROP POLICY IF EXISTS "policy_manage_faculty_members" ON public.faculty_members;

-- Criar ou substituir a função para verificar membership sem recursão
CREATE OR REPLACE FUNCTION public.check_faculty_membership(p_faculty_id INTEGER, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.faculty_members 
    WHERE faculty_id = p_faculty_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar políticas corrigidas para faculty_members
CREATE POLICY "Membros visíveis para outros membros" ON public.faculty_members
  FOR SELECT USING (
    -- Verificar se o ambiente é público
    EXISTS (
      SELECT 1 FROM public.faculties 
      WHERE id = faculty_members.faculty_id AND is_public = true
    )
    OR
    -- Verificar se o usuário é membro usando a função
    public.check_faculty_membership(faculty_members.faculty_id, auth.uid())
  );

CREATE POLICY "Administradores podem adicionar membros" ON public.faculty_members
  FOR INSERT WITH CHECK (
    -- Verificar se o usuário é administrador
    EXISTS (
      SELECT 1 
      FROM public.faculty_members 
      WHERE faculty_id = faculty_members.faculty_id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    ) 
    OR 
    -- Verificar se o usuário é proprietário
    EXISTS (
      SELECT 1 
      FROM public.faculties 
      WHERE id = faculty_members.faculty_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Administradores podem atualizar membros" ON public.faculty_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 
      FROM public.faculty_members 
      WHERE faculty_id = faculty_members.faculty_id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    ) 
    OR 
    EXISTS (
      SELECT 1 
      FROM public.faculties 
      WHERE id = faculty_members.faculty_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Administradores podem remover membros" ON public.faculty_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 
      FROM public.faculty_members 
      WHERE faculty_id = faculty_members.faculty_id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    ) 
    OR 
    EXISTS (
      SELECT 1 
      FROM public.faculties 
      WHERE id = faculty_members.faculty_id AND owner_id = auth.uid()
    )
    OR
    -- Usuários podem remover a si mesmos
    user_id = auth.uid()
  );

-- 3. Atualizar as funções RPC para verificar permissões
CREATE OR REPLACE FUNCTION public.is_faculty_member(faculty_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.faculty_members 
    WHERE faculty_id = faculty_id_param AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_faculty_admin(faculty_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.faculty_members 
    WHERE faculty_id = faculty_id_param 
      AND user_id = auth.uid() 
      AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 
    FROM public.faculties 
    WHERE id = faculty_id_param AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_faculty_owner(faculty_id_param INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.faculties 
    WHERE id = faculty_id_param AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 