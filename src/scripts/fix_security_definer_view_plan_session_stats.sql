-- Correção de Segurança: Remover SECURITY DEFINER da view view_plan_session_stats
-- Problema: View view_plan_session_stats está definida com a propriedade SECURITY DEFINER
-- Solução: Recriar a view com SECURITY INVOKER para usar as permissões do usuário que faz a consulta

-- Primeiro, vamos dropar a view existente
DROP VIEW IF EXISTS public.view_plan_session_stats CASCADE;

-- Recriar a view com SECURITY INVOKER explícito
-- Isso garante que a view use as permissões do usuário que faz a consulta, não do criador
CREATE OR REPLACE VIEW public.view_plan_session_stats
WITH (security_invoker=on) AS
SELECT 
  p.id AS plan_id,
  p.name,
  p.user_id,
  p.start_date,
  p.end_date,
  p.status,
  count(DISTINCT sps.id) AS session_count,
  COALESCE(sum(sps.duration_minutes), 0) AS total_minutes
FROM smart_plans p
  LEFT JOIN smart_plan_sessions sps ON p.id = sps.plan_id
GROUP BY p.id, p.name, p.user_id, p.start_date, p.end_date, p.status;

-- Configurar permissões adequadas
-- Garantir que apenas usuários autenticados possam acessar
GRANT SELECT ON public.view_plan_session_stats TO authenticated;
REVOKE ALL ON public.view_plan_session_stats FROM anon;

-- Comentários sobre a correção:
-- 1. Removida a propriedade SECURITY DEFINER usando WITH (security_invoker=on)
-- 2. Mantida toda a lógica original da view
-- 3. A view agora usa as permissões do usuário que faz a consulta, não do criador
-- 4. Isso é mais seguro pois respeita as políticas RLS do usuário atual
-- 5. Mantidas as permissões adequadas (apenas authenticated, sem anon)
-- 6. A view mostra estatísticas de sessões de planos de estudo com contagem e duração total