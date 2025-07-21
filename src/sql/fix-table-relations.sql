-- Script para corrigir as relações entre tabelas no Supabase
-- Este script verifica e corrige a relação entre questions e disciplines

-- Verificar se a relação entre questions e disciplines existe
DO $$
BEGIN
    -- Verificar se a chave estrangeira já existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'questions'
            AND ccu.table_name = 'disciplines'
            AND ccu.column_name = 'id'
    ) THEN
        -- Se não existir, verificar se a coluna discipline_id existe na tabela questions
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'questions'
            AND column_name = 'discipline_id'
        ) THEN
            -- Adicionar a chave estrangeira
            ALTER TABLE public.questions
            ADD CONSTRAINT fk_questions_discipline
            FOREIGN KEY (discipline_id)
            REFERENCES public.disciplines(id)
            ON DELETE SET NULL;
            
            RAISE NOTICE 'Chave estrangeira adicionada entre questions.discipline_id e disciplines.id';
        ELSE
            RAISE NOTICE 'Coluna discipline_id não existe na tabela questions';
        END IF;
    ELSE
        RAISE NOTICE 'Chave estrangeira entre questions e disciplines já existe';
    END IF;
END
$$;

-- Verificar se a relação entre questions e subjects existe
DO $$
BEGIN
    -- Verificar se a chave estrangeira já existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'questions'
            AND ccu.table_name = 'subjects'
            AND ccu.column_name = 'id'
    ) THEN
        -- Se não existir, verificar se a coluna subject_id existe na tabela questions
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'questions'
            AND column_name = 'subject_id'
        ) THEN
            -- Adicionar a chave estrangeira
            ALTER TABLE public.questions
            ADD CONSTRAINT fk_questions_subject
            FOREIGN KEY (subject_id)
            REFERENCES public.subjects(id)
            ON DELETE SET NULL;
            
            RAISE NOTICE 'Chave estrangeira adicionada entre questions.subject_id e subjects.id';
        ELSE
            RAISE NOTICE 'Coluna subject_id não existe na tabela questions';
        END IF;
    ELSE
        RAISE NOTICE 'Chave estrangeira entre questions e subjects já existe';
    END IF;
END
$$;

-- Adicionar explicitamente as relações RLS para permitir junções
COMMENT ON CONSTRAINT fk_questions_discipline ON public.questions IS 
'@foreignKey (discipline_id) references public.disciplines (id)';

COMMENT ON CONSTRAINT fk_questions_subject ON public.questions IS 
'@foreignKey (subject_id) references public.subjects (id)';

-- Verificar se as tabelas têm as políticas RLS adequadas
DO $$
BEGIN
    -- Verificar se RLS está habilitado para questions
    IF NOT EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE tablename = 'questions'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS habilitado para a tabela questions';
    END IF;
    
    -- Verificar se RLS está habilitado para disciplines
    IF NOT EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE tablename = 'disciplines'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS habilitado para a tabela disciplines';
    END IF;
END
$$;

-- Informações sobre como usar este script
RAISE NOTICE 'Script de correção de relações entre tabelas executado com sucesso.';
RAISE NOTICE 'Para verificar se as relações estão funcionando corretamente, execute:';
RAISE NOTICE 'SELECT q.id, q.content, d.name as discipline_name FROM questions q JOIN disciplines d ON q.discipline_id = d.id LIMIT 5;'; 