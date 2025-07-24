-- Verificar se o gatilho de contagem de questões existe
SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trigger_questions_per_day_limit'
) AS trigger_exists;

-- Verificar a definição da função do gatilho
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'check_questions_per_day_limit';

-- Verificar em quais eventos o gatilho é acionado
SELECT tgname, tgtype
FROM pg_trigger
WHERE tgname = 'trigger_questions_per_day_limit';

-- Verificar as colunas da tabela questions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'questions'
ORDER BY ordinal_position; 