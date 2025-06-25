-- Script para corrigir o problema com o trigger de criação de questões
-- O problema é causado pelo trigger question_creation_trigger que tenta inserir registros em tabelas que não existem mais

-- 1. Remover o trigger que está causando o erro
DROP TRIGGER IF EXISTS question_creation_trigger ON questions;

-- 2. Criar uma versão simplificada da função process_question_creation que não depende das tabelas de gamificação
CREATE OR REPLACE FUNCTION process_question_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Esta função foi simplificada para não depender mais das tabelas de gamificação
    -- A versão original tentava atualizar XP, moedas e conquistas do usuário
    
    -- Aqui poderíamos adicionar qualquer lógica necessária que não dependa das tabelas removidas
    -- Por exemplo, poderíamos atualizar estatísticas ou fazer outras operações
    
    -- Por enquanto, apenas retornamos o registro sem fazer nada
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recriar o trigger com a nova função simplificada (opcional)
-- Descomente as linhas abaixo se você quiser recriar o trigger
/*
CREATE TRIGGER question_creation_trigger
AFTER INSERT ON questions
FOR EACH ROW
EXECUTE FUNCTION process_question_creation();
*/ 