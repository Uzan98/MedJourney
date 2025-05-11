-- Tabela para armazenar mensagens de chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Políticas RLS (Row Level Security)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Política para ler mensagens (qualquer usuário autenticado pode ler mensagens)
CREATE POLICY "Chat messages are readable by authenticated users"
  ON public.chat_messages FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política para inserir mensagens (usuários autenticados podem criar mensagens)
CREATE POLICY "Chat messages are insertable by authenticated users"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Política para atualizar mensagens (somente o autor pode atualizar)
CREATE POLICY "Chat messages are updatable by author"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política para excluir mensagens (somente o autor pode excluir)
CREATE POLICY "Chat messages are deletable by author"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Função para limpar mensagens antigas
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages()
RETURNS TRIGGER AS $$
BEGIN
  -- Manter apenas 500 mensagens mais recentes por sala
  DELETE FROM public.chat_messages
  WHERE id IN (
    SELECT id FROM public.chat_messages
    WHERE room_id = NEW.room_id
    ORDER BY created_at DESC
    OFFSET 500
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para limpar mensagens antigas ao inserir novas
DROP TRIGGER IF EXISTS trigger_cleanup_old_chat_messages ON public.chat_messages;
CREATE TRIGGER trigger_cleanup_old_chat_messages
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION cleanup_old_chat_messages();

-- Habilitar Realtime para a tabela chat_messages
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.chat_messages; 