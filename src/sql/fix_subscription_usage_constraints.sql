-- Verifica se já existe um índice único para user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subscription_usage_user_id_key' AND conrelid = 'subscription_usage'::regclass
    ) THEN
        -- Adiciona uma restrição de chave única para user_id
        ALTER TABLE subscription_usage ADD CONSTRAINT subscription_usage_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Verifica se já existe uma chave estrangeira para user_id referenciando auth.users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subscription_usage_user_id_fkey' AND conrelid = 'subscription_usage'::regclass
    ) THEN
        -- Adiciona uma restrição de chave estrangeira para user_id
        ALTER TABLE subscription_usage 
        ADD CONSTRAINT subscription_usage_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;
    END IF;
END $$; 