-- Manual fix for genoma bank questions missing alternatives
-- Run this script in your Supabase SQL editor

-- First, let's see which questions need alternatives
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

-- Simple function to add alternatives for a specific question
CREATE OR REPLACE FUNCTION add_alternatives_to_question(
    p_question_id UUID,
    p_alt_a TEXT,
    p_alt_b TEXT,
    p_alt_c TEXT,
    p_alt_d TEXT,
    p_alt_e TEXT DEFAULT NULL,
    p_correct_letter CHAR(1) DEFAULT 'A'
)
RETURNS VOID AS $$
BEGIN
    -- Delete existing alternatives
    DELETE FROM answer_options WHERE question_id = p_question_id;
    
    -- Insert alternative A
    INSERT INTO answer_options (id, question_id, text, is_correct, created_at, updated_at)
    VALUES (gen_random_uuid(), p_question_id, p_alt_a, (p_correct_letter = 'A'), NOW(), NOW());
    
    -- Insert alternative B
    INSERT INTO answer_options (id, question_id, text, is_correct, created_at, updated_at)
    VALUES (gen_random_uuid(), p_question_id, p_alt_b, (p_correct_letter = 'B'), NOW(), NOW());
    
    -- Insert alternative C
    INSERT INTO answer_options (id, question_id, text, is_correct, created_at, updated_at)
    VALUES (gen_random_uuid(), p_question_id, p_alt_c, (p_correct_letter = 'C'), NOW(), NOW());
    
    -- Insert alternative D
    INSERT INTO answer_options (id, question_id, text, is_correct, created_at, updated_at)
    VALUES (gen_random_uuid(), p_question_id, p_alt_d, (p_correct_letter = 'D'), NOW(), NOW());
    
    -- Insert alternative E if provided
    IF p_alt_e IS NOT NULL THEN
        INSERT INTO answer_options (id, question_id, text, is_correct, created_at, updated_at)
        VALUES (gen_random_uuid(), p_question_id, p_alt_e, (p_correct_letter = 'E'), NOW(), NOW());
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Example usage (replace with actual question IDs and alternatives):
/*
SELECT add_alternatives_to_question(
    'QUESTION_ID_HERE'::UUID,
    'Alternative A text',
    'Alternative B text', 
    'Alternative C text',
    'Alternative D text',
    'Alternative E text',
    'C'  -- Correct answer letter
);
*/

-- Trigger to automatically process new questions
CREATE OR REPLACE FUNCTION auto_process_genoma_questions()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process genoma bank questions
    IF NEW.from_genoma_bank = true THEN
        -- You can add logic here to automatically extract alternatives
        -- from the question content if they follow a standard format
        RAISE NOTICE 'New genoma bank question inserted: %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new questions
DROP TRIGGER IF EXISTS auto_process_genoma_trigger ON questions;
CREATE TRIGGER auto_process_genoma_trigger
    AFTER INSERT ON questions
    FOR EACH ROW
    EXECUTE FUNCTION auto_process_genoma_questions();

-- Query to verify alternatives were added correctly
/*
SELECT 
    q.id,
    q.content,
    q.correct_answer,
    ao.text as alternative_text,
    ao.is_correct
FROM questions q
JOIN answer_options ao ON q.id = ao.question_id
WHERE q.from_genoma_bank = true
ORDER BY q.id, ao.created_at;
*/

-- Count alternatives per genoma question
/*
SELECT 
    q.id,
    COUNT(ao.id) as alternative_count
FROM questions q
LEFT JOIN answer_options ao ON q.id = ao.question_id
WHERE q.from_genoma_bank = true
GROUP BY q.id
ORDER BY alternative_count, q.created_at;
*/