# Configuração da Sala de Estudos no Supabase

Este documento contém instruções para configurar a funcionalidade de Sala de Estudos no Supabase, incluindo a criação de tabelas, funções e políticas de segurança.

## Pré-requisitos

- Uma conta no Supabase com um projeto criado
- Acesso ao SQL Editor do Supabase

## Passo 1: Criar as tabelas e funções

Execute o script SQL disponível em `src/scripts/study_rooms_schema.sql` no SQL Editor do Supabase. Este script irá:

1. Criar a tabela `study_rooms` para armazenar informações sobre as salas de estudo
2. Criar a tabela `study_room_users` para rastrear os usuários em cada sala
3. Configurar índices para otimizar consultas
4. Criar uma função e trigger para atualizar automaticamente a contagem de usuários ativos
5. Configurar políticas de Row Level Security (RLS)
6. Inserir algumas salas de estudo iniciais para teste

## Passo 2: Configurar o Supabase Realtime

Para habilitar o Supabase Realtime para as tabelas de sala de estudo:

1. No painel do Supabase, vá para "Database" > "Replication"
2. Na seção "Tables", encontre as tabelas `study_rooms` e `study_room_users`
3. Ative a opção "Realtime" para ambas as tabelas
4. Na seção "Realtime", certifique-se de que a opção "Broadcast" está habilitada

## Passo 3: Configurar a Presença (Presence)

Para habilitar a funcionalidade de Presença (Presence):

1. No painel do Supabase, vá para "Database" > "Extensions"
2. Verifique se a extensão `pg_stat_statements` está habilitada
3. Na seção "API", certifique-se de que "Realtime" está habilitado
4. Anote sua URL do Supabase e a chave anônima (ANON_KEY) para configuração no frontend

## Passo 4: Configurar o Frontend

No arquivo `.env.local` do seu projeto, adicione as seguintes variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anônima
```

## Passo 5: Testar a Funcionalidade

1. Inicie o aplicativo com `npm run dev`
2. Navegue até a seção "Comunidade" > "Sala de Estudos"
3. Verifique se as salas de estudo são exibidas
4. Entre em uma sala e verifique se seu tempo de estudo está sendo registrado
5. Abra o aplicativo em outro navegador ou guia e verifique se os usuários online são exibidos corretamente

## Solução de Problemas

### Problema: Usuários não aparecem online

- Verifique se o Realtime está habilitado para as tabelas
- Verifique se as políticas de RLS permitem acesso às tabelas
- Verifique o console do navegador para erros relacionados ao Supabase

### Problema: Tempo de estudo não é registrado

- Verifique se a função `update_active_users_count` está sendo executada corretamente
- Verifique se o usuário está autenticado antes de tentar entrar na sala
- Verifique as permissões da tabela `study_room_users`

### Problema: Erros de canal de presença

- Verifique se a extensão `pg_stat_statements` está habilitada
- Verifique se o limite de canais de presença não foi excedido (10 por sala)
- Verifique se a chave anônima (ANON_KEY) está configurada corretamente

## Correção de Contabilização Duplicada de Tempo

Para corrigir o problema de contabilização duplicada de tempo de estudo quando um usuário sai da sala, siga estas etapas:

1. Aplique as alterações no arquivo `src/app/comunidade/sala-estudos/[id]/page.tsx` para adicionar o controle de saída manual vs. automática usando as referências `manuallyClosed` e `cleanupExecuted`.

2. Aplique as alterações no arquivo `src/services/study-room.service.ts` para implementar o mecanismo de bloqueio de processamento duplicado de saídas.

3. Execute o script SQL abaixo no Console do Supabase para adicionar um trigger de prevenção de contagem dupla:

```sql
-- Script SQL para prevenir contagem dupla de tempo de estudo
-- Este script cria um trigger que impede atualização duplicada do tempo de estudo
-- quando um usuário já está offline

-- Função que será executada pelo trigger
CREATE OR REPLACE FUNCTION prevent_double_counting()
RETURNS TRIGGER AS $$
BEGIN
    -- Se estiver alterando o status de online para offline
    IF OLD.esta_online = true AND NEW.esta_online = false THEN
        -- Registrar a operação para fins de depuração
        RAISE NOTICE 'Usuário % saindo da sala %: tempo_total atualizado de % para %',
                    OLD.user_id, OLD.room_id, OLD.tempo_total, NEW.tempo_total;
    END IF;
    
    -- Se o usuário já estava offline e estão tentando atualizar o tempo_total,
    -- mantemos o tempo_total anterior para evitar duplicação
    IF OLD.esta_online = false AND NEW.esta_online = false AND NEW.tempo_total != OLD.tempo_total THEN
        RAISE NOTICE 'Impedindo atualização duplicada de tempo para usuário % na sala %',
                    OLD.user_id, OLD.room_id;
        
        -- Manter o tempo_total antigo
        NEW.tempo_total = OLD.tempo_total;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar ou substituir o trigger
DROP TRIGGER IF EXISTS prevent_double_counting_trigger ON study_room_users;

CREATE TRIGGER prevent_double_counting_trigger
BEFORE UPDATE ON study_room_users
FOR EACH ROW
EXECUTE FUNCTION prevent_double_counting();
```

Esta solução implementa três camadas de proteção contra contabilização duplicada:

1. **Nível de Interface**: Controle via referências React no componente da sala de estudos
2. **Nível de Serviço**: Sistema de bloqueio no serviço `StudyRoomService`
3. **Nível de Banco de Dados**: Trigger SQL que impede atualizações duplicadas 