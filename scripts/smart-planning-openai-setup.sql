-- Função que usa a API do OpenAI para gerar um plano inteligente
-- Nota: Esta função requer a extensão pg_net e configuração de variáveis de ambiente no Supabase
CREATE OR REPLACE FUNCTION generate_smart_plan(
  plan_id BIGINT,
  api_key TEXT DEFAULT NULL -- Pode ser passado diretamente ou usar variável de ambiente
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  plan_data JSONB;
  openai_key TEXT;
  openai_response JSONB;
  openai_headers JSONB;
  openai_url TEXT := 'https://api.openai.com/v1/chat/completions';
  response_data JSONB;
  plan_record RECORD;
  user_id UUID;
  response_code INT;
  http_response_status INT;
BEGIN
  -- Obter dados do plano
  SELECT 
    p.id, 
    p.name, 
    p.user_id, 
    p.start_date, 
    p.end_date, 
    p.settings, 
    COALESCE(p.status, 'draft') as status,
    ARRAY_AGG(DISTINCT d.id) as discipline_ids,
    ARRAY_AGG(DISTINCT d.name) as discipline_names
  INTO plan_record
  FROM smart_plans p
  LEFT JOIN LATERAL (
    SELECT d.id, d.name
    FROM disciplines d
    WHERE d.id = ANY(CAST(p.settings->'selectedDisciplines' AS INT[]))
  ) d ON TRUE
  WHERE p.id = plan_id
  GROUP BY p.id;
  
  -- Verificar se o plano existe e pertence ao usuário
  IF plan_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Plano não encontrado'
    );
  END IF;
  
  user_id := plan_record.user_id;
  
  -- Obter a chave API (da função ou variável de ambiente)
  IF api_key IS NOT NULL THEN
    openai_key := api_key;
  ELSE
    openai_key := current_setting('app.openai_key', true);
  END IF;
  
  -- Verificar se temos uma chave API
  IF openai_key IS NULL OR openai_key = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Chave OpenAI não configurada'
    );
  END IF;
  
  -- Construir o payload para a API OpenAI
  plan_data := jsonb_build_object(
    'model', 'gpt-4', -- ou 'gpt-3.5-turbo' para menor custo
    'messages', jsonb_build_array(
      jsonb_build_object(
        'role', 'system',
        'content', 'Você é um assistente de planejamento de estudos médicos. Sua tarefa é criar um plano de estudos otimizado com base nas disciplinas selecionadas, tempo disponível e período de estudos.'
      ),
      jsonb_build_object(
        'role', 'user',
        'content', format(
          'Crie um plano de estudos para as seguintes disciplinas: %s. O período de estudo é de %s a %s. O usuário tem disponibilidade diária de aproximadamente %s minutos. A estratégia de balanceamento é: %s. Inclua revisões: %s. Gere sessões de estudo equilibradas em formato JSON.',
          array_to_string(plan_record.discipline_names, ', '),
          plan_record.start_date,
          plan_record.end_date,
          COALESCE(plan_record.settings->>'averageDailyMinutes', '120'),
          COALESCE(plan_record.settings->>'balanceStrategy', 'balanced'),
          CASE WHEN COALESCE((plan_record.settings->>'revisionsEnabled')::boolean, true) THEN 'sim' ELSE 'não' END
        )
      )
    ),
    'temperature', 0.7,
    'max_tokens', 4000
  );
  
  -- Configurar cabeçalhos
  openai_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', format('Bearer %s', openai_key)
  );
  
  -- Chamar a API OpenAI usando pg_net
  SELECT
    status, 
    CASE 
      WHEN status < 300 THEN content::jsonb
      ELSE jsonb_build_object('error', content)
    END
  INTO http_response_status, response_data
  FROM net.http_post(
    url := openai_url,
    headers := openai_headers,
    body := plan_data
  ) AS t;
  
  -- Processo de resposta da API
  IF http_response_status >= 300 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Erro na API OpenAI: %s', (response_data->'error')::text),
      'status_code', http_response_status
    );
  END IF;
  
  -- Processar a resposta do OpenAI para extrair as sessões
  openai_response := response_data->'choices'->0->'message'->'content';
  
  -- Atualizar o status do plano para 'processing'
  UPDATE smart_plans 
  SET status = 'processing',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = plan_id;
  
  -- Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'plan_id', plan_id,
    'response', openai_response
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Função para processar a resposta da API OpenAI e criar as sessões do plano
CREATE OR REPLACE FUNCTION process_smart_plan_response(
  plan_id BIGINT,
  response_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sessions_json JSONB;
  session_record RECORD;
  plan_record RECORD;
  user_id UUID;
  total_sessions INT := 0;
  successful_sessions INT := 0;
  discipline_mapping JSONB := '{}'::JSONB;
  session_ids BIGINT[] := '{}'::BIGINT[];
BEGIN
  -- Obter dados do plano
  SELECT p.id, p.user_id, p.status 
  INTO plan_record
  FROM smart_plans p
  WHERE p.id = plan_id;
  
  -- Verificar se o plano existe
  IF plan_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Plano não encontrado'
    );
  END IF;
  
  user_id := plan_record.user_id;
  
  -- Verificar se o plano está em processamento
  IF plan_record.status <> 'processing' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Status do plano inválido: %s. Esperado: processing', plan_record.status)
    );
  END IF;
  
  -- Tentar extrair JSON da resposta
  BEGIN
    -- Tenta extrair JSON da resposta (considerando que pode ter texto ao redor)
    sessions_json := regexp_replace(
      response_text,
      '.*?(\\[\\s*\\{.*\\}\\s*\\]).*',
      '\\1',
      'gs'
    )::JSONB;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Não foi possível extrair JSON válido da resposta',
      'detail', SQLERRM
    );
  END;
  
  -- Construir mapeamento de nomes de disciplinas para IDs
  SELECT 
    jsonb_object_agg(LOWER(d.name), d.id) 
  INTO discipline_mapping
  FROM disciplines d
  WHERE d.user_id = user_id;

  -- Limpar sessões existentes
  DELETE FROM smart_plan_sessions WHERE plan_id = plan_id;
  
  -- Inserir sessões de estudo
  FOR session_record IN 
    SELECT 
      value->>'title' AS title,
      value->>'date' AS session_date,
      value->>'start_time' AS start_time,
      value->>'end_time' AS end_time,
      value->>'duration_minutes' AS duration_minutes,
      value->>'discipline' AS discipline_name,
      COALESCE((value->>'is_revision')::boolean, false) AS is_revision
    FROM jsonb_array_elements(sessions_json)
  LOOP
    total_sessions := total_sessions + 1;
    
    BEGIN
      WITH inserted_session AS (
        INSERT INTO smart_plan_sessions (
          plan_id,
          title,
          discipline_id,
          date,
          start_time,
          end_time,
          duration_minutes,
          is_revision
        )
        VALUES (
          plan_id,
          session_record.title,
          discipline_mapping->LOWER(session_record.discipline_name),
          session_record.session_date::date,
          session_record.start_time::time,
          session_record.end_time::time,
          session_record.duration_minutes::int,
          session_record.is_revision
        )
        RETURNING id
      )
      SELECT id FROM inserted_session INTO session_ids;
      
      successful_sessions := successful_sessions + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but continue processing
      RAISE NOTICE 'Error inserting session: % - %', SQLERRM, session_record;
    END;
  END LOOP;
  
  -- Atualizar o status do plano para 'active'
  UPDATE smart_plans 
  SET status = 'active',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = plan_id;
  
  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'plan_id', plan_id,
    'total_sessions', total_sessions,
    'successful_sessions', successful_sessions,
    'session_ids', session_ids
  );
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro, marcar o plano como 'error'
  UPDATE smart_plans 
  SET status = 'error',
      updated_at = CURRENT_TIMESTAMP
  WHERE id = plan_id;
  
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Criar políticas de segurança para as funções
REVOKE ALL ON FUNCTION generate_smart_plan(BIGINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generate_smart_plan(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_smart_plan(BIGINT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION process_smart_plan_response(BIGINT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_smart_plan_response(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_smart_plan_response(BIGINT, TEXT) TO service_role; 