-- Correção de Segurança: Remover SECURITY DEFINER da view flashcard_deck_stats
-- Problema: View flashcard_deck_stats está definida com a propriedade SECURITY DEFINER
-- Solução: Recriar a view com SECURITY INVOKER para usar as permissões do usuário que faz a consulta

-- Primeiro, vamos dropar a view existente
DROP VIEW IF EXISTS public.flashcard_deck_stats CASCADE;

-- Recriar a view com SECURITY INVOKER explícito
-- Isso garante que a view use as permissões do usuário que faz a consulta, não do criador
CREATE OR REPLACE VIEW public.flashcard_deck_stats
WITH (security_invoker=on) AS
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
  COALESCE(s.discipline_name, ''::text) AS discipline_name,
  COALESCE(s.subject_name, ''::character varying) AS subject_name,
  COALESCE(c.card_count, 0::bigint) AS card_count,
  COALESCE(c.mastery_average, 0::numeric) AS mastery_average,
  COALESCE(ss.study_count, 0::bigint) AS study_count
FROM flashcard_decks d
  LEFT JOIN (
    SELECT 
      flashcards.deck_id,
      count(*) AS card_count,
      round(avg(flashcards.mastery_level)) AS mastery_average
    FROM flashcards
    GROUP BY flashcards.deck_id
  ) c ON d.id = c.deck_id
  LEFT JOIN (
    SELECT 
      flashcard_study_sessions.deck_id,
      count(*) AS study_count
    FROM flashcard_study_sessions
    WHERE flashcard_study_sessions.end_time IS NOT NULL
    GROUP BY flashcard_study_sessions.deck_id
  ) ss ON d.id = ss.deck_id
  LEFT JOIN (
    SELECT 
      d_1.id AS discipline_id,
      d_1.name AS discipline_name,
      s_1.id AS subject_id,
      s_1.name AS subject_name
    FROM disciplines d_1
      LEFT JOIN subjects s_1 ON d_1.id = s_1.discipline_id
  ) s ON d.discipline_id = s.discipline_id AND (d.subject_id = s.subject_id OR d.subject_id IS NULL);

-- Configurar permissões adequadas
-- Garantir que apenas usuários autenticados possam acessar
GRANT SELECT ON public.flashcard_deck_stats TO authenticated;
REVOKE ALL ON public.flashcard_deck_stats FROM anon;

-- Comentários sobre a correção:
-- 1. Removida a propriedade SECURITY DEFINER usando WITH (security_invoker=on)
-- 2. Mantida toda a lógica original da view
-- 3. A view agora usa as permissões do usuário que faz a consulta, não do criador
-- 4. Isso é mais seguro pois respeita as políticas RLS do usuário atual
-- 5. Mantidas as permissões adequadas (apenas authenticated, sem anon)
-- 6. A view mostra estatísticas dos decks de flashcards com contagem de cartas, nível de maestria e sessões de estudo