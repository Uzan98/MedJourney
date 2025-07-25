-- Correção de Segurança: Remover SECURITY DEFINER da view view_smart_plan_sessions
-- Problema: View view_smart_plan_sessions está definida com a propriedade SECURITY DEFINER
-- Solução: Recriar a view com SECURITY INVOKER para usar as permissões do usuário que faz a consulta

-- Primeiro, vamos dropar a view existente
DROP VIEW IF EXISTS public.view_smart_plan_sessions CASCADE;

-- Recriar a view com SECURITY INVOKER explícito
-- Isso garante que a view use as permissões do usuário que faz a consulta, não do criador
CREATE OR REPLACE VIEW public.view_smart_plan_sessions
WITH (security_invoker=on) AS
SELECT 
  sps.id,
  sps.plan_id,
  sps.title,
  sps.date,
  sps.start_time,
  sps.end_time,
  sps.duration_minutes,
  sps.is_revision,
  sps.original_session_id,
  sps.discipline_id,
  sps.subject_id,
  d.name AS discipline_name,
  s.name AS subject_name,
  sps.created_at,
  sps.updated_at
FROM smart_plan_sessions sps
  LEFT JOIN disciplines d ON sps.discipline_id = d.id
  LEFT JOIN subjects s ON sps.subject_id = s.id;

-- Configurar permissões adequadas
-- Garantir que apenas usuários autenticados possam acessar
GRANT SELECT ON public.view_smart_plan_sessions TO authenticated;
REVOKE ALL ON public.view_smart_plan_sessions FROM anon;

-- Comentários sobre a correção:
-- 1. Removida a propriedade SECURITY DEFINER usando WITH (security_invoker=on)
-- 2. Mantida toda a lógica original da view
-- 3. A view agora usa as permissões do usuário que faz a consulta, não do criador
-- 4. Isso é mais seguro pois respeita as políticas RLS do usuário atual
-- 5. Mantidas as permissões adequadas (apenas authenticated, sem anon)
-- 6. A view mostra sessões de planos inteligentes com informações de disciplinas e assuntos