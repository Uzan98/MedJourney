-- =====================================================
-- FIX DEFINITIVO PARA QUESTÕES DO GENOMA BANK
-- =====================================================
-- Este script corrige o problema onde questões adicionadas ao Genoma Bank
-- através da interface (is_public = true) não têm suas alternativas extraídas
-- automaticamente porque o trigger só processava from_genoma_bank = true

BEGIN;

-- =====================================================
-- PARTE 1: REMOVER TRIGGERS ANTIGOS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_process_genoma_questions_v2 ON questions;
DROP TRIGGER IF EXISTS trigger_process_genoma_questions ON questions;
DROP TRIGGER IF EXISTS trigger_process_new_genoma_questions ON questions;
DROP TRIGGER IF EXISTS trigger_process_question_alternatives ON questions;
DROP TRIGGER IF EXISTS auto_process_genoma_trigger ON questions;

-- =====================================================
-- PARTE 2: FUNÇÃO PARA EXTRAIR ALTERNATIVAS (MELHORADA)
-- =====================================================

CREATE OR REPLACE FUNCTION extract_alternatives_from_content_v3(content_text TEXT)
RETURNS JSONB AS $$
DECLARE
    alternatives JSONB := '[]'::jsonb;
    lines TEXT[];
    line TEXT;
    letter CHAR;
    alt_text TEXT;
BEGIN
    -- Verifica se o conteúdo não é nulo ou vazio
    IF content_text IS NULL OR trim(content_text) = '' THEN
        RETURN alternatives;
    END IF;
    
    -- Divide o conteúdo em linhas
    lines := string_to_array(content_text, E'\n');
    
    -- Processa cada linha procurando por alternativas
    FOREACH line IN ARRAY lines
    LOOP
        -- Remove espaços em branco no início e fim
        line := trim(line);
        
        -- Verifica se a linha corresponde ao padrão de alternativa: A) texto, B) texto, etc.
        IF line ~ '^[A-Ea-e]\)\s*.+' THEN
            -- Extrai a letra da alternativa
            letter := upper(substring(line from '^([A-Ea-e])'));
            
            -- Extrai o texto da alternativa (remove a letra e o parêntese)
            alt_text := trim(substring(line from '^[A-Ea-e]\)\s*(.+)'));
            
            -- Adiciona a alternativa ao array JSON
            IF alt_text IS NOT NULL AND alt_text != '' THEN
                alternatives := alternatives || jsonb_build_object(
                    'letter', letter,
                    'text', alt_text
                );
            END IF;
        END IF;
    END LOOP;
    
    RETURN alternatives;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 3: FUNÇÃO PARA INSERIR ALTERNATIVAS (MELHORADA)
-- =====================================================

CREATE OR REPLACE FUNCTION insert_question_alternatives_v3(
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
        IF p_correct_answer IS NOT NULL THEN
            is_correct := (alt->>'letter' = upper(trim(p_correct_answer)));
        END IF;
        
        INSERT INTO answer_options (question_id, text, is_correct, created_at, updated_at)
        VALUES (
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
-- PARTE 4: TRIGGER FUNCTION CORRIGIDA
-- =====================================================

CREATE OR REPLACE FUNCTION process_genoma_questions_trigger_v3()
RETURNS TRIGGER AS $$
DECLARE
    extracted_alternatives JSONB;
    inserted_count INTEGER;
    should_process BOOLEAN := FALSE;
BEGIN
    -- Determina se deve processar esta questão
    -- Processa se:
    -- 1. É uma questão do genoma bank (from_genoma_bank = true) OU
    -- 2. É uma questão pública (is_public = true) que contém alternativas no conteúdo
    
    IF NEW.from_genoma_bank = true THEN
        should_process := TRUE;
        RAISE NOTICE 'Processando questão do genoma bank: %', NEW.id;
    ELSIF NEW.is_public = true AND NEW.content ~ '[A-Ea-e]\)\s*' THEN
        should_process := TRUE;
        RAISE NOTICE 'Processando questão pública com alternativas: %', NEW.id;
    END IF;
    
    IF should_process THEN
        -- Extrai alternativas do conteúdo
        extracted_alternatives := extract_alternatives_from_content_v3(NEW.content);
        
        -- Insere alternativas se encontradas
        IF jsonb_array_length(extracted_alternatives) > 0 THEN
            SELECT insert_question_alternatives_v3(
                NEW.id,
                extracted_alternatives,
                NEW.correct_answer
            ) INTO inserted_count;
            
            RAISE NOTICE 'Questão % processada: % alternativas inseridas', 
                NEW.id, inserted_count;
        ELSE
            RAISE WARNING 'Questão % não pôde ser processada: nenhuma alternativa encontrada no conteúdo', 
                NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 5: CRIAR O NOVO TRIGGER
-- =====================================================

CREATE TRIGGER trigger_process_genoma_questions_v3
    AFTER INSERT ON questions
    FOR EACH ROW
    EXECUTE FUNCTION process_genoma_questions_trigger_v3();

-- =====================================================
-- PARTE 6: CORRIGIR QUESTÕES EXISTENTES
-- =====================================================

-- Função para corrigir questões públicas existentes que não têm alternativas
CREATE OR REPLACE FUNCTION fix_existing_public_questions()
RETURNS TEXT AS $$
DECLARE
    question_record RECORD;
    extracted_alternatives JSONB;
    inserted_count INTEGER;
    total_fixed INTEGER := 0;
BEGIN
    -- Processa questões públicas que não têm alternativas mas têm alternativas no conteúdo
    FOR question_record IN
        SELECT q.id, q.content, q.correct_answer
        FROM questions q
        LEFT JOIN answer_options ao ON q.id = ao.question_id
        WHERE q.is_public = true 
        AND q.content ~ '[A-Ea-e]\)\s*'
        AND ao.question_id IS NULL
        ORDER BY q.id
    LOOP
        -- Extrai alternativas do conteúdo
        extracted_alternatives := extract_alternatives_from_content_v3(question_record.content);
        
        -- Insere alternativas se encontradas
        IF jsonb_array_length(extracted_alternatives) > 0 THEN
            SELECT insert_question_alternatives_v3(
                question_record.id,
                extracted_alternatives,
                question_record.correct_answer
            ) INTO inserted_count;
            
            total_fixed := total_fixed + 1;
            
            RAISE NOTICE 'Questão pública % corrigida: % alternativas inseridas', 
                question_record.id, inserted_count;
        ELSE
            RAISE WARNING 'Questão pública % não pôde ser corrigida: nenhuma alternativa encontrada no conteúdo', 
                question_record.id;
        END IF;
    END LOOP;
    
    RETURN format('Correção concluída: %s questões públicas corrigidas', total_fixed);
END;
$$ LANGUAGE plpgsql;

-- Executa a correção das questões existentes
SELECT fix_existing_public_questions();

-- =====================================================
-- PARTE 7: FUNÇÃO DE TESTE
-- =====================================================

CREATE OR REPLACE FUNCTION test_genoma_system_v3()
RETURNS TEXT AS $$
DECLARE
    test_content TEXT := 'Qual é a principal função do DNA?\nA) Armazenar energia celular\nB) Transportar oxigênio no sangue\nC) Armazenar informação genética\nD) Produzir ATP\nE) Regular a temperatura corporal';
    test_question_id BIGINT;
    alternative_count INTEGER;
    test_user_id TEXT := (SELECT user_id FROM questions LIMIT 1);
BEGIN
    -- Teste 1: Questão pública (simulando adição ao Genoma Bank via interface)
    INSERT INTO questions (content, is_public, from_genoma_bank, correct_answer, user_id, discipline_id, created_at, updated_at)
    VALUES (test_content, true, false, 'C', test_user_id, 1, NOW(), NOW())
    RETURNING id INTO test_question_id;
    
    -- Aguarda um momento para o trigger processar
    PERFORM pg_sleep(0.1);
    
    -- Verifica se as alternativas foram inseridas
    SELECT COUNT(*) INTO alternative_count
    FROM answer_options
    WHERE question_id = test_question_id;
    
    -- Remove a questão de teste
    DELETE FROM answer_options WHERE question_id = test_question_id;
    DELETE FROM questions WHERE id = test_question_id;
    
    IF alternative_count = 5 THEN
        RETURN format('✅ Sistema funcionando corretamente! %s alternativas foram inseridas automaticamente para questão pública.', alternative_count);
    ELSE
        RETURN format('❌ Sistema com problemas. Apenas %s alternativas foram inseridas para questão pública.', alternative_count);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 8: FUNÇÃO DE VERIFICAÇÃO DE STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION check_genoma_status_v3()
RETURNS TABLE(
    description TEXT,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Total de questões públicas'::TEXT,
        COUNT(*)::BIGINT
    FROM questions q
    WHERE q.is_public = true
    
    UNION ALL
    
    SELECT 
        'Questões públicas com alternativas'::TEXT,
        COUNT(DISTINCT q.id)::BIGINT
    FROM questions q
    INNER JOIN answer_options ao ON q.id = ao.question_id
    WHERE q.is_public = true
    
    UNION ALL
    
    SELECT 
        'Questões públicas SEM alternativas'::TEXT,
        COUNT(*)::BIGINT
    FROM questions q
    LEFT JOIN answer_options ao ON q.id = ao.question_id
    WHERE q.is_public = true AND ao.question_id IS NULL
    
    UNION ALL
    
    SELECT 
        'Questões do genoma bank (from_genoma_bank=true)'::TEXT,
        COUNT(*)::BIGINT
    FROM questions q
    WHERE q.from_genoma_bank = true
    
    UNION ALL
    
    SELECT 
        'Questões do genoma bank com alternativas'::TEXT,
        COUNT(DISTINCT q.id)::BIGINT
    FROM questions q
    INNER JOIN answer_options ao ON q.id = ao.question_id
    WHERE q.from_genoma_bank = true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 9: EXECUTAR TESTES E VERIFICAÇÕES
-- =====================================================

-- Testa o sistema
SELECT test_genoma_system_v3() as test_result;

-- Verifica o status atual
SELECT * FROM check_genoma_status_v3();

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

-- Este script resolve definitivamente o problema:
-- 1. Corrige o trigger para processar questões públicas (is_public = true)
-- 2. Corrige todas as questões públicas existentes sem alternativas
-- 3. Mantém compatibilidade com questões do genoma bank (from_genoma_bank = true)
-- 4. Inclui funções de teste e verificação melhoradas
-- 5. Trata casos edge como conteúdo vazio ou malformado

-- Para verificar questões que ainda precisam de correção manual:
-- SELECT q.id, q.content, q.is_public, q.from_genoma_bank 
-- FROM questions q 
-- LEFT JOIN answer_options ao ON q.id = ao.question_id 
-- WHERE (q.is_public = true OR q.from_genoma_bank = true) 
-- AND q.content ~ '[A-Ea-e]\)\s*'
-- AND ao.question_id IS NULL;

COMMIT;