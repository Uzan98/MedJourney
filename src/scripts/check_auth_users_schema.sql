-- Script para verificar a estrutura da tabela auth.users
-- Isso nos ajudará a entender os tipos de dados corretos

SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM 
    information_schema.columns
WHERE 
    table_schema = 'auth' 
    AND table_name = 'users'
ORDER BY 
    ordinal_position; 