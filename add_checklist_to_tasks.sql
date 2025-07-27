-- Script SQL para adicionar funcionalidade de checklist às tarefas
-- Execute este script no console SQL do Supabase
-- Acesse: https://app.supabase.com/project/seu-projeto/sql
-- Cole este script e clique em "Run"

-- Adicionar coluna checklist à tabela tasks
ALTER TABLE tasks ADD COLUMN checklist JSONB DEFAULT '[]'::jsonb;

-- Adicionar comentário para documentar o campo
COMMENT ON COLUMN tasks.checklist IS 'Lista de itens de checklist em formato JSON com estrutura: [{"id": "string", "text": "string", "completed": boolean}]';

-- Criar índice para melhorar performance de consultas na checklist
CREATE INDEX idx_tasks_checklist ON tasks USING GIN (checklist);

-- Exemplo de estrutura JSON esperada para a checklist:
-- [
--   {
--     "id": "1",
--     "text": "Item da checklist 1",
--     "completed": false
--   },
--   {
--     "id": "2", 
--     "text": "Item da checklist 2",
--     "completed": true
--   }
-- ]

-- Verificar se a coluna foi adicionada corretamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'checklist';