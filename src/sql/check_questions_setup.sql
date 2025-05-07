-- Script para verificar rapidamente a configuração do Banco de Questões
-- Execute este script no Console SQL do Supabase para visualizar informações úteis

-- Verificar tabelas existentes
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND information_schema.columns.table_name = information_schema.tables.table_name) AS num_columns 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('questions', 'answer_options', 'disciplines', 'subjects')
ORDER BY table_name;

-- Contar registros em cada tabela
SELECT 'questions' AS table_name, COUNT(*) AS record_count FROM public.questions
UNION ALL
SELECT 'answer_options' AS table_name, COUNT(*) AS record_count FROM public.answer_options
UNION ALL
SELECT 'disciplines' AS table_name, COUNT(*) AS record_count FROM public.disciplines
UNION ALL
SELECT 'subjects' AS table_name, COUNT(*) AS record_count FROM public.subjects
ORDER BY table_name;

-- Verificar políticas RLS
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('questions', 'answer_options', 'disciplines', 'subjects')
ORDER BY tablename, policyname;

-- Listar usuários e seus IDs para referência
SELECT id, email, last_sign_in_at
FROM auth.users
ORDER BY last_sign_in_at DESC;

-- Mostrar contagem de questões por usuário
SELECT user_id, COUNT(*) AS question_count
FROM public.questions
GROUP BY user_id;

-- Mostrar estatísticas por tipo de questão
SELECT question_type, COUNT(*) AS count
FROM public.questions
GROUP BY question_type
ORDER BY count DESC;

-- Mostrar estatísticas por dificuldade
SELECT difficulty, COUNT(*) AS count
FROM public.questions
GROUP BY difficulty
ORDER BY count DESC;

-- Finalização com mensagem
DO $$
BEGIN
    RAISE NOTICE 'Verificação concluída! Para criar questões de exemplo para um usuário, use:';
    RAISE NOTICE 'SELECT create_sample_questions(''SEU-USER-ID-AQUI'');';
END
$$; 