-- Finalizar todas as sessões de estudo abertas
UPDATE flashcard_study_sessions
SET 
  end_time = NOW(),
  cards_studied = 0,
  duration_seconds = 0
WHERE end_time IS NULL;

-- Criar uma view para mostrar estatísticas corretas dos decks
DROP VIEW IF EXISTS flashcard_decks_view;

CREATE OR REPLACE VIEW flashcard_decks_view AS
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

-- Corrige a view de estatísticas de usuário para calcular corretamente os cartões para revisão
CREATE OR REPLACE VIEW public.flashcard_user_stats AS
SELECT 
    u.id as user_id,
    COALESCE(c.total_cards, 0) as total_cards,
    COALESCE(c.mastered_cards, 0) as mastered_cards,
    COALESCE(c.cards_to_review, 0) as cards_to_review,
    -- Calcula a média de domínio de todos os cartões, não apenas os "dominados"
    COALESCE(c.avg_mastery_level, 0)::numeric as mastery_percentage,
    COALESCE(s.total_study_sessions, 0) as total_study_sessions,
    COALESCE(s.total_study_time_minutes, 0)::bigint as total_study_time_minutes,
    COALESCE(streak.study_streak_days, 0) as study_streak_days
FROM 
    auth.users u
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_cards,
        COUNT(*) FILTER (WHERE mastery_level >= 80) as mastered_cards,
        -- Corrigido: conta cartões sem data de revisão ou com data menor ou igual a hoje
        COUNT(*) FILTER (
            WHERE next_review IS NULL OR next_review <= CURRENT_DATE
        ) as cards_to_review,
        -- Adicionado: calcula a média de nível de domínio de todos os cartões
        ROUND(AVG(mastery_level)) as avg_mastery_level
    FROM 
        public.flashcards
    GROUP BY 
        user_id
) c ON u.id = c.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_study_sessions,
        COALESCE(SUM(duration_seconds) / 60, 0)::bigint as total_study_time_minutes
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
        start_time >= now() - INTERVAL '30 days'
    GROUP BY 
        user_id
) streak ON u.id = streak.user_id; 