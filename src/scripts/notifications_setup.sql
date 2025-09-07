-- Script de configuração para o sistema de notificações

-- Tabela principal para notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('simulado', 'forum_post', 'new_simulado', 'event', 'announcement', 'material')),
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('faculty', 'course', 'all_users', 'specific_users')),
  target_id INTEGER, -- ID da faculdade, curso, etc.
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data JSONB, -- Dados adicionais específicos do tipo de notificação
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Tabela para controlar quais usuários receberam cada notificação
CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- Tabela para configurações de notificação por usuário
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  simulado_notifications BOOLEAN DEFAULT TRUE,
  forum_notifications BOOLEAN DEFAULT TRUE,
  event_notifications BOOLEAN DEFAULT TRUE,
  announcement_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para grupos de notificação (para facilitar o envio em massa)
CREATE TABLE IF NOT EXISTS public.notification_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('faculty', 'course', 'custom')),
  target_id INTEGER, -- ID da faculdade, curso, etc.
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para membros dos grupos de notificação
CREATE TABLE IF NOT EXISTS public.notification_group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES public.notification_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON public.notifications(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user ON public.notification_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_unread ON public.notification_recipients(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notification_groups_type ON public.notification_groups(type, target_id);

-- Função para criar notificação automaticamente quando um simulado é enviado
CREATE OR REPLACE FUNCTION create_simulado_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir notificação para simulado enviado
  INSERT INTO public.notifications (
    title,
    message,
    type,
    target_type,
    target_id,
    sender_id,
    data
  ) VALUES (
    'Novo Simulado Disponível',
    'Um novo simulado foi disponibilizado',
    'new_simulado',
    'all_users', -- Notificar todos os usuários já que exams não tem faculty_id
    NULL,
    NEW.user_id, -- Usar user_id em vez de created_by
    jsonb_build_object(
      'simulado_id', NEW.id,
      'simulado_title', NEW.title
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para criar notificação quando um post é criado no fórum
CREATE OR REPLACE FUNCTION create_forum_post_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir notificação para novo post no fórum
  -- Remover verificação de type já que faculty_posts não tem esse campo
  INSERT INTO public.notifications (
    title,
    message,
    type,
    target_type,
    target_id,
    sender_id,
    data
  ) VALUES (
    'Novo Post no Fórum',
    'Um novo post foi criado no fórum da sua turma',
    'forum_post',
    'faculty',
    NEW.faculty_id,
    NEW.user_id,
    jsonb_build_object(
      'post_id', NEW.id,
      'post_title', NEW.title
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para distribuir notificações para os usuários corretos
CREATE OR REPLACE FUNCTION distribute_notification()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Distribuir notificação baseada no target_type
  IF NEW.target_type = 'faculty' THEN
    -- Inserir para todos os membros da faculdade
    INSERT INTO public.notification_recipients (notification_id, user_id)
    SELECT NEW.id, fm.user_id
    FROM public.faculty_members fm
    WHERE fm.faculty_id = NEW.target_id
    AND fm.user_id != COALESCE(NEW.sender_id, '00000000-0000-0000-0000-000000000000'::uuid);
    
  ELSIF NEW.target_type = 'all_users' THEN
    -- Inserir para todos os usuários (usar com cuidado)
    INSERT INTO public.notification_recipients (notification_id, user_id)
    SELECT NEW.id, au.id
    FROM auth.users au
    WHERE au.id != COALESCE(NEW.sender_id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_distribute_notification ON public.notifications;
CREATE TRIGGER trigger_distribute_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION distribute_notification();

-- Trigger para faculty_posts
DROP TRIGGER IF EXISTS trigger_forum_post_notification ON public.faculty_posts;
CREATE TRIGGER trigger_forum_post_notification
  AFTER INSERT ON public.faculty_posts
  FOR EACH ROW
  EXECUTE FUNCTION create_forum_post_notification();

-- Trigger para exams (simulados)
DROP TRIGGER IF EXISTS trigger_simulado_notification ON public.exams;
CREATE TRIGGER trigger_simulado_notification
  AFTER INSERT ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION create_simulado_notification();

-- Políticas RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_group_members ENABLE ROW LEVEL SECURITY;

-- Política para notifications - usuários podem ver notificações que receberam
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (
    id IN (
      SELECT nr.notification_id 
      FROM public.notification_recipients nr 
      WHERE nr.user_id = auth.uid()
    )
  );

-- Política para notification_recipients - usuários podem ver e atualizar seus próprios registros
CREATE POLICY "Users can view their notification recipients" ON public.notification_recipients
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notification recipients" ON public.notification_recipients
  FOR UPDATE USING (user_id = auth.uid());

-- Política para user_notification_settings - usuários podem gerenciar suas próprias configurações
CREATE POLICY "Users can manage their notification settings" ON public.user_notification_settings
  FOR ALL USING (user_id = auth.uid());

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notification_recipients
  SET is_read = TRUE, read_at = NOW()
  WHERE notification_recipients.notification_id = mark_notification_as_read.notification_id
  AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter contagem de notificações não lidas
CREATE OR REPLACE FUNCTION get_unread_notifications_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.notification_recipients nr
    JOIN public.notifications n ON n.id = nr.notification_id
    WHERE nr.user_id = auth.uid()
    AND nr.is_read = FALSE
    AND n.is_active = TRUE
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter notificações do usuário
CREATE OR REPLACE FUNCTION get_user_notifications(limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  id INTEGER,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  data JSONB,
  is_read BOOLEAN,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.data,
    nr.is_read,
    nr.read_at,
    n.created_at
  FROM public.notifications n
  JOIN public.notification_recipients nr ON n.id = nr.notification_id
  WHERE nr.user_id = auth.uid()
  AND n.is_active = TRUE
  AND (n.expires_at IS NULL OR n.expires_at > NOW())
  ORDER BY n.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;