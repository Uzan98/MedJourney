-- Script para inserir questões de exemplo no banco de dados
-- Execute este script no Console SQL do Supabase para popular o banco com questões de exemplo

-- Função para inserir questões de exemplo para um usuário específico
CREATE OR REPLACE FUNCTION create_sample_questions(p_user_id UUID)
RETURNS void AS $$
DECLARE
    discipline_id BIGINT;
    subject_id BIGINT;
    question_id BIGINT;
    subject_ids BIGINT[];
BEGIN
    -- Verificar se já existem questões para o usuário
    IF EXISTS (SELECT 1 FROM public.questions WHERE user_id = p_user_id LIMIT 1) THEN
        RAISE NOTICE 'Usuário já possui questões, pulando criação de questões de exemplo';
        RETURN;
    END IF;

    -- Verificar se o usuário possui disciplinas
    IF NOT EXISTS (SELECT 1 FROM public.disciplines WHERE user_id = p_user_id LIMIT 1) THEN
        -- Se não tiver, criar disciplinas de amostra primeiro
        PERFORM create_sample_disciplines(p_user_id);
    END IF;

    -- Obter IDs das disciplinas do usuário
    SELECT ARRAY_AGG(id) INTO subject_ids
    FROM public.subjects
    WHERE user_id = p_user_id;

    -- Se não houver assuntos, criar alguns
    IF subject_ids IS NULL OR ARRAY_LENGTH(subject_ids, 1) IS NULL THEN
        -- Obter ID de uma disciplina
        SELECT id INTO discipline_id
        FROM public.disciplines
        WHERE user_id = p_user_id
        LIMIT 1;

        -- Criar um assunto se nenhum existir
        IF discipline_id IS NOT NULL THEN
            INSERT INTO public.subjects (
                discipline_id, user_id, title, name, content, 
                status, difficulty, importance, estimated_hours
            )
            VALUES 
                (discipline_id, p_user_id, 'Hipertensão Arterial', 'Hipertensão Arterial', 
                'Estudo sobre diagnóstico e tratamento da hipertensão', 
                'in_progress', 'média', 'alta', 4),
                (discipline_id, p_user_id, 'Diabetes Mellitus', 'Diabetes Mellitus', 
                'Fisiopatologia e manejo do diabetes', 
                'pending', 'média', 'alta', 3)
            RETURNING id INTO subject_id;

            -- Atualizar array de assuntos
            SELECT ARRAY_AGG(id) INTO subject_ids
            FROM public.subjects
            WHERE user_id = p_user_id;
        END IF;
    END IF;

    -- Obter primeira disciplina do usuário
    SELECT id INTO discipline_id
    FROM public.disciplines
    WHERE user_id = p_user_id
    LIMIT 1;

    -- Adicionar questões de exemplo
    IF discipline_id IS NOT NULL THEN
        -- Questão 1: Múltipla escolha
        INSERT INTO public.questions (
            user_id, discipline_id, subject_id, content, explanation, 
            difficulty, question_type, tags
        )
        VALUES (
            p_user_id, 
            discipline_id, 
            subject_ids[1],
            'Qual é o tratamento de primeira linha para hipertensão em pacientes com diabetes?',
            'O tratamento de primeira linha mais recomendado é um inibidor da enzima conversora de angiotensina (IECA) ou bloqueador do receptor da angiotensina (BRA) devido à proteção renal adicional.',
            'média',
            'multiple_choice',
            ARRAY['hipertensão', 'diabetes', 'tratamento']
        )
        RETURNING id INTO question_id;

        -- Adicionar opções para a questão de múltipla escolha
        INSERT INTO public.answer_options (
            question_id, text, is_correct
        )
        VALUES
            (question_id, 'IECA ou BRA', TRUE),
            (question_id, 'Beta-bloqueadores', FALSE),
            (question_id, 'Bloqueadores de canais de cálcio', FALSE),
            (question_id, 'Diuréticos tiazídicos', FALSE);

        -- Questão 2: Verdadeiro/Falso
        INSERT INTO public.questions (
            user_id, discipline_id, subject_id, content, explanation, 
            difficulty, question_type, correct_answer, tags
        )
        VALUES (
            p_user_id, 
            discipline_id, 
            subject_ids[1],
            'Pacientes com fibrilação atrial devem sempre receber anticoagulação.',
            'Falso. A decisão sobre anticoagulação em pacientes com fibrilação atrial deve ser baseada na avaliação de risco de AVC (ex.: escore CHA2DS2-VASc) e no risco de sangramento (ex.: escore HAS-BLED).',
            'baixa',
            'true_false',
            'false',
            ARRAY['fibrilação atrial', 'anticoagulação', 'cardiologia']
        );

        -- Questão 3: Dissertativa
        INSERT INTO public.questions (
            user_id, discipline_id, subject_id, content, explanation, 
            difficulty, question_type, correct_answer, tags
        )
        VALUES (
            p_user_id, 
            discipline_id, 
            subject_ids[array_length(subject_ids, 1)],
            'Descreva os mecanismos fisiopatológicos da insuficiência cardíaca com fração de ejeção preservada (ICFEp).',
            'A ICFEp é caracterizada por disfunção diastólica, rigidez ventricular, fibrose miocárdica, diminuição da complacência ventricular, disfunção microvascular e inflamação. A disfunção diastólica resulta em pressões de enchimento elevadas, causando sintomas de congestão pulmonar e edema.',
            'alta',
            'essay',
            'A ICFEp envolve disfunção diastólica, rigidez ventricular, fibrose miocárdica e disfunção endotelial. Caracteriza-se pela preservação da fração de ejeção (>50%) com sintomas de insuficiência cardíaca.',
            ARRAY['insuficiência cardíaca', 'fisiopatologia', 'fração de ejeção preservada']
        );
    END IF;

    RAISE NOTICE 'Questões de exemplo criadas para o usuário %', p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Mensagem final e instruções de uso
DO $$
BEGIN
    RAISE NOTICE 'Script para inserção de questões de exemplo pronto!';
    RAISE NOTICE 'Para criar questões de exemplo, execute: SELECT create_sample_questions(''seu-user-id-aqui'');';
END
$$; 