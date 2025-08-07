-- Criar tabela de matérias (subjects)
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    weekly_frequency INTEGER NOT NULL CHECK (weekly_frequency >= 1 AND weekly_frequency <= 7),
    days_of_week INTEGER[] NOT NULL,
    approval_percentage DECIMAL(5,2) NOT NULL CHECK (approval_percentage > 0 AND approval_percentage <= 100),
    class_duration INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas calculadas após criação da tabela
ALTER TABLE subjects 
ADD COLUMN total_classes INTEGER GENERATED ALWAYS AS (
    CASE 
        WHEN start_date IS NOT NULL AND end_date IS NOT NULL AND weekly_frequency IS NOT NULL 
        THEN weekly_frequency * EXTRACT(WEEK FROM (end_date - start_date + INTERVAL '1 day'))
        ELSE 0
    END
) STORED;

ALTER TABLE subjects 
ADD COLUMN allowed_absences INTEGER GENERATED ALWAYS AS (
    CASE 
        WHEN total_classes > 0 AND approval_percentage IS NOT NULL
        THEN FLOOR(total_classes * (100 - approval_percentage) / 100)
        ELSE 0
    END
) STORED;

-- Criar índices
CREATE INDEX idx_subjects_user_id ON subjects(user_id);
CREATE INDEX idx_subjects_start_date ON subjects(start_date);
CREATE INDEX idx_subjects_end_date ON subjects(end_date);

-- Habilitar RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view own subjects" ON subjects 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects" ON subjects 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON subjects 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON subjects 
    FOR DELETE USING (auth.uid() = user_id);

-- Conceder permissões
GRANT SELECT ON subjects TO anon;
GRANT ALL PRIVILEGES ON subjects TO authenticated;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();