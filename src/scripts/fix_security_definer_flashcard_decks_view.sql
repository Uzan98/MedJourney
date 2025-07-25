-- Correção de Segurança: Remover SECURITY DEFINER da view flashcard_decks_view
-- Problema: View flashcard_decks_view está definida com a propriedade SECURITY DEFINER
-- Solução: Recriar a view com SECURITY INVOKER para usar as permissões do usuário que faz a consulta

-- Primeiro, vamos dropar a view existente
DROP VIEW IF EXISTS public.flashcard_decks_view CASCADE;

-- Recriar a view com SECURITY INVOKER explícito
-- Isso garante que a view use as permissões do usuário que faz a consulta, não do criador
CREATE OR REPLACE VIEW public.flashcard_decks_view
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
  d.id AS deck_id,
  COALESCE((
    SELECT count(*) AS count
    FROM flashcards f
    WHERE f.deck_id = d.id
  ), 0::bigint) AS card_count,
  COALESCE((
    SELECT round(avg(f.mastery_level)) AS round
    FROM flashcards f
    WHERE f.deck_id = d.id
  ), 0::numeric) AS mastery_level,
  COALESCE((
    SELECT count(*) AS count
    FROM flashcards f
    WHERE f.deck_id = d.id AND (f.next_review IS NULL OR f.next_review <= now())
  ), 0::bigint) AS cards_due,
  COALESCE((
    SELECT count(*) AS count
    FROM flashcards f
    WHERE f.deck_id = d.id AND f.mastery_level >= 80
  ), 0::bigint) AS cards_mastered,
  COALESCE((
    SELECT count(*) AS count
    FROM flashcard_study_sessions s
    WHERE s.deck_id = d.id
  ), 0::bigint) AS study_count,
  COALESCE(disc.name, ''::text) AS discipline_name,
  COALESCE(subj.name, ''::character varying) AS subject_name
FROM flashcard_decks d
  LEFT JOIN disciplines disc ON d.discipline_id = disc.id
  LEFT JOIN subjects subj ON d.subject_id = subj.id;

-- Configurar permissões adequadas
-- Garantir que apenas usuários autenticados possam acessar
GRANT SELECT ON public.flashcard_decks_view TO authenticated;
REVOKE ALL ON public.flashcard_decks_view FROM anon;

-- Comentários sobre a correção:
-- 1. Removida a propriedade SECURITY DEFINER usando WITH (security_invoker=on)
-- 2. Mantida toda a lógica original da view
-- 3. A view agora usa as permissões do usuário que faz a consulta, não do criador
-- 4. Isso é mais seguro pois respeita as políticas RLS do usuário atual
-- 5. Mantidas as permissões adequadas (apenas authenticated, sem anon)
-- 6. A view mostra informações detalhadas dos decks de flashcards incluindo estatísticas de cartas, maestria e sessões de estudo