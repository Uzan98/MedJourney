-- Criação da tabela de eventos da faculdade
CREATE TABLE IF NOT EXISTS public.faculty_events (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  type TEXT NOT NULL CHECK (type IN ('exam', 'assignment', 'lecture', 'meeting', 'other')),
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar índices para melhorar a performance
CREATE INDEX IF NOT EXISTS faculty_events_faculty_id_idx ON public.faculty_events(faculty_id);
CREATE INDEX IF NOT EXISTS faculty_events_creator_id_idx ON public.faculty_events(creator_id);
CREATE INDEX IF NOT EXISTS faculty_events_start_date_idx ON public.faculty_events(start_date);

-- Trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_faculty_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_faculty_events_updated_at ON public.faculty_events;
CREATE TRIGGER update_faculty_events_updated_at
BEFORE UPDATE ON public.faculty_events
FOR EACH ROW
EXECUTE FUNCTION update_faculty_events_updated_at();

-- Políticas de segurança (RLS)
ALTER TABLE public.faculty_events ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: membros da faculdade podem ver eventos
CREATE POLICY faculty_events_select_policy ON public.faculty_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.faculty_members
    WHERE faculty_members.faculty_id = faculty_events.faculty_id
    AND faculty_members.user_id = auth.uid()
  )
);

-- Política para INSERT: apenas administradores podem criar eventos
CREATE POLICY faculty_events_insert_policy ON public.faculty_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.faculty_members
    WHERE faculty_members.faculty_id = faculty_events.faculty_id
    AND faculty_members.user_id = auth.uid()
    AND faculty_members.role = 'admin'
  )
  AND creator_id = auth.uid()
);

-- Política para UPDATE: apenas o criador ou administradores podem editar eventos
CREATE POLICY faculty_events_update_policy ON public.faculty_events
FOR UPDATE
USING (
  creator_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.faculty_members
    WHERE faculty_members.faculty_id = faculty_events.faculty_id
    AND faculty_members.user_id = auth.uid()
    AND faculty_members.role IN ('admin', 'moderator')
  )
);

-- Política para DELETE: apenas o criador ou administradores podem excluir eventos
CREATE POLICY faculty_events_delete_policy ON public.faculty_events
FOR DELETE
USING (
  creator_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.faculty_members
    WHERE faculty_members.faculty_id = faculty_events.faculty_id
    AND faculty_members.user_id = auth.uid()
    AND faculty_members.role IN ('admin', 'moderator')
  )
);

-- Tabela de participantes de eventos (opcional, para implementação futura)
CREATE TABLE IF NOT EXISTS public.faculty_event_attendees (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES public.faculty_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('attending', 'maybe', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Índices para a tabela de participantes
CREATE INDEX IF NOT EXISTS faculty_event_attendees_event_id_idx ON public.faculty_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS faculty_event_attendees_user_id_idx ON public.faculty_event_attendees(user_id);

-- Trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_faculty_event_attendees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_faculty_event_attendees_updated_at ON public.faculty_event_attendees;
CREATE TRIGGER update_faculty_event_attendees_updated_at
BEFORE UPDATE ON public.faculty_event_attendees
FOR EACH ROW
EXECUTE FUNCTION update_faculty_event_attendees_updated_at();

-- Políticas de segurança para participantes
ALTER TABLE public.faculty_event_attendees ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: membros da faculdade podem ver participantes
CREATE POLICY faculty_event_attendees_select_policy ON public.faculty_event_attendees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.faculty_events
    JOIN public.faculty_members ON faculty_events.faculty_id = faculty_members.faculty_id
    WHERE faculty_events.id = faculty_event_attendees.event_id
    AND faculty_members.user_id = auth.uid()
  )
);

-- Política para INSERT: usuários só podem adicionar a si mesmos como participantes
CREATE POLICY faculty_event_attendees_insert_policy ON public.faculty_event_attendees
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM public.faculty_events
    JOIN public.faculty_members ON faculty_events.faculty_id = faculty_members.faculty_id
    WHERE faculty_events.id = faculty_event_attendees.event_id
    AND faculty_members.user_id = auth.uid()
  )
);

-- Política para UPDATE: usuários só podem atualizar seu próprio status
CREATE POLICY faculty_event_attendees_update_policy ON public.faculty_event_attendees
FOR UPDATE
USING (
  user_id = auth.uid()
);

-- Política para DELETE: usuários só podem remover a si mesmos
CREATE POLICY faculty_event_attendees_delete_policy ON public.faculty_event_attendees
FOR DELETE
USING (
  user_id = auth.uid()
);

-- Função para contar participantes de um evento
CREATE OR REPLACE FUNCTION get_event_attendees_count(event_id INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.faculty_event_attendees
    WHERE faculty_event_attendees.event_id = get_event_attendees_count.event_id
    AND status = 'attending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se um usuário está participando de um evento
CREATE OR REPLACE FUNCTION is_attending_event(event_id INTEGER, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.faculty_event_attendees
    WHERE faculty_event_attendees.event_id = is_attending_event.event_id
    AND faculty_event_attendees.user_id = is_attending_event.user_id
    AND status = 'attending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Habilitar o Realtime para as tabelas de eventos
ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_event_attendees; 