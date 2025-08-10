-- Políticas RLS para tabelas de termos de uso e política de privacidade

-- Habilitar RLS nas tabelas (se ainda não estiver habilitado)
ALTER TABLE user_terms_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_of_service ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_policy ENABLE ROW LEVEL SECURITY;

-- Políticas para user_terms_acceptance
CREATE POLICY "Permitir inserção pelo usuário autenticado" ON user_terms_acceptance
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir visualização pelo usuário autenticado" ON user_terms_acceptance
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Permitir atualização pelo usuário autenticado" ON user_terms_acceptance
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Políticas para user_privacy_acceptance
CREATE POLICY "Permitir inserção pelo usuário autenticado privacy" ON user_privacy_acceptance
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Permitir visualização pelo usuário autenticado privacy" ON user_privacy_acceptance
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Permitir atualização pelo usuário autenticado privacy" ON user_privacy_acceptance
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Políticas para terms_of_service (leitura pública)
CREATE POLICY "Permitir leitura pública dos termos" ON terms_of_service
FOR SELECT
USING (true);

-- Políticas para privacy_policy (leitura pública)
CREATE POLICY "Permitir leitura pública da política" ON privacy_policy
FOR SELECT
USING (true);

-- Política para administradores (opcional - para inserir novos termos/políticas)
-- Descomente as linhas abaixo se você tiver uma tabela de perfis com role de admin
/*
CREATE POLICY "Permitir inserção por admin terms" ON terms_of_service
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Permitir inserção por admin privacy" ON privacy_policy
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
*/