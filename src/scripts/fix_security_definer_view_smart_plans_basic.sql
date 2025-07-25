-- Correção de Segurança: Remover SECURITY DEFINER da view view_smart_plans_basic
-- Problema: View view_smart_plans_basic está definida com a propriedade SECURITY DEFINER
-- Solução: Recriar a view com SECURITY INVOKER para usar as permissões do usuário que faz a consulta

-- Primeiro, vamos dropar a view existente
DROP VIEW IF EXISTS public.view_smart_plans_basic CASCADE;

-- Recriar a view com SECURITY INVOKER explícito
-- Isso garante que a view use as permissões do usuário que faz a consulta, não do criador
CREATE OR REPLACE VIEW public.view_smart_plans_basic
WITH (security_invoker=on) AS
SELECT 
  sp.id,
  sp.name,
  sp.user_id,
  sp.start_date,
  sp.end_date,
  sp.status,
  sp.settings,
  sp.created_at,
  sp.updated_at
FROM smart_plans sp;

-- Configurar permissões adequadas
-- Garantir que apenas usuários autenticados possam acessar
GRANT SELECT ON public.view_smart_plans_basic TO authenticated;
REVOKE ALL ON public.view_smart_plans_basic FROM anon;

-- Comentários sobre a correção:
-- 1. Removida a propriedade SECURITY DEFINER usando WITH (security_invoker=on)
-- 2. Mantida toda a lógica original da view
-- 3. A view agora usa as permissões do usuário que faz a consulta, não do criador
-- 4. Isso é mais seguro pois respeita as políticas RLS do usuário atual
-- 5. Mantidas as permissões adequadas (apenas authenticated, sem anon)
-- 6. A view mostra informações básicas dos planos inteligentes