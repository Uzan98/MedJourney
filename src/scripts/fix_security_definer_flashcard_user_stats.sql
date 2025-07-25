-- Correção de Segurança: Remover SECURITY DEFINER da view flashcard_user_stats
-- Problema: View flashcard_user_stats está definida com a propriedade SECURITY DEFINER
-- Solução: Recriar a view sem SECURITY DEFINER para usar as permissões do usuário que faz a consulta

-- Primeiro, vamos dropar a view existente
DROP VIEW IF EXISTS public.flashcard_user_stats CASCADE;

-- Recriar a view com SECURITY INVOKER explícito
-- Isso garante que a view use as permissões do usuário que faz a consulta, não do criador
CREATE OR REPLACE VIEW public.flashcard_user_stats
WITH (security_invoker=on) AS
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

-- Configurar permissões adequadas
-- Garantir que apenas usuários autenticados possam acessar
GRANT SELECT ON public.flashcard_user_stats TO authenticated;
REVOKE ALL ON public.flashcard_user_stats FROM anon;

-- Comentários sobre a correção:
-- 1. Removida a propriedade SECURITY DEFINER (views são SECURITY INVOKER por padrão)
-- 2. Mantida toda a lógica original da view
-- 3. A view agora usa as permissões do usuário que faz a consulta, não do criador
-- 4. Isso é mais seguro pois respeita as políticas RLS do usuário atual
-- 5. Mantidas as permissões adequadas (apenas authenticated, sem anon)