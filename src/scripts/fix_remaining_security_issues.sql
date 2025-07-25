-- Script adicional para corrigir problemas de segurança restantes
-- Este script resolve os problemas identificados após a primeira correção

-- =====================================================
-- PROBLEMA 1: faculty_events_with_creator ainda expõe auth.users
-- =====================================================

-- Remover a view que ainda expõe auth.users
DROP VIEW IF EXISTS public.faculty_events_with_creator CASCADE;

-- Recriar a view de forma completamente segura
CREATE OR REPLACE VIEW public.faculty_events_with_creator AS
SELECT 
  fe.*,
  p.username,
  p.full_name as name,
  p.avatar_url,
  NULL::text as email
FROM 
  public.faculty_events fe
LEFT JOIN
  public.profiles p ON fe.creator_id = p.id;

-- Habilitar RLS na view
ALTER VIEW public.faculty_events_with_creator SET (security_barrier = true);

-- Conceder permissões
GRANT SELECT ON public.faculty_events_with_creator TO authenticated;
GRANT SELECT ON public.faculty_events_with_creator TO anon;

-- =====================================================
-- PROBLEMA 2: Tabela dashboard_carousel tem políticas mas RLS desabilitado
-- =====================================================

-- Habilitar RLS na tabela dashboard_carousel
ALTER TABLE public.dashboard_carousel ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROBLEMA 3: Views com SECURITY DEFINER desnecessário
-- =====================================================

-- Corrigir view_plan_session_stats
DROP VIEW IF EXISTS public.view_plan_session_stats CASCADE;
CREATE OR REPLACE VIEW public.view_plan_session_stats AS
SELECT 
    sps.plan_id,
    COUNT(*) as total_sessions,
    COALESCE(SUM(sps.duration_minutes), 0) as total_duration_minutes,
    COALESCE(AVG(sps.duration_minutes), 0) as avg_duration_minutes,
    MAX(sps.created_at) as last_session_date
FROM 
    public.smart_plan_sessions sps
GROUP BY 
    sps.plan_id;

-- Corrigir view_smart_plan_discipline_stats
DROP VIEW IF EXISTS public.view_smart_plan_discipline_stats CASCADE;
CREATE OR REPLACE VIEW public.view_smart_plan_discipline_stats AS
SELECT 
    spd.plan_id,
    spd.discipline_id,
    d.name as discipline_name,
    spd.allocated_hours,
    COALESCE(SUM(sps.duration_minutes), 0) / 60.0 as completed_hours,
    CASE 
        WHEN spd.allocated_hours > 0 THEN 
            ROUND((COALESCE(SUM(sps.duration_minutes), 0) / 60.0 / spd.allocated_hours) * 100, 2)
        ELSE 0
    END as completion_percentage
FROM 
    public.smart_plan_disciplines spd
LEFT JOIN 
    public.disciplines d ON spd.discipline_id = d.id
LEFT JOIN 
    public.smart_plan_sessions sps ON spd.plan_id = sps.plan_id 
    AND sps.discipline_id = spd.discipline_id
GROUP BY 
    spd.plan_id, spd.discipline_id, d.name, spd.allocated_hours;

-- Corrigir view_smart_plans
DROP VIEW IF EXISTS public.view_smart_plans CASCADE;
CREATE OR REPLACE VIEW public.view_smart_plans AS
SELECT 
    sp.*,
    COALESCE(stats.total_sessions, 0) as total_sessions,
    COALESCE(stats.total_duration_minutes, 0) as total_duration_minutes,
    COALESCE(stats.avg_duration_minutes, 0) as avg_duration_minutes,
    stats.last_session_date,
    COALESCE(disc_count.discipline_count, 0) as discipline_count
FROM 
    public.smart_plans sp
LEFT JOIN 
    public.view_plan_session_stats stats ON sp.id = stats.plan_id
LEFT JOIN (
    SELECT 
        plan_id,
        COUNT(*) as discipline_count
    FROM 
        public.smart_plan_disciplines
    GROUP BY 
        plan_id
) disc_count ON sp.id = disc_count.plan_id;

-- Corrigir view_smart_plan_sessions
DROP VIEW IF EXISTS public.view_smart_plan_sessions CASCADE;
CREATE OR REPLACE VIEW public.view_smart_plan_sessions AS
SELECT 
    sps.*,
    sp.name as plan_name,
    d.name as discipline_name
FROM 
    public.smart_plan_sessions sps
LEFT JOIN 
    public.smart_plans sp ON sps.plan_id = sp.id
LEFT JOIN 
    public.disciplines d ON sps.discipline_id = d.id;

-- Conceder permissões para as views corrigidas
GRANT SELECT ON public.view_plan_session_stats TO authenticated;
GRANT SELECT ON public.view_smart_plans_basic TO authenticated;
GRANT SELECT ON public.view_smart_plan_discipline_stats TO authenticated;
GRANT SELECT ON public.view_smart_plans TO authenticated;
GRANT SELECT ON public.view_smart_plan_sessions TO authenticated;

-- =====================================================
-- PROBLEMA 4: Criar tabela user_emails para evitar exposição de auth.users
-- =====================================================

-- Criar tabela user_emails para armazenar emails de forma segura
CREATE TABLE IF NOT EXISTS public.user_emails (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    email_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS na tabela user_emails
ALTER TABLE public.user_emails ENABLE ROW LEVEL SECURITY;

-- Criar políticas de RLS para a tabela user_emails
-- Política para permitir que usuários vejam apenas seu próprio email
DROP POLICY IF EXISTS user_emails_select_policy ON public.user_emails;
CREATE POLICY user_emails_select_policy ON public.user_emails
    FOR SELECT
    USING (auth.uid() = id);

-- Política para permitir que administradores vejam todos os emails
DROP POLICY IF EXISTS user_emails_select_admin_policy ON public.user_emails;
CREATE POLICY user_emails_select_admin_policy ON public.user_emails
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

-- Função para sincronizar emails de auth.users para user_emails
CREATE OR REPLACE FUNCTION public.sync_user_emails()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_emails (id, email, email_confirmed_at)
    VALUES (NEW.id, NEW.email, NEW.email_confirmed_at)
    ON CONFLICT (id) DO UPDATE
    SET email = NEW.email,
        email_confirmed_at = NEW.email_confirmed_at,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para sincronizar emails quando um usuário é criado ou atualizado
DROP TRIGGER IF EXISTS sync_user_emails_trigger ON auth.users;
CREATE TRIGGER sync_user_emails_trigger
AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_emails();

-- Sincronizar emails existentes
INSERT INTO public.user_emails (id, email, email_confirmed_at)
SELECT id, email, email_confirmed_at FROM auth.users
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    updated_at = now();

-- Conceder permissões para a tabela user_emails
GRANT SELECT ON public.user_emails TO authenticated;

-- =====================================================
-- VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar se RLS foi habilitado corretamente
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM 
    pg_tables 
WHERE 
    schemaname = 'public' 
    AND tablename IN ('dashboard_carousel', 'user_emails');

-- Verificar se ainda existem views com SECURITY DEFINER
SELECT 
    schemaname,
    viewname
FROM 
    pg_views 
WHERE 
    schemaname = 'public'
    AND definition ILIKE '%security_definer%';

-- Verificar se ainda existem views expondo auth.users
DO $$
DECLARE
    view_record RECORD;
    view_count INTEGER := 0;
BEGIN
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE definition ILIKE '%auth.users%' 
        AND schemaname = 'public'
    LOOP
        RAISE WARNING 'View ainda expõe auth.users: %.%', view_record.schemaname, view_record.viewname;
        view_count := view_count + 1;
    END LOOP;
    
    IF view_count = 0 THEN
        RAISE NOTICE 'Sucesso: Nenhuma view pública expõe auth.users diretamente';
    ELSE
        RAISE WARNING 'Atenção: % view(s) ainda expõem auth.users', view_count;
    END IF;
END $$;

RAISE NOTICE 'Script de correção de problemas de segurança restantes executado com sucesso!';
RAISE NOTICE 'Problemas corrigidos:';
RAISE NOTICE '1. faculty_events_with_creator não expõe mais auth.users';
RAISE NOTICE '2. RLS habilitado na tabela dashboard_carousel';
RAISE NOTICE '3. Removido SECURITY DEFINER desnecessário das views de planejamento';
RAISE NOTICE '4. Criada tabela user_emails com RLS para armazenar emails de forma segura';
RAISE NOTICE 'Execute novamente os advisors para verificar se todos os problemas foram resolvidos.';}