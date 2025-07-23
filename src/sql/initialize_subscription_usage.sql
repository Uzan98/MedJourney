-- Inicializa a tabela subscription_usage para usuários existentes
-- Primeiro, identifica todos os usuários que têm questões mas não têm registro em subscription_usage
WITH users_with_questions AS (
  SELECT DISTINCT user_id
  FROM questions
  WHERE user_id IS NOT NULL
)
INSERT INTO subscription_usage (
  user_id,
  disciplines_count,
  subjects_per_discipline_count,
  study_sessions_today,
  flashcard_decks_count,
  flashcards_per_deck_count,
  questions_used_week,
  questions_used_today,
  simulados_created_week,
  simulados_questions_count,
  study_groups_created,
  faculty_groups_created,
  last_usage_date,
  last_week_reset,
  created_at,
  updated_at
)
SELECT 
  uwq.user_id,
  0 AS disciplines_count,
  0 AS subjects_per_discipline_count,
  0 AS study_sessions_today,
  0 AS flashcard_decks_count,
  0 AS flashcards_per_deck_count,
  COUNT(q.id) AS questions_used_week,
  COUNT(q.id) AS questions_used_today,
  0 AS simulados_created_week,
  0 AS simulados_questions_count,
  0 AS study_groups_created,
  0 AS faculty_groups_created,
  CURRENT_DATE AS last_usage_date,
  CURRENT_DATE AS last_week_reset,
  NOW() AS created_at,
  NOW() AS updated_at
FROM users_with_questions uwq
LEFT JOIN subscription_usage su ON uwq.user_id = su.user_id
JOIN questions q ON uwq.user_id = q.user_id
WHERE su.user_id IS NULL
GROUP BY uwq.user_id
ON CONFLICT (user_id) DO NOTHING;

-- Inicializa a tabela subscription_usage para todos os usuários autenticados que não têm registro
INSERT INTO subscription_usage (
  user_id,
  disciplines_count,
  subjects_per_discipline_count,
  study_sessions_today,
  flashcard_decks_count,
  flashcards_per_deck_count,
  questions_used_week,
  questions_used_today,
  simulados_created_week,
  simulados_questions_count,
  study_groups_created,
  faculty_groups_created,
  last_usage_date,
  last_week_reset,
  created_at,
  updated_at
)
SELECT 
  au.id AS user_id,
  0 AS disciplines_count,
  0 AS subjects_per_discipline_count,
  0 AS study_sessions_today,
  0 AS flashcard_decks_count,
  0 AS flashcards_per_deck_count,
  0 AS questions_used_week,
  0 AS questions_used_today,
  0 AS simulados_created_week,
  0 AS simulados_questions_count,
  0 AS study_groups_created,
  0 AS faculty_groups_created,
  CURRENT_DATE AS last_usage_date,
  CURRENT_DATE AS last_week_reset,
  NOW() AS created_at,
  NOW() AS updated_at
FROM auth.users au
LEFT JOIN subscription_usage su ON au.id = su.user_id
WHERE su.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING; 