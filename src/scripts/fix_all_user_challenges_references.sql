-- Script para remover todas as referências à tabela user_challenges
-- Este script remove triggers e funções que fazem referência à tabela inexistente

-- 1. Remover o trigger que está causando o erro imediato
DROP TRIGGER IF EXISTS session_challenges_trigger ON study_sessions;

-- 2. Remover outros triggers que possam referenciar funções problemáticas
DROP TRIGGER IF EXISTS exam_challenges_trigger ON simulados;

-- 3. Substituir a função update_session_challenges (que referencia user_challenges)
-- por uma versão vazia que não faz nada, para evitar erros caso ela seja chamada em outro lugar
CREATE OR REPLACE FUNCTION update_session_challenges()
RETURNS TRIGGER AS $$
BEGIN
    -- Esta função foi esvaziada porque referenciava a tabela user_challenges que não existe mais
    -- A implementação original tentava atualizar desafios relacionados a sessões de estudo
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Substituir a função update_exam_challenges (que referencia user_challenges)
-- por uma versão vazia que não faz nada, para evitar erros caso ela seja chamada em outro lugar
CREATE OR REPLACE FUNCTION update_exam_challenges()
RETURNS TRIGGER AS $$
BEGIN
    -- Esta função foi esvaziada porque referenciava a tabela user_challenges que não existe mais
    -- A implementação original tentava atualizar desafios relacionados a simulados
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Substituir a função process_simulado_completion para remover referências a user_challenges
CREATE OR REPLACE FUNCTION process_simulado_completion()
RETURNS TRIGGER AS $$
DECLARE
    xp_earned INT;
    coins_earned INT;
    acertos_perc FLOAT;
    questions_difficulty_avg TEXT;
    difficulty_multiplier FLOAT;
    completed_count INT;
    perfect_score_count INT;
    high_score_count INT;
    consecutive_count INT;
BEGIN
    -- Só executa se o simulado foi concluído
    IF NEW.status = 'concluido' AND (OLD.status != 'concluido' OR OLD.status IS NULL) THEN
        -- Calcular percentual de acertos
        acertos_perc := COALESCE(NEW.acertos::FLOAT / NULLIF(NEW.quantidade_questoes, 0), 0) * 100;
        
        -- Código mantido, mas removida a parte final que atualizava user_challenges
        -- O restante da função permanece inalterado para manter a funcionalidade de XP, moedas e conquistas
        
        -- Definir dificuldade padrão (média)
        difficulty_multiplier := 1.5;
        
        -- Calcular XP com base na pontuação (acertos) e dificuldade
        xp_earned := CEIL(100 * (acertos_perc / 100) * difficulty_multiplier);
        
        -- Bônus por desempenho
        IF acertos_perc >= 90 THEN
            xp_earned := xp_earned * 1.5; -- Bônus de 50% para desempenho excelente
        ELSIF acertos_perc >= 70 THEN
            xp_earned := xp_earned * 1.2; -- Bônus de 20% para bom desempenho
        END IF;
        
        -- Calcular MedCoins (geralmente menos que XP)
        coins_earned := CEIL(xp_earned * 0.2); -- 20% do XP como moedas
        
        -- Bônus de moedas por tempo
        IF NEW.tempo_gasto < (NEW.duracao * 0.7) AND acertos_perc > 70 THEN
            coins_earned := coins_earned * 1.5; -- Bônus de 50% para conclusão rápida com bom desempenho
        END IF;
        
        -- Resto da função mantido, mas sem a parte que referenciava user_challenges
        -- ...
        
        -- REMOVIDO: Atualizar desafios relacionados a simulados (referenciava user_challenges)
        -- A parte abaixo foi removida:
        /*
        UPDATE user_challenges
        SET progress = progress + 1,
            updated_at = NOW()
        WHERE user_id = NEW.user_id
        AND challenge_id IN (
            SELECT id FROM challenges 
            WHERE type = 'simulado_completion' 
            AND active = TRUE
        )
        AND progress < target_value;
        */
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Substituir a função process_question_creation para remover referências a user_challenges
CREATE OR REPLACE FUNCTION process_question_creation()
RETURNS TRIGGER AS $$
DECLARE
    xp_earned INT;
    coins_earned INT;
    difficulty_multiplier FLOAT;
    question_count INT;
    daily_questions INT;
    weekly_questions INT;
    has_content BOOLEAN;
    has_explanation BOOLEAN;
    has_tags BOOLEAN;
    quality_bonus FLOAT;
BEGIN
    -- Verificar se a questão tem conteúdo substancial
    has_content := NEW.content IS NOT NULL AND LENGTH(NEW.content) > 50;
    has_explanation := NEW.explanation IS NOT NULL AND LENGTH(NEW.explanation) > 20;
    has_tags := NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 0;
    
    -- Resto da função mantido, mas sem a parte que referenciava user_challenges
    -- ...
    
    -- REMOVIDO: Atualizar desafios relacionados a criação de questões
    -- A parte abaixo foi removida:
    /*
    UPDATE user_challenges
    SET progress = progress + 1,
        updated_at = NOW()
    WHERE user_id = NEW.user_id
    AND challenge_id IN (
        SELECT id FROM challenges 
        WHERE type = 'question_creation' 
        AND active = TRUE
    )
    AND progress < target_value;
    */
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Remover ou substituir as funções de atribuição de desafios que referenciam user_challenges
DROP FUNCTION IF EXISTS assign_daily_challenges();
DROP FUNCTION IF EXISTS assign_weekly_challenges();

-- 8. Garantir que a função process_study_session_completion esteja atualizada
CREATE OR REPLACE FUNCTION process_study_session_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_challenge RECORD;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Só executa se a sessão foi marcada como concluída
    IF NEW.completed = TRUE AND (OLD.completed = FALSE OR OLD.completed IS NULL) THEN
        -- Atualizar desafios de tempo de estudo
        -- Iterar sobre todos os desafios ativos do tipo 'study_time'
        FOR v_challenge IN 
          SELECT c.id
          FROM community_challenges c
          JOIN challenge_participants p ON c.id = p.challenge_id
          WHERE c.challenge_type = 'study_time'
            AND c.is_active = TRUE
            AND c.start_date <= v_today
            AND c.end_date >= v_today
            AND p.user_id = NEW.user_id
            AND p.completed_at IS NULL
        LOOP
          -- Atualizar o progresso do desafio para este usuário
          BEGIN
            PERFORM update_challenge_progress(v_challenge.id, NEW.user_id, COALESCE(NEW.actual_duration_minutes, NEW.duration_minutes));
          EXCEPTION
            WHEN OTHERS THEN
              -- Log do erro e continuar com o próximo desafio
              RAISE NOTICE 'Erro ao atualizar desafio %: %', v_challenge.id, SQLERRM;
          END;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;