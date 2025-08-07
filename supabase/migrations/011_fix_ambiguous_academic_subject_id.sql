-- Corrigir ambiguidade na função get_discipline_attendance_stats
DROP FUNCTION IF EXISTS get_discipline_attendance_stats(bigint,uuid);

-- Recriar função com qualificação adequada para evitar ambiguidade
CREATE OR REPLACE FUNCTION get_discipline_attendance_stats(p_academic_subject_id BIGINT, p_user_id UUID)
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
    subject_data RECORD;
BEGIN
    -- Buscar dados da matéria acadêmica
    SELECT * INTO subject_data
    FROM academic_subjects
    WHERE id = p_academic_subject_id AND user_id = p_user_id::text;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Matéria acadêmica não encontrada';
    END IF;
    
    -- Contar faltas da matéria acadêmica (usando alias para evitar ambiguidade)
    SELECT COUNT(*)
    INTO total_abs
    FROM absences a
    WHERE a.academic_subject_id = p_academic_subject_id AND a.user_id = p_user_id::text;
    
    -- Usar faltas permitidas da matéria acadêmica
    allowed_abs := subject_data.allowed_absences;
    
    -- Calcular faltas restantes
    remaining_abs := GREATEST(allowed_abs - total_abs, 0);
    
    -- Calcular porcentagem de frequência
    IF subject_data.total_classes > 0 THEN
        attendance_pct := GREATEST(100 - (total_abs::DECIMAL / subject_data.total_classes * 100), 0);
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
$$ LANGUAGE plpgsql