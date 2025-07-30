-- Script para garantir que futuras questões do banco genoma
-- sejam importadas corretamente com suas alternativas
-- Este script NÃO corrige questões já existentes

-- Função para extrair alternativas do conteúdo da questão
CREATE OR REPLACE FUNCTION extract_alternatives_from_content(content TEXT)
RETURNS JSONB AS $$
DECLARE
    alternatives JSONB := '[]'::JSONB;
    alt_text TEXT;
    counter INTEGER := 0;
    lines TEXT[];
    line TEXT;
BEGIN
    -- Divide o conteúdo por linhas
    lines := string_to_array(content, E'\n');
    
    -- Procura por padrões como "A)", "B)", "C)", "D)", "E)" ou "a)", "b)", etc.
    FOREACH line IN ARRAY lines
    LOOP
        -- Verifica padrões de alternativas
        IF line ~ '^\\s*[A-Ea-e]\\)\\s*' THEN
            -- Extrai o texto da alternativa (remove a letra e parênteses)
            alt_text := trim(regexp_replace(line, '^\\s*[A-Ea-e]\\)\\s*', ''));
            
            IF alt_text != '' THEN
                counter := counter + 1;
                alternatives := alternatives || jsonb_build_object(
                    'id', counter,
                    'text', alt_text,
                    'letter', upper(substring(trim(line) from '^\\s*([A-Ea-e])\\)'))
                );
            END IF;
        END IF;
    END LOOP;
    
    RETURN alternatives;
END;
$$ LANGUAGE plpgsql;

-- Função para inserir alternativas de uma questão
CREATE OR REPLACE FUNCTION insert_question_alternatives(
    p_question_id UUID,
    p_alternatives JSONB,
    p_correct_answer TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    alt JSONB;
    is_correct BOOLEAN;
BEGIN
    -- Remove alternativas existentes para esta questão
    DELETE FROM answer_options WHERE question_id = p_question_id;
    
    -- Insere novas alternativas
    FOR alt IN SELECT * FROM jsonb_array_elements(p_alternatives)
    LOOP
        -- Determina se esta alternativa é a correta
        is_correct := FALSE;
        IF p_correct_answer IS NOT NULL THEN
            is_correct := (alt->>'letter' = upper(p_correct_answer));
        END IF;
        
        INSERT INTO answer_options (id, question_id, text, is_correct, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            p_question_id,
            alt->>'text',
            is_correct,
            NOW(),
            NOW()
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função de trigger para processar automaticamente alternativas de novas questões
CREATE OR REPLACE FUNCTION process_new_genoma_questions_trigger()
RETURNS TRIGGER AS $$
DECLARE
    extracted_alternatives JSONB;
BEGIN
    -- Processa apenas se for uma questão do banco genoma
    IF NEW.from_genoma_bank = true THEN
        -- Extrai alternativas do conteúdo
        extracted_alternatives := extract_alternatives_from_content(NEW.content);
        
        -- Insere alternativas se encontradas
        IF jsonb_array_length(extracted_alternatives) > 0 THEN
            PERFORM insert_question_alternatives(
                NEW.id,
                extracted_alternatives,
                NEW.correct_answer
            );
            
            RAISE NOTICE 'Inseridas % alternativas para nova questão do banco genoma %', 
                jsonb_array_length(extracted_alternatives), 
                NEW.id;
        ELSE
            RAISE WARNING 'Nenhuma alternativa encontrada no conteúdo da questão do banco genoma %', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger existente se houver
DROP TRIGGER IF EXISTS trigger_process_new_genoma_questions ON questions;

-- Cria o trigger para novas questões
CREATE TRIGGER trigger_process_new_genoma_questions
    AFTER INSERT ON questions
    FOR EACH ROW
    WHEN (NEW.from_genoma_bank = true)
    EXECUTE FUNCTION process_new_genoma_questions_trigger();

-- Trigger para a tabela questoes (tabela legada)
CREATE OR REPLACE FUNCTION process_new_questoes_genoma_trigger()
RETURNS TRIGGER AS $$
DECLARE
    extracted_alternatives JSONB;
    question_id UUID;
BEGIN
    -- Verifica se esta questão existe na tabela questions e é do banco genoma
    SELECT id INTO question_id
    FROM questions q
    WHERE q.content = NEW.enunciado
    AND q.from_genoma_bank = true
    LIMIT 1;
    
    -- Se encontrada e alternativas estão vazias na tabela questoes
    IF question_id IS NOT NULL AND (NEW.alternativas IS NULL OR NEW.alternativas = '[]'::jsonb) THEN
        -- Extrai alternativas do conteúdo
        extracted_alternatives := extract_alternatives_from_content(NEW.enunciado);
        
        -- Atualiza a tabela questoes com alternativas extraídas
        IF jsonb_array_length(extracted_alternatives) > 0 THEN
            NEW.alternativas := extracted_alternatives;
            
            -- Também insere na tabela answer_options
            PERFORM insert_question_alternatives(
                question_id,
                extracted_alternatives,
                NEW.resposta_correta
            );
            
            RAISE NOTICE 'Processadas alternativas para questão genoma na tabela questoes %', question_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger existente se houver
DROP TRIGGER IF EXISTS trigger_process_new_questoes_genoma ON questoes;

-- Cria trigger para tabela questoes
CREATE TRIGGER trigger_process_new_questoes_genoma
    BEFORE INSERT ON questoes
    FOR EACH ROW
    EXECUTE FUNCTION process_new_questoes_genoma_trigger();

-- Cria índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_questions_from_genoma_bank ON questions(from_genoma_bank) WHERE from_genoma_bank = true;
CREATE INDEX IF NOT EXISTS idx_answer_options_question_id ON answer_options(question_id);

-- Função para testar se o sistema está funcionando
CREATE OR REPLACE FUNCTION test_genoma_import_system()
RETURNS TEXT AS $$
DECLARE
    test_content TEXT := 'Qual é a função principal do DNA?\nA) Armazenar energia\nB) Transportar oxigênio\nC) Armazenar informação genética\nD) Produzir proteínas\nE) Regular temperatura';
    test_question_id UUID;
    alternative_count INTEGER;
BEGIN
    -- Insere uma questão de teste
    INSERT INTO questions (id, content, from_genoma_bank, correct_answer, created_at, updated_at)
    VALUES (gen_random_uuid(), test_content, true, 'C', NOW(), NOW())
    RETURNING id INTO test_question_id;
    
    -- Verifica se as alternativas foram inseridas
    SELECT COUNT(*) INTO alternative_count
    FROM answer_options
    WHERE question_id = test_question_id;
    
    -- Remove a questão de teste
    DELETE FROM answer_options WHERE question_id = test_question_id;
    DELETE FROM questions WHERE id = test_question_id;
    
    IF alternative_count = 5 THEN
        RETURN 'Sistema funcionando corretamente! ' || alternative_count || ' alternativas foram inseridas automaticamente.';
    ELSE
        RETURN 'Sistema com problemas. Apenas ' || alternative_count || ' alternativas foram inseridas.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Comentários sobre uso:
-- Para testar o sistema, execute: SELECT test_genoma_import_system();
-- Para verificar questões genoma sem alternativas: 
-- SELECT q.id, q.content FROM questions q LEFT JOIN answer_options ao ON q.id = ao.question_id WHERE q.from_genoma_bank = true AND ao.question_id IS NULL;

COMMIT;