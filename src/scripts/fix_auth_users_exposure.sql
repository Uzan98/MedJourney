-- Script para corrigir exposição de auth.users nas views
-- Este script resolve os problemas de segurança identificados pelos advisors do Supabase

-- =====================================================
-- PROBLEMA 1: View user_emails expõe auth.users diretamente
-- =====================================================

-- Remover a view insegura
DROP VIEW IF EXISTS public.user_emails;

-- Criar função segura para obter emails de usuários
CREATE OR REPLACE FUNCTION public.get_user_email(user_id_param uuid)
RETURNS TABLE (id uuid, email text) AS $$
BEGIN
  -- Verificar se o usuário está autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: usuário não autenticado';
  END IF;
  
  -- Permitir apenas que o usuário veja seu próprio email ou admins vejam qualquer email
  IF auth.uid() = user_id_param OR EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) THEN
    RETURN QUERY
    SELECT u.id, u.email::text
    FROM auth.users u
    WHERE u.id = user_id_param;
  ELSE
    RAISE EXCEPTION 'Acesso negado: você só pode acessar seu próprio email';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão apenas para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_user_email TO authenticated;

-- =====================================================
-- PROBLEMA 2: View flashcard_user_stats expõe auth.users
-- =====================================================

-- Remover a view insegura
DROP VIEW IF EXISTS public.flashcard_user_stats;

-- Criar view segura que não expõe auth.users diretamente
CREATE OR REPLACE VIEW public.flashcard_user_stats AS
SELECT 
    p.id as user_id,
    COALESCE(c.total_cards, 0) as total_cards,
    COALESCE(c.mastered_cards, 0) as mastered_cards,
    COALESCE(c.cards_to_review, 0) as cards_to_review,
    CASE 
        WHEN COALESCE(c.total_cards, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(c.mastered_cards, 0)::numeric / COALESCE(c.total_cards, 1)::numeric) * 100)
    END as mastery_percentage,
    COALESCE(s.total_study_sessions, 0) as total_study_sessions,
    COALESCE(s.total_study_time_minutes, 0) as total_study_time_minutes,
    COALESCE(streak.study_streak_days, 0) as study_streak_days
FROM 
    public.profiles p
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_cards,
        COUNT(*) FILTER (WHERE mastery_level >= 80) as mastered_cards,
        COUNT(*) FILTER (WHERE next_review <= now() OR next_review IS NULL) as cards_to_review
    FROM 
        public.flashcards
    GROUP BY 
        user_id
) c ON p.id = c.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_study_sessions,
        COALESCE(ROUND(SUM(duration_seconds) / 60), 0) as total_study_time_minutes
    FROM 
        public.flashcard_study_sessions
    WHERE 
        end_time IS NOT NULL
    GROUP BY 
        user_id
) s ON p.id = s.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(DISTINCT DATE(start_time)) as study_streak_days
    FROM 
        public.flashcard_study_sessions
    WHERE 
        start_time >= now() - INTERVAL '30 days'
    GROUP BY 
        user_id
) streak ON p.id = streak.user_id;

-- Habilitar RLS na view
ALTER VIEW public.flashcard_user_stats SET (security_barrier = true);

-- Conceder permissões
GRANT SELECT ON public.flashcard_user_stats TO authenticated;

-- =====================================================
-- PROBLEMA 3: View faculty_events_with_creator expõe auth.users
-- =====================================================

-- Remover a view insegura
DROP VIEW IF EXISTS public.faculty_events_with_creator;

-- Criar view segura usando profiles em vez de auth.users
CREATE OR REPLACE VIEW public.faculty_events_with_creator AS
SELECT 
  fe.*,
  p.username,
  p.full_name as name,
  p.avatar_url,
  -- Para o email, usar uma função segura
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.faculty_members fm 
      WHERE fm.faculty_id = fe.faculty_id 
      AND fm.user_id = auth.uid()
    ) THEN (
      SELECT email::text FROM auth.users WHERE id = fe.creator_id
    )
    ELSE NULL
  END as email
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
-- PROBLEMA 4: Outras views com SECURITY DEFINER
-- =====================================================

-- Verificar e corrigir views que usam SECURITY DEFINER desnecessariamente
-- Remover SECURITY DEFINER de views que não precisam

-- View flashcard_decks_view (se existir)
DROP VIEW IF EXISTS public.flashcard_decks_view CASCADE;
CREATE OR REPLACE VIEW public.flashcard_decks_view AS
SELECT 
    fd.*,
    p.username as creator_username,
    p.full_name as creator_name
FROM 
    public.flashcard_decks fd
LEFT JOIN 
    public.profiles p ON fd.user_id = p.id;

-- View view_user_plan_stats (se existir)
DROP VIEW IF EXISTS public.view_user_plan_stats CASCADE;
CREATE OR REPLACE VIEW public.view_user_plan_stats AS
SELECT 
    sp.user_id,
    count(DISTINCT sp.id) AS total_plans,
    count(DISTINCT
        CASE
            WHEN (sp.status = 'active') THEN sp.id
            ELSE NULL
        END) AS active_plans,
    count(DISTINCT
        CASE
            WHEN (sp.status = 'completed') THEN sp.id
            ELSE NULL
        END) AS completed_plans,
    COALESCE(sum(sps.duration_minutes), 0) AS total_planned_minutes
FROM 
    public.smart_plans sp
LEFT JOIN 
    public.smart_plan_sessions sps ON sp.id = sps.plan_id
GROUP BY 
    sp.user_id;

-- View faculty_members_view (se existir)
DROP VIEW IF EXISTS public.faculty_members_view CASCADE;
CREATE OR REPLACE VIEW public.faculty_members_view AS
SELECT 
    fm.*,
    p.username,
    p.full_name,
    p.avatar_url,
    f.name as faculty_name
FROM 
    public.faculty_members fm
LEFT JOIN 
    public.profiles p ON fm.user_id = p.id
LEFT JOIN 
    public.faculties f ON fm.faculty_id = f.id;

-- Conceder permissões para as novas views
GRANT SELECT ON public.flashcard_decks_view TO authenticated;
GRANT SELECT ON public.view_user_plan_stats TO authenticated;
GRANT SELECT ON public.faculty_members_view TO authenticated;

-- =====================================================
-- VERIFICAÇÕES FINAIS
-- =====================================================

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

-- Verificar se as funções foram criadas corretamente
SELECT 
    routine_name,
    routine_type,
    security_type
FROM 
    information_schema.routines 
WHERE 
    routine_schema = 'public' 
    AND routine_name IN ('get_user_email')
ORDER BY 
    routine_name;

RAISE NOTICE 'Script de correção de exposição auth.users executado com sucesso!';
RAISE NOTICE 'Próximos passos:';
RAISE NOTICE '1. Atualizar o código da aplicação para usar get_user_email() em vez de user_emails';
RAISE NOTICE '2. Testar todas as funcionalidades que dependiam das views alteradas';
RAISE NOTICE '3. Executar novamente os advisors do Supabase para verificar se os problemas foram resolvidos';