-- Script para corrigir a função update_streak_challenges que está causando o erro
-- Erro: relation "user_levels" does not exist

-- Primeiro, vamos verificar se a função existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_streak_challenges') THEN
        -- Primeiro, vamos remover a função existente
        EXECUTE 'DROP FUNCTION IF EXISTS update_streak_challenges(UUID, INTEGER)';
        
        -- Agora criar a versão simplificada que não usa a tabela user_levels
        EXECUTE $FUNC$
        CREATE FUNCTION update_streak_challenges(p_user_id UUID, p_streak_value INTEGER)
        RETURNS void AS $BODY$
        BEGIN
            -- Esta é uma versão simplificada que não faz nada além de registrar a chamada
            -- Você pode adicionar lógica aqui se precisar manter alguma funcionalidade
            RAISE NOTICE 'Função update_streak_challenges chamada para usuário % com valor %', p_user_id, p_streak_value;
            
            -- Se você precisar manter alguma lógica relacionada a desafios, pode adicionar aqui
            -- Por exemplo, atualizar uma tabela de desafios que ainda existe
            
            -- A função original provavelmente fazia algo como:
            -- UPDATE user_levels SET xp = xp + (p_streak_value * 10) WHERE user_id = p_user_id;
            -- Mas como a tabela não existe mais, removemos essa lógica
        END;
        $BODY$ LANGUAGE plpgsql;
        $FUNC$;
        
        RAISE NOTICE 'Função update_streak_challenges atualizada com sucesso.';
    ELSE
        -- Criar a função se ela não existir
        EXECUTE $FUNC$
        CREATE FUNCTION update_streak_challenges(p_user_id UUID, p_streak_value INTEGER)
        RETURNS void AS $BODY$
        BEGIN
            RAISE NOTICE 'Função update_streak_challenges chamada para usuário % com valor %', p_user_id, p_streak_value;
            -- Função vazia que não faz nada além de registrar a chamada
        END;
        $BODY$ LANGUAGE plpgsql;
        $FUNC$;
        
        RAISE NOTICE 'Função update_streak_challenges criada com sucesso.';
    END IF;
END $$; 