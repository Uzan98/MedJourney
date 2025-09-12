-- Triggers para envio automático de notificações
-- Este arquivo contém os triggers que serão executados automaticamente
-- quando eventos específicos ocorrerem no banco de dados

-- =====================================================
-- TRIGGER: Notificação para novos simulados
-- =====================================================

-- Função para criar notificação de novo simulado
CREATE OR REPLACE FUNCTION notify_new_exam()
RETURNS TRIGGER AS $$
DECLARE
    notification_id INTEGER;
    faculty_exam_record RECORD;
BEGIN
    -- Verificar se existe um faculty_exam associado a este exam
    SELECT fe.faculty_id INTO faculty_exam_record
    FROM public.faculty_exams fe
    WHERE fe.external_exam_id = NEW.id
    LIMIT 1;
    
    -- Se encontrou uma faculdade associada, notificar apenas os membros da faculdade
    IF FOUND THEN
        INSERT INTO notifications (
            title,
            message,
            type,
            target_type,
            target_id,
            sender_id,
            data,
            created_at
        ) VALUES (
            'Novo Simulado Disponível',
            'O simulado "' || COALESCE(NEW.title, 'Sem título') || '" foi disponibilizado para sua turma',
            'new_simulado',
            'faculty',
            faculty_exam_record.faculty_id,
            NEW.user_id,
            jsonb_build_object(
                'exam_id', NEW.id,
                'exam_title', NEW.title
            ),
            NOW()
        ) RETURNING id INTO notification_id;
    ELSE
        -- Se não há faculdade associada, é um simulado público - não enviar notificações
        -- Comentário: Simulados públicos não devem gerar notificações para todos os usuários
        NULL; -- Não fazer nada para simulados públicos
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger para novos simulados
DROP TRIGGER IF EXISTS trigger_notify_new_exam ON exams;
CREATE TRIGGER trigger_notify_new_exam
    AFTER INSERT ON exams
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_exam();

-- =====================================================
-- TRIGGER: Notificação para simulados da faculdade
-- =====================================================

-- Função para criar notificação de novo simulado da faculdade
CREATE OR REPLACE FUNCTION notify_new_faculty_exam()
RETURNS TRIGGER AS $$
DECLARE
    notification_id INTEGER;
BEGIN
    -- Criar notificação apenas quando o simulado é publicado
    IF NEW.is_published = true AND (OLD.is_published IS NULL OR OLD.is_published = false) THEN
        INSERT INTO notifications (
            title,
            message,
            type,
            target_type,
            target_id,
            sender_id,
            data,
            created_at
        ) VALUES (
            'Novo Simulado FACUL Disponível',
            'O simulado "' || COALESCE(NEW.title, 'Sem título') || '" foi disponibilizado na faculdade',
            'new_simulado',
            'faculty',
            NEW.faculty_id,
            NEW.creator_id,
            jsonb_build_object(
                'faculty_exam_id', NEW.id,
                'exam_title', NEW.title,
                'faculty_id', NEW.faculty_id,
                'external_exam_id', NEW.external_exam_id,
                'disciplina', NEW.disciplina,
                'periodo', NEW.periodo
            ),
            NOW()
        ) RETURNING id INTO notification_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger para simulados da faculdade
DROP TRIGGER IF EXISTS trigger_notify_new_faculty_exam ON faculty_exams;
CREATE TRIGGER trigger_notify_new_faculty_exam
    AFTER INSERT OR UPDATE ON faculty_exams
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_faculty_exam();

-- =====================================================
-- TRIGGER: Notificação para novos posts no fórum
-- =====================================================

-- Função para criar notificação de novo tópico no fórum
CREATE OR REPLACE FUNCTION notify_new_forum_post()
RETURNS TRIGGER AS $$
DECLARE
    new_notification_id INTEGER;
    user_record RECORD;
BEGIN
    -- Criar notificação para novo tópico no fórum
    INSERT INTO notifications (
        title,
        message,
        type,
        target_type,
        target_id,
        sender_id,
        data,
        created_at
    ) VALUES (
        'Nova Dúvida no Fórum',
        'Uma nova dúvida "' || COALESCE(NEW.title, 'Sem título') || '" foi postada no fórum da sua turma',
        'forum_post',
        'faculty',
        NEW.faculty_id,
        NEW.user_id,
        jsonb_build_object(
            'topic_id', NEW.id,
            'topic_title', NEW.title,
            'faculty_id', NEW.faculty_id
        ),
        NOW()
    ) RETURNING id INTO new_notification_id;
    
    -- Criar destinatários para todos os usuários da faculdade (exceto o autor)
    FOR user_record IN 
        SELECT u.user_id FROM faculty_members fm
        JOIN users u ON fm.user_id::text = u.user_id
        WHERE fm.faculty_id = NEW.faculty_id 
        AND u.user_id != NEW.user_id::text
        AND u.is_active = true
    LOOP
        INSERT INTO notification_recipients (
            notification_id,
            user_id,
            read_at,
            created_at
        ) VALUES (
            new_notification_id,
            user_record.user_id::uuid,
            NULL,
            NOW()
        ) ON CONFLICT (notification_id, user_id) DO NOTHING;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger para novos tópicos no fórum
DROP TRIGGER IF EXISTS trigger_notify_new_forum_post ON faculty_posts;
DROP TRIGGER IF EXISTS trigger_notify_new_forum_post ON faculty_forum_topics;
CREATE TRIGGER trigger_notify_new_forum_post
    AFTER INSERT ON faculty_forum_topics
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_forum_post();

-- =====================================================
-- TRIGGER: Notificação para novos eventos
-- =====================================================

-- Função para criar notificação de novo evento
CREATE OR REPLACE FUNCTION notify_new_event()
RETURNS TRIGGER AS $$
DECLARE
    notification_id INTEGER;
    event_date_formatted TEXT;
BEGIN
    -- Formatar a data do evento
    event_date_formatted := TO_CHAR(NEW.start_date, 'DD/MM/YYYY');
    
    -- Criar notificação para novo evento
    INSERT INTO notifications (
        title,
        message,
        type,
        target_type,
        target_id,
        sender_id,
        data,
        created_at
    ) VALUES (
        'Novo Evento Agendado',
        'O evento "' || COALESCE(NEW.title, 'Sem título') || '" foi agendado para ' || event_date_formatted,
        'event',
        'faculty',
        NEW.faculty_id,
        NEW.creator_id,
        jsonb_build_object(
            'event_id', NEW.id,
            'event_title', NEW.title,
            'event_date', NEW.start_date,
            'faculty_id', NEW.faculty_id
        ),
        NOW()
    ) RETURNING id INTO notification_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger para novos eventos
DROP TRIGGER IF EXISTS trigger_notify_new_event ON faculty_events;
CREATE TRIGGER trigger_notify_new_event
    AFTER INSERT ON faculty_events
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_event();

-- =====================================================
-- TRIGGER: Notificação para envio de simulados
-- =====================================================

-- Função para criar notificação quando simulado é enviado/submetido
CREATE OR REPLACE FUNCTION notify_exam_submission()
RETURNS TRIGGER AS $$
DECLARE
    notification_id INTEGER;
    exam_title TEXT;
    faculty_exam_record RECORD;
BEGIN
    -- Obter informações do simulado
    SELECT title INTO exam_title
    FROM exams 
    WHERE id = NEW.exam_id;
    
    -- Verificar se existe um faculty_exam associado a este exam
    SELECT fe.faculty_id INTO faculty_exam_record
    FROM public.faculty_exams fe
    WHERE fe.external_exam_id = NEW.exam_id
    LIMIT 1;
    
    -- Se encontrou uma faculdade associada, notificar apenas os membros da faculdade
    IF FOUND THEN
        INSERT INTO notifications (
            title,
            message,
            type,
            target_type,
            target_id,
            sender_id,
            data,
            created_at
        ) VALUES (
            'Simulado Concluído na Turma',
            'Um aluno concluiu o simulado "' || COALESCE(exam_title, 'Sem título') || '" com ' || COALESCE(NEW.score::text, '0') || '% de acerto',
            'exam_completed',
            'faculty',
            faculty_exam_record.faculty_id,
            NEW.user_id,
            jsonb_build_object(
                'attempt_id', NEW.id,
                'exam_id', NEW.exam_id,
                'exam_title', exam_title,
                'user_id', NEW.user_id,
                'score', NEW.score
            ),
            NOW()
        ) RETURNING id INTO notification_id;
    -- Se não há faculdade, não notificar (simulados públicos não precisam notificar conclusão)
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger para envios de simulados
DROP TRIGGER IF EXISTS trigger_notify_exam_submission ON exam_attempts;
CREATE TRIGGER trigger_notify_exam_submission
    AFTER INSERT ON exam_attempts
    FOR EACH ROW
    WHEN (NEW.completed_at IS NOT NULL) -- Apenas quando o simulado for concluído
    EXECUTE FUNCTION notify_exam_submission();

-- =====================================================
-- TRIGGER: Notificação para novos materiais
-- =====================================================

-- Função para criar notificação de novo material
CREATE OR REPLACE FUNCTION notify_new_material()
RETURNS TRIGGER AS $$
DECLARE
    new_notification_id INTEGER;
    user_record RECORD;
BEGIN
    -- Criar notificação para novo material
    INSERT INTO notifications (
        title,
        message,
        type,
        target_type,
        target_id,
        sender_id,
        data,
        created_at
    ) VALUES (
        'Novo Material Disponível',
        'O material "' || COALESCE(NEW.title, 'Sem título') || '" foi disponibilizado',
        'material',
        'faculty',
        NEW.faculty_id,
        NEW.user_id,
        jsonb_build_object(
            'material_id', NEW.id,
            'material_title', NEW.title,
            'material_type', NEW.file_type,
            'faculty_id', NEW.faculty_id
        ),
        NOW()
    ) RETURNING id INTO new_notification_id;
    
    -- Criar destinatários para todos os usuários da faculdade (exceto quem fez upload)
    FOR user_record IN 
        SELECT u.user_id FROM faculty_members fm
        JOIN users u ON fm.user_id::text = u.user_id
        WHERE fm.faculty_id = NEW.faculty_id 
        AND u.user_id != NEW.user_id::text
        AND u.is_active = true
    LOOP
        INSERT INTO notification_recipients (
            notification_id,
            user_id,
            read_at,
            created_at
        ) VALUES (
            new_notification_id,
            user_record.user_id::uuid,
            NULL,
            NOW()
        ) ON CONFLICT (notification_id, user_id) DO NOTHING;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger para novos materiais
DROP TRIGGER IF EXISTS trigger_notify_new_material ON faculty_materials;
CREATE TRIGGER trigger_notify_new_material
    AFTER INSERT ON faculty_materials
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_material();

-- =====================================================
-- TRIGGER: Notificação para anúncios gerais
-- =====================================================

-- =====================================================
-- TRIGGER: Notificação para novos posts importantes
-- =====================================================

-- Função para criar notificação de post importante
CREATE OR REPLACE FUNCTION notify_important_post()
RETURNS TRIGGER AS $$
DECLARE
    notification_id INTEGER;
BEGIN
    -- Criar notificação apenas para posts importantes (announcements)
    IF NEW.type = 'announcement' THEN
        INSERT INTO notifications (
            title,
            message,
            type,
            target_type,
            target_id,
            sender_id,
            data,
            created_at
        ) VALUES (
            'Novo Anúncio',
            'Um novo anúncio foi publicado: "' || COALESCE(NEW.title, 'Sem título') || '"',
            'announcement',
            'faculty',
            NEW.faculty_id,
            NEW.author_id,
            jsonb_build_object(
                'post_id', NEW.id,
                'post_title', NEW.title,
                'faculty_id', NEW.faculty_id,
                'post_type', NEW.type
            ),
            NOW()
        ) RETURNING id INTO notification_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger para posts importantes
DROP TRIGGER IF EXISTS trigger_notify_important_post ON faculty_posts;
CREATE TRIGGER trigger_notify_important_post
    AFTER INSERT ON faculty_posts
    FOR EACH ROW
    WHEN (NEW.type = 'announcement') -- Apenas para anúncios
    EXECUTE FUNCTION notify_important_post();

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para melhorar a performance das consultas de notificações
CREATE INDEX IF NOT EXISTS idx_notifications_target_type_target_id 
    ON notifications(target_type, target_id) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
    ON notifications(created_at DESC) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_id_read 
    ON notification_recipients(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification_id 
    ON notification_recipients(notification_id);

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

-- Este arquivo contém todos os triggers necessários para o sistema de notificações.
-- Os triggers são executados automaticamente quando:
-- 1. Um novo simulado é criado
-- 2. Uma nova dúvida é postada no fórum
-- 3. Um novo evento é agendado
-- 4. Um simulado é enviado por um aluno
-- 5. Um novo material é disponibilizado
-- 6. Um novo anúncio é publicado
--
-- Cada trigger cria automaticamente uma notificação na tabela 'notifications'
-- e os recipients são criados automaticamente pela função 'create_notification_recipients'
-- definida no arquivo notifications_setup.sql
--
-- Para aplicar estes triggers, execute este arquivo após ter aplicado o notifications_setup.sql