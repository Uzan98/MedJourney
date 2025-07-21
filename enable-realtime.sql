-- Script para habilitar o suporte a realtime para as tabelas de grupos de estudo

-- No Supabase, o realtime é habilitado adicionando tabelas à publicação supabase_realtime
-- Não é necessário criar triggers manualmente, o Supabase gerencia isso internamente

-- Verificar se a publicação já existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    -- Criar a publicação se não existir
    CREATE PUBLICATION supabase_realtime;
    RAISE NOTICE 'Publicação supabase_realtime criada';
  ELSE
    RAISE NOTICE 'Publicação supabase_realtime já existe';
  END IF;
END $$;

-- Adicionar tabelas à publicação
DO $$
BEGIN
  -- Adicionar tabela de mensagens
  ALTER PUBLICATION supabase_realtime ADD TABLE study_group_messages;
  RAISE NOTICE 'Tabela study_group_messages adicionada à publicação';
  
  -- Adicionar tabela de membros
  ALTER PUBLICATION supabase_realtime ADD TABLE study_group_members;
  RAISE NOTICE 'Tabela study_group_members adicionada à publicação';
  
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Erro ao adicionar tabelas: %', SQLERRM;
END $$;

-- Habilitar realtime para tabelas específicas via API do Supabase
-- Isso é feito no painel de administração do Supabase:
-- 1. Vá para Database > Replication
-- 2. Na seção "Realtime", habilite as tabelas study_group_messages e study_group_members

-- Verificar configuração de replicação (deve ser 'logical' para suportar realtime)
SHOW wal_level;

-- Nota: Se wal_level não for 'logical', você precisará alterá-lo como superusuário:
-- ALTER SYSTEM SET wal_level = logical;
-- E reiniciar o servidor PostgreSQL

-- Dica: Você também pode habilitar o realtime diretamente no painel do Supabase:
-- 1. Vá para o painel do projeto
-- 2. Navegue até Database > Tables
-- 3. Selecione a tabela
-- 4. Vá para "Realtime" na barra lateral
-- 5. Habilite "Realtime" para a tabela 