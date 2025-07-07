-- Script para corrigir a view flashcard_deck_stats
-- Recria a view garantindo que todas as colunas necessárias estejam presentes

DROP VIEW IF EXISTS public.flashcard_deck_stats;

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