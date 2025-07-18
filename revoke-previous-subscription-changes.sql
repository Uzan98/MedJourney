-- Script para revogar alterações anteriores de assinatura

-- 1. Remover colunas adicionadas à tabela profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_start_date;
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_end_date;

-- 2. Remover a tabela subscription_history
DROP TABLE IF EXISTS subscription_history;

-- Confirmar que as alterações foram revertidas
COMMENT ON TABLE profiles IS 'Tabela de perfis sem as colunas de assinatura'; 