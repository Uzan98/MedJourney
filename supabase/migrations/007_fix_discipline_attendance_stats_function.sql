-- Corrigir função get_discipline_attendance_stats para usar academic_subject_id corretamente
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
    -- Contar faltas da disciplina (corrigido para usar academic_subject_id diretamente)
    SELECT COUNT(*)
    INTO total_abs
    FROM absences a
    WHERE a.academic_subject_id = discipline_id AND a.user_id = user_id_param;
    
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