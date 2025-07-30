-- Migration to fix missing alternatives for genoma bank questions
-- and ensure future questions are properly inserted with alternatives

-- First, let's create a function to extract alternatives from question content
-- This assumes alternatives are embedded in the question text in a standard format
CREATE OR REPLACE FUNCTION extract_alternatives_from_content(content TEXT)
RETURNS JSONB AS $$
DECLARE
    alternatives JSONB := '[]'::JSONB;
    alt_text TEXT;
    counter INTEGER := 0;
    lines TEXT[];
    line TEXT;
BEGIN
    -- Split content by lines
    lines := string_to_array(content, E'\n');
    
    -- Look for patterns like "A)", "B)", "C)", "D)", "E)" or "a)", "b)", etc.
    FOREACH line IN ARRAY lines
    LOOP
        -- Check for alternative patterns
        IF line ~ '^\\s*[A-Ea-e]\\)\\s*' THEN
            -- Extract the alternative text (remove the letter and parenthesis)
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

-- Function to insert alternatives for a question
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
    -- Delete existing alternatives for this question
    DELETE FROM answer_options WHERE question_id = p_question_id;
    
    -- Insert new alternatives
    FOR alt IN SELECT * FROM jsonb_array_elements(p_alternatives)
    LOOP
        -- Determine if this alternative is correct
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

-- Now let's fix existing genoma bank questions that are missing alternatives
DO $$
DECLARE
    question_record RECORD;
    extracted_alternatives JSONB;
BEGIN
    -- Process each genoma bank question that has no alternatives
    FOR question_record IN 
        SELECT q.id, q.content, q.correct_answer
        FROM questions q
        WHERE q.from_genoma_bank = true
        AND q.id NOT IN (
            SELECT DISTINCT question_id 
            FROM answer_options 
            WHERE question_id IS NOT NULL
        )
    LOOP
        -- Extract alternatives from content
        extracted_alternatives := extract_alternatives_from_content(question_record.content);
        
        -- Only insert if we found alternatives
        IF jsonb_array_length(extracted_alternatives) > 0 THEN
            PERFORM insert_question_alternatives(
                question_record.id,
                extracted_alternatives,
                question_record.correct_answer
            );
            
            RAISE NOTICE 'Inserted % alternatives for question %', 
                jsonb_array_length(extracted_alternatives), 
                question_record.id;
        ELSE
            RAISE NOTICE 'No alternatives found in content for question %', question_record.id;
        END IF;
    END LOOP;
END;
$$;

-- Create a trigger function to automatically process alternatives for new questions
CREATE OR REPLACE FUNCTION process_question_alternatives_trigger()
RETURNS TRIGGER AS $$
DECLARE
    extracted_alternatives JSONB;
BEGIN
    -- Only process if it's a genoma bank question or if content contains alternatives
    IF NEW.from_genoma_bank = true OR NEW.content ~ '[A-Ea-e]\\)\\s*' THEN
        -- Extract alternatives from content
        extracted_alternatives := extract_alternatives_from_content(NEW.content);
        
        -- Insert alternatives if found
        IF jsonb_array_length(extracted_alternatives) > 0 THEN
            PERFORM insert_question_alternatives(
                NEW.id,
                extracted_alternatives,
                NEW.correct_answer
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_process_question_alternatives ON questions;
CREATE TRIGGER trigger_process_question_alternatives
    AFTER INSERT OR UPDATE OF content, correct_answer ON questions
    FOR EACH ROW
    EXECUTE FUNCTION process_question_alternatives_trigger();

-- Also create a trigger for the questoes table (legacy table)
CREATE OR REPLACE FUNCTION process_questoes_alternatives_trigger()
RETURNS TRIGGER AS $$
DECLARE
    extracted_alternatives JSONB;
    question_id UUID;
BEGIN
    -- Check if this question exists in the questions table
    SELECT id INTO question_id
    FROM questions q
    WHERE q.content = NEW.enunciado
    AND q.from_genoma_bank = true
    LIMIT 1;
    
    -- If found and alternatives are empty in questoes table
    IF question_id IS NOT NULL AND (NEW.alternativas IS NULL OR NEW.alternativas = '[]'::jsonb) THEN
        -- Extract alternatives from content
        extracted_alternatives := extract_alternatives_from_content(NEW.enunciado);
        
        -- Update the questoes table with extracted alternatives
        IF jsonb_array_length(extracted_alternatives) > 0 THEN
            NEW.alternativas := extracted_alternatives;
            
            -- Also insert into answer_options table
            PERFORM insert_question_alternatives(
                question_id,
                extracted_alternatives,
                NEW.resposta_correta
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for questoes table
DROP TRIGGER IF EXISTS trigger_process_questoes_alternatives ON questoes;
CREATE TRIGGER trigger_process_questoes_alternatives
    BEFORE INSERT OR UPDATE OF enunciado, alternativas ON questoes
    FOR EACH ROW
    EXECUTE FUNCTION process_questoes_alternatives_trigger();

-- Create an index to improve performance
CREATE INDEX IF NOT EXISTS idx_questions_from_genoma_bank ON questions(from_genoma_bank) WHERE from_genoma_bank = true;
CREATE INDEX IF NOT EXISTS idx_answer_options_question_id ON answer_options(question_id);

-- Manual fix for existing questions (run this if the automatic extraction doesn't work)
-- You can manually insert alternatives for specific questions like this:
/*
INSERT INTO answer_options (id, question_id, text, is_correct, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'QUESTION_ID_HERE', 'Alternative A text', false, NOW(), NOW()),
    (gen_random_uuid(), 'QUESTION_ID_HERE', 'Alternative B text', false, NOW(), NOW()),
    (gen_random_uuid(), 'QUESTION_ID_HERE', 'Alternative C text', true, NOW(), NOW()),
    (gen_random_uuid(), 'QUESTION_ID_HERE', 'Alternative D text', false, NOW(), NOW()),
    (gen_random_uuid(), 'QUESTION_ID_HERE', 'Alternative E text', false, NOW(), NOW());
*/

-- Query to check which questions still need alternatives after running this migration:
/*
SELECT 
    q.id,
    q.content,
    q.correct_answer,
    COUNT(ao.id) as alternative_count
FROM questions q
LEFT JOIN answer_options ao ON q.id = ao.question_id
WHERE q.from_genoma_bank = true
GROUP BY q.id, q.content, q.correct_answer
HAVING COUNT(ao.id) = 0
ORDER BY q.created_at;
*/