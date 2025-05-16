-- Script para adicionar a coluna metadata à tabela smart_plan_sessions
-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'smart_plan_sessions' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE smart_plan_sessions ADD COLUMN metadata JSONB;
    END IF;
END$$;

-- Comentário para documentar a alteração
COMMENT ON COLUMN smart_plan_sessions.metadata IS 'Campo para armazenar metadados adicionais da sessão, como intervalo de revisão, dificuldade e importância'; 