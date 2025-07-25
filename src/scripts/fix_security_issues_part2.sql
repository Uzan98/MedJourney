-- Script para corrigir problemas de segurança restantes após a primeira correção
-- Este script resolve os problemas identificados pelos advisors de segurança

-- =====================================================
-- PROBLEMA 1: faculty_events_with_creator ainda expõe auth.users e tem SECURITY DEFINER
-- =====================================================

-- Remover a view que ainda expõe auth.users
DROP VIEW IF EXISTS public.faculty_events_with_creator CASCADE;

-- Recriar a view de forma completamente segura sem SECURITY DEFINER
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

-- Corrigir flashcard_user_stats
DROP VIEW IF EXISTS public.flashcard_user_stats CASCADE;
CREATE OR REPLACE VIEW public.flashcard_user_stats AS
SELECT 
    user_id,
    COUNT(*) as total_cards,
    SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END) as correct_answers,
    SUM(CASE WHEN result = 'incorrect' THEN 1 ELSE 0 END) as incorrect_answers,
    ROUND(SUM(CASE WHEN result = 'correct' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as accuracy_percentage
FROM 
    public.flashcard_reviews
GROUP BY 
    user_id;

-- Corrigir view_smart_plans_basic
DROP VIEW IF EXISTS public.view_smart_plans_basic CASCADE;
CREATE OR REPLACE VIEW public.view_smart_plans_basic AS
SELECT 
    id,
    name,
    description,
    start_date,
    end_date,
    user_id,
    created_at,
    updated_at,
    status,
    total_hours
FROM 
    public.smart_plans;

-- Corrigir view_smart_plan_sessions_by_day
DROP VIEW IF EXISTS public.view_smart_plan_sessions_by_day CASCADE;
CREATE OR REPLACE VIEW public.view_smart_plan_sessions_by_day AS
SELECT 
    plan_id,
    discipline_id,
    DATE(created_at) as session_date,
    SUM(duration_minutes) as total_minutes
FROM 
    public.smart_plan_sessions
GROUP BY 
    plan_id, discipline_id, DATE(created_at);

-- Corrigir view_smart_plan_daily_sessions
DROP VIEW IF EXISTS public.view_smart_plan_daily_sessions CASCADE;
CREATE OR REPLACE VIEW public.view_smart_plan_daily_sessions AS
SELECT 
    sps.user_id,
    DATE(sps.created_at) as session_date,
    SUM(sps.duration_minutes) as total_minutes,
    COUNT(DISTINCT sps.discipline_id) as disciplines_count,
    COUNT(*) as sessions_count
FROM 
    public.smart_plan_sessions sps
GROUP BY 
    sps.user_id, DATE(sps.created_at);

-- Corrigir flashcard_deck_stats
DROP VIEW IF EXISTS public.flashcard_deck_stats CASCADE;
CREATE OR REPLACE VIEW public.flashcard_deck_stats AS
SELECT 
    f.deck_id,
    COUNT(DISTINCT fr.id) as total_cards,
    SUM(CASE WHEN fr.result = 'correct' THEN 1 ELSE 0 END) as correct_answers,
    SUM(CASE WHEN fr.result = 'incorrect' THEN 1 ELSE 0 END) as incorrect_answers,
    ROUND(SUM(CASE WHEN fr.result = 'correct' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(DISTINCT fr.id), 0) * 100, 2) as accuracy_percentage
FROM 
    public.flashcard_reviews fr
JOIN
    public.flashcards f ON fr.card_id = f.id
GROUP BY 
    f.deck_id;

-- Corrigir flashcard_decks_view
DROP VIEW IF EXISTS public.flashcard_decks_view CASCADE;
CREATE OR REPLACE VIEW public.flashcard_decks_view AS
SELECT 
    fd.*,
    COUNT(fc.id) as card_count
FROM 
    public.flashcard_decks fd
LEFT JOIN 
    public.flashcards fc ON fd.id = fc.deck_id
GROUP BY 
    fd.id;

-- Corrigir view_user_plan_stats
DROP VIEW IF EXISTS public.view_user_plan_stats CASCADE;
CREATE OR REPLACE VIEW public.view_user_plan_stats AS
SELECT 
    sp.user_id,
    COUNT(DISTINCT sp.id) as total_plans,
    COUNT(DISTINCT sps.discipline_id) as total_disciplines,
    COALESCE(SUM(sps.duration_minutes), 0) as total_minutes_studied,
    COUNT(DISTINCT sps.id) as total_sessions
FROM 
    public.smart_plans sp
LEFT JOIN 
    public.smart_plan_sessions sps ON sp.id = sps.plan_id
GROUP BY 
    sp.user_id;

-- Corrigir faculty_members_view
DROP VIEW IF EXISTS public.faculty_members_view CASCADE;
CREATE OR REPLACE VIEW public.faculty_members_view AS
SELECT 
    fm.*,
    p.full_name,
    p.avatar_url
FROM 
    public.faculty_members fm
LEFT JOIN 
    public.profiles p ON fm.user_id = p.id;

-- Conceder permissões para as views corrigidas
GRANT SELECT ON public.flashcard_user_stats TO authenticated;
GRANT SELECT ON public.view_smart_plans_basic TO authenticated;
GRANT SELECT ON public.view_smart_plan_sessions_by_day TO authenticated;
GRANT SELECT ON public.view_smart_plan_daily_sessions TO authenticated;
GRANT SELECT ON public.flashcard_deck_stats TO authenticated;
GRANT SELECT ON public.flashcard_decks_view TO authenticated;
GRANT SELECT ON public.view_user_plan_stats TO authenticated;
GRANT SELECT ON public.faculty_members_view TO authenticated;

-- =====================================================
-- PROBLEMA 4: Tabelas com RLS habilitado mas sem políticas
-- =====================================================

-- Adicionar políticas para faculty_comments
CREATE POLICY "Usuários podem ver todos os comentários" ON public.faculty_comments
    FOR SELECT
    USING (true);

CREATE POLICY "Usuários podem inserir seus próprios comentários" ON public.faculty_comments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios comentários" ON public.faculty_comments
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir seus próprios comentários" ON public.faculty_comments
    FOR DELETE
    USING (auth.uid() = user_id);

-- Adicionar políticas para faculty_forum_tags
CREATE POLICY "Todos podem ver tags do fórum" ON public.faculty_forum_tags
    FOR SELECT
    USING (true);

CREATE POLICY "Administradores podem gerenciar tags do fórum" ON public.faculty_forum_tags
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

-- Adicionar políticas para faculty_forum_topic_tags
CREATE POLICY "Todos podem ver associações de tags com tópicos" ON public.faculty_forum_topic_tags
    FOR SELECT
    USING (true);

CREATE POLICY "Usuários podem gerenciar tags em seus próprios tópicos" ON public.faculty_forum_topic_tags
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.faculty_forum_topics
        WHERE faculty_forum_topics.id = public.faculty_forum_topic_tags.topic_id
        AND faculty_forum_topics.user_id = auth.uid()
    ));

CREATE POLICY "Administradores podem gerenciar todas as associações de tags" ON public.faculty_forum_topic_tags
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ));

-- Adicionar políticas para faculty_forum_votes
CREATE POLICY "Todos podem ver votos" ON public.faculty_forum_votes
    FOR SELECT
    USING (true);

CREATE POLICY "Usuários podem gerenciar seus próprios votos" ON public.faculty_forum_votes
    FOR ALL
    USING (auth.uid() = user_id);

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
    AND tablename IN ('dashboard_carousel', 'faculty_comments', 'faculty_forum_tags', 'faculty_forum_topic_tags', 'faculty_forum_votes');

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

RAISE NOTICE 'Script de correção de problemas de segurança adicionais executado com sucesso!';
RAISE NOTICE 'Problemas corrigidos:';
RAISE NOTICE '1. faculty_events_with_creator recriada sem SECURITY DEFINER e sem expor auth.users';
RAISE NOTICE '2. RLS habilitado na tabela dashboard_carousel';
RAISE NOTICE '3. Removido SECURITY DEFINER desnecessário de várias views';
RAISE NOTICE '4. Adicionadas políticas RLS para tabelas que tinham RLS habilitado mas sem políticas';
RAISE NOTICE 'Execute novamente os advisors para verificar se todos os problemas foram resolvidos.';