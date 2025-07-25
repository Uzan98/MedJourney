-- Correção de Segurança: flashcard_user_stats
-- Problema: View expõe dados do auth.users para usuários anônimos
-- Solução: Remover referência direta ao auth.users e usar apenas dados do usuário autenticado

-- Corrigir view flashcard_user_stats para não expor auth.users
DROP VIEW IF EXISTS public.flashcard_user_stats CASCADE;

CREATE OR REPLACE VIEW public.flashcard_user_stats AS
SELECT 
  auth.uid() AS user_id,
  COALESCE(c.total_cards, 0) AS total_cards,
  COALESCE(c.mastered_cards, 0) AS mastered_cards,
  COALESCE(c.cards_to_review, 0) AS cards_to_review,
  CASE
    WHEN COALESCE(c.total_cards, 0) = 0 THEN 0
    ELSE round(COALESCE(c.mastered_cards, 0)::numeric / COALESCE(c.total_cards, 1)::numeric * 100)
  END AS mastery_percentage,
  COALESCE(s.total_study_sessions, 0) AS total_study_sessions,
  COALESCE(s.total_study_time_minutes, 0) AS total_study_time_minutes,
  COALESCE(streak.study_streak_days, 0) AS study_streak_days
FROM (
  SELECT 
    flashcards.user_id,
    count(*) AS total_cards,
    count(*) FILTER (WHERE flashcards.mastery_level >= 80) AS mastered_cards,
    count(*) FILTER (WHERE flashcards.next_review <= now() OR flashcards.next_review IS NULL) AS cards_to_review
  FROM flashcards
  WHERE flashcards.user_id = auth.uid()
  GROUP BY flashcards.user_id
) c
FULL OUTER JOIN (
  SELECT 
    flashcard_study_sessions.user_id,
    count(*) AS total_study_sessions,
    COALESCE(round((sum(flashcard_study_sessions.duration_seconds) / 60)::double precision), 0) AS total_study_time_minutes
  FROM flashcard_study_sessions
  WHERE flashcard_study_sessions.end_time IS NOT NULL
    AND flashcard_study_sessions.user_id = auth.uid()
  GROUP BY flashcard_study_sessions.user_id
) s ON c.user_id = s.user_id
FULL OUTER JOIN (
  SELECT 
    flashcard_study_sessions.user_id,
    count(DISTINCT date_trunc('day', flashcard_study_sessions.created_at)) AS study_streak_days
  FROM flashcard_study_sessions
  WHERE flashcard_study_sessions.created_at >= (now() - interval '30 days')
    AND flashcard_study_sessions.user_id = auth.uid()
  GROUP BY flashcard_study_sessions.user_id
) streak ON c.user_id = streak.user_id
WHERE auth.uid() IS NOT NULL;

-- Garantir que apenas usuários autenticados possam acessar
GRANT SELECT ON public.flashcard_user_stats TO authenticated;
REVOKE ALL ON public.flashcard_user_stats FROM anon;

-- Comentários sobre a correção:
-- 1. Removida a referência direta à tabela auth.users
-- 2. Usado auth.uid() para obter apenas dados do usuário autenticado
-- 3. Adicionados filtros WHERE para garantir que apenas dados do usuário atual sejam retornados
-- 4. Revogado acesso para usuários anônimos
-- 5. Mantida a funcionalidade original da view mas com segurança aprimorada