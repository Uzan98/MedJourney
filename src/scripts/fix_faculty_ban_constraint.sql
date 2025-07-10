-- Script para corrigir a restrição unique_active_ban da tabela faculty_banned_users

-- 1. Remover a restrição existente
ALTER TABLE public.faculty_banned_users DROP CONSTRAINT IF EXISTS unique_active_ban;

-- 2. Adicionar uma nova restrição que considera apenas banimentos ativos
-- Isso permitirá ter múltiplos registros para o mesmo usuário/faculdade desde que apenas um esteja ativo
ALTER TABLE public.faculty_banned_users 
  ADD CONSTRAINT unique_active_ban 
  EXCLUDE USING btree (faculty_id WITH =, user_id WITH =) 
  WHERE (is_active = TRUE);

-- 3. Corrigir a função de desbanimento para lidar corretamente com múltiplos registros
CREATE OR REPLACE FUNCTION public.unban_faculty_user(
  p_faculty_id INTEGER,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_user UUID;
  v_is_admin BOOLEAN;
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
  
  -- Verificar se o usuário está banido e obter o ID do banimento ativo
  SELECT id INTO v_ban_id FROM public.faculty_banned_users
  WHERE faculty_id = p_faculty_id
  AND user_id = p_user_id
  AND is_active = TRUE;
  
  IF v_ban_id IS NULL THEN
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