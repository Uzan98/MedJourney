-- Script para corrigir o problema de registro de usuários
-- O problema é causado pelo trigger on_auth_user_created que tenta inserir registros em tabelas que não existem mais

-- 1. Remover o trigger que está causando o erro
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Criar tabelas necessárias para o sistema de gamificação (opcional)
-- Se você quiser manter o sistema de gamificação, descomente e execute esta parte

/*
-- Tabela para armazenar níveis dos usuários
CREATE TABLE IF NOT EXISTS user_levels (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_level INTEGER NOT NULL DEFAULT 1,
    current_xp INTEGER NOT NULL DEFAULT 0,
    next_level_xp INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar moedas dos usuários
CREATE TABLE IF NOT EXISTS user_coins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    total_spent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar transações de moedas
CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    description TEXT,
    reference_id TEXT,
    reference_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recriar o trigger para inicializar o sistema de gamificação para novos usuários
CREATE OR REPLACE FUNCTION initialize_user_gamification()
RETURNS TRIGGER AS $$
BEGIN
  -- Inicializar nível do usuário
  INSERT INTO user_levels (user_id, current_level, current_xp, next_level_xp)
  VALUES (NEW.id, 1, 0, 100);
  
  -- Inicializar saldo de moedas
  INSERT INTO user_coins (user_id, balance, total_earned, total_spent)
  VALUES (NEW.id, 50, 50, 0); -- Começar com 50 MedCoins como bônus inicial
  
  -- Registrar transação inicial
  INSERT INTO coin_transactions (user_id, amount, description, transaction_type)
  VALUES (NEW.id, 50, 'Bônus de boas-vindas', 'welcome_bonus');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION initialize_user_gamification();
*/

-- 3. Verificar se o trigger create_profile_trigger está funcionando corretamente
-- Este trigger cria um perfil para novos usuários na tabela profiles
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
) AS profiles_table_exists; 