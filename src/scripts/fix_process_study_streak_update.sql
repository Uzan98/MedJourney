-- Script para corrigir a função process_study_streak_update que está causando o erro
-- Erro: relation "user_levels" does not exist

-- Primeiro, verificar se a função está associada a algum trigger
DO $$
DECLARE
    trigger_name text;
    table_name text;
BEGIN
    -- Procurar triggers que usam esta função
    SELECT tgname, relname INTO trigger_name, table_name
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE p.proname = 'process_study_streak_update'
    LIMIT 1;
    
    -- Se encontrou um trigger, remover
    IF trigger_name IS NOT NULL THEN
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON ' || table_name;
        RAISE NOTICE 'Trigger % na tabela % removido com sucesso', trigger_name, table_name;
    END IF;
END $$;

-- Remover a função existente
DROP FUNCTION IF EXISTS process_study_streak_update() CASCADE;

-- Criar uma nova versão simplificada da função que não depende de tabelas de gamificação
CREATE OR REPLACE FUNCTION process_study_streak_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Somente processa se a streak atual aumentou
    IF NEW.current_streak > COALESCE(OLD.current_streak, 0) THEN
        -- Atualizar desafios de streak nos participantes de desafios
        UPDATE challenge_participants cp
        SET current_value = NEW.current_streak
        FROM community_challenges cc
        WHERE cp.challenge_id = cc.id
        AND cp.user_id = NEW.user_id::uuid
        AND cc.challenge_type = 'study_streak'
        AND cc.is_active = true
        AND cc.end_date >= CURRENT_DATE;
        
        -- Registrar que a função foi chamada
        RAISE NOTICE 'Função process_study_streak_update executada para usuário % com streak %', 
                      NEW.user_id, NEW.current_streak;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se a tabela study_streaks existe e criar o trigger
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'study_streaks'
    ) THEN
        -- Criar o trigger na tabela study_streaks
        DROP TRIGGER IF EXISTS study_streak_update_trigger ON study_streaks;
        
        CREATE TRIGGER study_streak_update_trigger
        AFTER UPDATE ON study_streaks
        FOR EACH ROW
        WHEN (NEW.current_streak IS DISTINCT FROM OLD.current_streak)
        EXECUTE FUNCTION process_study_streak_update();
        
        RAISE NOTICE 'Trigger study_streak_update_trigger criado com sucesso na tabela study_streaks';
    ELSE
        RAISE NOTICE 'Tabela study_streaks não existe, o trigger não foi criado';
    END IF;
END $$; 