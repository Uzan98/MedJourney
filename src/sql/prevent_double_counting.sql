-- Script SQL para prevenir contagem dupla de tempo de estudo
-- Este script cria um trigger que impede atualização duplicada do tempo de estudo
-- quando um usuário já está offline

-- Função que será executada pelo trigger
CREATE OR REPLACE FUNCTION prevent_double_counting()
RETURNS TRIGGER AS $$
BEGIN
    -- Se estiver alterando o status de online para offline
    IF OLD.esta_online = true AND NEW.esta_online = false THEN
        -- Registrar a operação para fins de depuração
        RAISE NOTICE 'Usuário % saindo da sala %: tempo_total atualizado de % para %',
                    OLD.user_id, OLD.room_id, OLD.tempo_total, NEW.tempo_total;
    END IF;
    
    -- Se o usuário já estava offline e estão tentando atualizar o tempo_total,
    -- mantemos o tempo_total anterior para evitar duplicação
    IF OLD.esta_online = false AND NEW.esta_online = false AND NEW.tempo_total != OLD.tempo_total THEN
        RAISE NOTICE 'Impedindo atualização duplicada de tempo para usuário % na sala %',
                    OLD.user_id, OLD.room_id;
        
        -- Manter o tempo_total antigo
        NEW.tempo_total = OLD.tempo_total;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar ou substituir o trigger
DROP TRIGGER IF EXISTS prevent_double_counting_trigger ON study_room_users;

CREATE TRIGGER prevent_double_counting_trigger
BEFORE UPDATE ON study_room_users
FOR EACH ROW
EXECUTE FUNCTION prevent_double_counting();

-- Adicionalmente, vamos adicionar uma coluna para registrar a última vez que o tempo foi atualizado
-- isso pode ajudar a depurar problemas

DO $$
BEGIN
    -- Verificar se a coluna já existe
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'study_room_users' AND column_name = 'last_time_update'
    ) THEN
        ALTER TABLE study_room_users ADD COLUMN last_time_update TIMESTAMP WITH TIME ZONE;
    END IF;
END
$$;

-- Função para atualizar o timestamp da última atualização de tempo
CREATE OR REPLACE FUNCTION update_last_time_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o tempo_total está sendo atualizado, registrar o momento
    IF NEW.tempo_total != OLD.tempo_total THEN
        NEW.last_time_update = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar ou substituir o trigger
DROP TRIGGER IF EXISTS update_last_time_update_trigger ON study_room_users;

CREATE TRIGGER update_last_time_update_trigger
BEFORE UPDATE ON study_room_users
FOR EACH ROW
EXECUTE FUNCTION update_last_time_update();

-- Criar ou atualizar uma função para retornar as informações de depuração
CREATE OR REPLACE FUNCTION get_study_room_user_debug(p_user_id TEXT, p_room_id TEXT)
RETURNS TABLE(
    user_id TEXT,
    room_id TEXT,
    esta_online BOOLEAN,
    tempo_total INTEGER,
    entrou_em TIMESTAMP WITH TIME ZONE,
    last_time_update TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sru.user_id::TEXT,
        sru.room_id::TEXT,
        sru.esta_online,
        sru.tempo_total,
        sru.entrou_em,
        sru.last_time_update
    FROM 
        study_room_users sru
    WHERE 
        sru.user_id = p_user_id AND sru.room_id = p_room_id;
END;
$$ LANGUAGE plpgsql;
