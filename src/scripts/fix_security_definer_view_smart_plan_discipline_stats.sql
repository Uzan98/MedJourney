-- Correção de Segurança: Remover SECURITY DEFINER da view view_smart_plan_discipline_stats
-- Problema: View view_smart_plan_discipline_stats está definida com a propriedade SECURITY DEFINER
-- Solução: Recriar a view com SECURITY INVOKER para usar as permissões do usuário que faz a consulta

-- Primeiro, vamos dropar a view existente
DROP VIEW IF EXISTS public.view_smart_plan_discipline_stats CASCADE;

-- Recriar a view com SECURITY INVOKER explícito
-- Isso garante que a view use as permissões do usuário que faz a consulta, não do criador
CREATE OR REPLACE VIEW public.view_smart_plan_discipline_stats
WITH (security_invoker=on) AS
SELECT 
  sps.plan_id,
  sps.discipline_id,
  d.name AS discipline_name,
  count(sps.id) AS session_count,
  sum(sps.duration_minutes) AS total_minutes,
  count(
    CASE
      WHEN sps.is_revision THEN 1
      ELSE NULL::integer
    END) AS revision_count
FROM smart_plan_sessions sps
  JOIN disciplines d ON sps.discipline_id = d.id
GROUP BY sps.plan_id, sps.discipline_id, d.name;

-- Configurar permissões adequadas
-- Garantir que apenas usuários autenticados possam acessar
GRANT SELECT ON public.view_smart_plan_discipline_stats TO authenticated;
REVOKE ALL ON public.view_smart_plan_discipline_stats FROM anon;

-- Comentários sobre a correção:
-- 1. Removida a propriedade SECURITY DEFINER usando WITH (security_invoker=on)
-- 2. Mantida toda a lógica original da view
-- 3. A view agora usa as permissões do usuário que faz a consulta, não do criador
-- 4. Isso é mais seguro pois respeita as políticas RLS do usuário atual
-- 5. Mantidas as permissões adequadas (apenas authenticated, sem anon)
-- 6. A view mostra estatísticas de disciplinas por plano com contagem de sessões, duração total e revisões