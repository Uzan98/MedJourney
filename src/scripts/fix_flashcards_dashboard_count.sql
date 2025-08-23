-- Script para corrigir o problema de contagem de flashcards na dashboard
-- O problema está na inconsistência entre comparações de data no JavaScript e SQL

-- Corrigir a view flashcard_user_stats para usar NOW() em vez de CURRENT_DATE
-- para ser consistente com as comparações JavaScript que usam toISOString()
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
        -- CORRIGIDO: usar NOW() em vez de CURRENT_DATE para ser consistente com JavaScript
        COUNT(*) FILTER (WHERE next_review IS NULL OR next_review <= NOW()) as cards_to_review
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
    -- Cálculo simplificado de streak - pode ser melhorado com função específica
    SELECT 
        user_id,
        COUNT(DISTINCT DATE(start_time)) as study_streak_days
    FROM 
        public.flashcard_study_sessions
    WHERE 
        start_time >= NOW() - INTERVAL '30 days'
    GROUP BY 
        user_id
) streak ON u.id = streak.user_id;

-- Garantir que a view flashcard_decks_view também use NOW() consistentemente
CREATE OR REPLACE VIEW public.flashcard_decks_view AS
SELECT 
  d.*,
  d.id as deck_id,
  COALESCE((
    SELECT COUNT(*) 
    FROM flashcards f 
    WHERE f.deck_id = d.id
  ), 0) as card_count,
  COALESCE((
    SELECT ROUND(AVG(f.mastery_level)) 
    FROM flashcards f 
    WHERE f.deck_id = d.id
  ), 0) as mastery_level,
  COALESCE((
    SELECT COUNT(*) 
    FROM flashcards f 
    WHERE f.deck_id = d.id 
    -- CORRIGIDO: usar NOW() para ser consistente com JavaScript
    AND (f.next_review IS NULL OR f.next_review <= NOW())
  ), 0) as cards_due,
  COALESCE((
    SELECT COUNT(*) 
    FROM flashcards f 
    WHERE f.deck_id = d.id 
    AND f.mastery_level >= 80
  ), 0) as cards_mastered,
  COALESCE((
    SELECT COUNT(*) 
    FROM flashcard_study_sessions s 
    WHERE s.deck_id = d.id
  ), 0) as study_count,
  COALESCE(disc.name, '') as discipline_name,
  COALESCE(subj.name, '') as subject_name
FROM 
  flashcard_decks d
LEFT JOIN 
  disciplines disc ON d.discipline_id = disc.id
LEFT JOIN 
  subjects subj ON d.subject_id = subj.id;

-- Adicionar índices para melhorar performance das consultas de flashcards
-- Índice para consultas por deck_id e next_review
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_next_review 
ON public.flashcards (deck_id, next_review) 
WHERE next_review IS NOT NULL;

-- Índice para consultas por user_id e next_review
CREATE INDEX IF NOT EXISTS idx_flashcards_user_next_review 
ON public.flashcards (user_id, next_review) 
WHERE next_review IS NOT NULL;

-- Índice para consultas por deck_id e mastery_level
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_mastery 
ON public.flashcards (deck_id, mastery_level);

-- Comentário explicativo sobre o problema corrigido:
-- O problema estava na inconsistência entre:
-- 1. JavaScript: new Date().toISOString() (inclui horário)
-- 2. SQL: CURRENT_DATE (apenas data)
-- 
-- Agora todas as comparações usam NOW() que inclui horário,
-- sendo consistente com o JavaScript que usa toISOString()