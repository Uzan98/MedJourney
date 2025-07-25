-- Correção de Segurança: Remover SECURITY DEFINER da view faculty_events_with_creator
-- Problema: View faculty_events_with_creator está definida com a propriedade SECURITY DEFINER
-- Solução: Recriar a view com SECURITY INVOKER para usar as permissões do usuário que faz a consulta

-- Primeiro, vamos dropar a view existente
DROP VIEW IF EXISTS public.faculty_events_with_creator CASCADE;

-- Recriar a view com SECURITY INVOKER explícito
-- Isso garante que a view use as permissões do usuário que faz a consulta, não do criador
CREATE OR REPLACE VIEW public.faculty_events_with_creator
WITH (security_invoker=on) AS
SELECT 
  fe.id,
  fe.faculty_id,
  fe.creator_id,
  fe.title,
  fe.description,
  fe.location,
  fe.start_date,
  fe.end_date,
  fe.all_day,
  fe.color,
  fe.type,
  fe.is_public,
  fe.created_at,
  fe.updated_at,
  p.username,
  p.full_name AS name,
  p.avatar_url,
  NULL::text AS email
FROM faculty_events fe
  LEFT JOIN profiles p ON fe.creator_id = p.id;

-- Configurar permissões adequadas
-- Garantir que apenas usuários autenticados possam acessar
GRANT SELECT ON public.faculty_events_with_creator TO authenticated;
REVOKE ALL ON public.faculty_events_with_creator FROM anon;

-- Comentários sobre a correção:
-- 1. Removida a propriedade SECURITY DEFINER usando WITH (security_invoker=on)
-- 2. Mantida toda a lógica original da view
-- 3. A view agora usa as permissões do usuário que faz a consulta, não do criador
-- 4. Isso é mais seguro pois respeita as políticas RLS do usuário atual
-- 5. Mantidas as permissões adequadas (apenas authenticated, sem anon)
-- 6. A view mostra eventos da faculdade com informações do criador