-- Criar tabela de estatísticas de matérias (subject_statistics)
CREATE TABLE subject_statistics (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    total_absences INTEGER DEFAULT 0,
    justified_absences INTEGER DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subject_id)
);

-- Adicionar campos para cálculos (serão atualizados via trigger)
ALTER TABLE subject_statistics 
ADD COLUMN attendance_percentage DECIMAL(5,2) DEFAULT 100.00;

ALTER TABLE subject_statistics 
ADD COLUMN status TEXT DEFAULT 'safe';

-- Criar índices
CREATE INDEX idx_subject_statistics_subject_id ON subject_statistics(subject_id);
CREATE INDEX idx_subject_statistics_status ON subject_statistics(status);
CREATE INDEX idx_subject_statistics_calculated_at ON subject_statistics(calculated_at);

-- Habilitar RLS
ALTER TABLE subject_statistics ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view own subject statistics" ON subject_statistics 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = subject_statistics.subject_id 
            AND subjects.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can insert own subject statistics" ON subject_statistics 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = subject_statistics.subject_id 
            AND subjects.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update own subject statistics" ON subject_statistics 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = subject_statistics.subject_id 
            AND subjects.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete own subject statistics" ON subject_statistics 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM subjects 
            WHERE subjects.id = subject_statistics.subject_id 
            AND subjects.user_id = auth.uid()::text
        )
    );

-- Conceder permissões
GRANT SELECT ON subject_statistics TO anon;
GRANT ALL PRIVILEGES ON subject_statistics TO authenticated;

-- Função para atualizar estatísticas automaticamente
CREATE OR REPLACE FUNCTION update_subject_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserir ou atualizar estatísticas para a matéria
    INSERT INTO subject_statistics (subject_id, total_absences, justified_absences)
    SELECT 
        COALESCE(NEW.subject_id, OLD.subject_id),
        COUNT(*),
        COUNT(*) FILTER (WHERE is_justified = true)
    FROM absences 
    WHERE subject_id = COALESCE(NEW.subject_id, OLD.subject_id)
    ON CONFLICT (subject_id) DO UPDATE SET
        total_absences = EXCLUDED.total_absences,
        justified_absences = EXCLUDED.justified_absences,
        calculated_at = NOW();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar estatísticas automaticamente quando faltas são modificadas
DROP TRIGGER IF EXISTS trigger_update_subject_statistics ON absences;
CREATE TRIGGER trigger_update_subject_statistics
    AFTER INSERT OR UPDATE OR DELETE ON absences
    FOR EACH ROW
    EXECUTE FUNCTION update_subject_statistics();