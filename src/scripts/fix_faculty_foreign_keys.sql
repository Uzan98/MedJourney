-- Script para adicionar chaves estrangeiras na tabela faculty_members
-- Isso melhora a integridade referencial e permite joins implícitos

-- Verificar se a tabela faculty_members existe
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'faculty_members'
    ) THEN
        -- Verificar se a chave estrangeira para faculties já existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'faculty_members_faculty_id_fkey' 
            AND table_name = 'faculty_members'
        ) THEN
            -- Adicionar chave estrangeira para faculties
            ALTER TABLE public.faculty_members
            ADD CONSTRAINT faculty_members_faculty_id_fkey
            FOREIGN KEY (faculty_id)
            REFERENCES public.faculties(id)
            ON DELETE CASCADE;
            
            RAISE NOTICE 'Chave estrangeira faculty_members_faculty_id_fkey adicionada com sucesso';
        ELSE
            RAISE NOTICE 'Chave estrangeira faculty_members_faculty_id_fkey já existe';
        END IF;
        
        -- Verificar se a chave estrangeira para users já existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'faculty_members_user_id_fkey' 
            AND table_name = 'faculty_members'
        ) THEN
            -- Adicionar chave estrangeira para users
            ALTER TABLE public.faculty_members
            ADD CONSTRAINT faculty_members_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES auth.users(id)
            ON DELETE CASCADE;
            
            RAISE NOTICE 'Chave estrangeira faculty_members_user_id_fkey adicionada com sucesso';
        ELSE
            RAISE NOTICE 'Chave estrangeira faculty_members_user_id_fkey já existe';
        END IF;
    ELSE
        RAISE NOTICE 'A tabela faculty_members não existe';
    END IF;
END $$; 