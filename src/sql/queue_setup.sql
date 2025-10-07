-- Setup de fila (emulação PGMQ) e tabela de resultados de jobs de flashcards
-- Execute este arquivo no SQL Editor do Supabase ou via script de setup

-- Tabela de mensagens de fila (emulação simples do PGMQ)
CREATE TABLE IF NOT EXISTS public.queue_messages (
  msg_id BIGSERIAL PRIMARY KEY,
  queue_name TEXT NOT NULL,
  message JSONB NOT NULL,
  visible_after TIMESTAMPTZ DEFAULT now(),
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para melhorar leitura por fila e visibilidade
CREATE INDEX IF NOT EXISTS idx_queue_messages_lookup
  ON public.queue_messages (queue_name, visible_after, archived);

-- Tabela para armazenar resultados de jobs de flashcards
CREATE TABLE IF NOT EXISTS public.flashcard_job_results (
  job_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','processing','completed','failed')),
  result_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Habilitar RLS para proteger dados por usuário
ALTER TABLE public.flashcard_job_results ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuário só vê e altera seus próprios resultados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'flashcard_job_results' AND polname = 'Usuários podem ver seus próprios resultados de jobs'
  ) THEN
    CREATE POLICY "Usuários podem ver seus próprios resultados de jobs"
      ON public.flashcard_job_results FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'flashcard_job_results' AND polname = 'Usuários podem inserir seus próprios resultados'
  ) THEN
    CREATE POLICY "Usuários podem inserir seus próprios resultados"
      ON public.flashcard_job_results FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'flashcard_job_results' AND polname = 'Usuários podem atualizar seus próprios resultados'
  ) THEN
    CREATE POLICY "Usuários podem atualizar seus próprios resultados"
      ON public.flashcard_job_results FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- Emulação das funções PGMQ: pgmq_send, pgmq_read, pgmq_delete, pgmq_archive
-- Observação: Estas funções simulam comportamento básico do PGMQ

CREATE OR REPLACE FUNCTION public.pgmq_send(queue_name TEXT, msg JSONB)
RETURNS BIGINT AS $$
DECLARE
  new_id BIGINT;
BEGIN
  SET search_path TO pg_temp, public;
  INSERT INTO public.queue_messages (queue_name, message)
  VALUES ($1, $2)
  RETURNING msg_id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.pgmq_send(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_send(TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.pgmq_read(queue_name TEXT, qty INTEGER, visibility_timeout INTEGER)
RETURNS TABLE(msg_id BIGINT, message TEXT) AS $$
DECLARE
  v_timeout INTERVAL := make_interval(secs => GREATEST($3, 0));
BEGIN
  SET search_path TO pg_temp, public;

  RETURN QUERY
  WITH selected AS (
    SELECT msg_id, message
    FROM public.queue_messages
    WHERE queue_name = $1
      AND archived = false
      AND visible_after <= now()
    ORDER BY msg_id
    LIMIT GREATEST($2, 0)
    FOR UPDATE
  )
  , updated AS (
    UPDATE public.queue_messages qm
    SET visible_after = now() + v_timeout
    WHERE qm.msg_id IN (SELECT msg_id FROM selected)
    RETURNING qm.msg_id
  )
  SELECT s.msg_id, s.message::TEXT FROM selected s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.pgmq_read(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_read(TEXT, INTEGER, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.pgmq_delete(queue_name TEXT, msg_id BIGINT)
RETURNS VOID AS $$
BEGIN
  SET search_path TO pg_temp, public;
  DELETE FROM public.queue_messages WHERE msg_id = $2 AND queue_name = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.pgmq_delete(TEXT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_delete(TEXT, BIGINT) TO service_role;

CREATE OR REPLACE FUNCTION public.pgmq_archive(queue_name TEXT, msg_id BIGINT)
RETURNS VOID AS $$
BEGIN
  SET search_path TO pg_temp, public;
  UPDATE public.queue_messages SET archived = true WHERE msg_id = $2 AND queue_name = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.pgmq_archive(TEXT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_archive(TEXT, BIGINT) TO service_role;

-- Fim do setup de fila

-- =====================================================
-- Integração com pg_net para acionar processamento via HTTP
-- =====================================================

-- Observação:
-- - Requer extensão pg_net instalada (Supabase já disponibiliza).
-- - As requisições são assíncronas; coletamos resposta consultando net._http_response.

-- Função para enviar POST ao endpoint interno de processamento da fila
CREATE OR REPLACE FUNCTION public.http_process_flashcard_queue()
RETURNS TABLE(request_id bigint) AS $$
DECLARE
  v_url text := COALESCE(current_setting('app.site_url', true), '') || '/api/queue/process';
  v_key text := COALESCE(current_setting('app.internal_queue_key', true), current_setting('app.internal_endpoint_key', true));
  v_headers jsonb := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-internal-key', COALESCE(v_key, 'default-internal-key')
  );
  v_body jsonb := jsonb_build_object('action', 'process-all');
  v_req_id bigint;
BEGIN
  IF v_url IS NULL OR v_url = '' THEN
    RAISE EXCEPTION 'Parâmetro app.site_url não configurado. Defina via: ALTER SYSTEM SET app.site_url=''https://seu-site'';';
  END IF;

  SELECT net.http_post(
    url := v_url,
    headers := v_headers,
    body := v_body
  ) INTO v_req_id;

  RETURN QUERY SELECT v_req_id::bigint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.http_process_flashcard_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.http_process_flashcard_queue() TO service_role;

-- Função para coletar resposta de uma requisição pg_net específica
CREATE OR REPLACE FUNCTION public.collect_queue_process_response(p_request_id bigint)
RETURNS TABLE(status int, response jsonb, created_at timestamptz) AS $$
BEGIN
  RETURN QUERY
  SELECT r.status, r.response::jsonb, r.created_at
  FROM net._http_response r
  WHERE r.id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.collect_queue_process_response(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.collect_queue_process_response(BIGINT) TO service_role;