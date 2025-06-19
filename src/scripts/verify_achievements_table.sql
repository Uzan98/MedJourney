-- Verificar se a tabela existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'study_group_achievements'
) AS table_exists;

-- Verificar a estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'study_group_achievements';

-- Verificar as políticas RLS
SELECT * FROM pg_policies
WHERE tablename = 'study_group_achievements';

-- Verificar os índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'study_group_achievements';

-- Verificar as permissões
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'study_group_achievements'; 