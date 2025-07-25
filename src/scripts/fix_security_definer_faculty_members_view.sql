-- Correção de Segurança: Remover SECURITY DEFINER da view faculty_members_view
-- Problema: View faculty_members_view está definida com a propriedade SECURITY DEFINER
-- Solução: Recriar a view com SECURITY INVOKER para usar as permissões do usuário que faz a consulta

-- Primeiro, vamos dropar a view existente
DROP VIEW IF EXISTS public.faculty_members_view CASCADE;

-- Recriar a view com SECURITY INVOKER explícito
-- Isso garante que a view use as permissões do usuário que faz a consulta, não do criador
CREATE OR REPLACE VIEW public.faculty_members_view
WITH (security_invoker=on) AS
SELECT 
  fm.id,
  fm.faculty_id,
  fm.user_id,
  fm.role,
  fm.joined_at,
  fm.last_active_at,
  p.username,
  p.full_name,
  p.avatar_url,
  f.name AS faculty_name
FROM faculty_members fm
  LEFT JOIN profiles p ON fm.user_id = p.id
  LEFT JOIN faculties f ON fm.faculty_id = f.id;

-- Configurar permissões adequadas
-- Garantir que apenas usuários autenticados possam acessar
GRANT SELECT ON public.faculty_members_view TO authenticated;
REVOKE ALL ON public.faculty_members_view FROM anon;

-- Comentários sobre a correção:
-- 1. Removida a propriedade SECURITY DEFINER usando WITH (security_invoker=on)
-- 2. Mantida toda a lógica original da view
-- 3. A view agora usa as permissões do usuário que faz a consulta, não do criador
-- 4. Isso é mais seguro pois respeita as políticas RLS do usuário atual
-- 5. Mantidas as permissões adequadas (apenas authenticated, sem anon)
-- 6. A view mostra membros da faculdade com informações do perfil e nome da faculdade