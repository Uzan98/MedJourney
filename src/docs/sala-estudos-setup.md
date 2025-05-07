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