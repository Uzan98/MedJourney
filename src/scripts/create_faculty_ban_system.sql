-- Script para implementar o sistema de banimento de usuários em faculdades

-- 1. Criar tabela para armazenar os banimentos
CREATE TABLE IF NOT EXISTS public.faculty_banned_users (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id),
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  unbanned_at TIMESTAMP WITH TIME ZONE,
  unbanned_by UUID REFERENCES auth.users(id),
  
  -- Garantir que um usuário só pode ser banido uma vez por faculdade (se estiver ativo)
  CONSTRAINT unique_active_ban UNIQUE (faculty_id, user_id, is_active),
  
  -- Verificar se is_active é false quando unbanned_at e unbanned_by são preenchidos
  CONSTRAINT check_unbanned CHECK (
    (is_active = TRUE AND unbanned_at IS NULL AND unbanned_by IS NULL) OR
    (is_active = FALSE AND unbanned_at IS NOT NULL AND unbanned_by IS NOT NULL)
  )
);

-- 2. Criar índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_faculty_banned_users_faculty_id ON public.faculty_banned_users(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_banned_users_user_id ON public.faculty_banned_users(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_banned_users_is_active ON public.faculty_banned_users(is_active);

-- 3. Configurar políticas de segurança (RLS)
ALTER TABLE public.faculty_banned_users ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DO $$
BEGIN
    -- Tentar remover políticas se existirem
    BEGIN
        DROP POLICY IF EXISTS "Admins podem ver banimentos" ON public.faculty_banned_users;
    EXCEPTION WHEN OTHERS THEN
        -- Ignorar erros ao tentar remover políticas
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Admins podem banir usuários" ON public.faculty_banned_users;
    EXCEPTION WHEN OTHERS THEN
        -- Ignorar erros ao tentar remover políticas
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Admins podem atualizar banimentos" ON public.faculty_banned_users;
    EXCEPTION WHEN OTHERS THEN
        -- Ignorar erros ao tentar remover políticas
    END;
END
$$;

-- Política para visualização: apenas administradores da faculdade podem ver os banimentos
CREATE POLICY "Admins podem ver banimentos" ON public.faculty_banned_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.faculty_members
      WHERE faculty_id = faculty_banned_users.faculty_id
      AND user_id = (SELECT auth.uid())
      AND role IN ('admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.faculties
      WHERE id = faculty_banned_users.faculty_id
      AND owner_id = (SELECT auth.uid())
    )
  );

-- Política para inserção: apenas administradores da faculdade podem banir usuários
CREATE POLICY "Admins podem banir usuários" ON public.faculty_banned_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.faculty_members
      WHERE faculty_id = faculty_banned_users.faculty_id
      AND user_id = (SELECT auth.uid())
      AND role IN ('admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.faculties
      WHERE id = faculty_banned_users.faculty_id
      AND owner_id = (SELECT auth.uid())
    )
  );

-- Política para atualização: apenas administradores da faculdade podem atualizar banimentos
CREATE POLICY "Admins podem atualizar banimentos" ON public.faculty_banned_users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.faculty_members
      WHERE faculty_id = faculty_banned_users.faculty_id
      AND user_id = (SELECT auth.uid())
      AND role IN ('admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.faculties
      WHERE id = faculty_banned_users.faculty_id
      AND owner_id = (SELECT auth.uid())
    )
  );

-- 4. Criar funções para banir e desbanir usuários
-- Função para banir um usuário
CREATE OR REPLACE FUNCTION public.ban_faculty_user(
  p_faculty_id INTEGER,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_user UUID;
  v_is_admin BOOLEAN;
  v_is_banned BOOLEAN;
BEGIN
  -- Obter o usuário atual
  v_current_user := (SELECT auth.uid());
  
  -- Verificar se o usuário atual é administrador da faculdade
  SELECT EXISTS (
    SELECT 1 FROM public.faculty_members
    WHERE faculty_id = p_faculty_id
    AND user_id = v_current_user
    AND role IN ('admin')
  ) OR EXISTS (
    SELECT 1 FROM public.faculties
    WHERE id = p_faculty_id
    AND owner_id = v_current_user
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem banir usuários';
  END IF;
  
  -- Verificar se o usuário já está banido
  SELECT EXISTS (
    SELECT 1 FROM public.faculty_banned_users
    WHERE faculty_id = p_faculty_id
    AND user_id = p_user_id
    AND is_active = TRUE
  ) INTO v_is_banned;
  
  IF v_is_banned THEN
    RAISE EXCEPTION 'Usuário já está banido desta faculdade';
  END IF;
  
  -- Banir o usuário
  INSERT INTO public.faculty_banned_users (
    faculty_id,
    user_id,
    banned_by,
    reason
  ) VALUES (
    p_faculty_id,
    p_user_id,
    v_current_user,
    p_reason
  );
  
  -- Remover o usuário da faculdade
  DELETE FROM public.faculty_members
  WHERE faculty_id = p_faculty_id
  AND user_id = p_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para desbanir um usuário
CREATE OR REPLACE FUNCTION public.unban_faculty_user(
  p_faculty_id INTEGER,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_user UUID;
  v_is_admin BOOLEAN;
  v_is_banned BOOLEAN;
  v_ban_id INTEGER;
BEGIN
  -- Obter o usuário atual
  v_current_user := (SELECT auth.uid());
  
  -- Verificar se o usuário atual é administrador da faculdade
  SELECT EXISTS (
    SELECT 1 FROM public.faculty_members
    WHERE faculty_id = p_faculty_id
    AND user_id = v_current_user
    AND role IN ('admin')
  ) OR EXISTS (
    SELECT 1 FROM public.faculties
    WHERE id = p_faculty_id
    AND owner_id = v_current_user
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem desbanir usuários';
  END IF;
  
  -- Verificar se o usuário está banido
  SELECT id, EXISTS (
    SELECT 1 FROM public.faculty_banned_users
    WHERE faculty_id = p_faculty_id
    AND user_id = p_user_id
    AND is_active = TRUE
  ) INTO v_ban_id, v_is_banned FROM public.faculty_banned_users
  WHERE faculty_id = p_faculty_id
  AND user_id = p_user_id
  AND is_active = TRUE;
  
  IF NOT v_is_banned THEN
    RAISE EXCEPTION 'Usuário não está banido desta faculdade';
  END IF;
  
  -- Desbanir o usuário
  UPDATE public.faculty_banned_users
  SET 
    is_active = FALSE,
    unbanned_at = NOW(),
    unbanned_by = v_current_user
  WHERE id = v_ban_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar função para verificar se um usuário está banido
CREATE OR REPLACE FUNCTION public.is_user_banned_from_faculty(
  p_faculty_id INTEGER,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.faculty_banned_users
    WHERE faculty_id = p_faculty_id
    AND user_id = p_user_id
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION public.ban_faculty_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.unban_faculty_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_banned_from_faculty TO authenticated;

-- 7. Criar trigger para impedir que usuários banidos sejam adicionados como membros
CREATE OR REPLACE FUNCTION public.check_faculty_ban_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o usuário está banido
  IF EXISTS (
    SELECT 1 FROM public.faculty_banned_users
    WHERE faculty_id = NEW.faculty_id
    AND user_id = NEW.user_id
    AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Este usuário está banido desta faculdade e não pode ser adicionado como membro';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger na tabela faculty_members
DROP TRIGGER IF EXISTS check_faculty_ban_before_insert_trigger ON public.faculty_members;

CREATE TRIGGER check_faculty_ban_before_insert_trigger
BEFORE INSERT ON public.faculty_members
FOR EACH ROW
EXECUTE FUNCTION public.check_faculty_ban_before_insert(); 