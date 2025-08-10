-- Criar tabela para armazenar versões dos termos de uso
CREATE TABLE IF NOT EXISTS terms_of_service (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT false
);

-- Criar tabela para registrar aceitação dos termos pelos usuários
CREATE TABLE IF NOT EXISTS user_terms_acceptance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    terms_version VARCHAR(20) NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    UNIQUE(user_id, terms_version)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_terms_of_service_version ON terms_of_service(version);
CREATE INDEX IF NOT EXISTS idx_terms_of_service_active ON terms_of_service(is_active);
CREATE INDEX IF NOT EXISTS idx_user_terms_acceptance_user_id ON user_terms_acceptance(user_id);
CREATE INDEX IF NOT EXISTS idx_user_terms_acceptance_version ON user_terms_acceptance(terms_version);

-- Habilitar RLS (Row Level Security)
ALTER TABLE terms_of_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para terms_of_service
-- Permitir leitura para todos os usuários autenticados
CREATE POLICY "Allow read access to terms of service" ON terms_of_service
    FOR SELECT
    TO authenticated
    USING (true);

-- Permitir leitura para usuários anônimos (necessário para o cadastro)
CREATE POLICY "Allow anonymous read access to terms of service" ON terms_of_service
    FOR SELECT
    TO anon
    USING (is_active = true);

-- Políticas de segurança para user_terms_acceptance
-- Permitir inserção para usuários autenticados (apenas seus próprios registros)
CREATE POLICY "Allow users to insert their own terms acceptance" ON user_terms_acceptance
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Permitir leitura para usuários autenticados (apenas seus próprios registros)
CREATE POLICY "Allow users to read their own terms acceptance" ON user_terms_acceptance
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Inserir versão inicial dos termos de uso
INSERT INTO terms_of_service (version, title, content, effective_date, is_active)
VALUES (
    '1.0',
    'Termos de Uso - MedJourney',
    'Documento de termos de uso será inserido posteriormente via aplicação.',
    NOW(),
    true
) ON CONFLICT (version) DO NOTHING;

-- Conceder permissões às roles
GRANT SELECT ON terms_of_service TO anon;
GRANT SELECT ON terms_of_service TO authenticated;
GRANT INSERT, SELECT ON user_terms_acceptance TO authenticated;

-- Conceder permissões para as sequências
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;