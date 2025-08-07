-- Expandir tabela absences existente com novas colunas

-- Adicionar novas colunas à tabela absences
ALTER TABLE absences 
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE;

ALTER TABLE absences 
ADD COLUMN IF NOT EXISTS is_justified BOOLEAN DEFAULT false;

ALTER TABLE absences 
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Renomear coluna date para absence_date se necessário (manter compatibilidade)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'absences' AND column_name = 'date') THEN
        ALTER TABLE absences RENAME COLUMN date TO absence_date;
    END IF;
END $$;

-- Adicionar coluna absence_date se não existir
ALTER TABLE absences 
ADD COLUMN IF NOT EXISTS absence_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Criar novos índices
CREATE INDEX IF NOT EXISTS idx_absences_subject_id ON absences(subject_id);
CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(absence_date);
CREATE INDEX IF NOT EXISTS idx_absences_justified ON absences(is_justified);
CREATE INDEX IF NOT EXISTS idx_absences_user_subject ON absences(user_id, subject_id);

-- Atualizar políticas RLS existentes
DROP POLICY IF EXISTS "Users can view own absences" ON absences;
DROP POLICY IF EXISTS "Users can insert own absences" ON absences;
DROP POLICY IF EXISTS "Users can update own absences" ON absences;
DROP POLICY IF EXISTS "Users can delete own absences" ON absences;

-- Criar novas políticas RLS
CREATE POLICY "Users can view own absences" ON absences 
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = absences.subject_id 
            AND subjects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own absences" ON absences 
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        (subject_id IS NULL OR EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = absences.subject_id 
            AND subjects.user_id = auth.uid()
        ))
    );

CREATE POLICY "Users can update own absences" ON absences 
    FOR UPDATE USING (
        auth.uid() = user_id AND
        (subject_id IS NULL OR EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = absences.subject_id 
            AND subjects.user_id = auth.uid()
        ))
    );

CREATE POLICY "Users can delete own absences" ON absences 
    FOR DELETE USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = absences.subject_id 
            AND subjects.user_id = auth.uid()
        )
    );

-- Garantir que as permissões estão corretas
GRANT SELECT ON absences TO anon;
GRANT ALL PRIVILEGES ON absences TO authenticated;

-- Função para migrar dados existentes (se necessário)
CREATE OR REPLACE FUNCTION migrate_existing_absences()
RETURNS void AS $$
BEGIN
    -- Esta função pode ser usada para migrar dados existentes se necessário
    -- Por exemplo, associar faltas existentes a matérias baseado no nome da disciplina
    RAISE NOTICE 'Migration function created. Run manually if data migration is needed.';
END;
$$ LANGUAGE plpgsql;