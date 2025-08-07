-- Adicionar campo academic_subject_id na tabela absences
ALTER TABLE absences 
ADD COLUMN academic_subject_id INTEGER REFERENCES academic_subjects(id) ON DELETE SET NULL;

-- Criar índice para o novo campo
CREATE INDEX idx_absences_academic_subject_id ON absences(academic_subject_id);

-- Atualizar políticas RLS para incluir o novo campo
DROP POLICY IF EXISTS "Users can view own absences" ON absences;
DROP POLICY IF EXISTS "Users can insert own absences" ON absences;
DROP POLICY IF EXISTS "Users can update own absences" ON absences;
DROP POLICY IF EXISTS "Users can delete own absences" ON absences;

-- Habilitar RLS se não estiver habilitado
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- Recriar políticas RLS atualizadas
CREATE POLICY "Users can view own absences" ON absences 
    FOR SELECT USING (
        user_id = auth.uid()::text OR 
        (academic_subject_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM academic_subjects 
            WHERE academic_subjects.id = absences.academic_subject_id 
            AND academic_subjects.user_id = auth.uid()::text
        ))
    );

CREATE POLICY "Users can insert own absences" ON absences 
    FOR INSERT WITH CHECK (
        user_id = auth.uid()::text AND 
        (academic_subject_id IS NULL OR EXISTS (
            SELECT 1 FROM academic_subjects 
            WHERE academic_subjects.id = absences.academic_subject_id 
            AND academic_subjects.user_id = auth.uid()::text
        ))
    );

CREATE POLICY "Users can update own absences" ON absences 
    FOR UPDATE USING (
        user_id = auth.uid()::text AND 
        (academic_subject_id IS NULL OR EXISTS (
            SELECT 1 FROM academic_subjects 
            WHERE academic_subjects.id = absences.academic_subject_id 
            AND academic_subjects.user_id = auth.uid()::text
        ))
    );

CREATE POLICY "Users can delete own absences" ON absences 
    FOR DELETE USING (
        user_id = auth.uid()::text OR 
        (academic_subject_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM academic_subjects 
            WHERE academic_subjects.id = absences.academic_subject_id 
            AND academic_subjects.user_id = auth.uid()::text
        ))
    );

-- Comentário para o novo campo
COMMENT ON COLUMN absences.academic_subject_id IS 'ID da matéria acadêmica associada à falta';

-- Atualizar a função de estatísticas para usar academic_subject_id
CREATE OR REPLACE FUNCTION update_subject_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar estatísticas para a matéria acadêmica se academic_subject_id estiver presente
    IF COALESCE(NEW.academic_subject_id, OLD.academic_subject_id) IS NOT NULL THEN
        INSERT INTO subject_statistics (subject_id, total_absences, justified_absences)
        SELECT 
            COALESCE(NEW.academic_subject_id, OLD.academic_subject_id),
            COUNT(*),
            COUNT(*) FILTER (WHERE is_justified = true)
        FROM absences 
        WHERE academic_subject_id = COALESCE(NEW.academic_subject_id, OLD.academic_subject_id)
        ON CONFLICT (subject_id) DO UPDATE SET
            total_absences = EXCLUDED.total_absences,
            justified_absences = EXCLUDED.justified_absences,
            calculated_at = NOW();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger
DROP TRIGGER IF EXISTS trigger_update_subject_statistics ON absences;
CREATE TRIGGER trigger_update_subject_statistics
    AFTER INSERT OR UPDATE OR DELETE ON absences
    FOR EACH ROW
    EXECUTE FUNCTION update_subject_statistics();

-- Conceder permissões
GRANT SELECT ON absences TO anon;
GRANT ALL PRIVILEGES ON absences TO authenticated;