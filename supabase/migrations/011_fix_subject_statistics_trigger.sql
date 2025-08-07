-- Corrigir função update_subject_statistics para trabalhar com academic_subjects
-- O problema é que a função está tentando inserir academic_subject_id na coluna subject_id
-- da tabela subject_statistics, mas essa tabela referencia subjects(id), não academic_subjects(id)

-- Opção 1: Desabilitar o trigger temporariamente para academic_subjects
-- Vamos modificar a função para só atualizar estatísticas se for um subject tradicional

CREATE OR REPLACE FUNCTION update_subject_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Só atualizar estatísticas se for uma falta tradicional (sem academic_subject_id)
    -- Para academic_subjects, as estatísticas são calculadas via RPC functions
    IF COALESCE(NEW.academic_subject_id, OLD.academic_subject_id) IS NULL THEN
        -- Lógica original para subjects tradicionais (se existir subject_id)
        IF COALESCE(NEW.subject_id, OLD.subject_id) IS NOT NULL THEN
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
        END IF;
    END IF;
    -- Para academic_subjects, não fazemos nada aqui
    -- As estatísticas são calculadas via get_discipline_attendance_stats RPC
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Comentário explicativo
COMMENT ON FUNCTION update_subject_statistics() IS 'Atualiza estatísticas apenas para subjects tradicionais. Academic subjects usam RPC functions para estatísticas.';