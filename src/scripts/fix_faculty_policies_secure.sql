-- Script de correção de políticas RLS para o módulo "Minha Faculdade"
-- Implementa uma abordagem de defesa em profundidade com funções de segurança dedicadas
-- e políticas RLS otimizadas para evitar recursão infinita

-- PARTE 1: REMOVER TODAS AS POLÍTICAS EXISTENTES
-- =============================================

-- Desativar temporariamente RLS para facilitar as alterações
ALTER TABLE public.faculty_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_posts DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DO $$
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename IN ('faculty_members', 'faculties', 'faculty_posts')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                       policy_record.policyname, 
                       policy_record.tablename);
    END LOOP;
END $$;

-- PARTE 2: CRIAR FUNÇÕES DE SEGURANÇA DEDICADAS
-- =============================================

-- Função para verificar se um usuário é membro de uma faculdade
CREATE OR REPLACE FUNCTION public.is_faculty_member(faculty_id_param integer)
RETURNS boolean AS $$
DECLARE
    user_id_var uuid;
BEGIN
    -- Capturar o ID do usuário uma única vez para evitar múltiplas chamadas a auth.uid()
    user_id_var := (SELECT auth.uid());
    
    RETURN EXISTS (
        SELECT 1 FROM public.faculty_members
        WHERE faculty_id = faculty_id_param AND user_id = user_id_var
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se um usuário é proprietário de uma faculdade
CREATE OR REPLACE FUNCTION public.is_faculty_owner(faculty_id_param integer)
RETURNS boolean AS $$
DECLARE
    user_id_var uuid;
BEGIN
    -- Capturar o ID do usuário uma única vez
    user_id_var := (SELECT auth.uid());
    
    RETURN EXISTS (
        SELECT 1 FROM public.faculties
        WHERE id = faculty_id_param AND owner_id = user_id_var
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se um usuário é administrador de uma faculdade
CREATE OR REPLACE FUNCTION public.is_faculty_admin(faculty_id_param integer)
RETURNS boolean AS $$
DECLARE
    user_id_var uuid;
BEGIN
    -- Capturar o ID do usuário uma única vez
    user_id_var := (SELECT auth.uid());
    
    RETURN EXISTS (
        SELECT 1 FROM public.faculty_members
        WHERE faculty_id = faculty_id_param 
        AND user_id = user_id_var 
        AND role = 'admin'
    ) OR public.is_faculty_owner(faculty_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PARTE 3: CRIAR POLÍTICAS RLS OTIMIZADAS
-- ======================================

-- Políticas para faculty_members
-- 1. Visualização dos próprios registros
CREATE POLICY "policy_view_own_membership" ON public.faculty_members
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- 2. Visualização de membros da mesma faculdade
CREATE POLICY "policy_view_same_faculty_members" ON public.faculty_members
  FOR SELECT USING (public.is_faculty_member(faculty_id));

-- 3. Gerenciamento por proprietários e administradores
CREATE POLICY "policy_manage_faculty_members" ON public.faculty_members
  FOR ALL USING (public.is_faculty_admin(faculty_id));

-- 4. Entrada com código (apenas para o próprio usuário)
CREATE POLICY "policy_join_faculty" ON public.faculty_members
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Políticas para faculties
-- 1. Visualização de faculdades públicas ou onde o usuário é membro
CREATE POLICY "policy_view_faculties" ON public.faculties
  FOR SELECT USING (
    is_public OR public.is_faculty_member(id)
  );

-- 2. Edição apenas pelo proprietário
CREATE POLICY "policy_update_faculty" ON public.faculties
  FOR UPDATE USING (owner_id = (SELECT auth.uid()));

-- 3. Exclusão apenas pelo proprietário
CREATE POLICY "policy_delete_faculty" ON public.faculties
  FOR DELETE USING (owner_id = (SELECT auth.uid()));

-- 4. Criação por qualquer usuário autenticado
CREATE POLICY "policy_create_faculty" ON public.faculties
  FOR INSERT WITH CHECK (owner_id = (SELECT auth.uid()));

-- Políticas para faculty_posts
-- 1. Visualização de posts da faculdade onde o usuário é membro
CREATE POLICY "policy_view_faculty_posts" ON public.faculty_posts
  FOR SELECT USING (public.is_faculty_member(faculty_id));

-- 2. Criação de posts por membros
CREATE POLICY "policy_create_faculty_posts" ON public.faculty_posts
  FOR INSERT WITH CHECK (
    public.is_faculty_member(faculty_id) AND 
    user_id = (SELECT auth.uid())
  );

-- 3. Edição de posts pelo autor ou administradores
CREATE POLICY "policy_update_faculty_posts" ON public.faculty_posts
  FOR UPDATE USING (
    user_id = (SELECT auth.uid()) OR 
    public.is_faculty_admin(faculty_id)
  );

-- 4. Exclusão de posts pelo autor ou administradores
CREATE POLICY "policy_delete_faculty_posts" ON public.faculty_posts
  FOR DELETE USING (
    user_id = (SELECT auth.uid()) OR 
    public.is_faculty_admin(faculty_id)
  );

-- PARTE 4: REATIVAR RLS
-- ====================
ALTER TABLE public.faculty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_posts ENABLE ROW LEVEL SECURITY;

-- PARTE 5: CONCEDER PERMISSÕES PARA FUNÇÕES DE SEGURANÇA
-- ====================================================
GRANT EXECUTE ON FUNCTION public.is_faculty_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_faculty_owner TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_faculty_admin TO authenticated; 