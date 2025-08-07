-- Criar tabela de matérias acadêmicas (academic_subjects)
CREATE TABLE academic_subjects (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    weekly_frequency INTEGER NOT NULL CHECK (weekly_frequency > 0 AND weekly_frequency <= 7),
    days_of_week TEXT[] NOT NULL, -- Array de dias da semana: ['monday', 'tuesday', etc.]
    approval_percentage DECIMAL(5,2) NOT NULL DEFAULT 75.00 CHECK (approval_percentage >= 0 AND approval_percentage <= 100),
    class_duration INTEGER NOT NULL DEFAULT 60, -- Duração da aula em minutos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas calculadas (serão atualizadas via trigger)
ALTER TABLE academic_subjects 
ADD COLUMN total_classes INTEGER DEFAULT 0;

ALTER TABLE academic_subjects 
ADD COLUMN allowed_absences INTEGER DEFAULT 0;

-- Criar índices
CREATE INDEX idx_academic_subjects_user_id ON academic_subjects(user_id);
CREATE INDEX idx_academic_subjects_name ON academic_subjects(name);
CREATE INDEX idx_academic_subjects_dates ON academic_subjects(start_date, end_date);

-- Habilitar RLS
ALTER TABLE academic_subjects ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view own academic subjects" ON academic_subjects 
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own academic subjects" ON academic_subjects 
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own academic subjects" ON academic_subjects 
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own academic subjects" ON academic_subjects 
    FOR DELETE USING (user_id = auth.uid()::text);

-- Conceder permissões
GRANT SELECT ON academic_subjects TO anon;
GRANT ALL PRIVILEGES ON academic_subjects TO authenticated;

-- Função para calcular campos automáticos
CREATE OR REPLACE FUNCTION calculate_academic_subject_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar updated_at
    NEW.updated_at = NOW();
    
    -- Calcular total_classes
    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL AND NEW.weekly_frequency > 0 THEN
        NEW.total_classes = ((NEW.end_date - NEW.start_date) / 7) * NEW.weekly_frequency;
    ELSE
        NEW.total_classes = 0;
    END IF;
    
    -- Calcular allowed_absences
    IF NEW.total_classes > 0 AND NEW.approval_percentage > 0 THEN
        NEW.allowed_absences = FLOOR(NEW.total_classes * (100 - NEW.approval_percentage) / 100);
    ELSE
        NEW.allowed_absences = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_academic_subject_fields
    BEFORE INSERT OR UPDATE ON academic_subjects
    FOR EACH ROW
    EXECUTE FUNCTION calculate_academic_subject_fields();

-- Comentários
COMMENT ON TABLE academic_subjects IS 'Tabela para armazenar matérias acadêmicas dos usuários';
COMMENT ON COLUMN academic_subjects.name IS 'Nome da matéria acadêmica';
COMMENT ON COLUMN academic_subjects.start_date IS 'Data de início da matéria';
COMMENT ON COLUMN academic_subjects.end_date IS 'Data de fim da matéria';
COMMENT ON COLUMN academic_subjects.weekly_frequency IS 'Frequência semanal de aulas (1-7)';
COMMENT ON COLUMN academic_subjects.days_of_week IS 'Dias da semana que a matéria acontece';
COMMENT ON COLUMN academic_subjects.approval_percentage IS 'Porcentagem mínima de presença para aprovação';
COMMENT ON COLUMN academic_subjects.class_duration IS 'Duração de cada aula em minutos';
COMMENT ON COLUMN academic_subjects.total_classes IS 'Total de aulas calculado automaticamente';
COMMENT ON COLUMN academic_subjects.allowed_absences IS 'Número de faltas permitidas calculado automaticamente';