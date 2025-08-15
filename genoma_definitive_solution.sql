-- SOLUÇÃO DEFINITIVA PARA ALTERNATIVAS DO GENOMA BANK
-- Este script resolve o problema das alternativas ausentes de forma permanente
-- Corrige questões existentes E garante que futuras questões sejam processadas automaticamente

-- =====================================================
-- PARTE 1: FUNÇÕES AUXILIARES MELHORADAS
-- =====================================================

-- Função melhorada para extrair alternativas do conteúdo
CREATE OR REPLACE FUNCTION extract_alternatives_from_content_v2(content TEXT)
RETURNS JSONB AS $$
DECLARE
    alternatives JSONB := '[]'::JSONB;
    alt_text TEXT;
    counter INTEGER := 0;
    lines TEXT[];
    line TEXT;
    clean_line TEXT;
BEGIN
    -- Retorna vazio se content for nulo ou vazio
    IF content IS NULL OR trim(content) = '' THEN
        RETURN alternatives;
    END IF;
    
    -- Divide o conteúdo por linhas
    lines := string_to_array(content, E'\n');
    
    -- Procura por padrões como "A)", "B)", "C)", "D)", "E)" ou "a)", "b)", etc.
    FOREACH line IN ARRAY lines
    LOOP
        clean_line := trim(line);
        
        -- Verifica padrões de alternativas mais flexíveis
        IF clean_line ~ '^[A-Ea-e]\)\s*\S+' OR clean_line ~ '^[A-Ea-e]\s*-\s*\S+' OR clean_line ~ '^[A-Ea-e]\.\s*\S+' THEN
            -- Extrai o texto da alternativa (remove a letra e símbolos)
            alt_text := trim(regexp_replace(clean_line, '^[A-Ea-e][\)\-\.]\s*', ''));
            
            IF alt_text != '' AND length(alt_text) > 2 THEN
                counter := counter + 1;
                alternatives := alternatives || jsonb_build_object(
                    'id', counter,
                    'text', alt_text,
                    'letter', upper(substring(clean_line from '^([A-Ea-e])'))
                );
            END IF;
        END IF;
    END LOOP;
    
    RETURN alternatives;
END;
$$ LANGUAGE plpgsql;

-- Função melhorada para inserir alternativas
CREATE OR REPLACE FUNCTION insert_question_alternatives_v2(
    p_question_id BIGINT,
    p_alternatives JSONB,
    p_correct_answer TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    alt JSONB;
    is_correct BOOLEAN;
    inserted_count INTEGER := 0;
BEGIN
    -- Remove alternativas existentes para esta questão
    DELETE FROM answer_options WHERE question_id = p_question_id;
    
    -- Insere novas alternativas
    FOR alt IN SELECT * FROM jsonb_array_elements(p_alternatives)
    LOOP
        -- Determina se esta alternativa é a correta
        is_correct := FALSE;
        IF p_correct_answer IS NOT NULL AND p_correct_answer != '' THEN
            is_correct := (alt->>'letter' = upper(trim(p_correct_answer)));
        END IF;
        
        INSERT INTO answer_options (id, question_id, text, is_correct, created_at, updated_at)
        VALUES (
            nextval('answer_options_id_seq'),
            p_question_id,
            alt->>'text',
            is_correct,
            NOW(),
            NOW()
        );
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 2: CORREÇÃO DAS QUESTÕES EXISTENTES
-- =====================================================

DO $$
DECLARE
    question_record RECORD;
    extracted_alternatives JSONB;
    inserted_count INTEGER;
    total_fixed INTEGER := 0;
BEGIN
    RAISE NOTICE 'Iniciando correção das questões existentes do genoma bank...';
    
    -- Processa cada questão do genoma bank que não tem alternativas
    FOR question_record IN
        SELECT q.id, q.content, q.correct_answer
        FROM questions q
        LEFT JOIN answer_options ao ON q.id = ao.question_id
        WHERE q.from_genoma_bank = true
        AND ao.question_id IS NULL
    LOOP
        -- Extrai alternativas do conteúdo
        extracted_alternatives := extract_alternatives_from_content_v2(question_record.content);
        
        -- Só insere se encontrou alternativas
        IF jsonb_array_length(extracted_alternatives) > 0 THEN
            inserted_count := insert_question_alternatives_v2(
                question_record.id,
                extracted_alternatives,
                question_record.correct_answer
            );
            
            total_fixed := total_fixed + 1;
            RAISE NOTICE 'Questão % corrigida: % alternativas inseridas', 
                question_record.id, inserted_count;
        ELSE
            RAISE WARNING 'Questão % não pôde ser corrigida: nenhuma alternativa encontrada no conteúdo', 
                question_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Correção concluída: % questões corrigidas', total_fixed;
END;
$$;

-- =====================================================
-- PARTE 3: SISTEMA PARA FUTURAS IMPORTAÇÕES
-- =====================================================

-- Remove triggers antigos
DROP TRIGGER IF EXISTS trigger_process_genoma_questions ON questions;
DROP TRIGGER IF EXISTS trigger_process_new_genoma_questions ON questions;

-- Função de trigger melhorada para futuras questões
CREATE OR REPLACE FUNCTION process_genoma_questions_trigger_v2()
RETURNS TRIGGER AS $$
DECLARE
    extracted_alternatives JSONB;
    inserted_count INTEGER;
BEGIN
    -- Processa apenas questões do genoma bank
    IF NEW.from_genoma_bank = true THEN
        -- Extrai alternativas do conteúdo
        extracted_alternatives := extract_alternatives_from_content_v2(NEW.content);
        
        -- Insere alternativas se encontradas
        IF jsonb_array_length(extracted_alternatives) > 0 THEN
            -- Usa PERFORM para executar a função sem retornar valor
            SELECT insert_question_alternatives_v2(
                NEW.id,
                extracted_alternatives,
                NEW.correct_answer
            ) INTO inserted_count;
            
            RAISE NOTICE 'Questão genoma % processada automaticamente: % alternativas inseridas', 
                NEW.id, inserted_count;
        ELSE
            RAISE WARNING 'Questão genoma % inserida sem alternativas no conteúdo', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria o trigger definitivo
CREATE TRIGGER trigger_process_genoma_questions_v2
    AFTER INSERT ON questions
    FOR EACH ROW
    WHEN (NEW.from_genoma_bank = true)
    EXECUTE FUNCTION process_genoma_questions_trigger_v2();

-- =====================================================
-- PARTE 4: FUNÇÃO DE TESTE E VERIFICAÇÃO
-- =====================================================

-- Função para testar o sistema completo
CREATE OR REPLACE FUNCTION test_genoma_system_complete()
RETURNS TEXT AS $$
DECLARE
    test_content TEXT := 'Qual é a principal função do DNA?\nA) Armazenar energia celular\nB) Transportar oxigênio no sangue\nC) Armazenar informação genética\nD) Produzir ATP\nE) Regular a temperatura corporal';
    test_question_id BIGINT;
    alternative_count INTEGER;
    result_text TEXT;
BEGIN
    -- Insere uma questão de teste
    INSERT INTO questions (content, from_genoma_bank, correct_answer, user_id, discipline_id, created_at, updated_at)
    VALUES (test_content, true, 'C', 'test-user', 1, NOW(), NOW())
    RETURNING id INTO test_question_id;
    
    -- Aguarda um momento para o trigger processar
    PERFORM pg_sleep(0.1);
    
    -- Verifica se as alternativas foram inseridas
    SELECT COUNT(*) INTO alternative_count
    FROM answer_options
    WHERE question_id = test_question_id;
    
    -- Monta o resultado
    IF alternative_count >= 4 THEN
        result_text := 'SUCESSO: Sistema funcionando! ' || alternative_count || ' alternativas inseridas automaticamente.';
    ELSE
        result_text := 'FALHA: Sistema com problemas. Apenas ' || alternative_count || ' alternativas inseridas.';
    END IF;
    
    -- Remove a questão de teste
    DELETE FROM answer_options WHERE question_id = test_question_id;
    DELETE FROM questions WHERE id = test_question_id;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar o status atual
CREATE OR REPLACE FUNCTION check_genoma_status()
RETURNS TABLE(
    total_genoma_questions BIGINT,
    questions_with_alternatives BIGINT,
    questions_without_alternatives BIGINT,
    percentage_fixed NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ao.question_id IS NOT NULL THEN 1 END) as with_alt,
        COUNT(CASE WHEN ao.question_id IS NULL THEN 1 END) as without_alt,
        ROUND(
            (COUNT(CASE WHEN ao.question_id IS NOT NULL THEN 1 END)::NUMERIC / 
             NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 2
        ) as percentage
    FROM questions q
    LEFT JOIN answer_options ao ON q.id = ao.question_id
    WHERE q.from_genoma_bank = true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 5: EXECUÇÃO DOS TESTES
-- =====================================================

-- Testa o sistema
SELECT test_genoma_system_complete() as test_result;

-- Verifica o status atual
SELECT * FROM check_genoma_status();

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

-- Este script resolve definitivamente o problema:
-- 1. Corrige todas as questões existentes do genoma bank
-- 2. Cria um trigger robusto para futuras importações
-- 3. Inclui funções de teste e verificação
-- 4. Trata casos edge como conteúdo vazio ou malformado

-- Para verificar questões que ainda precisam de correção manual:
-- SELECT q.id, q.content FROM questions q 
-- LEFT JOIN answer_options ao ON q.id = ao.question_id 
-- WHERE q.from_genoma_bank = true AND ao.question_id IS NULL;

-- Para testar novamente o sistema:
-- SELECT test_genoma_system_complete();

-- Para verificar o status:
-- SELECT * FROM check_genoma_status();

COMMIT;