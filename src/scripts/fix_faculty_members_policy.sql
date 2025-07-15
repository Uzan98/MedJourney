-- Script para corrigir a recursão infinita na política de faculty_members

-- Primeiro, remover a política existente que está causando recursão infinita
DROP POLICY IF EXISTS "Membros visíveis para outros membros" ON public.faculty_members;

-- Criar uma nova função para verificar se um usuário é membro de uma faculdade sem causar recursão
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

-- Criar uma nova política que usa a função em vez de uma subconsulta direta
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

-- Atualizar outras políticas que podem estar causando recursão
DROP POLICY IF EXISTS "Administradores podem adicionar membros" ON public.faculty_members;

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

-- Adicionar políticas para UPDATE e DELETE que estavam faltando
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

-- Criar funções RPC para verificar permissões
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