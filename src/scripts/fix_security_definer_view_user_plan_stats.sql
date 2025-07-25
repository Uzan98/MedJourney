-- Correção de Segurança: Remover SECURITY DEFINER da view view_user_plan_stats
-- Problema: View view_user_plan_stats está definida com a propriedade SECURITY DEFINER
-- Solução: Recriar a view com SECURITY INVOKER para usar as permissões do usuário que faz a consulta

-- Primeiro, vamos dropar a view existente
DROP VIEW IF EXISTS public.view_user_plan_stats CASCADE;

-- Recriar a view com SECURITY INVOKER explícito
-- Isso garante que a view use as permissões do usuário que faz a consulta, não do criador
CREATE OR REPLACE VIEW public.view_user_plan_stats
WITH (security_invoker=on) AS
SELECT 
  sp.user_id,
  count(DISTINCT sp.id) AS total_plans,
  count(DISTINCT
      CASE
          WHEN sp.status = 'active'::text THEN sp.id
          ELSE NULL::bigint
      END) AS active_plans,
  count(DISTINCT
      CASE
          WHEN sp.status = 'completed'::text THEN sp.id
          ELSE NULL::bigint
      END) AS completed_plans,
  COALESCE(sum(sps.duration_minutes), 0::bigint) AS total_planned_minutes
FROM smart_plans sp
  LEFT JOIN smart_plan_sessions sps ON sp.id = sps.plan_id
GROUP BY sp.user_id;

-- Configurar permissões adequadas
-- Garantir que apenas usuários autenticados possam acessar
GRANT SELECT ON public.view_user_plan_stats TO authenticated;
REVOKE ALL ON public.view_user_plan_stats FROM anon;

-- Comentários sobre a correção:
-- 1. Removida a propriedade SECURITY DEFINER usando WITH (security_invoker=on)
-- 2. Mantida toda a lógica original da view
-- 3. A view agora usa as permissões do usuário que faz a consulta, não do criador
-- 4. Isso é mais seguro pois respeita as políticas RLS do usuário atual
-- 5. Mantidas as permissões adequadas (apenas authenticated, sem anon)
-- 6. A view mostra estatísticas dos planos por usuário com contagens e duração total