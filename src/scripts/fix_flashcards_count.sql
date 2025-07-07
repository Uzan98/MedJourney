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