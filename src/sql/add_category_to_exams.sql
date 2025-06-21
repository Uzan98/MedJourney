-- Script para adicionar a coluna de categoria à tabela exams
-- Este script pode ser executado na interface de administração do Supabase ou via API

-- Adicionar coluna de categoria à tabela exams
ALTER TABLE exams ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Atualizar as políticas RLS para incluir a nova coluna
COMMENT ON TABLE exams IS 'Tabela de simulados com suporte a categorias para melhor organização';

-- Criar um índice para melhorar as consultas por categoria
CREATE INDEX IF NOT EXISTS exams_category_idx ON exams (category);

-- Adicionar comentário à coluna
COMMENT ON COLUMN exams.category IS 'Categoria do simulado (ex: Cardiologia, Pediatria, etc)';

-- Exemplo de atualização de alguns simulados com categorias
-- UPDATE exams SET category = 'Cardiologia' WHERE id = 1;
-- UPDATE exams SET category = 'Pediatria' WHERE id = 2; 