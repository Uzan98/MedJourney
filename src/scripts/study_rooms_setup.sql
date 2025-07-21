-- Script para configurar as tabelas relacionadas às salas de estudo e chat
-- Execute este script no Console SQL do Supabase

-- Tabela de salas de estudo - Modificando para utilizar UUID para compatibilidade
CREATE TABLE IF NOT EXISTS study_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 20,
  active_users INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de usuários em salas de estudo
CREATE TABLE IF NOT EXISTS study_room_users (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES study_rooms(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  entrou_em TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  saiu_em TIMESTAMP WITH TIME ZONE,
  esta_online BOOLEAN DEFAULT TRUE,
  tempo_total INTEGER DEFAULT 0, -- em segundos
  PRIMARY KEY (user_id, room_id)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_study_room_users_room_id ON study_room_users(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_users_user_id ON study_room_users(user_id);
CREATE INDEX IF NOT EXISTS idx_study_room_users_online ON study_room_users(esta_online);

-- Função para atualizar o contador de usuários ativos
CREATE OR REPLACE FUNCTION update_active_users_count()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.esta_online = TRUE THEN
      -- Contar usuários online
      SELECT COUNT(*) INTO user_count
      FROM study_room_users
      WHERE room_id = NEW.room_id AND esta_online = TRUE;
      
      -- Atualizar contagem na sala
      UPDATE study_rooms
      SET active_users = user_count
      WHERE id = NEW.room_id;
    END IF;
  ELSIF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    -- Contar usuários online
    SELECT COUNT(*) INTO user_count
    FROM study_room_users
    WHERE room_id = COALESCE(OLD.room_id, NEW.room_id) AND esta_online = TRUE;
    
    -- Atualizar contagem na sala
    UPDATE study_rooms
    SET active_users = user_count
    WHERE id = COALESCE(OLD.room_id, NEW.room_id);
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contagem de usuários ativos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_update_active_users'
  ) THEN
    CREATE TRIGGER trg_update_active_users
    AFTER INSERT OR UPDATE OR DELETE ON study_room_users
    FOR EACH ROW
    EXECUTE FUNCTION update_active_users_count();
  END IF;
END$$;

-- Tabela de mensagens de chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Adicionar a constraint de chave estrangeira separadamente para permitir opção de verificação
ALTER TABLE IF EXISTS chat_messages 
  DROP CONSTRAINT IF EXISTS chat_messages_room_id_fkey,
  ADD CONSTRAINT chat_messages_room_id_fkey 
  FOREIGN KEY (room_id) REFERENCES study_rooms(id) ON DELETE CASCADE;

-- Índices para a tabela de mensagens
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Políticas RLS para a tabela de salas
ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Salas visíveis para todos" ON study_rooms
  FOR SELECT USING (true);

-- Políticas RLS para a tabela de usuários em salas
ALTER TABLE study_room_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários em salas visíveis para todos" ON study_room_users
  FOR SELECT USING (true);
  
CREATE POLICY "Usuários podem entrar em salas" ON study_room_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Usuários podem atualizar apenas seus próprios registros" ON study_room_users
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Usuários podem sair de salas" ON study_room_users
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para a tabela de mensagens do chat
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mensagens visíveis para todos" ON chat_messages
  FOR SELECT USING (true);
  
CREATE POLICY "Usuários podem enviar mensagens" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Usuários podem editar suas próprias mensagens" ON chat_messages
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Usuários podem excluir suas próprias mensagens" ON chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Função para limpar mensagens antigas (mantém apenas as últimas 100 por sala)
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages()
RETURNS TRIGGER AS $$
BEGIN
  -- Exclui mensagens antigas, mantendo apenas as últimas 100 por sala
  DELETE FROM chat_messages
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             row_number() OVER (PARTITION BY room_id ORDER BY created_at DESC) as rn
      FROM chat_messages
      WHERE room_id = NEW.room_id
    ) sq
    WHERE rn > 100
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para limpar mensagens antigas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_cleanup_old_chat_messages'
  ) THEN
    CREATE TRIGGER trigger_cleanup_old_chat_messages
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_old_chat_messages();
  END IF;
END$$;

-- Configurar Supabase Realtime para a tabela de mensagens
BEGIN;
  -- Criar uma publicação para as mensagens de chat
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE chat_messages;
  
  -- Adicionar a tabela de usuários em salas à publicação
  ALTER PUBLICATION supabase_realtime ADD TABLE study_room_users;
COMMIT;

-- Inserir salas de exemplo se necessário
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM study_rooms LIMIT 1) THEN
    INSERT INTO study_rooms (id, name, description, capacity)
    VALUES 
      (gen_random_uuid(), 'Cardiologia Avançada', 'Sala dedicada aos estudos de cardiologia e doenças cardiovasculares', 20),
      (gen_random_uuid(), 'Neurologia e Neurociência', 'Para entusiastas do sistema nervoso e distúrbios neurológicos', 15),
      (gen_random_uuid(), 'Técnicas Cirúrgicas', 'Discussão sobre procedimentos cirúrgicos e novas tecnologias', 12),
      (gen_random_uuid(), 'Pediatria Geral', 'Estudos sobre saúde infantil e desenvolvimento', 15),
      (gen_random_uuid(), 'Preparação para Residência', 'Grupo de estudos focado na preparação para provas de residência médica', 25);
      
    RAISE NOTICE 'Salas de exemplo criadas com sucesso!';
  END IF;
END$$; 