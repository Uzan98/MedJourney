-- Script COMPLETO para cadastrar disciplinas, assuntos e tópicos no banco de questões
-- Gerado automaticamente a partir do arquivo genomedbanco JSON
-- Execute este script no Supabase SQL Editor

-- IMPORTANTE: Substitua o UUID abaixo por um UUID válido do seu sistema
-- Execute primeiro: SELECT id FROM auth.users LIMIT 1;
DO $$
DECLARE
    system_user_id UUID := '9e959500-f290-4457-a5d7-2a81c496d123'; -- SUBSTITUA POR UM UUID VÁLIDO
BEGIN

-- ========================================
-- 1. INSERIR DISCIPLINAS
-- ========================================

-- Cirurgia Geral
IF NOT EXISTS (SELECT 1 FROM disciplines WHERE name = 'Cirurgia Geral' AND user_id = system_user_id) THEN
    INSERT INTO disciplines (user_id, name, description, is_system, created_at, updated_at)
    VALUES (system_user_id, 'Cirurgia Geral', 'Disciplina de Cirurgia Geral', true, NOW(), NOW());
END IF;

-- Clínica Médica
IF NOT EXISTS (SELECT 1 FROM disciplines WHERE name = 'Clínica Médica' AND user_id = system_user_id) THEN
    INSERT INTO disciplines (user_id, name, description, is_system, created_at, updated_at)
    VALUES (system_user_id, 'Clínica Médica', 'Disciplina de Clínica Médica', true, NOW(), NOW());
END IF;

-- Ginecologia e Obstetrícia
IF NOT EXISTS (SELECT 1 FROM disciplines WHERE name = 'Ginecologia e Obstetrícia' AND user_id = system_user_id) THEN
    INSERT INTO disciplines (user_id, name, description, is_system, created_at, updated_at)
    VALUES (system_user_id, 'Ginecologia e Obstetrícia', 'Disciplina de Ginecologia e Obstetrícia', true, NOW(), NOW());
END IF;

-- Medicina Preventiva
IF NOT EXISTS (SELECT 1 FROM disciplines WHERE name = 'Medicina Preventiva' AND user_id = system_user_id) THEN
    INSERT INTO disciplines (user_id, name, description, is_system, created_at, updated_at)
    VALUES (system_user_id, 'Medicina Preventiva', 'Disciplina de Medicina Preventiva', true, NOW(), NOW());
END IF;

-- Pediatria
IF NOT EXISTS (SELECT 1 FROM disciplines WHERE name = 'Pediatria' AND user_id = system_user_id) THEN
    INSERT INTO disciplines (user_id, name, description, is_system, created_at, updated_at)
    VALUES (system_user_id, 'Pediatria', 'Disciplina de Pediatria', true, NOW(), NOW());
END IF;

-- ========================================
-- 2. FUNÇÃO AUXILIAR PARA INSERIR ASSUNTOS
-- ========================================

CREATE OR REPLACE FUNCTION insert_subject_if_not_exists(
    p_discipline_name TEXT,
    p_subject_name TEXT,
    p_user_id TEXT
) RETURNS INTEGER AS $func$
DECLARE
    v_discipline_id INTEGER;
    v_subject_id INTEGER;
BEGIN
    -- Buscar discipline_id
    SELECT id INTO v_discipline_id 
    FROM disciplines 
    WHERE name = p_discipline_name AND user_id = p_user_id::UUID;
    
    IF v_discipline_id IS NULL THEN
        RAISE EXCEPTION 'Disciplina não encontrada: %', p_discipline_name;
    END IF;
    
    -- Verificar se subject já existe (verificar tanto name quanto title)
    SELECT id INTO v_subject_id 
    FROM subjects 
    WHERE discipline_id = v_discipline_id AND (name = p_subject_name OR title = p_subject_name);
    
    -- Inserir subject se não existir
    IF v_subject_id IS NULL THEN
        INSERT INTO subjects (discipline_id, user_id, title, name, created_at, updated_at)
        VALUES (v_discipline_id, p_user_id, p_subject_name, p_subject_name, NOW(), NOW())
        RETURNING id INTO v_subject_id;
    END IF;
    
    RETURN v_subject_id;
END;
$func$ LANGUAGE plpgsql;

-- ========================================
-- 3. INSERIR ASSUNTOS
-- ========================================

-- Assuntos da disciplina: Cirurgia Geral
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Abdome agudo hemorrágico', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Abdome agudo obstrutivo', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Abdome agudo perfurativo', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Abdome agudo vascular', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Abscesso cervical', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Alterações genitais', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Anatomia e Fisiologia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Anestesia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Aneurisma', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Apendicite aguda', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Atendimento inicial ao politraumatizado', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Atresia de Vias Biliares', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Atresias do Tubo digestivo', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Carótidas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Cicatrização', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Cirurgia cardíaca', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Cirurgia de obesidade', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Cirurgia pediátrica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Controle de Danos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Corpo estranho', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Criptorquidia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Câncer colorretal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Câncer de Próstata', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Câncer de bexiga', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Câncer de canal anal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Câncer de estômago', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Câncer de esôfago', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Câncer de pele não melanoma', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Câncer de testículo', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Câncer renal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Derrame pleural', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Dispepsia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Dissecção de aorta', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Diverticulite aguda', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Divertículo de Meckel', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Doença de Hirschsprung', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Doença do refluxo gastroesofágico', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Doença vascular periférica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Doenças benignas do esôfago', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Doenças das vias biliares', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Doenças orificiais', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Emergências Urológicas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Enterocolite Necrosante', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Enxerto e Retalho', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Estenose Hipertrófica de Piloro', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Fasceíte Necrosante e Gangrena de Fournier', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Fístula arteriovenosa', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Gastrosquise e Onfalocele', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Hemoptise', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Hemorragia Digestiva Alta Não Varicosa', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Hemorragia Digestiva Alta Varicosa', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Hemorragia Digestiva Baixa', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Hiperplasia prostática benigna', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Hérnias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Hérnias na Infância', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Intussuscepção e Volvo de Intestino', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Malformações anorretais', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Massas cervicais benignas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Melanoma', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Nefrolitíase', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Neoplasias do intestino delgado', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Nódulos hepáticos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Oftalmologia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Oncologia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Ortopedia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Otorrinolaringologia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Outros temas - Cirurgia geral', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Pancreatite Crônica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Pancreatite aguda', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Patologias Traqueais', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Perioperatório', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Pneumotórax Espontâneo', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Queimados', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Refluxo Vesico Ureteral e Estenose de JUP', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Resposta metabólica ao trauma', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Sarcoma', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Síndrome compartimental abdominal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Síndrome do desfiladeiro torácico', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Síndromes pós-gastrectomias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Transplante de fígado', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Trauma abdominal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Trauma cervical', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Trauma cranioencefálico', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Trauma de extremidades', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Trauma de tórax', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Trauma pélvico e perineal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Trauma raquimedular e coluna', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Trombose venosa profunda', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Tumor de Pâncreas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Tumores Abdominais na Infância', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Tumores de Cabeça e Pescoço', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Tumores de Mediastino', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Tumores neuroendócrinos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Técnica cirúrgica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Videolaparoscopia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Cirurgia Geral', 'Úlcera péptica e H. pylori', system_user_id::TEXT);

-- Assuntos da disciplina: Clínica Médica
PERFORM insert_subject_if_not_exists('Clínica Médica', 'ACLS', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'AVCH', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'AVCI', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Abscesso pulmonar', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Abuso de substâncias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Acidentes com animais peçonhentos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Acromegalia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Alcoolismo', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Amiloidose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Anafilaxia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Anemia falciforme', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Anemias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Angioedema hereditário', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Apneia do sono', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Arritmias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Artrite idiopática juvenil', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Artrite reumatoide', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Artrites infecciosas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Artrites soronegativas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Asma', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Aspergilus e pulmão', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Bradiarritmias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Bronquiectasias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'COVID-19', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Cefaleias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Choque', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Cirrose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Colite pseudomembranosa', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Constipação', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Corrimento uretral', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Crise hipertensiva', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Cuidados paliativos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Câncer de pulmão', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Câncer de tireoide', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'DPOC', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Delirium', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Demência', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Dengue e outras arboviroses', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Dermatologia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Derrame pleural', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Diabetes', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Dislipidemia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Distúrbios da hemostasia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Distúrbios hidroeletrolíticos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Distúrbios ácido-básicos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Doença Inflamatória Intestinal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Doença Renal Crônica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Doença celíaca', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Doença de Chagas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Doença de Parkinson', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Doença de Still', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Doença policística renal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Doença pulmonar parenquimatosa difusa', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Doença relacionada a IgG4', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Doenças do pericárdio', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Doenças glomerulares', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Doenças neuromusculares', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Drogas - Efeitos adversos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'ENADE', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Ebola', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Endocardite', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Epilepsia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Esclerose múltipla', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Esclerose sistêmica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Esquistossomose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Febre reumática', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Febre tifóide', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Feocromocitoma', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Fibromialgia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Geriatria', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Gota', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Gripe', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'HIV', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hanseníase', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hantavirose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hepatites', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hepatites virais', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Herpes Zóster', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hiperaldosteronismo Primário', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hiperparatireoidismo primário', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hiperplasia adrenal congênita', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hiperprolactinemia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hipertensão Renovascular', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hipertensão arterial sistêmica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hipertensão intracraniana', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hipertensão pulmonar', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Hipotireoidismo', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Histoplasmose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Incidentaloma Adrenal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Infecção do trato urinário', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Infecções de partes moles', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Infecções de pele e partes moles', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Injúria Renal Aguda', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Insuficiência Adrenal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Insuficiência Cardíaca', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Insuficiência respiratória aguda', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Intoxicações exógenas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Leishmaniose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Leptospirose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Leucemias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Linfoma', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Linfonodomegalias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Lombalgia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Lúpus eritematoso sistêmico', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Malária', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Meningite', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Micoses profundas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Mieloma múltiplo', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Morte encefálica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Mucormicose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Neuropatias periféricas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Neutropenia febril', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Nódulo de tireoide', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Nódulos de pulmão', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Osteoartrite', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Osteoporose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Outras infecções e antibióticos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Outros temas - Clínica médica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Paracoccidioidomicose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Paralisia facial', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Pneumonia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Policondrite recidivante', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Polimialgia reumática', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Polimiosite e Dermatomiosite', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Porfirias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Precauções e Isolamento', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Profilaxia de raiva', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Profilaxia de tétano', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Profilaxia pós-exposição', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Propedêutica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Psiquiatria', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Rabdomiólise', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Reações transfusionais', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Ricketsioses', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Sarcoidose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Sepse', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Suporte ventilatório - Ventilação mecânica e VNI', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Sífilis', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síncope', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síndrome coronariana', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síndrome da veia cava superior', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síndrome de Cushing', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síndrome de Sjogren', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síndrome de lise tumoral', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síndrome do Choque Tóxico', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síndrome do intestino irritável', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síndrome hemofagocítica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síndrome metabólica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síndrome mielodisplásica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síndromes medulares', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Síndromes mieloproliferativas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Tabagismo', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Terapia intensiva', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Tireotoxicose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Toxoplasmose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Tromboembolia pulmonar', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Tuberculose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Tumores hipofisários e hipopituitarismo', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Valvopatias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Vasculites', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Vertigem', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Clínica Médica', 'Úlceras Genitais', system_user_id::TEXT);

-- Assuntos da disciplina: Ginecologia e Obstetrícia
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Amenorreia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Assistência pré-natal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Cervicite e vulvovaginite', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Ciclo e fisiologia menstrual', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Climatério', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de colo de útero e HPV', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de endométrio', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de mama', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de vulva', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Diabetes na gestação', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Diagnóstico de gestação', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Doença hipertensiva específica da gravidez', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Doença inflamatória pélvica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Doenças da Mama', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Doenças ovarianas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Endometriose', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Gemelaridade', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Hemorragias da primeira metade da gestação', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Hemorragias da segunda metade da gestação', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Incontinência Urinária e Prolapso Genital', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Infecção de trato urinário na gestante', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Infecções e gestação', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Infertilidade', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Isoimunização RH', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Mecanismo de parto e assistência clínica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Métodos contraceptivos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Outros temas - Ginecologia e Obstetrícia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Prematuridade', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Puerpério', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Relações uterofetais', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Restrição do crescimento intrauterino', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Rotura prematura de membranas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Sangramento Uterino Anormal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Síndrome dos Ovários Policísticos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Violência sexual', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Ginecologia e Obstetrícia', 'Vitalidade Fetal', system_user_id::TEXT);

-- Assuntos da disciplina: Medicina Preventiva
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Atenção básica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Bioestatística', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Declaração de óbito', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Epidemias', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Estratégia de saúde da família', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Gestão em Saúde', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Indicadores em Saúde', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Medicina do trabalho', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Outros temas - Medicina preventiva', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Prevenção de acidentes', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Processo Saúde-Doença', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Programa Mais Médicos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Questões de gênero e sexualidade', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Rastreamento', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'SUS', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Saúde suplementar e planos de saúde', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Testes diagnósticos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Vigilância Epidemiológica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Violência doméstica e contra a mulher', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Violência psicológica', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Medicina Preventiva', 'Ética Médica', system_user_id::TEXT);

-- Assuntos da disciplina: Pediatria
PERFORM insert_subject_if_not_exists('Pediatria', 'Aleitamento materno', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Alergia à proteína do leite de vaca', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Avaliação neonatal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Bronquiolite e lactente sibilante', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Cardiopatias congênitas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Convulsão febril', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Coqueluche', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Desconforto respiratório do recém-nascido', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Desnutrição', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Diarreia e desidratação', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Distúrbios do Crescimento e Desenvolvimento', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Doença do refluxo gastroesofágico na infância', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Doenças Congênitas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Doenças exantemáticas', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Febre sem sinais localizatórios', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Fibrose cística', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Hemorragia neonatal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Hidrocefalia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Hipoglicemia neonatal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'IVAS', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Icterícia neonatal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Imunodeficiência', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Infecção urinária na infância', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Maus tratos', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Obesidade na infância', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Outros temas - Pediatria', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'PBLS e PALS', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Parasitoses', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Pneumonia na infância', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Puberdade precoce e tardia', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Puericultura', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Reanimação Neonatal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Sepse neonatal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Síndrome da morte súbita do lactente', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'TORCH e Sífilis congênita', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Triagem Neonatal', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Vacinação', system_user_id::TEXT);
PERFORM insert_subject_if_not_exists('Pediatria', 'Varíola', system_user_id::TEXT);

-- ========================================
-- 4. FUNÇÃO AUXILIAR PARA INSERIR TÓPICOS
-- ========================================

CREATE OR REPLACE FUNCTION insert_topic_if_not_exists(
    p_discipline_name TEXT,
    p_subject_name TEXT,
    p_topic_name TEXT
) RETURNS INTEGER AS $func$
DECLARE
    v_subject_id INTEGER;
    v_topic_id INTEGER;
BEGIN
    -- Buscar subject_id pela disciplina e assunto (considerando name ou title)
    SELECT s.id INTO v_subject_id
    FROM subjects s
    JOIN disciplines d ON d.id = s.discipline_id
    WHERE d.name = p_discipline_name
      AND (s.name = p_subject_name OR s.title = p_subject_name)
    ORDER BY s.created_at DESC NULLS LAST, s.id DESC
    LIMIT 1;

    IF v_subject_id IS NULL THEN
        RAISE EXCEPTION 'Assunto não encontrado: % na disciplina %', p_subject_name, p_discipline_name;
    END IF;

    -- Verificar se topic já existe
    SELECT id INTO v_topic_id 
    FROM topics 
    WHERE subject_id = v_subject_id AND name = p_topic_name;

    -- Inserir topic se não existir
    IF v_topic_id IS NULL THEN
        INSERT INTO topics (subject_id, name, created_at, updated_at)
        VALUES (v_subject_id, p_topic_name, NOW(), NOW())
        RETURNING id INTO v_topic_id;
    END IF;

    RETURN v_topic_id;
END;
$func$ LANGUAGE plpgsql;

-- ========================================
-- 5. INSERIR TÓPICOS
-- ========================================

-- Tópicos do assunto 'Abdome agudo hemorrágico' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Abdome agudo hemorrágico', 'Abdome agudo hemorrágico');

-- Tópicos do assunto 'Abdome agudo obstrutivo' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Abdome agudo obstrutivo', 'Abdome agudo obstrutivo - Diagnóstico e Etiologias');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Abdome agudo obstrutivo', 'Abdome agudo obstrutivo - tratamento');

-- Tópicos do assunto 'Abdome agudo perfurativo' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Abdome agudo perfurativo', 'Abdome Agudo Perfurativo');

-- Tópicos do assunto 'Abdome agudo vascular' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Abdome agudo vascular', 'Abdome agudo vascular');

-- Tópicos do assunto 'Abscesso cervical' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Abscesso cervical', 'Abscesso cervical');

-- Tópicos do assunto 'Alterações genitais' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Alterações genitais', 'Alterações genitais');

-- Tópicos do assunto 'Anatomia e Fisiologia' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Anatomia e Fisiologia', 'Anatomia - Aparelho Digestivo');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Anatomia e Fisiologia', 'Cabeça e Pescoço');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Anatomia e Fisiologia', 'Trato genitourinário');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Anatomia e Fisiologia', 'Vascular');

-- Tópicos do assunto 'Anestesia' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Anestesia', 'Anestesia - Anestésicos locais');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Anestesia', 'Anestesia - Dor, Medicações e Hipertermia maligna');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Anestesia', 'Anestesia - Intubação orotraqueal e via aérea difícil');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Anestesia', 'Anestesia - Peridural e raquianestesia');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Anestesia', 'Monitorização da Anestesia e Recuperação pós Anestésica');

-- Tópicos do assunto 'Aneurisma' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Aneurisma', 'Aneurisma - Aneurisma de aorta abdominal');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Aneurisma', 'Aneurisma - Aneurismas periféricos');

-- Tópicos do assunto 'Apendicite aguda' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Apendicite aguda', 'Apendicite aguda - Diagnóstico');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Apendicite aguda', 'Apendicite aguda - Tratamento e Complicações');

-- Tópicos do assunto 'Atendimento inicial ao politraumatizado' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Atendimento inicial ao politraumatizado', 'Trauma - atendimento inicial');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Atendimento inicial ao politraumatizado', 'Trauma - choque e transfusão');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Atendimento inicial ao politraumatizado', 'Trauma - vias aéreas');

-- Tópicos do assunto 'Atresia de Vias Biliares' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Atresia de Vias Biliares', 'Atresia de Vias Biliares');

-- Tópicos do assunto 'Atresias do Tubo digestivo' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Atresias do Tubo digestivo', 'Atresias do Tubo digestivo');

-- Tópicos do assunto 'Carótidas' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Carótidas', 'carótidas');

-- Tópicos do assunto 'Cicatrização' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Cicatrização', 'Cicatrização - Fases da cicatrização');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Cicatrização', 'Cicatrização patológica e Úlceras de Pressão');

-- Tópicos do assunto 'Cirurgia cardíaca' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Cirurgia cardíaca', 'Cirurgia cardíaca');

-- Tópicos do assunto 'Cirurgia de obesidade' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Cirurgia de obesidade', 'Cirurgia de obesidade - Complicações');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Cirurgia de obesidade', 'Cirurgia de obesidade - Indicações e técnicas cirúrgicas');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Cirurgia de obesidade', 'Cirurgia de obesidade - Indicações, técnicas e complicações');

-- Tópicos do assunto 'Cirurgia pediátrica' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Cirurgia pediátrica', 'Cirurgia pediátrica');

-- Tópicos do assunto 'Controle de Danos' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Controle de Danos', 'Controle de danos');

-- Tópicos do assunto 'Corpo estranho' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Corpo estranho', 'Corpo estranho');

-- Tópicos do assunto 'Criptorquidia' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Criptorquidia', 'Criptorquidia');

-- Tópicos do assunto 'Câncer colorretal' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer colorretal', 'Câncer colorretal - Diagnóstico e rastreamento');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer colorretal', 'Câncer colorretal - Estadiamento e Tratamento');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer colorretal', 'Câncer colorretal - Polipose e síndromes familiares');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer colorretal', 'Câncer colorretal - neoplasia de apêndice');

-- Tópicos do assunto 'Câncer de Próstata' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer de Próstata', 'Câncer de próstata');

-- Tópicos do assunto 'Câncer de bexiga' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer de bexiga', 'Câncer de bexiga');

-- Tópicos do assunto 'Câncer de canal anal' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer de canal anal', 'Câncer de canal anal');

-- Tópicos do assunto 'Câncer de estômago' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer de estômago', 'Câncer de estômago - Diagnóstico e Classificações');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer de estômago', 'Câncer de estômago - Estadiamento e Tratamento');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer de estômago', 'Câncer de estômago - GIST');

-- Tópicos do assunto 'Câncer de esôfago' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer de esôfago', 'Câncer de esôfago');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer de esôfago', 'Câncer de esôfago - Diagnóstico e Classificação');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer de esôfago', 'Câncer de esôfago - Estadiamento e Tratamento');

-- Tópicos do assunto 'Câncer de pele não melanoma' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer de pele não melanoma', 'Câncer de pele não melanoma');

-- Tópicos do assunto 'Câncer de testículo' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer de testículo', 'Câncer de testículo');

-- Tópicos do assunto 'Câncer renal' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Câncer renal', 'Câncer renal');

-- Tópicos do assunto 'Derrame pleural' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Derrame pleural', 'Derrame pleural - Diagnóstico');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Derrame pleural', 'Tuberculose pleural - não');

-- Tópicos do assunto 'Dispepsia' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Dispepsia', 'Dispepsia');

-- Tópicos do assunto 'Dissecção de aorta' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Dissecção de aorta', 'Dissecção de aorta - Diagnóstico e tratamento');

-- Tópicos do assunto 'Diverticulite aguda' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Diverticulite aguda', 'Diverticulite aguda - Diagnóstico e classificação');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Diverticulite aguda', 'Diverticulite aguda - Tratamento e complicações');

-- Tópicos do assunto 'Divertículo de Meckel' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Divertículo de Meckel', 'Divertículo de Meckel');

-- Tópicos do assunto 'Doença de Hirschsprung' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doença de Hirschsprung', 'Doença de Hirschsprung');

-- Tópicos do assunto 'Doença do refluxo gastroesofágico' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doença do refluxo gastroesofágico', 'DRGE - Clínica e Diagnóstico');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doença do refluxo gastroesofágico', 'DRGE - Esôfago de Barrett');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doença do refluxo gastroesofágico', 'DRGE - Tratamento');

-- Tópicos do assunto 'Doença vascular periférica' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doença vascular periférica', 'Insuficiência arterial aguda');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doença vascular periférica', 'Insuficiência arterial crônica');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doença vascular periférica', 'Insuficiência venosa crônica');

-- Tópicos do assunto 'Doenças benignas do esôfago' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças benignas do esôfago', 'Doenças benignas do esôfago - Acalásia e Megaesôfago');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças benignas do esôfago', 'Doenças benignas do esôfago - Outras');

-- Tópicos do assunto 'Doenças das vias biliares' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças das vias biliares', 'Doenças das vias biliares - Cistos de colédoco');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças das vias biliares', 'Doenças das vias biliares - Colangiocarcinoma');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças das vias biliares', 'Doenças das vias biliares - Colangite');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças das vias biliares', 'Doenças das vias biliares - Colecistite');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças das vias biliares', 'Doenças das vias biliares - Coledocolitíase');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças das vias biliares', 'Doenças das vias biliares - Colelitiase');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças das vias biliares', 'Doenças das vias biliares - Exames');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças das vias biliares', 'Doenças das vias biliares - Pólipos e câncer de vesícula');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças das vias biliares', 'Lesões iatrogências das vias biliares');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças das vias biliares', 'Síndrome Colestática');

-- Tópicos do assunto 'Doenças orificiais' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças orificiais', 'Doenças orificiais - Fissura');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças orificiais', 'Doenças orificiais - Fístula perianal');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças orificiais', 'Doenças orificiais - Hemorroidas');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Doenças orificiais', 'Doenças orificiais - abscesso anorretal e cisto pilonidal');

-- Tópicos do assunto 'Emergências Urológicas' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Emergências Urológicas', 'Emergências Urológicas - Orquiepididimite');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Emergências Urológicas', 'Emergências Urológicas - Torção testicular');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Emergências Urológicas', 'Emergências Urológicas- Priapismo');

-- Tópicos do assunto 'Enterocolite Necrosante' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Enterocolite Necrosante', 'Enterocolite Necrosante');

-- Tópicos do assunto 'Enxerto e Retalho' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Enxerto e Retalho', 'Enxerto e Retalho');

-- Tópicos do assunto 'Estenose Hipertrófica de Piloro' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Estenose Hipertrófica de Piloro', 'Estenose Hipertrófica de Piloro');

-- Tópicos do assunto 'Fasceíte Necrosante e Gangrena de Fournier' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Fasceíte Necrosante e Gangrena de Fournier', 'Fasceíte Necrosante e Gangrena de Fournier');

-- Tópicos do assunto 'Fístula arteriovenosa' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Fístula arteriovenosa', 'Fístula arteriovenosa');

-- Tópicos do assunto 'Gastrosquise e Onfalocele' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Gastrosquise e Onfalocele', 'Gastrosquise e Onfalocele');

-- Tópicos do assunto 'Hemoptise' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Hemoptise', 'Hemoptise');

-- Tópicos do assunto 'Hemorragia Digestiva Alta Não Varicosa' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Hemorragia Digestiva Alta Não Varicosa', 'HDA não varicosa - Outras Etiologias');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Hemorragia Digestiva Alta Não Varicosa', 'HDA não varicosa - Úlcera péptica');

-- Tópicos do assunto 'Hemorragia Digestiva Alta Varicosa' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Hemorragia Digestiva Alta Varicosa', 'HDA Varicosa - Etiologias');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Hemorragia Digestiva Alta Varicosa', 'HDA Varicosa - Tratamento');

-- Tópicos do assunto 'Hemorragia Digestiva Baixa' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Hemorragia Digestiva Baixa', 'Hemorragia Digestiva Baixa');

-- Tópicos do assunto 'Hiperplasia prostática benigna' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Hiperplasia prostática benigna', 'Hiperplasia prostática benigna');

-- Tópicos do assunto 'Hérnias' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Hérnias', 'Hérnias - Outras hérnias');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Hérnias', 'Hérnias inguinocrurais - Anatomia e classificação');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Hérnias', 'Hérnias inguinocrurais - Tratamento');

-- Tópicos do assunto 'Hérnias na Infância' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Hérnias na Infância', 'Hérnias na Infância');

-- Tópicos do assunto 'Intussuscepção e Volvo de Intestino' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Intussuscepção e Volvo de Intestino', 'Intussuscepção e Volvo de Intestino');

-- Tópicos do assunto 'Malformações anorretais' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Malformações anorretais', 'Malformações anorretais');

-- Tópicos do assunto 'Massas cervicais benignas' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Massas cervicais benignas', 'Massas cervicais benignas');

-- Tópicos do assunto 'Melanoma' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Melanoma', 'Melanoma');

-- Tópicos do assunto 'Nefrolitíase' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Nefrolitíase', 'Nefrolitíase - Diagnóstico');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Nefrolitíase', 'Nefrolitíase - Tratamento');

-- Tópicos do assunto 'Neoplasias do intestino delgado' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Neoplasias do intestino delgado', 'neoplasias do intestino delgado');

-- Tópicos do assunto 'Nódulos hepáticos' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Nódulos hepáticos', 'Nódulos hepáticos - Abscesso Hepático');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Nódulos hepáticos', 'Nódulos hepáticos Benignos');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Nódulos hepáticos', 'Nódulos hepáticos Malignos');

-- Tópicos do assunto 'Oftalmologia' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Oftalmologia', 'Oftalmologia - Erros refrativos, catarata e estrabismo');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Oftalmologia', 'Oftalmologia - Retinoblastoma');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Oftalmologia', 'Oftalmologia - Trauma ocular');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Oftalmologia', 'Oftalmologia - síndrome do olho vermelho');

-- Tópicos do assunto 'Oncologia' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Oncologia', 'Oncologia - Tumores malignos');

-- Tópicos do assunto 'Ortopedia' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Ortopedia', 'Ortopedia - Doenças do quadril');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Ortopedia', 'Ortopedia - Fraturas, Luxações e Entorses');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Ortopedia', 'Ortopedia - outros temas');

-- Tópicos do assunto 'Otorrinolaringologia' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Otorrinolaringologia', 'Otorrino - Cerúmen');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Otorrinolaringologia', 'Otorrino - Disfonia');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Otorrinolaringologia', 'Otorrino - epistaxe');

-- Tópicos do assunto 'Outros temas - Cirurgia geral' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Outros temas - Cirurgia geral', 'Câncer de pênis');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Outros temas - Cirurgia geral', 'Deformidades congênitas da parede torácica');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Outros temas - Cirurgia geral', 'Hematoma de reto abdominal');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Outros temas - Cirurgia geral', 'Hidrocele');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Outros temas - Cirurgia geral', 'História da medicina');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Outros temas - Cirurgia geral', 'Intestino Curto');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Outros temas - Cirurgia geral', 'Mielomeningocele');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Outros temas - Cirurgia geral', 'Outros temas - Cirurgia geral');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Outros temas - Cirurgia geral', 'Pseudoaneurisma');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Outros temas - Cirurgia geral', 'Quilotórax');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Outros temas - Cirurgia geral', 'Íleo meconial');

-- Tópicos do assunto 'Pancreatite Crônica' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Pancreatite Crônica', 'Pancreatite crônica');

-- Tópicos do assunto 'Pancreatite aguda' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Pancreatite aguda', 'Pancreatite Aguda - Classificações e Escores de Gravidade');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Pancreatite aguda', 'Pancreatite Aguda - Tratamento e complicações');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Pancreatite aguda', 'Pancreatite aguda - Diagnóstico e Etiologias');

-- Tópicos do assunto 'Patologias Traqueais' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Patologias Traqueais', 'Patologias Traqueais');

-- Tópicos do assunto 'Perioperatório' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Perioperatório', 'Perioperatório - Antibiótico e Infecção de Sítio Cirúrgico');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Perioperatório', 'Perioperatório - Complicações Pós operatórias + Profilaxia de TEV');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Perioperatório', 'Perioperatório - Exames e Risco Cirúrgico');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Perioperatório', 'Perioperatório - Medicações');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Perioperatório', 'Perioperatório - Nutrição e Projeto ACERTO');

-- Tópicos do assunto 'Pneumotórax Espontâneo' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Pneumotórax Espontâneo', 'Pneumotórax Espontâneo');

-- Tópicos do assunto 'Queimados' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Queimados', 'Queimados - Cuidados e Complicações');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Queimados', 'Queimados - atendimento inicial');

-- Tópicos do assunto 'Refluxo Vesico Ureteral e Estenose de JUP' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Refluxo Vesico Ureteral e Estenose de JUP', 'Refluxo Vesico Ureteral e Estenose de JUP');

-- Tópicos do assunto 'Resposta metabólica ao trauma' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Resposta metabólica ao trauma', 'Resposta metabólica ao trauma');

-- Tópicos do assunto 'Sarcoma' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Sarcoma', 'Sarcoma - Sarcoma de partes moles');

-- Tópicos do assunto 'Síndrome compartimental abdominal' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Síndrome compartimental abdominal', 'Síndrome compartimental abdominal');

-- Tópicos do assunto 'Síndrome do desfiladeiro torácico' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Síndrome do desfiladeiro torácico', 'Síndrome do desfiladeiro torácico');

-- Tópicos do assunto 'Síndromes pós-gastrectomias' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Síndromes pós-gastrectomias', 'Síndromes pós-gastrectomias');

-- Tópicos do assunto 'Transplante de fígado' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Transplante de fígado', 'Morte encefálica, transplantes e doação de órgãos');

-- Tópicos do assunto 'Trauma abdominal' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma abdominal', 'Trauma abdominal - Penetrante');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma abdominal', 'Trauma abdominal - trauma abdominal fechado');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma abdominal', 'trauma de transição toracoabdominal');

-- Tópicos do assunto 'Trauma cervical' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma cervical', 'Trauma cervical');

-- Tópicos do assunto 'Trauma cranioencefálico' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma cranioencefálico', 'Trauma de face');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma cranioencefálico', 'Traumatismo cranioencefálico');

-- Tópicos do assunto 'Trauma de extremidades' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma de extremidades', 'Trauma de extremidades - Embolia Gordurosa');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma de extremidades', 'Trauma de extremidades - Fratura e Lesão de Partes moles');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma de extremidades', 'Trauma de extremidades - Lesão Vascular');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma de extremidades', 'Trauma de extremidades - Síndrome compartimental e de Esmagamento');

-- Tópicos do assunto 'Trauma de tórax' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma de tórax', 'Trauma de tórax - Hemotórax');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma de tórax', 'Trauma de tórax - Lesão de Aorta e Tamponamento cardíaco');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma de tórax', 'Trauma de tórax - Pneumotórax');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma de tórax', 'Trauma de tórax - Tórax instável e contusão pulmonar');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma de tórax', 'Trauma de tórax - Zona de Ziedler e indicações de Toracotomia');

-- Tópicos do assunto 'Trauma pélvico e perineal' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma pélvico e perineal', 'Trauma perineal');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma pélvico e perineal', 'Trauma pélvico');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma pélvico e perineal', 'lesão de uretra e bexiga');

-- Tópicos do assunto 'Trauma raquimedular e coluna' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trauma raquimedular e coluna', 'Trauma raquimedular e coluna');

-- Tópicos do assunto 'Trombose venosa profunda' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Trombose venosa profunda', 'Trombose venosa profunda - diagnóstico e tratamento');

-- Tópicos do assunto 'Tumor de Pâncreas' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Tumor de Pâncreas', 'Tumor de pâncreas');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Tumor de Pâncreas', 'Tumores císticos de pâncreas');

-- Tópicos do assunto 'Tumores Abdominais na Infância' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Tumores Abdominais na Infância', 'Tumores Abdominais na Infância');

-- Tópicos do assunto 'Tumores de Cabeça e Pescoço' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Tumores de Cabeça e Pescoço', 'Tumores da Cavidade Oral');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Tumores de Cabeça e Pescoço', 'Tumores da Nasofaringe');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Tumores de Cabeça e Pescoço', 'Tumores das Glândulas Salivares');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Tumores de Cabeça e Pescoço', 'Tumores de Cabeça e Pescoço');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Tumores de Cabeça e Pescoço', 'Tumores de Laringe');

-- Tópicos do assunto 'Tumores de Mediastino' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Tumores de Mediastino', 'Tumores de Mediastino');

-- Tópicos do assunto 'Tumores neuroendócrinos' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Tumores neuroendócrinos', 'Tumores neuroendócrinos');

-- Tópicos do assunto 'Técnica cirúrgica' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Técnica cirúrgica', 'Técnica cirúrgica - Fios e suturas');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Técnica cirúrgica', 'Técnica cirúrgica - Incisões e manobras cirúrgicas');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Técnica cirúrgica', 'Técnica cirúrgica - Instrumentos, materiais e mesa cirúrgica');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Técnica cirúrgica', 'Técnica cirúrgica - Procedimentos cirúrgicos');
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Técnica cirúrgica', 'Técnica cirúrgica - Procedimentos em Cirurgia plástica');

-- Tópicos do assunto 'Videolaparoscopia' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Videolaparoscopia', 'Videolaparoscopia');

-- Tópicos do assunto 'Úlcera péptica e H. pylori' da disciplina 'Cirurgia Geral'
PERFORM insert_topic_if_not_exists('Cirurgia Geral', 'Úlcera péptica e H. pylori', 'Úlcera péptica e H.pylori');

-- Tópicos do assunto 'ACLS' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'ACLS', 'ACLS');

-- Tópicos do assunto 'AVCH' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'AVCH', 'AVCH');

-- Tópicos do assunto 'AVCI' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'AVCI', 'Acidente vascular cerebral isquêmico');

-- Tópicos do assunto 'Abscesso pulmonar' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Abscesso pulmonar', 'Abscesso pulmonar');

-- Tópicos do assunto 'Abuso de substâncias' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Abuso de substâncias', 'Abuso de substâncias');

-- Tópicos do assunto 'Acidentes com animais peçonhentos' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Acidentes com animais peçonhentos', 'Acidentes com animais peçonhentos - Outros');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Acidentes com animais peçonhentos', 'Acidentes com animais peçonhentos - ofídicos');

-- Tópicos do assunto 'Acromegalia' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Acromegalia', 'Acromegalia');

-- Tópicos do assunto 'Alcoolismo' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Alcoolismo', 'Alcoolismo e abstinência alcoólica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Alcoolismo', 'Síndrome de Wernicke-Korsakoff');

-- Tópicos do assunto 'Amiloidose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Amiloidose', 'Amiloidose');

-- Tópicos do assunto 'Anafilaxia' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anafilaxia', 'Anafilaxia');

-- Tópicos do assunto 'Anemia falciforme' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemia falciforme', 'Anemia falciforme - Complicações crônicas');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemia falciforme', 'Anemia falciforme - Complicações e tratamento');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemia falciforme', 'Anemia falciforme - Crise aguda');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemia falciforme', 'Anemia falciforme - Manifestações clínicas e diagnóstico.');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemia falciforme', 'Anemia falciforme - Manifestações e diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemia falciforme', 'Anemia falciforme - Tratamento');

-- Tópicos do assunto 'Anemias' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemias', 'Anemia de doença crônica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemias', 'Anemia ferropriva');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemias', 'Anemia megaloblástica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemias', 'Anemias - Deficiência de G6PD');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemias', 'Anemias - Investigação inicial');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemias', 'Anemias - Talassemia');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemias', 'Anemias ferropriva e de doença crônica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Anemias', 'Anemias hemolíticas');

-- Tópicos do assunto 'Angioedema hereditário' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Angioedema hereditário', 'Angioedema hereditário');

-- Tópicos do assunto 'Apneia do sono' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Apneia do sono', 'Apneia obstrutiva do sono');

-- Tópicos do assunto 'Arritmias' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Arritmias', 'Fibrilação atrial/Flutter atrial');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Arritmias', 'Taquiarritmias de QRS estreito');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Arritmias', 'Taquiarritmias de QRS largo');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Arritmias', 'Taquicardia paroxística supraventricular');

-- Tópicos do assunto 'Artrite idiopática juvenil' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Artrite idiopática juvenil', 'Artrite idiopática juvenil');

-- Tópicos do assunto 'Artrite reumatoide' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Artrite reumatoide', 'Artrite reumatoide');

-- Tópicos do assunto 'Artrites infecciosas' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Artrites infecciosas', 'Artrites infecciosas');

-- Tópicos do assunto 'Artrites soronegativas' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Artrites soronegativas', 'Artrites soronegativas - Artrite reativa');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Artrites soronegativas', 'Artrites soronegativas - Espondilite anquilosante');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Artrites soronegativas', 'Artrites soronegativas - Psoriásica');

-- Tópicos do assunto 'Asma' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Asma', 'Asma - Diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Asma', 'Asma - Tratamento ambulatorial e classificação de controle');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Asma', 'Asma - crise de asma');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Asma', 'Asma - situações especiais');

-- Tópicos do assunto 'Aspergilus e pulmão' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Aspergilus e pulmão', 'Aspergilus e pulmão');

-- Tópicos do assunto 'Bradiarritmias' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Bradiarritmias', 'Bradiarritmias');

-- Tópicos do assunto 'Bronquiectasias' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Bronquiectasias', 'Bronquiectasias');

-- Tópicos do assunto 'COVID-19' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'COVID-19', 'COVID-19 - Diagnóstico e Tratamento');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'COVID-19', 'COVID-19 - Prevenção e Controle de Infecção');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'COVID-19', 'COVID-19 - SIM-P');

-- Tópicos do assunto 'Cefaleias' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Cefaleias', 'Cefaleia secundária, tensional e migrânea');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Cefaleias', 'Cefaleias trigeminais');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Cefaleias', 'Investigação de cefaleia secundária');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Cefaleias', 'Migrânea e cefaleia tensional');

-- Tópicos do assunto 'Choque' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Choque', 'Choque');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Choque', 'POCUS - Cardio');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Choque', 'POCUS - Pulmonar');

-- Tópicos do assunto 'Cirrose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Cirrose', 'CIrrose - Causas');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Cirrose', 'Cirrose - Ascite');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Cirrose', 'Cirrose - Complicações');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Cirrose', 'Cirrose - Encefalopatia hepática');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Cirrose', 'Cirrose - Peritonite Bacteriana Espontânea');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Cirrose', 'Cirrose - Síndrome Hepatorrenal');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Cirrose', 'Cirrose - Varizes esofágicas');

-- Tópicos do assunto 'Colite pseudomembranosa' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Colite pseudomembranosa', 'Colite pseudomembranosa');

-- Tópicos do assunto 'Constipação' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Constipação', 'Constipação na infância');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Constipação', 'Constipação no adulto');

-- Tópicos do assunto 'Corrimento uretral' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Corrimento uretral', 'Corrimento uretral');

-- Tópicos do assunto 'Crise hipertensiva' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Crise hipertensiva', 'Crise hipertensiva');

-- Tópicos do assunto 'Cuidados paliativos' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Cuidados paliativos', 'Cuidados paliativos');

-- Tópicos do assunto 'Câncer de pulmão' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Câncer de pulmão', 'Câncer de pulmão - Diagnóstico e rastreamento');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Câncer de pulmão', 'Câncer de pulmão - Manifestações clínicas');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Câncer de pulmão', 'Câncer de pulmão - Tratamento');

-- Tópicos do assunto 'Câncer de tireoide' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Câncer de tireoide', 'Câncer de Tireoide - Diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Câncer de tireoide', 'Câncer de Tireoide - Tratamento Cirúrgico');

-- Tópicos do assunto 'DPOC' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'DPOC', 'DPOC - Classificação e tratamento');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'DPOC', 'DPOC - Diagnóstico e quadro clínico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'DPOC', 'DPOC - Exacerbação');

-- Tópicos do assunto 'Delirium' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Delirium', 'Delirium');

-- Tópicos do assunto 'Demência' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Demência', 'Demência');

-- Tópicos do assunto 'Dengue e outras arboviroses' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Dengue e outras arboviroses', 'Dengue');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Dengue e outras arboviroses', 'Outras arboviroses');

-- Tópicos do assunto 'Dermatologia' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Dermatologia', 'Dermatologia - Dermatites');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Dermatologia', 'Dermatologia - Doenças infecciosas');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Dermatologia', 'Dermatologia - Doenças inflamatórias');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Dermatologia', 'Dermatologia - farmacodermia');

-- Tópicos do assunto 'Derrame pleural' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Derrame pleural', 'Derrame pleural - Diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Derrame pleural', 'Tuberculose pleural');

-- Tópicos do assunto 'Diabetes' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Diabetes', 'Diabetes - Complicações agudas');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Diabetes', 'Diabetes - Fisiopatologia e classificação');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Diabetes', 'Diabetes - Nefropatia diabética');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Diabetes', 'Diabetes - Neuropatia diabética');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Diabetes', 'Diabetes - Quadro clínico e diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Diabetes', 'Diabetes - Retinopatia diabética');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Diabetes', 'Diabetes - Tratamento - Insulina');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Diabetes', 'Diabetes - Tratamento não-insulina');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Diabetes', 'Pé Diabético');

-- Tópicos do assunto 'Dislipidemia' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Dislipidemia', 'Dislipidemia - Risco cardiovascular e metas terapêuticas');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Dislipidemia', 'Síndrome metabólica');

-- Tópicos do assunto 'Distúrbios da hemostasia' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios da hemostasia', 'Anticoagulantes');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios da hemostasia', 'Distúrbios da hemostasia secundária');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios da hemostasia', 'Doença de Von Willebrand');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios da hemostasia', 'Microangiopatia trombótica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios da hemostasia', 'Púrpura de Henoch-Schonlein');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios da hemostasia', 'Púrpura trombocitopênica imune');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios da hemostasia', 'SAAF');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios da hemostasia', 'Trombocitopenia induzida por heparina');

-- Tópicos do assunto 'Distúrbios hidroeletrolíticos' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios hidroeletrolíticos', 'Distúrbios hidroeletrolíticos - Hipo e hipermagnesemia');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios hidroeletrolíticos', 'Hipercalcemia');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios hidroeletrolíticos', 'Hipercalemia');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios hidroeletrolíticos', 'Hipernatremia');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios hidroeletrolíticos', 'Hipocalcemia');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios hidroeletrolíticos', 'Hipocalemia');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios hidroeletrolíticos', 'Hiponatremia');

-- Tópicos do assunto 'Distúrbios ácido-básicos' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios ácido-básicos', 'Distúrbios ácido-básicos');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Distúrbios ácido-básicos', 'Distúrbios ácido-básicos - Acidose metabólica');

-- Tópicos do assunto 'Doença Inflamatória Intestinal' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença Inflamatória Intestinal', 'DII - Complicações');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença Inflamatória Intestinal', 'DII - Doença de Crohn');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença Inflamatória Intestinal', 'DII - Retocolite Ulcerativa');

-- Tópicos do assunto 'Doença Renal Crônica' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença Renal Crônica', 'Doença renal crônica - Complicações');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença Renal Crônica', 'Doença renal crônica - Diagnóstico e estadiamento');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença Renal Crônica', 'Doença renal crônica - Tratamento');

-- Tópicos do assunto 'Doença celíaca' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença celíaca', 'Doença celíaca');

-- Tópicos do assunto 'Doença de Chagas' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença de Chagas', 'Doença de Chagas');

-- Tópicos do assunto 'Doença de Parkinson' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença de Parkinson', 'Doença de Parkinson - Diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença de Parkinson', 'Doenças de Parkinson - Tratamento');

-- Tópicos do assunto 'Doença de Still' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença de Still', 'Doença de Still');

-- Tópicos do assunto 'Doença policística renal' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença policística renal', 'Doença policística renal');

-- Tópicos do assunto 'Doença pulmonar parenquimatosa difusa' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença pulmonar parenquimatosa difusa', 'Doenças pulmonares fibrosantes');

-- Tópicos do assunto 'Doença relacionada a IgG4' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doença relacionada a IgG4', 'Doença relacionada a IgG4');

-- Tópicos do assunto 'Doenças do pericárdio' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doenças do pericárdio', 'Doenças do pericárdio');

-- Tópicos do assunto 'Doenças glomerulares' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doenças glomerulares', 'GNPE');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doenças glomerulares', 'GNRP');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doenças glomerulares', 'Nefropatia por IgA');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doenças glomerulares', 'Síndrome nefrítica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doenças glomerulares', 'Síndrome nefrótica - Causas');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doenças glomerulares', 'Síndrome nefrótica - Diagnóstico e tratamento');

-- Tópicos do assunto 'Doenças neuromusculares' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doenças neuromusculares', 'ELA');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doenças neuromusculares', 'Guillain-Barré');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Doenças neuromusculares', 'Miastenia gravis');

-- Tópicos do assunto 'Drogas - Efeitos adversos' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Drogas - Efeitos adversos', 'Drogas - Efeitos adversos');

-- Tópicos do assunto 'ENADE' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'ENADE', 'Conhecimentos gerais');

-- Tópicos do assunto 'Ebola' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Ebola', 'Ebola');

-- Tópicos do assunto 'Endocardite' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Endocardite', 'Endocardite - Diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Endocardite', 'Endocardite - Tratamento e profilaxia');

-- Tópicos do assunto 'Epilepsia' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Epilepsia', 'Epilepsia - Diagnóstico e manejo');

-- Tópicos do assunto 'Esclerose múltipla' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Esclerose múltipla', 'Esclerose múltipla');

-- Tópicos do assunto 'Esclerose sistêmica' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Esclerose sistêmica', 'Esclerose sistêmica');

-- Tópicos do assunto 'Esquistossomose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Esquistossomose', 'Esquistossomose');

-- Tópicos do assunto 'Febre reumática' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Febre reumática', 'Febre Reumática - Manifestações clínicas e diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Febre reumática', 'Febre Reumática - Tratamento e profilaxia');

-- Tópicos do assunto 'Febre tifóide' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Febre tifóide', 'Febre tifóide');

-- Tópicos do assunto 'Feocromocitoma' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Feocromocitoma', 'Feocromocitoma');

-- Tópicos do assunto 'Fibromialgia' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Fibromialgia', 'Fibromialgia');

-- Tópicos do assunto 'Geriatria' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Geriatria', 'Geriatria');

-- Tópicos do assunto 'Gota' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Gota', 'Gota - Diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Gota', 'Gota - Tratamento');

-- Tópicos do assunto 'Gripe' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Gripe', 'Gripe - SRAG');

-- Tópicos do assunto 'HIV' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'HIV', 'HIV - Diagnóstico e tratamento');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'HIV', 'HIV - Doenças oportunistas');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'HIV', 'HIV - Doenças oportunistas neurológicas');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'HIV', 'HIV - Doenças oportunistas respiratórias');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'HIV', 'HIV - HIV na criança');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'HIV', 'HIV - profilaxias pré e pós-exposição');

-- Tópicos do assunto 'Hanseníase' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hanseníase', 'Hanseníase - Tratamento');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hanseníase', 'Hanseníase - diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hanseníase', 'Hanseníase - estados reacionais');

-- Tópicos do assunto 'Hantavirose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hantavirose', 'Hantavirose');

-- Tópicos do assunto 'Hepatites' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hepatites', 'Colangite esclerosante primária');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hepatites', 'Doença gordurosa hepática não alcoólica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hepatites', 'Hepatite alcóolica aguda');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hepatites', 'Hepatite autoimune');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hepatites', 'Hepatite fulminante');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hepatites', 'Síndrome de Gilbert');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hepatites', 'cirrose biliar primaria');

-- Tópicos do assunto 'Hepatites virais' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hepatites virais', 'Hepatites virais - Hepatite A');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hepatites virais', 'Hepatites virais - Hepatite B');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hepatites virais', 'Hepatites virais - Hepatite C');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hepatites virais', 'Hepatites virais - Hepatite Delta');

-- Tópicos do assunto 'Herpes Zóster' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Herpes Zóster', 'Herpes Zóster');

-- Tópicos do assunto 'Hiperaldosteronismo Primário' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hiperaldosteronismo Primário', 'Hiperaldosteronismo Primário');

-- Tópicos do assunto 'Hiperparatireoidismo primário' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hiperparatireoidismo primário', 'Hiperparatireoidismo primário');

-- Tópicos do assunto 'Hiperplasia adrenal congênita' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hiperplasia adrenal congênita', 'Hiperplasia adrenal congênita');

-- Tópicos do assunto 'Hiperprolactinemia' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hiperprolactinemia', 'Hiperprolactinemia');

-- Tópicos do assunto 'Hipertensão Renovascular' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hipertensão Renovascular', 'Hipertensão Renovascular');

-- Tópicos do assunto 'Hipertensão arterial sistêmica' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hipertensão arterial sistêmica', 'HAS - Classificação e escolha inicial de fármacos');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hipertensão arterial sistêmica', 'HAS - Definições e diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hipertensão arterial sistêmica', 'HAS - Hipertensão na criança');

-- Tópicos do assunto 'Hipertensão intracraniana' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hipertensão intracraniana', 'Hipertensão intracraniana - complicações');

-- Tópicos do assunto 'Hipertensão pulmonar' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hipertensão pulmonar', 'Hipertensão pulmonar');

-- Tópicos do assunto 'Hipotireoidismo' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Hipotireoidismo', 'Hipotireoidismo');

-- Tópicos do assunto 'Histoplasmose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Histoplasmose', 'Histoplasmose');

-- Tópicos do assunto 'Incidentaloma Adrenal' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Incidentaloma Adrenal', 'Incidentaloma Adrenal');

-- Tópicos do assunto 'Infecção do trato urinário' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Infecção do trato urinário', 'Infecção do trato urinário no adulto');

-- Tópicos do assunto 'Infecções de partes moles' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Infecções de partes moles', 'Celulite e Erisipela');

-- Tópicos do assunto 'Infecções de pele e partes moles' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Infecções de pele e partes moles', 'Infecção de partes moles');

-- Tópicos do assunto 'Injúria Renal Aguda' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Injúria Renal Aguda', 'Injúria Renal Aguda');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Injúria Renal Aguda', 'Injúria Renal Aguda - IRA intrínseca');

-- Tópicos do assunto 'Insuficiência Adrenal' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Insuficiência Adrenal', 'Insuficiência Adrenal');

-- Tópicos do assunto 'Insuficiência Cardíaca' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Insuficiência Cardíaca', 'Insuficiência cardíaca - Diagnóstico e manifestações clínicas');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Insuficiência Cardíaca', 'Insuficiência cardíaca - Exames diagnósticos');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Insuficiência Cardíaca', 'Insuficiência cardíaca - IC descompensada');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Insuficiência Cardíaca', 'Insuficiência cardíaca - Tratamento ambulatorial');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Insuficiência Cardíaca', 'Insuficiência cardíaca -Manifestações Clínicas');

-- Tópicos do assunto 'Insuficiência respiratória aguda' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Insuficiência respiratória aguda', 'IRpA - Diagnóstico diferencial');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Insuficiência respiratória aguda', 'SDRA');

-- Tópicos do assunto 'Intoxicações exógenas' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Intoxicações exógenas', 'Intoxicação por Nafazolina');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Intoxicações exógenas', 'Intoxicações exógenas - Medidas gerais');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Intoxicações exógenas', 'Intoxicações exógenas - Monóxido de carbono');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Intoxicações exógenas', 'Intoxicações exógenas - Opioides e benzodiazepínicos');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Intoxicações exógenas', 'Intoxicações exógenas - Organofosforados/carbamato');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Intoxicações exógenas', 'Intoxicações exógenas - Paracetamol');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Intoxicações exógenas', 'Intoxicações exógenas - ecstasy e cocaína');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Intoxicações exógenas', 'Intoxicações exógenas- antidepressivos tricíclicos');

-- Tópicos do assunto 'Leishmaniose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Leishmaniose', 'Leishmaniose - tegumentar');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Leishmaniose', 'Leishmaniose - visceral');

-- Tópicos do assunto 'Leptospirose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Leptospirose', 'Leptospirose');

-- Tópicos do assunto 'Leucemias' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Leucemias', 'Leucemia linfocítica crônica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Leucemias', 'Leucemia linfóide aguda');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Leucemias', 'Leucemia mieloide aguda');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Leucemias', 'Leucemia mieloide crônica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Leucemias', 'Leucemias - Complicações');

-- Tópicos do assunto 'Linfoma' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Linfoma', 'Linfoma');

-- Tópicos do assunto 'Linfonodomegalias' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Linfonodomegalias', 'Linfonodomegalias');

-- Tópicos do assunto 'Lombalgia' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Lombalgia', 'Lombalgia');

-- Tópicos do assunto 'Lúpus eritematoso sistêmico' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Lúpus eritematoso sistêmico', 'Doença renal no lúpus');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Lúpus eritematoso sistêmico', 'Lúpus - induzido por droga');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Lúpus eritematoso sistêmico', 'Lúpus - laboratório');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Lúpus eritematoso sistêmico', 'Lúpus - manifestações clínicas');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Lúpus eritematoso sistêmico', 'Tratamento do lúpus');

-- Tópicos do assunto 'Malária' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Malária', 'Malária');

-- Tópicos do assunto 'Meningite' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Meningite', 'Meningite - Meningite aguda - Diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Meningite', 'Meningite - Meningite aguda - Tratamento e profilaxia');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Meningite', 'Meningite - Meningite crônica');

-- Tópicos do assunto 'Micoses profundas' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Micoses profundas', 'Infecções respiratórias');

-- Tópicos do assunto 'Mieloma múltiplo' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Mieloma múltiplo', 'Gamopatias monoclonais');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Mieloma múltiplo', 'Mieloma múltiplo');

-- Tópicos do assunto 'Morte encefálica' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Morte encefálica', 'Morte encefálica - Protocolo de ME');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Morte encefálica', 'Morte encefálica - doação de órgãos');

-- Tópicos do assunto 'Mucormicose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Mucormicose', 'Mucormicose');

-- Tópicos do assunto 'Neuropatias periféricas' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Neuropatias periféricas', 'Polineuropatias - Propedêutica');

-- Tópicos do assunto 'Neutropenia febril' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Neutropenia febril', 'Neutropenia febril');

-- Tópicos do assunto 'Nódulo de tireoide' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Nódulo de tireoide', 'Investigação do nódulo tireoidiano');

-- Tópicos do assunto 'Nódulos de pulmão' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Nódulos de pulmão', 'Nódulos de pulmão');

-- Tópicos do assunto 'Osteoartrite' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Osteoartrite', 'Osteoartrite');

-- Tópicos do assunto 'Osteoporose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Osteoporose', 'Osteoporose - Abordagem geral');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Osteoporose', 'Osteoporose - Diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Osteoporose', 'Osteoporose - Manejo');

-- Tópicos do assunto 'Outras infecções e antibióticos' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Outras infecções e antibióticos', 'Antibióticos - Classes e mecanismos de ação');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Outras infecções e antibióticos', 'Infecção fúngica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Outras infecções e antibióticos', 'Outras infecções - ESBL');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Outras infecções e antibióticos', 'Outras infecções - Infecção de corrente sanguínea');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Outras infecções e antibióticos', 'Proteína c reativa');

-- Tópicos do assunto 'Outros temas - Clínica médica' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Outros temas - Clínica médica', 'Comunicação de notícias difíceis');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Outros temas - Clínica médica', 'Outros temas - Clínica médica');

-- Tópicos do assunto 'Paracoccidioidomicose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Paracoccidioidomicose', 'Paracoccidioidomicose - diagnóstico');

-- Tópicos do assunto 'Paralisia facial' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Paralisia facial', 'Paralisia facial');

-- Tópicos do assunto 'Pneumonia' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Pneumonia', 'Derrame parapneumônico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Pneumonia', 'Pneumonia Adquirida na Comunidade');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Pneumonia', 'Pneumonia hospitalar');

-- Tópicos do assunto 'Policondrite recidivante' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Policondrite recidivante', 'Policondrite recidivante');

-- Tópicos do assunto 'Polimialgia reumática' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Polimialgia reumática', 'Polimialgia reumática');

-- Tópicos do assunto 'Polimiosite e Dermatomiosite' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Polimiosite e Dermatomiosite', 'Polimiosite e Dermatomiosite');

-- Tópicos do assunto 'Porfirias' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Porfirias', 'Porfirias');

-- Tópicos do assunto 'Precauções e Isolamento' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Precauções e Isolamento', 'Precaução e Isolamento');

-- Tópicos do assunto 'Profilaxia de raiva' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Profilaxia de raiva', 'Profilaxia de raiva');

-- Tópicos do assunto 'Profilaxia de tétano' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Profilaxia de tétano', 'Profilaxia de tétano');

-- Tópicos do assunto 'Profilaxia pós-exposição' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Profilaxia pós-exposição', 'Profilaxia pós-exposição');

-- Tópicos do assunto 'Propedêutica' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Propedêutica', 'Cianose');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Propedêutica', 'Exame cardiovascular');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Propedêutica', 'Exame neurológico - diagnóstico topográfico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Propedêutica', 'Exame neurológico - pares cranianos');

-- Tópicos do assunto 'Psiquiatria' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Psiquiatria', 'Esquizofrenia');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Psiquiatria', 'Psiquiatria - Agitação psicomotora');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Psiquiatria', 'Psiquiatria - Sono - tratamento');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Psiquiatria', 'Psiquiatria - abuso de substâncias');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Psiquiatria', 'Psiquiatria da infância');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Psiquiatria', 'Suicídio');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Psiquiatria', 'Síndrome de Burnout');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Psiquiatria', 'Transtornos alimentares');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Psiquiatria', 'Transtornos de ansiedade');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Psiquiatria', 'Transtornos de personalidade');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Psiquiatria', 'Transtornos do humor');

-- Tópicos do assunto 'Rabdomiólise' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Rabdomiólise', 'Rabdomiólise');

-- Tópicos do assunto 'Reações transfusionais' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Reações transfusionais', 'Reações transfusionais');

-- Tópicos do assunto 'Ricketsioses' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Ricketsioses', 'Doença de Lyme');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Ricketsioses', 'Febre maculosa');

-- Tópicos do assunto 'Sarcoidose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Sarcoidose', 'Sarcoidose');

-- Tópicos do assunto 'Sepse' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Sepse', 'Sepse - Choque séptico na criança');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Sepse', 'Sepse - Critérios e diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Sepse', 'Sepse - Tratamento');

-- Tópicos do assunto 'Suporte ventilatório - Ventilação mecânica e VNI' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Suporte ventilatório - Ventilação mecânica e VNI', 'Ventilação mecânica e VNI');

-- Tópicos do assunto 'Sífilis' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Sífilis', 'Sífilis - Diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Sífilis', 'Sífilis - Tratamento');

-- Tópicos do assunto 'Síncope' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síncope', 'Síncope');

-- Tópicos do assunto 'Síndrome coronariana' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome coronariana', 'Doença coronária crônica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome coronariana', 'Síndrome Coronariana - Complicações');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome coronariana', 'Síndrome Coronariana - Diagnóstico Diferencial');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome coronariana', 'Síndrome Coronariana Aguda - Diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome coronariana', 'Síndrome Coronariana Aguda - Parede e Artéria');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome coronariana', 'Síndrome Coronariana Aguda - Tratamento');

-- Tópicos do assunto 'Síndrome da veia cava superior' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome da veia cava superior', 'Síndrome da veia cava superior');

-- Tópicos do assunto 'Síndrome de Cushing' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome de Cushing', 'Síndrome de Cushing');

-- Tópicos do assunto 'Síndrome de Sjogren' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome de Sjogren', 'Síndrome de Sjogren');

-- Tópicos do assunto 'Síndrome de lise tumoral' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome de lise tumoral', 'Síndrome da lise tumoral');

-- Tópicos do assunto 'Síndrome do Choque Tóxico' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome do Choque Tóxico', 'Síndrome do Choque Tóxico');

-- Tópicos do assunto 'Síndrome do intestino irritável' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome do intestino irritável', 'Síndrome do Intestino Irritável');

-- Tópicos do assunto 'Síndrome hemofagocítica' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome hemofagocítica', 'Síndrome hemofagocítica');

-- Tópicos do assunto 'Síndrome metabólica' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome metabólica', 'Compreender os critérios diagnósticos da Síndrome Metabólica.');

-- Tópicos do assunto 'Síndrome mielodisplásica' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndrome mielodisplásica', 'Síndrome mielodisplásica');

-- Tópicos do assunto 'Síndromes medulares' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndromes medulares', 'Síndromes medulares');

-- Tópicos do assunto 'Síndromes mieloproliferativas' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Síndromes mieloproliferativas', 'Síndromes mieloproliferativas');

-- Tópicos do assunto 'Tabagismo' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Tabagismo', 'Tabagismo - Fases de Motivação');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Tabagismo', 'Tratamento do tabagismo');

-- Tópicos do assunto 'Terapia intensiva' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Terapia intensiva', 'Terapia intensiva - Manejo do choque');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Terapia intensiva', 'Terapia intensiva - Monitorização em UTI');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Terapia intensiva', 'Terapia intensiva - sedação');

-- Tópicos do assunto 'Tireotoxicose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Tireotoxicose', 'Tireotoxicose com hipertireoidismo');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Tireotoxicose', 'Tireotoxicose sem hipertireoidismo');

-- Tópicos do assunto 'Toxoplasmose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Toxoplasmose', 'Toxoplasmose');

-- Tópicos do assunto 'Tromboembolia pulmonar' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Tromboembolia pulmonar', 'Tromboembolia pulmonar - manifestações clínicas e diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Tromboembolia pulmonar', 'Tromboembolia pulmonar - tratamento');

-- Tópicos do assunto 'Tuberculose' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Tuberculose', 'Tuberculose - Diagnóstico');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Tuberculose', 'Tuberculose - Tratamento');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Tuberculose', 'Tuberculose - Tuberculose na criança');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Tuberculose', 'Tuberculose extrapulmonar');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Tuberculose', 'Tuberculose latente');

-- Tópicos do assunto 'Tumores hipofisários e hipopituitarismo' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Tumores hipofisários e hipopituitarismo', 'Tumores hipofisários e hipopituitarismo');

-- Tópicos do assunto 'Valvopatias' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Valvopatias', 'Valvopatias - Doenças da válvula mitral');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Valvopatias', 'Valvopatias - Insuficiência aórtica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Valvopatias', 'Valvopatias- Estenose aórtica');

-- Tópicos do assunto 'Vasculites' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Vasculites', 'Arterite de Takayasu');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Vasculites', 'Arterite de células gigantes');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Vasculites', 'Doença de Behçet');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Vasculites', 'Granulomatose com poliangeíte');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Vasculites', 'Granulomatose com poliangeíte e eosinofilia');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Vasculites', 'Poliangeíte microscópica');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Vasculites', 'Poliarterite nodosa');
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Vasculites', 'Tromboangeíte obliterante');

-- Tópicos do assunto 'Vertigem' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Vertigem', 'Vertigem');

-- Tópicos do assunto 'Úlceras Genitais' da disciplina 'Clínica Médica'
PERFORM insert_topic_if_not_exists('Clínica Médica', 'Úlceras Genitais', 'Úlceras genitais');

-- Tópicos do assunto 'Amenorreia' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Amenorreia', 'Amenorreia - Amenorreia primária');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Amenorreia', 'Amenorreia - Amenorreia secundária');

-- Tópicos do assunto 'Assistência pré-natal' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Assistência pré-natal', 'Assistência pré-natal - Alto risco');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Assistência pré-natal', 'Assistência pré-natal - Exame físico');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Assistência pré-natal', 'Assistência pré-natal - Exames complementares');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Assistência pré-natal', 'Assistência pré-natal - Suplementação');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Assistência pré-natal', 'Assistência pré-natal - Vacinação');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Assistência pré-natal', 'Colestase gravídica');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Assistência pré-natal', 'Comorbidades e gestação');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Assistência pré-natal', 'Fármacos e Gestação');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Assistência pré-natal', 'Medicina Fetal');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Assistência pré-natal', 'Trombofilias');

-- Tópicos do assunto 'Cervicite e vulvovaginite' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Cervicite e vulvovaginite', 'Cervicite');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Cervicite e vulvovaginite', 'Vulvovaginite');

-- Tópicos do assunto 'Ciclo e fisiologia menstrual' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Ciclo e fisiologia menstrual', 'Ciclo e fisiologia menstrual');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Ciclo e fisiologia menstrual', 'Dismenorreia e síndrome pré-menstrual');

-- Tópicos do assunto 'Climatério' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Climatério', 'Climatério - Quadro clínico e diagnóstico');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Climatério', 'Climatério - Terapia de reposição hormonal e alternativas');

-- Tópicos do assunto 'Câncer de colo de útero e HPV' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de colo de útero e HPV', 'Câncer de colo de útero - Colpocitologia oncótica, colposcopia e rastreamento');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de colo de útero e HPV', 'Câncer de colo de útero - Estadiamento e tratamento');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de colo de útero e HPV', 'Câncer de colo de útero - Fatores de risco e epidemiologia');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de colo de útero e HPV', 'HPV - Conceitos gerais e história natural');

-- Tópicos do assunto 'Câncer de endométrio' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de endométrio', 'Câncer de endométrio - Diagnóstico e fatores de risco');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de endométrio', 'Câncer de endométrio - Tratamento');

-- Tópicos do assunto 'Câncer de mama' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de mama', 'Câncer de mama - Diagnóstico e rastreamento');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de mama', 'Câncer de mama - Estadiamento e tratamento');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de mama', 'Câncer de mama - fatores de risco');

-- Tópicos do assunto 'Câncer de vulva' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Câncer de vulva', 'Câncer de vulva');

-- Tópicos do assunto 'Diabetes na gestação' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Diabetes na gestação', 'Diabetes na gestação - Diagnóstico e fisiopatologia');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Diabetes na gestação', 'Diabetes na gestação - Tratamento e seguimento');

-- Tópicos do assunto 'Diagnóstico de gestação' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Diagnóstico de gestação', 'Diagnóstico de gestação');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Diagnóstico de gestação', 'Modificações do organismo materno');

-- Tópicos do assunto 'Doença hipertensiva específica da gravidez' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Doença hipertensiva específica da gravidez', 'DHEG - Diagnóstico e classificação');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Doença hipertensiva específica da gravidez', 'DHEG - Fatores de risco e prevenção');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Doença hipertensiva específica da gravidez', 'DHEG - Iminência de eclâmpsia / eclâmpsia');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Doença hipertensiva específica da gravidez', 'DHEG - Tratamento');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Doença hipertensiva específica da gravidez', 'Síndrome HELLP');

-- Tópicos do assunto 'Doença inflamatória pélvica' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Doença inflamatória pélvica', 'Doença inflamatória pélvica - Quadro clínico e diagnóstico');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Doença inflamatória pélvica', 'Doença inflamatória pélvica - Tratamento');

-- Tópicos do assunto 'Doenças da Mama' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Doenças da Mama', 'Doenças da mama - Derrame papilar');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Doenças da Mama', 'Doenças da mama - Mastalgia e processos inflamatórios da mama');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Doenças da Mama', 'Doenças da mama - Nódulos e cistos');

-- Tópicos do assunto 'Doenças ovarianas' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Doenças ovarianas', 'Câncer de ovário');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Doenças ovarianas', 'Doenças benignas do ovário');

-- Tópicos do assunto 'Endometriose' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Endometriose', 'Endometriose - Diagnóstico e classificação');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Endometriose', 'Endometriose - tratamento');

-- Tópicos do assunto 'Gemelaridade' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Gemelaridade', 'Gemelaridade');

-- Tópicos do assunto 'Hemorragias da primeira metade da gestação' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Hemorragias da primeira metade da gestação', 'Hemorragias da primeira metade da gestação - Aborto');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Hemorragias da primeira metade da gestação', 'Hemorragias da primeira metade da gestação - Doença trofoblástica e Mola');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Hemorragias da primeira metade da gestação', 'Hemorragias da primeira metade da gestação - Gestação ectópica');

-- Tópicos do assunto 'Hemorragias da segunda metade da gestação' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Hemorragias da segunda metade da gestação', 'Hemorragias da segunda metade da gestação - Descolamento prematuro de placenta');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Hemorragias da segunda metade da gestação', 'Hemorragias da segunda metade da gestação - Placenta prévia e acretismo placentário');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Hemorragias da segunda metade da gestação', 'Hemorragias da segunda metade da gestação - Rotura uterina e rotura de vasa prévia');

-- Tópicos do assunto 'Incontinência Urinária e Prolapso Genital' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Incontinência Urinária e Prolapso Genital', 'Incontinência Urinária - Diagnóstico');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Incontinência Urinária e Prolapso Genital', 'Incontinência Urinária - Tratamento');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Incontinência Urinária e Prolapso Genital', 'Prolapso genital - Manifestações clínicas e POP-Q');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Incontinência Urinária e Prolapso Genital', 'Prolapso genital - Tratamento');

-- Tópicos do assunto 'Infecção de trato urinário na gestante' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Infecção de trato urinário na gestante', 'Infecção de trato urinário na gestante');

-- Tópicos do assunto 'Infecções e gestação' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Infecções e gestação', 'HIV e gestação');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Infecções e gestação', 'Herpes e hepatites virais em gestantes');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Infecções e gestação', 'Sífilis e gestação');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Infecções e gestação', 'Toxoplasmose e gestação');

-- Tópicos do assunto 'Infertilidade' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Infertilidade', 'Infertilidade - Investigação e etiologia');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Infertilidade', 'Infertilidade - Tratamento e questões legais');

-- Tópicos do assunto 'Isoimunização RH' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Isoimunização RH', 'Isoimunização RH');

-- Tópicos do assunto 'Mecanismo de parto e assistência clínica' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Mecanismo de parto e assistência clínica', 'Hemorragia puerperal');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Mecanismo de parto e assistência clínica', 'Indicações de vias de parto');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Mecanismo de parto e assistência clínica', 'Mecanismo de Parto - Assistência clínica');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Mecanismo de parto e assistência clínica', 'Mecanismo de parto');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Mecanismo de parto e assistência clínica', 'Parto - Distócia de ombro');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Mecanismo de parto e assistência clínica', 'Parto pélvico');

-- Tópicos do assunto 'Métodos contraceptivos' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Métodos contraceptivos', 'Métodos contraceptivos - Contracepção de emergência');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Métodos contraceptivos', 'Métodos contraceptivos - Esterilização cirúrgica');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Métodos contraceptivos', 'Métodos contraceptivos - Hormonais');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Métodos contraceptivos', 'Métodos contraceptivos - Não hormonais');

-- Tópicos do assunto 'Outros temas - Ginecologia e Obstetrícia' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Outros temas - Ginecologia e Obstetrícia', 'Aloimunização Rh');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Outros temas - Ginecologia e Obstetrícia', 'Dor Pélvica Crônica');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Outros temas - Ginecologia e Obstetrícia', 'Função Placentária');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Outros temas - Ginecologia e Obstetrícia', 'Infecção do trato urinário');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Outros temas - Ginecologia e Obstetrícia', 'Licença Maternidade');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Outros temas - Ginecologia e Obstetrícia', 'Outros temas - Dismenorréia primária');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Outros temas - Ginecologia e Obstetrícia', 'Outros temas - anatomia');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Outros temas - Ginecologia e Obstetrícia', 'Saúde LGBT');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Outros temas - Ginecologia e Obstetrícia', 'Sexualidade');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Outros temas - Ginecologia e Obstetrícia', 'Óbito Materno e Near Miss');

-- Tópicos do assunto 'Prematuridade' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Prematuridade', 'Prematuridade - Incompetência istmocervical');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Prematuridade', 'Prematuridade - TPP, tocólise, corticoterapia e profilaxia');

-- Tópicos do assunto 'Puerpério' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Puerpério', 'Puerpério - Contracepção');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Puerpério', 'Puerpério - Infecção puerperal');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Puerpério', 'Puerpério - Mastite e amamentação');

-- Tópicos do assunto 'Relações uterofetais' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Relações uterofetais', 'Relações uterofetais');

-- Tópicos do assunto 'Restrição do crescimento intrauterino' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Restrição do crescimento intrauterino', 'Restrição do crescimento intrauterino');

-- Tópicos do assunto 'Rotura prematura de membranas' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Rotura prematura de membranas', 'Rotura prematura de membranas - Conduta');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Rotura prematura de membranas', 'Rotura prematura de membranas - Diagnóstico');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Rotura prematura de membranas', 'Rotura prematura de membranas - Profilaxia antibiótica');

-- Tópicos do assunto 'Sangramento Uterino Anormal' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Sangramento Uterino Anormal', 'Sangramento Uterino Anormal - Adenomiose');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Sangramento Uterino Anormal', 'Sangramento Uterino Anormal - Hiperplasia e Neoplasia Endometrial');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Sangramento Uterino Anormal', 'Sangramento Uterino Anormal - Investigação inicial');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Sangramento Uterino Anormal', 'Sangramento Uterino Anormal - Mioma uterino');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Sangramento Uterino Anormal', 'Sangramento Uterino Anormal - Pólipos e sarcoma uterino');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Sangramento Uterino Anormal', 'Sangramento Uterino Anormal - Tratamento');

-- Tópicos do assunto 'Síndrome dos Ovários Policísticos' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Síndrome dos Ovários Policísticos', 'Síndrome dos ovários policísticos - Diagnóstico');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Síndrome dos Ovários Policísticos', 'Síndrome dos ovários policísticos - Tratamento');

-- Tópicos do assunto 'Violência sexual' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Violência sexual', 'Violência sexual');

-- Tópicos do assunto 'Vitalidade Fetal' da disciplina 'Ginecologia e Obstetrícia'
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Vitalidade Fetal', 'Vitalidade fetal - Cardiotocografia');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Vitalidade Fetal', 'Vitalidade fetal - Perfil biofísico fetal e dopplervelocimetria');
PERFORM insert_topic_if_not_exists('Ginecologia e Obstetrícia', 'Vitalidade Fetal', 'Vitalidade fetal - Óbito fetal');

-- Tópicos do assunto 'Atenção básica' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Atenção básica', 'Atenção básica - Atributos da APS');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Atenção básica', 'Atenção básica - Comunicação, Clínica Ampliada e Método Clínico Centrado na Pessoa');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Atenção básica', 'Atenção básica - Equipe de Saúde da Família e Política Nacional de Atenção Básica');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Atenção básica', 'Atenção básica - Ferramentas de abordagem familiar');

-- Tópicos do assunto 'Bioestatística' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Bioestatística', 'Bioestatística - Amostragem');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Bioestatística', 'Bioestatística - Classificação de variáveis');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Bioestatística', 'Bioestatística - Medidas de tendência central e dispersão');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Bioestatística', 'Bioestatística - Testes estatísticos e tipos de gráficos');

-- Tópicos do assunto 'Declaração de óbito' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Declaração de óbito', 'Declaração de óbito - Preenchimento');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Declaração de óbito', 'Declaração de óbito - Responsabilidade de preenchimento');

-- Tópicos do assunto 'Epidemias' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Epidemias', 'Epidemias');

-- Tópicos do assunto 'Estratégia de saúde da família' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estratégia de saúde da família', 'ESF - interprofissionalidade e matriciamento');

-- Tópicos do assunto 'Estudos epidemiológicos' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Estudos de intervenção - Ensaio clínico (delineamento)');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Estudos de intervenção - Ensaio clínico (medidas de efeito)');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Estudos de intervenção - Outros ensaios (de comunidade, de equivalência e de não-inferioridade)');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Estudos epidemiológicos - Ensaio clínico (delineamento e medidas de efeito)');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Estudos observacionais - Caso-controle');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Estudos observacionais - Coorte');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Estudos observacionais - Ecológico e Transversal');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Estudos observacionais - Medidas em estudos observacionais');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Estudos observacionais - Relato de caso e série de casos');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Metodologia de Pesquisa - Critérios de causalidade');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Metodologia de Pesquisa - Metodologia científica e ética em pesquisa');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Metodologia de Pesquisa - Nível de evidência científica');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Metodologia de Pesquisa - Revisão sistemática e metanálise');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Estudos epidemiológicos', 'Metodologia de Pesquisa - Teste de hipóteses');

-- Tópicos do assunto 'Gestão em Saúde' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Gestão em Saúde', 'Gestão em Saúde');

-- Tópicos do assunto 'Indicadores em Saúde' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Indicadores em Saúde', 'Indicadores em Saúde - Avaliação da atenção básica');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Indicadores em Saúde', 'Indicadores em Saúde - Causas de mortalidade');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Indicadores em Saúde', 'Indicadores em Saúde - DALY');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Indicadores em Saúde', 'Indicadores em Saúde - Doenças crônicas não transmissíveis');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Indicadores em Saúde', 'Indicadores em Saúde - Medidas de frequência elementares');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Indicadores em Saúde', 'Indicadores em Saúde - Nelson Moraes e Swaroop-Uemura');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Indicadores em Saúde', 'Indicadores em Saúde - Paradoxo preventivo');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Indicadores em Saúde', 'Indicadores em Saúde - Transição demográfica e epidemiológica');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Indicadores em Saúde', 'Indicadores em Saúde - Vulnerabilidade e desigualdade social');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Indicadores em Saúde', 'Indicadores em saúde - Mortalidade infantil e materna');

-- Tópicos do assunto 'Medicina do trabalho' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Medicina do trabalho', 'Medicina do trabalho - Acidente de trabalho; CAT e benefícios');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Medicina do trabalho', 'Medicina do trabalho - Doenças ocupacionais e classificação de Schilling');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Medicina do trabalho', 'Medicina do trabalho - Doenças osteomusculares relacionadas ao trabalho');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Medicina do trabalho', 'Medicina do trabalho - Doenças psiquiátricas relacionadas ao trabalho');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Medicina do trabalho', 'Medicina do trabalho - Intoxicação por metais e benzeno');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Medicina do trabalho', 'Medicina do trabalho - Normas regulamentadoras e classificação de riscos ocupacionais');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Medicina do trabalho', 'Medicina do trabalho - Perda auditiva induzida por ruído');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Medicina do trabalho', 'Medicina do trabalho - Pneumoconioses e doenças respiratórias ocupacionais');

-- Tópicos do assunto 'Outros temas - Medicina preventiva' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Outros temas - Medicina preventiva', 'Outros temas - Medicina preventiva');

-- Tópicos do assunto 'Prevenção de acidentes' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Prevenção de acidentes', 'Prevenção de acidentes');

-- Tópicos do assunto 'Processo Saúde-Doença' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Processo Saúde-Doença', 'Processo Saúde-Doença - Determinantes sociais e conceito de saúde');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Processo Saúde-Doença', 'Processo Saúde-Doença - Níveis de prevenção e história natural da doença');

-- Tópicos do assunto 'Programa Mais Médicos' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Programa Mais Médicos', 'Programa Mais Médicos');

-- Tópicos do assunto 'Questões de gênero e sexualidade' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Questões de gênero e sexualidade', 'Questões de gênero e sexualidade');

-- Tópicos do assunto 'Rastreamento' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Rastreamento', 'Rastreamento - Critérios para implementação');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Rastreamento', 'Rastreamento - Recomendações por idade e fatores de risco');

-- Tópicos do assunto 'SUS' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'SUS', 'SUS - Histórico e tipos de sistemas de saúde');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'SUS', 'SUS - Leis orgânicas da saúde (8080/90 e 8142/90)');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'SUS', 'SUS - Marcos legislativos e financiamento');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'SUS', 'SUS - Políticas públicas e Agências Reguladoras');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'SUS', 'SUS - Princípios e diretrizes');

-- Tópicos do assunto 'Saúde suplementar e planos de saúde' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Saúde suplementar e planos de saúde', 'Saúde suplementar e planos de saúde');

-- Tópicos do assunto 'Testes diagnósticos' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Testes diagnósticos', 'Testes diagnósticos - Curva ROC');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Testes diagnósticos', 'Testes diagnósticos - Razão de verossimilhança');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Testes diagnósticos', 'Testes diagnósticos - Sensibilidade/Especificidade e Valores Preditivos');

-- Tópicos do assunto 'Vigilância Epidemiológica' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Vigilância Epidemiológica', 'Vigilância Epidemiológica - Cadeia epidemiológica');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Vigilância Epidemiológica', 'Vigilância Epidemiológica - Sistemas de informação');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Vigilância Epidemiológica', 'Vigilância em Saúde - Conceitos gerais, definições e funções');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Vigilância Epidemiológica', 'Vigilância epidemiológica - Notificação compulsória');

-- Tópicos do assunto 'Violência doméstica e contra a mulher' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Violência doméstica e contra a mulher', 'Violência doméstica e contra a mulher');

-- Tópicos do assunto 'Violência psicológica' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Violência psicológica', 'Violência psicológica');

-- Tópicos do assunto 'Ética Médica' da disciplina 'Medicina Preventiva'
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Ética Médica', 'Ética médica - Aborto legal');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Ética Médica', 'Ética médica - Ortotanásia e distanásia');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Ética Médica', 'Ética médica - Princípios fundamentais e Código de ética');
PERFORM insert_topic_if_not_exists('Medicina Preventiva', 'Ética Médica', 'Ética médica - Prontuário médico e sigilo profissional');

-- Tópicos do assunto 'Aleitamento materno' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Aleitamento materno', 'Aleitamento materno - Orientações, pega e contraindicações');
PERFORM insert_topic_if_not_exists('Pediatria', 'Aleitamento materno', 'Aleitamento materno - Propriedades do leite e benefícios');

-- Tópicos do assunto 'Alergia à proteína do leite de vaca' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Alergia à proteína do leite de vaca', 'Alergia à proteína do leite de vaca');

-- Tópicos do assunto 'Avaliação neonatal' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Avaliação neonatal', 'Avaliação neonatal e exame do recém-nascido');

-- Tópicos do assunto 'Bronquiolite e lactente sibilante' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Bronquiolite e lactente sibilante', 'Bronquiolite e lactente sibilante');

-- Tópicos do assunto 'Cardiopatias congênitas' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Cardiopatias congênitas', 'Cardiopatias congênitas - Cianogênicas');
PERFORM insert_topic_if_not_exists('Pediatria', 'Cardiopatias congênitas', 'Cardiopatias congênitas - Não cianogênicas');

-- Tópicos do assunto 'Convulsão febril' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Convulsão febril', 'Convulsão febril');

-- Tópicos do assunto 'Coqueluche' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Coqueluche', 'Coqueluche - Diagnóstico e tratamento');

-- Tópicos do assunto 'Desconforto respiratório do recém-nascido' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Desconforto respiratório do recém-nascido', 'Desconforto respiratório do recém-nascido - Taquip…ória, aspiração meconial, apneia da prematuridade');
PERFORM insert_topic_if_not_exists('Pediatria', 'Desconforto respiratório do recém-nascido', 'Hipertensão pulmonar neonatal');
PERFORM insert_topic_if_not_exists('Pediatria', 'Desconforto respiratório do recém-nascido', 'Síndrome do desconforto respiratório neonatal');

-- Tópicos do assunto 'Desnutrição' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Desnutrição', 'Desnutrição - Classificação e formas clínicas');
PERFORM insert_topic_if_not_exists('Pediatria', 'Desnutrição', 'Desnutrição - Hipovitaminoses e deficiência de micronutrientes');

-- Tópicos do assunto 'Diarreia e desidratação' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Diarreia e desidratação', 'Diarreia e desidratação - Diarreia crônica e persistente');
PERFORM insert_topic_if_not_exists('Pediatria', 'Diarreia e desidratação', 'Diarreia e desidratação - Mecanismo e agentes etiológicos');
PERFORM insert_topic_if_not_exists('Pediatria', 'Diarreia e desidratação', 'Diarreia e desidratação - Tratamento');

-- Tópicos do assunto 'Distúrbios do Crescimento e Desenvolvimento' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Distúrbios do Crescimento e Desenvolvimento', 'Baixa estatura');

-- Tópicos do assunto 'Doença do refluxo gastroesofágico na infância' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Doença do refluxo gastroesofágico na infância', 'Doença do refluxo gastroesofágico na infância');

-- Tópicos do assunto 'Doenças Congênitas' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Doenças Congênitas', 'Doenças congênitas - Síndrome Alcoólica Fetal');
PERFORM insert_topic_if_not_exists('Pediatria', 'Doenças Congênitas', 'Doenças congênitas - Síndrome de Down e Turner');

-- Tópicos do assunto 'Doenças exantemáticas' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Doenças exantemáticas', 'Doenças exantemáticas - Doença de Kawasaki');
PERFORM insert_topic_if_not_exists('Pediatria', 'Doenças exantemáticas', 'Doenças exantemáticas - Eritema infeccioso, Escarlatina, Exantema Súbito e Rubéola');
PERFORM insert_topic_if_not_exists('Pediatria', 'Doenças exantemáticas', 'Doenças exantemáticas - Sarampo');
PERFORM insert_topic_if_not_exists('Pediatria', 'Doenças exantemáticas', 'Doenças exantemáticas - Varicela');

-- Tópicos do assunto 'Febre sem sinais localizatórios' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Febre sem sinais localizatórios', 'Febre sem sinais localizatórios');

-- Tópicos do assunto 'Fibrose cística' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Fibrose cística', 'Fibrose Cística');

-- Tópicos do assunto 'Hemorragia neonatal' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Hemorragia neonatal', 'Hemorragia neonatal');

-- Tópicos do assunto 'Hidrocefalia' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Hidrocefalia', 'Hidrocefalia - DVP');

-- Tópicos do assunto 'Hipoglicemia neonatal' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Hipoglicemia neonatal', 'Hipoglicemia neonatal');

-- Tópicos do assunto 'IVAS' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'IVAS', 'IVAS - Crupe e epiglotite');
PERFORM insert_topic_if_not_exists('Pediatria', 'IVAS', 'IVAS - Faringoamigdalites e mononucleose');
PERFORM insert_topic_if_not_exists('Pediatria', 'IVAS', 'IVAS - Otite média aguda e otite externa');
PERFORM insert_topic_if_not_exists('Pediatria', 'IVAS', 'IVAS - Resfriado e rinossinusite aguda');

-- Tópicos do assunto 'Icterícia neonatal' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Icterícia neonatal', 'Icterícia neonatal - Colestase neonatal');
PERFORM insert_topic_if_not_exists('Pediatria', 'Icterícia neonatal', 'Icterícia neonatal - Fisiológica vs Patológica');

-- Tópicos do assunto 'Imunodeficiência' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Imunodeficiência', 'Imunodeficiência - ICV');
PERFORM insert_topic_if_not_exists('Pediatria', 'Imunodeficiência', 'Imunodeficiência adquirida');
PERFORM insert_topic_if_not_exists('Pediatria', 'Imunodeficiência', 'Imunodeficiência na infância - Primária');

-- Tópicos do assunto 'Infecção urinária na infância' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Infecção urinária na infância', 'ITU PED - Diagnóstico');
PERFORM insert_topic_if_not_exists('Pediatria', 'Infecção urinária na infância', 'ITU PED - Epidemiologia e agentes etiológicos');
PERFORM insert_topic_if_not_exists('Pediatria', 'Infecção urinária na infância', 'ITU PED - Manejo');
PERFORM insert_topic_if_not_exists('Pediatria', 'Infecção urinária na infância', 'ITU PED - Manifestações clínicas e diagnóstico');

-- Tópicos do assunto 'Maus tratos' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Maus tratos', 'Maus tratos');

-- Tópicos do assunto 'Obesidade na infância' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Obesidade na infância', 'Obesidade na infância');

-- Tópicos do assunto 'Outros temas - Pediatria' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Outros temas - Pediatria', 'Outros temas - Pediatria');

-- Tópicos do assunto 'PBLS e PALS' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'PBLS e PALS', 'PBLS e PALS - Aspiração de Corpo estranho');
PERFORM insert_topic_if_not_exists('Pediatria', 'PBLS e PALS', 'PBLS e PALS - Avaliação inicial e critérios de gravidade');
PERFORM insert_topic_if_not_exists('Pediatria', 'PBLS e PALS', 'PBLS e PALS - PCR');
PERFORM insert_topic_if_not_exists('Pediatria', 'PBLS e PALS', 'PBLS e PALS - Taquicardia supraventricular');

-- Tópicos do assunto 'Parasitoses' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Parasitoses', 'Parasitoses - Escabiose, pediculose e larva migrans cutânea');
PERFORM insert_topic_if_not_exists('Pediatria', 'Parasitoses', 'Parasitoses - Helmintos e toxocaríase');
PERFORM insert_topic_if_not_exists('Pediatria', 'Parasitoses', 'Parasitoses - Protozoários');

-- Tópicos do assunto 'Pneumonia na infância' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Pneumonia na infância', 'Pneumonias na infância');

-- Tópicos do assunto 'Puberdade precoce e tardia' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Puberdade precoce e tardia', 'Puberdade precoce e tardia');

-- Tópicos do assunto 'Puericultura' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Puericultura', 'Puericultura - Alimentação, suplementação e higiene oral');
PERFORM insert_topic_if_not_exists('Pediatria', 'Puericultura', 'Puericultura - Crescimento');
PERFORM insert_topic_if_not_exists('Pediatria', 'Puericultura', 'Puericultura - Desenvolvimento neuropsicomotor');
PERFORM insert_topic_if_not_exists('Pediatria', 'Puericultura', 'Puericultura - Puberdade e adolescência');

-- Tópicos do assunto 'Reanimação Neonatal' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Reanimação Neonatal', 'Reanimação neonatal');

-- Tópicos do assunto 'Sepse neonatal' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Sepse neonatal', 'Sepse neonatal');

-- Tópicos do assunto 'Síndrome da morte súbita do lactente' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Síndrome da morte súbita do lactente', 'Síndrome da morte súbita do lactente');

-- Tópicos do assunto 'TORCH e Sífilis congênita' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'TORCH e Sífilis congênita', 'Sífilis congênita');
PERFORM insert_topic_if_not_exists('Pediatria', 'TORCH e Sífilis congênita', 'TORCHS - Citomegalovírus e Zika');
PERFORM insert_topic_if_not_exists('Pediatria', 'TORCH e Sífilis congênita', 'TORCHS - Rubéola');
PERFORM insert_topic_if_not_exists('Pediatria', 'TORCH e Sífilis congênita', 'TORCHS - Toxoplasmose');

-- Tópicos do assunto 'Triagem Neonatal' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Triagem Neonatal', 'Triagem neonatal');

-- Tópicos do assunto 'Vacinação' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Vacinação', 'BCG');
PERFORM insert_topic_if_not_exists('Pediatria', 'Vacinação', 'Calendário vacinal da criança, adolescente e adulto');
PERFORM insert_topic_if_not_exists('Pediatria', 'Vacinação', 'Conceitos gerais e contraindicações');
PERFORM insert_topic_if_not_exists('Pediatria', 'Vacinação', 'Vacinação - BCG, HPV, Febre amarela e VORH');

-- Tópicos do assunto 'Varíola' da disciplina 'Pediatria'
PERFORM insert_topic_if_not_exists('Pediatria', 'Varíola', 'Varíola');

-- ========================================
-- 6. LIMPEZA E VERIFICAÇÃO
-- ========================================

-- Limpar funções temporárias
DROP FUNCTION IF EXISTS insert_subject_if_not_exists(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS insert_topic_if_not_exists(TEXT, TEXT, TEXT);

END $$;

-- ========================================
-- 7. CONSULTAS DE VERIFICAÇÃO
-- ========================================

-- Verificar os dados inseridos
SELECT 'Disciplinas inseridas:' as info, COUNT(*) as total FROM disciplines WHERE is_system = true;
SELECT 'Assuntos inseridos:' as info, COUNT(*) as total FROM subjects;
SELECT 'Tópicos inseridos:' as info, COUNT(*) as total FROM topics WHERE subject_id IS NOT NULL;

-- Consulta detalhada da hierarquia criada
SELECT 
    d.name as disciplina,
    COUNT(DISTINCT s.id) as total_assuntos,
    COUNT(t.id) as total_topicos
FROM disciplines d
LEFT JOIN subjects s ON d.id = s.discipline_id
LEFT JOIN topics t ON s.id = t.subject_id
WHERE d.is_system = true
GROUP BY d.id, d.name
ORDER BY d.name;

-- Amostra da hierarquia completa (primeiros 100 registros)
SELECT 
    d.name as disciplina,
    s.name as assunto,
    t.name as topico
FROM disciplines d
INNER JOIN subjects s ON d.id = s.discipline_id
INNER JOIN topics t ON s.id = t.subject_id
WHERE d.is_system = true
ORDER BY d.name, s.name, t.name
LIMIT 100;

/*
========================================
INSTRUÇÕES DE USO:
========================================

1. ANTES DE EXECUTAR:
   - Substitua o UUID 'system_user_id' por um UUID válido do seu sistema
   - Execute: SELECT id FROM auth.users LIMIT 1;
   - Copie o UUID retornado e substitua na variável system_user_id

2. EXECUÇÃO:
   - Copie todo o conteúdo deste arquivo
   - Cole no Supabase SQL Editor
   - Execute o script completo

3. VERIFICAÇÃO:
   - As consultas no final mostrarão os dados inseridos
   - Verifique se os totais estão corretos
   - Use as consultas de amostra para verificar a hierarquia

4. ESTRUTURA CRIADA:
   - Disciplinas: Áreas principais (Clínica Médica, Cirurgia, etc.)
   - Assuntos: Temas dentro de cada disciplina
   - Tópicos: Subtemas específicos dentro de cada assunto

5. CARACTERÍSTICAS:
   - Usa ON CONFLICT DO NOTHING para evitar duplicatas
   - Mantém integridade referencial
   - Marca disciplinas como is_system = true
   - Inclui timestamps de criação e atualização

6. EM CASO DE ERRO:
   - Verifique se o UUID do usuário está correto
   - Verifique se as tabelas existem no banco
   - Verifique as foreign keys entre as tabelas
*/
