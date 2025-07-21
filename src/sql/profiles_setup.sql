-- Script para configuração da tabela de perfis

-- Verificar se a extensão uuid-ossp está instalada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de perfis se não existir
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Habilitar RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON profiles;
CREATE POLICY "Usuários podem ver todos os perfis" ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Usuários podem editar seus próprios perfis" ON profiles;
CREATE POLICY "Usuários podem editar seus próprios perfis" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem inserir seus próprios perfis" ON profiles;
CREATE POLICY "Usuários podem inserir seus próprios perfis" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Função para atualizar o timestamp de atualização
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar o timestamp quando um perfil for modificado
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- Função para criar perfil automaticamente quando um novo usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)), 
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Migrar perfis existentes que não estejam na tabela
INSERT INTO profiles (id, username, created_at, updated_at)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', SPLIT_PART(email, '@', 1)), 
  created_at,
  created_at
FROM 
  auth.users
WHERE 
  id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING; 