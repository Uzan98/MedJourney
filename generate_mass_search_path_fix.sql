-- Script automatizado para corrigir search_path em todas as 120 funções
-- Este script gera dinamicamente as correções para cada função

-- Função principal que gera todas as correções
CREATE OR REPLACE FUNCTION fix_all_search_paths()
RETURNS TEXT AS $$
DECLARE
    func_record RECORD;
    func_definition TEXT;
    func_body TEXT;
    func_signature TEXT;
    func_returns TEXT;
    func_language TEXT;
    func_security TEXT;
    new_body TEXT;
    result_script TEXT := '-- Script gerado automaticamente para corrigir search_path em todas as funções\n\n';
    counter INTEGER := 0;
BEGIN
    -- Iterar sobre todas as funções do esquema public
    FOR func_record IN 
        SELECT 
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args,
            pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'  -- apenas funções, não procedures
        ORDER BY p.proname
    LOOP
        func_definition := func_record.definition;
        
        -- Verificar se já tem SET search_path
        IF func_definition IS NOT NULL AND func_definition NOT LIKE '%SET search_path%' THEN
            counter := counter + 1;
            
            -- Extrair partes da função usando regex
            func_signature := substring(func_definition from 'CREATE OR REPLACE FUNCTION[^\$]*');
            func_body := substring(func_definition from '\$\$(.*)\$\$' for '\1');
            func_language := substring(func_definition from 'LANGUAGE\s+(\w+)' for '\1');
            
            -- Determinar se é SECURITY DEFINER
            IF func_definition LIKE '%SECURITY DEFINER%' THEN
                func_security := ' SECURITY DEFINER';
            ELSE
                func_security := '';
            END IF;
            
            -- Adicionar SET search_path no início do corpo da função
            IF func_body LIKE 'BEGIN%' THEN
                new_body := 'BEGIN\n    SET search_path TO pg_temp, public;\n' || substring(func_body from 6);
            ELSIF func_body LIKE 'DECLARE%' THEN
                new_body := regexp_replace(func_body, '^DECLARE', 'DECLARE');
                new_body := regexp_replace(new_body, 'BEGIN', 'BEGIN\n    SET search_path TO pg_temp, public;');
            ELSE
                -- Para funções simples sem DECLARE/BEGIN
                new_body := 'SET search_path TO pg_temp, public;\n' || func_body;
            END IF;
            
            -- Montar a nova definição da função
            result_script := result_script || '-- ' || counter || '. Corrigindo: ' || func_record.function_name || '\n';
            result_script := result_script || func_signature || '\n$$\n' || new_body || '\n$$';
            result_script := result_script || ' LANGUAGE ' || func_language || func_security || ';\n\n';
        END IF;
    END LOOP;
    
    result_script := result_script || '-- Total de funções corrigidas: ' || counter || '\n';
    result_script := result_script || '-- Execute este script em lotes pequenos para evitar problemas\n';
    
    RETURN result_script;
END;
$$ LANGUAGE plpgsql;

-- Função alternativa mais simples que lista todas as funções que precisam ser corrigidas
CREATE OR REPLACE FUNCTION list_functions_needing_fix()
RETURNS TABLE(
    function_name TEXT,
    has_search_path BOOLEAN,
    is_security_definer BOOLEAN
) AS $$
BEGIN
    SET search_path TO pg_temp, public;
    
    RETURN QUERY
    SELECT 
        p.proname::TEXT,
        (pg_get_functiondef(p.oid) LIKE '%SET search_path%') as has_search_path,
        (pg_get_functiondef(p.oid) LIKE '%SECURITY DEFINER%') as is_security_definer
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    ORDER BY p.proname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para corrigir uma função específica
CREATE OR REPLACE FUNCTION fix_single_function_search_path(func_name TEXT)
RETURNS TEXT AS $$
DECLARE
    func_definition TEXT;
    new_definition TEXT;
BEGIN
    SET search_path TO pg_temp, public;
    
    -- Obter definição da função
    SELECT pg_get_functiondef(p.oid) INTO func_definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = func_name;
    
    IF func_definition IS NULL THEN
        RETURN 'Função não encontrada: ' || func_name;
    END IF;
    
    IF func_definition LIKE '%SET search_path%' THEN
        RETURN 'Função já possui SET search_path: ' || func_name;
    END IF;
    
    -- Adicionar SET search_path
    new_definition := regexp_replace(
        func_definition,
        '(\$\$[\s\n]*)(BEGIN|DECLARE)',
        E'\\1SET search_path TO pg_temp, public;\\n    \\2',
        'gi'
    );
    
    -- Se não encontrou BEGIN/DECLARE, adicionar após $$
    IF new_definition = func_definition THEN
        new_definition := regexp_replace(
            func_definition,
            '(\$\$[\s\n]*)',
            E'\\1SET search_path TO pg_temp, public;\\n    ',
            'g'
        );
    END IF;
    
    RETURN new_definition || ';';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- INSTRUÇÕES DE USO:

-- 1. Para listar todas as funções que precisam ser corrigidas:
-- SELECT * FROM list_functions_needing_fix() WHERE has_search_path = false;

-- 2. Para gerar o script completo de correção:
-- SELECT fix_all_search_paths();

-- 3. Para corrigir uma função específica:
-- SELECT fix_single_function_search_path('nome_da_funcao');

-- 4. Para aplicar as correções em lotes:
-- Execute o resultado de fix_all_search_paths() em partes pequenas

-- EXEMPLO DE USO PASSO A PASSO:

-- Passo 1: Verificar quantas funções precisam ser corrigidas
-- SELECT COUNT(*) FROM list_functions_needing_fix() WHERE has_search_path = false;

-- Passo 2: Gerar script de correção
-- SELECT fix_all_search_paths();

-- Passo 3: Copiar o resultado e salvar em arquivo
-- Passo 4: Executar em lotes de 10-20 funções por vez
-- Passo 5: Testar após cada lote

-- IMPORTANTE:
-- - Sempre faça backup antes de executar
-- - Execute em ambiente de desenvolvimento primeiro
-- - Teste cada função após a correção
-- - Monitore logs de erro durante a execução