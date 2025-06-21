-- Script para adicionar a chave estrangeira entre questions e subjects

-- Primeiro, verifica se existem questões com subject_id inválido
DO $$
DECLARE
    invalid_questions INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_questions
    FROM questions q
    LEFT JOIN subjects s ON q.subject_id = s.id
    WHERE q.subject_id IS NOT NULL AND s.id IS NULL;

    IF invalid_questions > 0 THEN
        RAISE NOTICE 'Existem % questões com subject_id que não corresponde a uma entrada na tabela subjects', invalid_questions;
        RAISE NOTICE 'Recomenda-se corrigir esses dados antes de adicionar a chave estrangeira';
        RAISE NOTICE 'Você pode corrigir isso usando:';
        RAISE NOTICE 'UPDATE questions SET subject_id = NULL WHERE subject_id NOT IN (SELECT id FROM subjects);';
    ELSE
        RAISE NOTICE 'Não há questões com subject_id inválido, pode prosseguir com segurança';
    END IF;
END
$$;

-- Adicionar a chave estrangeira (execute após corrigir os dados, se necessário)
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
        -- Adicionar a chave estrangeira
        ALTER TABLE public.questions
        ADD CONSTRAINT fk_questions_subject
        FOREIGN KEY (subject_id)
        REFERENCES public.subjects(id)
        ON DELETE SET NULL;
        
        -- Adicionar um comentário à constraint para melhor integração com Supabase
        EXECUTE 'COMMENT ON CONSTRAINT fk_questions_subject ON public.questions IS 
        ''@foreignKey (subject_id) references public.subjects (id)''';

        RAISE NOTICE 'Chave estrangeira adicionada com sucesso entre questions.subject_id e subjects.id';
    ELSE
        RAISE NOTICE 'A chave estrangeira já existe. Nenhuma alteração foi feita.';
    END IF;
END
$$; 