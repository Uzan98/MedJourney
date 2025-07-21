-- Script para criação das tabelas de grupos de estudos personalizados

-- Tabela para os grupos de estudos criados pelos usuários
CREATE TABLE IF NOT EXISTS study_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_code TEXT UNIQUE NOT NULL,
  is_private BOOLEAN DEFAULT TRUE,
  discipline_id UUID REFERENCES disciplines(id),
  subject_id UUID REFERENCES subjects(id),
  max_members INT DEFAULT 20,
  image_url TEXT,
  color_theme TEXT DEFAULT 'blue'
);

-- Adicionar índice para pesquisa por código de acesso
CREATE INDEX IF NOT EXISTS idx_study_groups_access_code ON study_groups(access_code);

-- Tabela para membros dos grupos
CREATE TABLE IF NOT EXISTS study_group_members (
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_study_time INTEGER DEFAULT 0,
  PRIMARY KEY (group_id, user_id)
);

-- Tabela para mensagens do chat dos grupos
CREATE TABLE IF NOT EXISTS study_group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_pinned BOOLEAN DEFAULT FALSE,
  attachment_url TEXT
);

-- Função para gerar código de acesso único
CREATE OR REPLACE FUNCTION generate_access_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sem caracteres ambíguos
  result TEXT := '';
  i INTEGER := 0;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP -- Código de 6 caracteres
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Verificar se o código já existe
    SELECT EXISTS(SELECT 1 FROM study_groups WHERE access_code = result) INTO code_exists;
    IF NOT code_exists THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar código de acesso automaticamente
CREATE OR REPLACE FUNCTION set_access_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.access_code IS NULL THEN
    NEW.access_code := generate_access_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_access_code
BEFORE INSERT ON study_groups
FOR EACH ROW
EXECUTE FUNCTION set_access_code();

-- Permissões RLS
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para grupos de estudos
CREATE POLICY "Grupos visíveis para todos" ON study_groups
  FOR SELECT USING (true);

CREATE POLICY "Apenas donos podem editar grupos" ON study_groups
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Apenas donos podem excluir grupos" ON study_groups
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Usuários autenticados podem criar grupos" ON study_groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para membros de grupos
CREATE POLICY "Membros visíveis para membros do grupo" ON study_group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_group_members 
      WHERE group_id = study_group_members.group_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem se juntar a grupos" ON study_group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio registro" ON study_group_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Administradores podem atualizar qualquer membro" ON study_group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM study_group_members 
      WHERE group_id = study_group_members.group_id 
      AND user_id = auth.uid() 
      AND is_admin = true
    )
  );

-- Políticas para mensagens
CREATE POLICY "Mensagens visíveis para membros do grupo" ON study_group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM study_group_members 
      WHERE group_id = study_group_messages.group_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Membros podem enviar mensagens" ON study_group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM study_group_members 
      WHERE group_id = study_group_messages.group_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem editar suas mensagens" ON study_group_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Administradores podem editar qualquer mensagem" ON study_group_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM study_group_members 
      WHERE group_id = study_group_messages.group_id 
      AND user_id = auth.uid() 
      AND is_admin = true
    )
  ); 