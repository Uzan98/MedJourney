-- Verificar permissões atuais das tabelas de termos de uso
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('terms_of_service', 'user_terms_acceptance')
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Conceder permissões para a tabela terms_of_service
-- Usuários anônimos podem ler os termos de uso
GRANT SELECT ON terms_of_service TO anon;

-- Usuários autenticados podem ler os termos de uso
GRANT SELECT ON terms_of_service TO authenticated;

-- Conceder permissões para a tabela user_terms_acceptance
-- Usuários autenticados podem inserir e consultar suas próprias aceitações
GRANT SELECT, INSERT ON user_terms_acceptance TO authenticated;

-- Verificar permissões após a concessão
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('terms_of_service', 'user_terms_acceptance')
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;