-- Script para corrigir o erro da coluna 'description' que não existe na tabela smart_plans

-- Verificar a definição atual da view
SELECT definition FROM pg_views WHERE viewname = 'view_smart_plans_basic';

-- Recriar a view sem a coluna 'description'
CREATE OR REPLACE VIEW view_smart_plans_basic AS
SELECT 
  sp.id,
  sp.name,
  sp.user_id,
  sp.start_date,
  sp.end_date,
  sp.status,
  sp.settings,
  sp.created_at,
  sp.updated_at
FROM 
  smart_plans sp;

-- Verificar se a view foi corretamente recriada
SELECT definition FROM pg_views WHERE viewname = 'view_smart_plans_basic';

-- Notificar conclusão
RAISE NOTICE 'A view view_smart_plans_basic foi corrigida com sucesso.';