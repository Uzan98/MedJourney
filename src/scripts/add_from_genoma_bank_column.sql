-- Adicionar a coluna from_genoma_bank à tabela questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS from_genoma_bank BOOLEAN DEFAULT FALSE;

-- Verificar se as políticas existem antes de tentar alterá-las
DO $$ 
BEGIN
    -- Verificar se a política "Questões públicas são visíveis para todos" existe
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'questions' 
        AND policyname = 'Questões públicas são visíveis para todos'
    ) THEN
        -- Atualizar a política existente
        ALTER POLICY "Questões públicas são visíveis para todos" ON questions
        USING (is_public = true);
    ELSE
        -- Criar a política se não existir
        CREATE POLICY "Questões públicas são visíveis para todos" ON questions
        FOR SELECT USING (is_public = true);
    END IF;

    -- Verificar se a política "Usuários podem ler suas próprias questões" existe
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'questions' 
        AND policyname = 'Usuários podem ler suas próprias questões'
    ) THEN
        -- Atualizar a política existente
        ALTER POLICY "Usuários podem ler suas próprias questões" ON questions
        USING (auth.uid() = user_id);
    ELSE
        -- Criar a política se não existir
        CREATE POLICY "Usuários podem ler suas próprias questões" ON questions
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'questions' 
  AND column_name = 'from_genoma_bank'; 