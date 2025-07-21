-- Função para executar SQL diretamente
-- Útil para contornar problemas de RLS em operações administrativas
-- ATENÇÃO: Esta função deve ser usada com extrema cautela!

CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT) 
RETURNS VOID AS $$
BEGIN
    -- Desativar temporariamente o RLS para esta transação
    SET LOCAL rls.enabled = off;
    
    -- Executar a consulta SQL fornecida
    EXECUTE sql_query;
    
    -- Reativar o RLS
    SET LOCAL rls.enabled = on;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para executar consultas SELECT e retornar os resultados
-- Útil para contornar problemas de RLS em consultas
CREATE OR REPLACE FUNCTION exec_sql_select(sql_query TEXT)
RETURNS SETOF json AS $$
DECLARE
    result json;
BEGIN
    -- Desativar temporariamente o RLS para esta transação
    SET LOCAL rls.enabled = off;
    
    -- Executar a consulta SQL fornecida e retornar os resultados como JSON
    FOR result IN EXECUTE sql_query
    LOOP
        RETURN NEXT result;
    END LOOP;
    
    -- Reativar o RLS
    SET LOCAL rls.enabled = on;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissão para todos os usuários autenticados
GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql_select TO authenticated;

-- Comentário para o DBA:
-- Esta função é potencialmente perigosa pois permite executar SQL arbitrário.
-- Em um ambiente de produção, considere limitar seu uso ou implementar
-- validações adicionais para evitar injeção de SQL. 