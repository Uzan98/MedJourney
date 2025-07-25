-- Script para corrigir views com SECURITY DEFINER
-- Este script remove a propriedade SECURITY DEFINER de todas as views listadas no arquivo .corrections

-- =====================================================
-- 1. Corrigir views relacionadas a flashcards
-- =====================================================

-- Corrigir flashcard_user_stats
DROP VIEW IF EXISTS public.flashcard_user_stats CASCADE;
CREATE OR REPLACE VIEW public.flashcard_user_stats AS
SELECT 
    u.id as user_id,
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
    auth.users u
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
) c ON u.id = c.user_id
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
) s ON u.id = s.user_id
LEFT JOIN (
    -- Cálculo simplificado de streak
    SELECT 
        user_id,
        COUNT(DISTINCT date_trunc('day', created_at)) as study_streak_days
    FROM 
        public.flashcard_study_sessions
    WHERE 
        created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 
        user_id
) streak ON u.id = streak.user_id;

-- Corrigir flashcard_deck_stats
DROP VIEW IF EXISTS public.flashcard_deck_stats CASCADE;
CREATE OR REPLACE VIEW public.flashcard_deck_stats AS
SELECT 
    d.id,
    d.user_id,
    d.name,
    d.description,
    d.cover_color,
    d.cover_image,
    d.is_public,
    d.discipline_id,
    d.subject_id,
    d.tags,
    d.created_at,
    d.updated_at,
    COALESCE(s.discipline_name, '') as discipline_name,
    COALESCE(s.subject_name, '') as subject_name,
    COALESCE(c.card_count, 0) as card_count,
    COALESCE(c.mastery_average, 0) as mastery_average,
    COALESCE(ss.study_count, 0) as study_count
FROM 
    public.flashcard_decks d
LEFT JOIN (
    SELECT 
        deck_id,
        COUNT(*) as card_count,
        ROUND(AVG(mastery_level)) as mastery_average
    FROM 
        public.flashcards
    GROUP BY 
        deck_id
) c ON d.id = c.deck_id
LEFT JOIN (
    SELECT 
        deck_id,
        COUNT(*) as study_count
    FROM 
        public.flashcard_study_sessions
    WHERE 
        end_time IS NOT NULL
    GROUP BY 
        deck_id
) ss ON d.id = ss.deck_id
LEFT JOIN (
    SELECT 
        d.id as discipline_id,
        d.name as discipline_name,
        s.id as subject_id,
        s.name as subject_name
    FROM 
        public.disciplines d
    LEFT JOIN 
        public.subjects s ON d.id = s.discipline_id
) s ON d.discipline_id = s.discipline_id AND (d.subject_id = s.subject_id OR d.subject_id IS NULL);

-- Corrigir flashcard_decks_view
DROP VIEW IF EXISTS public.flashcard_decks_view CASCADE;
CREATE OR REPLACE VIEW public.flashcard_decks_view AS
SELECT 
  d.*,
  d.id as deck_id,
  COALESCE((SELECT COUNT(*) FROM flashcards f WHERE f.deck_id = d.id), 0) as card_count,
  COALESCE((SELECT ROUND(AVG(f.mastery_level)) FROM flashcards f WHERE f.deck_id = d.id), 0) as mastery_level,
  COALESCE((SELECT COUNT(*) FROM flashcards f WHERE f.deck_id = d.id AND (f.next_review IS NULL OR f.next_review <= NOW())), 0) as cards_due,
  COALESCE((SELECT COUNT(*) FROM flashcards f WHERE f.deck_id = d.id AND f.mastery_level >= 80), 0) as cards_mastered,
  COALESCE((SELECT COUNT(*) FROM flashcard_study_sessions s WHERE s.deck_id = d.id), 0) as study_count,
  COALESCE(disc.name, '') as discipline_name,
  COALESCE(subj.name, '') as subject_name
FROM 
  flashcard_decks d
LEFT JOIN 
  disciplines disc ON d.discipline_id = disc.id
LEFT JOIN 
  subjects subj ON d.subject_id = subj.id;

-- =====================================================
-- 2. Corrigir views relacionadas a smart planning
-- =====================================================

-- Corrigir view_plan_session_stats
DROP VIEW IF EXISTS public.view_plan_session_stats CASCADE;
CREATE OR REPLACE VIEW public.view_plan_session_stats AS
SELECT 
  p.id AS plan_id,
  p.name,
  p.user_id,
  p.start_date,
  p.end_date,
  p.status,
  COUNT(DISTINCT sps.id) AS session_count,
  COALESCE(SUM(sps.duration_minutes), 0) AS total_minutes
FROM 
  smart_plans p
LEFT JOIN 
  smart_plan_sessions sps ON p.id = sps.plan_id
GROUP BY 
  p.id, p.name, p.user_id, p.start_date, p.end_date, p.status;

-- Corrigir view_smart_plan_discipline_stats
DROP VIEW IF EXISTS public.view_smart_plan_discipline_stats CASCADE;
CREATE OR REPLACE VIEW public.view_smart_plan_discipline_stats AS
SELECT 
  sps.plan_id,
  sps.discipline_id,
  d.name AS discipline_name,
  COUNT(sps.id) AS session_count,
  SUM(sps.duration_minutes) AS total_minutes,
  COUNT(CASE WHEN sps.is_revision THEN 1 END) AS revision_count
FROM 
  smart_plan_sessions sps
JOIN
  disciplines d ON sps.discipline_id = d.id
GROUP BY 
  sps.plan_id, sps.discipline_id, d.name;

-- Corrigir view_smart_plans
DROP VIEW IF EXISTS public.view_smart_plans CASCADE;
CREATE OR REPLACE VIEW public.view_smart_plans AS
SELECT 
  p.id,
  p.name,
  p.user_id,
  p.start_date,
  p.end_date,
  p.status,
  p.settings,
  p.created_at,
  p.updated_at,
  COALESCE(SUM(stats.session_count), 0) AS total_sessions,
  COALESCE(SUM(stats.total_minutes), 0) AS total_minutes,
  COUNT(DISTINCT stats.discipline_id) AS discipline_count,
  COALESCE(SUM(stats.revision_count), 0) AS revision_count,
  COALESCE(
    (SELECT 
      jsonb_agg(
        jsonb_build_object(
          'id', stats.discipline_id,
          'name', stats.discipline_name,
          'session_count', stats.session_count,
          'minutes', stats.total_minutes
        )
      )
    FROM view_smart_plan_discipline_stats stats
    WHERE stats.plan_id = p.id),
    '[]'::jsonb
  ) AS disciplines
FROM 
  view_smart_plans_basic p
LEFT JOIN 
  view_smart_plan_discipline_stats stats ON p.id = stats.plan_id
GROUP BY 
  p.id, p.name, p.user_id, p.start_date, p.end_date, p.status, p.settings, p.created_at, p.updated_at;

-- Corrigir view_smart_plan_sessions
DROP VIEW IF EXISTS public.view_smart_plan_sessions CASCADE;
CREATE OR REPLACE VIEW public.view_smart_plan_sessions AS
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
FROM 
  smart_plan_sessions sps
LEFT JOIN 
  disciplines d ON sps.discipline_id = d.id
LEFT JOIN 
  subjects s ON sps.subject_id = s.id;

-- Corrigir view_smart_plan_sessions_by_day
DROP VIEW IF EXISTS public.view_smart_plan_sessions_by_day CASCADE;
CREATE OR REPLACE VIEW public.view_smart_plan_sessions_by_day AS
SELECT 
  plan_id,
  date,
  COUNT(*) AS session_count,
  SUM(duration_minutes) AS total_minutes
FROM 
  view_smart_plan_sessions
GROUP BY 
  plan_id, date;

-- Corrigir view_smart_plan_daily_sessions
DROP VIEW IF EXISTS public.view_smart_plan_daily_sessions CASCADE;
CREATE OR REPLACE VIEW public.view_smart_plan_daily_sessions AS
SELECT 
  s_day.plan_id,
  s_day.date,
  s_day.session_count,
  s_day.total_minutes,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'discipline_id', s.discipline_id,
        'discipline_name', s.discipline_name,
        'start_time', s.start_time,
        'end_time', s.end_time,
        'duration_minutes', s.duration_minutes,
        'is_revision', s.is_revision
      ) ORDER BY s.start_time
    )
    FROM view_smart_plan_sessions s
    WHERE s.plan_id = s_day.plan_id AND s.date = s_day.date
  ) AS sessions
FROM 
  view_smart_plan_sessions_by_day s_day
ORDER BY 
  s_day.date;

-- Corrigir view_smart_plans_basic
DROP VIEW IF EXISTS public.view_smart_plans_basic CASCADE;
CREATE OR REPLACE VIEW public.view_smart_plans_basic AS
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
FROM 
  smart_plans sp;

-- Corrigir view_user_plan_stats
DROP VIEW IF EXISTS public.view_user_plan_stats CASCADE;
CREATE OR REPLACE VIEW public.view_user_plan_stats AS
SELECT 
  sp.user_id,
  COUNT(DISTINCT sp.id) AS total_plans,
  COUNT(DISTINCT CASE WHEN sp.status = 'active' THEN sp.id END) AS active_plans,
  COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.id END) AS completed_plans,
  COALESCE(SUM(sps.duration_minutes), 0) AS total_planned_minutes
FROM 
  smart_plans sp
LEFT JOIN 
  smart_plan_sessions sps ON sp.id = sps.plan_id
GROUP BY 
  sp.user_id;

-- =====================================================
-- 3. Corrigir views relacionadas a faculdades
-- =====================================================

-- Corrigir faculty_events_with_creator
DROP VIEW IF EXISTS public.faculty_events_with_creator CASCADE;
CREATE OR REPLACE VIEW public.faculty_events_with_creator AS
SELECT 
  fe.*,
  u.email,
  p.username,
  p.full_name as name,
  p.avatar_url
FROM 
  public.faculty_events fe
JOIN 
  auth.users u ON fe.creator_id = u.id
LEFT JOIN
  public.profiles p ON u.id = p.id;

-- Corrigir faculty_members_view
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

-- Conceder permissões para as views
GRANT SELECT ON public.flashcard_user_stats TO authenticated;
GRANT SELECT ON public.flashcard_deck_stats TO authenticated;
GRANT SELECT ON public.flashcard_decks_view TO authenticated;
GRANT SELECT ON public.view_plan_session_stats TO authenticated;
GRANT SELECT ON public.view_smart_plan_discipline_stats TO authenticated;
GRANT SELECT ON public.view_smart_plans TO authenticated;
GRANT SELECT ON public.view_smart_plan_sessions TO authenticated;
GRANT SELECT ON public.view_smart_plan_sessions_by_day TO authenticated;
GRANT SELECT ON public.view_smart_plan_daily_sessions TO authenticated;
GRANT SELECT ON public.view_smart_plans_basic TO authenticated;
GRANT SELECT ON public.view_user_plan_stats TO authenticated;
GRANT SELECT ON public.faculty_events_with_creator TO authenticated;
GRANT SELECT ON public.faculty_events_with_creator TO anon;
GRANT SELECT ON public.faculty_members_view TO authenticated;

-- Verificar se ainda existem views com SECURITY DEFINER
DO $$
DECLARE
    view_record RECORD;
    view_count INTEGER := 0;
BEGIN
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE definition ILIKE '%SECURITY DEFINER%' 
        AND schemaname = 'public'
    LOOP
        RAISE WARNING 'View ainda usa SECURITY DEFINER: %.%', view_record.schemaname, view_record.viewname;
        view_count := view_count + 1;
    END LOOP;
    
    IF view_count = 0 THEN
        RAISE NOTICE 'Sucesso: Nenhuma view pública usa SECURITY DEFINER';
    ELSE
        RAISE WARNING 'Atenção: % view(s) ainda usam SECURITY DEFINER', view_count;
    END IF;
END $$;