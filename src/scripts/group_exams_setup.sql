-- Verificar e corrigir a referência da chave estrangeira
DO $$
BEGIN
    -- Verificar se a tabela existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_exams') THEN
        -- Verificar se a constraint existe com referência errada
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'group_exams_added_by_fkey' 
                   AND table_name = 'group_exams') THEN
            -- Remover a constraint existente
            ALTER TABLE public.group_exams DROP CONSTRAINT group_exams_added_by_fkey;
            
            -- Adicionar a constraint correta
            ALTER TABLE public.group_exams 
            ADD CONSTRAINT group_exams_added_by_fkey 
            FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Referência de chave estrangeira corrigida para auth.users';
        END IF;
    END IF;
END;
$$;

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS public.group_exams (
    id SERIAL PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    exam_id INTEGER NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, exam_id)
);

-- Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_group_exams_group_id ON public.group_exams(group_id);
CREATE INDEX IF NOT EXISTS idx_group_exams_exam_id ON public.group_exams(exam_id);
CREATE INDEX IF NOT EXISTS idx_group_exams_added_by ON public.group_exams(added_by);

-- Configurar permissões RLS (Row Level Security)
ALTER TABLE public.group_exams ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se necessário
DO $$
BEGIN
    -- Verificar e remover políticas existentes
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_exams' AND policyname = 'insert_group_exams') THEN
        DROP POLICY insert_group_exams ON public.group_exams;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_exams' AND policyname = 'select_group_exams') THEN
        DROP POLICY select_group_exams ON public.group_exams;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_exams' AND policyname = 'delete_group_exams') THEN
        DROP POLICY delete_group_exams ON public.group_exams;
    END IF;
END;
$$;

-- Criar políticas
CREATE POLICY insert_group_exams ON public.group_exams
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.study_group_members 
            WHERE study_group_members.user_id = auth.uid() 
            AND study_group_members.group_id = group_id
        )
    );

CREATE POLICY select_group_exams ON public.group_exams
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.study_group_members 
            WHERE study_group_members.user_id = auth.uid() 
            AND study_group_members.group_id = group_id
        )
    );

CREATE POLICY delete_group_exams ON public.group_exams
    FOR DELETE 
    TO authenticated
    USING (
        added_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.study_group_members 
            WHERE study_group_members.user_id = auth.uid() 
            AND study_group_members.group_id = group_id
            AND study_group_members.is_admin = true
        )
    );

-- Remover função existente se necessário
DROP FUNCTION IF EXISTS public.add_exam_to_group;

-- Função RPC para adicionar simulado ao grupo com segurança
CREATE OR REPLACE FUNCTION public.add_exam_to_group(p_group_id UUID, p_exam_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_member BOOLEAN;
    v_exists BOOLEAN;
BEGIN
    -- Obter ID do usuário atual
    v_user_id := auth.uid();
    
    -- Verificar se o usuário é membro do grupo
    SELECT EXISTS (
        SELECT 1 FROM public.study_group_members 
        WHERE user_id = v_user_id AND group_id = p_group_id
    ) INTO v_is_member;
    
    IF NOT v_is_member THEN
        RAISE EXCEPTION 'Usuário não é membro do grupo';
    END IF;
    
    -- Verificar se o simulado já está no grupo
    SELECT EXISTS (
        SELECT 1 FROM public.group_exams 
        WHERE group_id = p_group_id AND exam_id = p_exam_id
    ) INTO v_exists;
    
    IF v_exists THEN
        RETURN TRUE; -- Simulado já está no grupo
    END IF;
    
    -- Adicionar o simulado ao grupo
    INSERT INTO public.group_exams (group_id, exam_id, added_by, created_at)
    VALUES (p_group_id, p_exam_id, v_user_id, NOW());
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao adicionar simulado: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Comentários da tabela
COMMENT ON TABLE public.group_exams IS 'Associação entre simulados e grupos de estudos';
COMMENT ON COLUMN public.group_exams.id IS 'ID único da associação';
COMMENT ON COLUMN public.group_exams.group_id IS 'ID do grupo de estudos';
COMMENT ON COLUMN public.group_exams.exam_id IS 'ID do simulado';
COMMENT ON COLUMN public.group_exams.added_by IS 'ID do usuário que adicionou o simulado ao grupo';
COMMENT ON COLUMN public.group_exams.created_at IS 'Data de adição do simulado ao grupo'; 