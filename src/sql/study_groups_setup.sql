-- Script para criação das tabelas de grupos de estudos personalizados

-- Verificar se a extensão uuid-ossp está instalada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Remover tabelas existentes se necessário (em ordem inversa devido a dependências)
DROP TABLE IF EXISTS study_group_messages CASCADE;
DROP TABLE IF EXISTS study_group_members CASCADE;
DROP TABLE IF EXISTS study_groups CASCADE;

-- Verificar se a tabela de perfis existe, se não, criar
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  discipline_id BIGINT REFERENCES disciplines(id),
  subject_id BIGINT REFERENCES subjects(id),
  max_members INT DEFAULT 20,
  image_url TEXT,
  color_theme TEXT DEFAULT 'blue',
  is_active BOOLEAN DEFAULT TRUE
);

-- Adicionar índice para pesquisa por código de acesso
CREATE INDEX IF NOT EXISTS idx_study_groups_access_code ON study_groups(access_code);

-- Tabela para membros dos grupos de estudo
CREATE TABLE IF NOT EXISTS study_group_members (
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_study_time BIGINT DEFAULT 0, -- tempo total em segundos
  PRIMARY KEY (group_id, user_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_study_group_members_user ON study_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_study_group_members_active ON study_group_members(is_active);

-- Tabela para mensagens do chat do grupo
CREATE TABLE IF NOT EXISTS study_group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_system_message BOOLEAN DEFAULT FALSE
);

-- Criar índice para performance nas consultas de mensagens
CREATE INDEX IF NOT EXISTS idx_study_group_messages_group ON study_group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_study_group_messages_created ON study_group_messages(created_at);

-- Função para atualizar o timestamp de atualização
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar o timestamp quando um grupo for modificado
DROP TRIGGER IF EXISTS update_study_group_updated_at ON study_groups;
CREATE TRIGGER update_study_group_updated_at
BEFORE UPDATE ON study_groups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Configurar políticas de segurança para acesso RLS (Row Level Security)
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas extremamente simplificadas para evitar recursão
-- Permitir acesso total para usuários autenticados
DROP POLICY IF EXISTS "Permitir acesso total a grupos" ON study_groups;
CREATE POLICY "Permitir acesso total a grupos" ON study_groups
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir acesso total a membros" ON study_group_members;
CREATE POLICY "Permitir acesso total a membros" ON study_group_members
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir acesso total a mensagens" ON study_group_messages;
CREATE POLICY "Permitir acesso total a mensagens" ON study_group_messages
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir acesso total a perfis" ON profiles;
CREATE POLICY "Permitir acesso total a perfis" ON profiles
  USING (auth.uid() IS NOT NULL);

-- Policy para bloquear criação de grupos de estudo para usuários free
DROP POLICY IF EXISTS "Permitir criação de grupos só para pro" ON study_groups;
CREATE POLICY "Permitir criação de grupos só para pro" ON study_groups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_subscriptions us
      JOIN subscription_feature_access sfa ON us.tier = sfa.subscription_tier
      WHERE us.user_id = auth.uid()
        AND sfa.feature_key = 'study_groups'
        AND sfa.has_access = true
    )
  );

-- Criar função para geração automática de códigos de acesso
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  done BOOLEAN;
BEGIN
  done := FALSE;
  WHILE NOT done LOOP
    -- Gerar código aleatório de 6 caracteres (letras e números)
    code := UPPER(SUBSTRING(MD5(''||NOW()::TEXT||RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Verificar se o código já existe
    done := NOT EXISTS(SELECT 1 FROM study_groups WHERE access_code = code);
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql; 