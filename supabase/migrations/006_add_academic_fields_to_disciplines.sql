-- Adicionar campos acadêmicos à tabela disciplines
ALTER TABLE disciplines 
ADD COLUMN semester_start_date DATE,
ADD COLUMN semester_end_date DATE,
ADD COLUMN weekly_frequency INTEGER DEFAULT 1,
ADD COLUMN minimum_attendance_percentage DECIMAL(5,2) DEFAULT 75.00,
ADD COLUMN class_schedule JSONB,
ADD COLUMN is_academic BOOLEAN DEFAULT false;

-- Comentários para documentar os novos campos
COMMENT ON COLUMN disciplines.semester_start_date IS 'Data de início do semestre/período letivo';
COMMENT ON COLUMN disciplines.semester_end_date IS 'Data de término do semestre/período letivo';
COMMENT ON COLUMN disciplines.weekly_frequency IS 'Número de aulas por semana';
COMMENT ON COLUMN disciplines.minimum_attendance_percentage IS 'Porcentagem mínima de frequência para aprovação';
COMMENT ON COLUMN disciplines.class_schedule IS 'Horários das aulas em formato JSON';
COMMENT ON COLUMN disciplines.is_academic IS 'Indica se a disciplina é acadêmica (com controle de faltas)';

-- Índices para melhorar performance
CREATE INDEX idx_disciplines_is_academic ON disciplines(is_academic);
CREATE INDEX idx_disciplines_semester_dates ON disciplines(semester_start_date, semester_end_date);

-- Função para calcular faltas permitidas baseado na frequência semanal e duração do semestre
CREATE OR REPLACE FUNCTION calculate_allowed_absences(discipline_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    weekly_freq INTEGER;
    start_date DATE;
    end_date DATE;
    min_attendance DECIMAL(5,2);
    total_weeks INTEGER;
    total_classes INTEGER;
    allowed_absences INTEGER;
BEGIN
    -- Buscar dados da disciplina
    SELECT weekly_frequency, semester_start_date, semester_end_date, minimum_attendance_percentage
    INTO weekly_freq, start_date, end_date, min_attendance
    FROM disciplines
    WHERE id = discipline_id;
    
    -- Se não encontrou a disciplina ou dados incompletos, retorna 0
    IF weekly_freq IS NULL OR start_date IS NULL OR end_date IS NULL OR min_attendance IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calcular número de semanas
    total_weeks := EXTRACT(DAYS FROM (end_date - start_date)) / 7;
    
    -- Calcular total de aulas
    total_classes := total_weeks * weekly_freq;
    
    -- Calcular faltas permitidas (100% - porcentagem mínima)
    allowed_absences := FLOOR(total_classes * (100 - min_attendance) / 100);
    
    RETURN GREATEST(allowed_absences, 0);
END;
$$ LANGUAGE plpgsql;

-- Função para calcular estatísticas de frequência de uma disciplina
CREATE OR REPLACE FUNCTION get_discipline_attendance_stats(discipline_id BIGINT, user_id_param UUID)
RETURNS TABLE (
    total_absences INTEGER,
    allowed_absences INTEGER,
    remaining_absences INTEGER,
    attendance_percentage DECIMAL(5,2),
    risk_status TEXT
) AS $$
DECLARE
    total_abs INTEGER;
    allowed_abs INTEGER;
    remaining_abs INTEGER;
    attendance_pct DECIMAL(5,2);
    risk TEXT;
BEGIN
    -- Contar faltas da disciplina
    SELECT COUNT(*)
    INTO total_abs
    FROM absences a
    JOIN disciplines d ON d.id = a.academic_subject_id
    WHERE d.id = discipline_id AND a.user_id = user_id_param;
    
    -- Calcular faltas permitidas
    SELECT calculate_allowed_absences(discipline_id) INTO allowed_abs;
    
    -- Calcular faltas restantes
    remaining_abs := GREATEST(allowed_abs - total_abs, 0);
    
    -- Calcular porcentagem de frequência
    IF allowed_abs > 0 THEN
        attendance_pct := GREATEST(100 - (total_abs::DECIMAL / (allowed_abs + total_abs) * 100), 0);
    ELSE
        attendance_pct := 100;
    END IF;
    
    -- Determinar status de risco
    IF remaining_abs = 0 THEN
        risk := 'critical';
    ELSIF remaining_abs <= 2 THEN
        risk := 'warning';
    ELSE
        risk := 'safe';
    END IF;
    
    RETURN QUERY SELECT total_abs, allowed_abs, remaining_abs, attendance_pct, risk;
END;
$$ LANGUAGE plpgsql;

-- Atualizar RLS policies se necessário
-- As policies existentes da tabela disciplines já devem cobrir os novos campos