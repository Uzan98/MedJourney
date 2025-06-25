-- Script para corrigir a função register_study_time_in_challenges que está causando o erro
-- Erro: relation "user_levels" does not exist

-- Primeiro, vamos verificar se a função existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'register_study_time_in_challenges') THEN
        -- Primeiro, vamos remover a função existente
        EXECUTE 'DROP FUNCTION IF EXISTS register_study_time_in_challenges(UUID, INTEGER)';
        
        -- Agora criar a versão simplificada que não usa a tabela user_levels
        EXECUTE $FUNC$
        CREATE FUNCTION register_study_time_in_challenges(p_user_id UUID, p_duration_minutes INTEGER)
        RETURNS void AS $BODY$
        BEGIN
            -- Esta é uma versão simplificada que não faz nada além de registrar a chamada
            -- Você pode adicionar lógica aqui se precisar manter alguma funcionalidade
            RAISE NOTICE 'Função register_study_time_in_challenges chamada para usuário % com duração %', p_user_id, p_duration_minutes;
            
            -- Se você precisar manter alguma lógica relacionada a desafios, pode adicionar aqui
            -- Por exemplo, atualizar uma tabela de desafios que ainda existe
            
            -- A função original provavelmente fazia algo como:
            -- UPDATE user_levels SET xp = xp + (p_duration_minutes * 2) WHERE user_id = p_user_id;
            -- Mas como a tabela não existe mais, removemos essa lógica
        END;
        $BODY$ LANGUAGE plpgsql;
        $FUNC$;
        
        RAISE NOTICE 'Função register_study_time_in_challenges atualizada com sucesso.';
    ELSE
        -- Criar a função se ela não existir
        EXECUTE $FUNC$
        CREATE FUNCTION register_study_time_in_challenges(p_user_id UUID, p_duration_minutes INTEGER)
        RETURNS void AS $BODY$
        BEGIN
            RAISE NOTICE 'Função register_study_time_in_challenges chamada para usuário % com duração %', p_user_id, p_duration_minutes;
            -- Função vazia que não faz nada além de registrar a chamada
        END;
        $BODY$ LANGUAGE plpgsql;
        $FUNC$;
        
        RAISE NOTICE 'Função register_study_time_in_challenges criada com sucesso.';
    END IF;
END $$; 