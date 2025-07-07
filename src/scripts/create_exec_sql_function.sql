-- Função para executar SQL dinâmico
-- Esta função deve ser executada com permissões de administrador

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 