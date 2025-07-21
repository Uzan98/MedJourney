# Scripts SQL para Configuração do Banco de Dados

Este diretório contém scripts SQL para configuração manual do banco de dados Supabase do aplicativo MedJourney.

## Smart Planning - Planejamento Inteligente

### 1. Criação de Tabelas Básicas

O arquivo `smart-planning-tables.sql` contém o script para criação das tabelas necessárias para o módulo de Planejamento Inteligente.

#### Como Usar

1. Acesse o dashboard do Supabase para seu projeto
2. Navegue até "SQL Editor"
3. Crie uma nova consulta (clique em "New Query")
4. Copie e cole o conteúdo completo do arquivo `smart-planning-tables.sql`
5. Execute o script clicando em "RUN"

#### O que o Script Faz

O script cria:

- Tabela `smart_plans` para armazenar os planos de estudo
- Tabela `smart_plan_sessions` para armazenar as sessões de estudo
- Políticas de segurança RLS (Row Level Security) para ambas tabelas
- Índices para melhorar a performance das consultas

### 2. Integração com OpenAI

O arquivo `smart-planning-openai-setup.sql` contém funções para integração com a API do OpenAI para geração automatizada de planos de estudo.

#### Pré-requisitos

Antes de executar este script, você precisa:

1. Ter a extensão `pg_net` habilitada em seu banco de dados Supabase
2. Configurar uma variável de ambiente `app.openai_key` com sua chave da API OpenAI

Para habilitar a extensão pg_net, execute:

```sql
create extension pg_net with schema extensions;
```

Para configurar a variável de ambiente OpenAI, execute:

```sql
alter database postgres set app.openai_key = 'sua-chave-api-openai';
```

#### Como Usar

1. Execute primeiro o script `smart-planning-tables.sql`
2. Configure os pré-requisitos mencionados acima
3. Execute o script `smart-planning-openai-setup.sql` no SQL Editor do Supabase

#### O que o Script Faz

O script cria duas funções principais:

1. `generate_smart_plan(plan_id, api_key)`: Chama a API OpenAI para gerar um plano de estudos baseado nas configurações
2. `process_smart_plan_response(plan_id, response_text)`: Processa a resposta da API e cria as sessões de estudo

#### Uso das Funções

Para usar estas funções no backend da aplicação:

```typescript
// Gerar um plano
const { data: generationResult, error: generationError } = await supabase
  .rpc('generate_smart_plan', { plan_id: createdPlanId });

// Se a geração for bem-sucedida, processar a resposta
if (generationResult.success) {
  const { data: processingResult, error: processingError } = await supabase
    .rpc('process_smart_plan_response', { 
      plan_id: createdPlanId, 
      response_text: generationResult.response 
    });
}
```

### 3. Views e Funções de Consulta

O arquivo `smart-planning-views.sql` contém views e funções de consulta que facilitam o acesso aos dados do planejamento inteligente.

#### Como Usar

1. Execute primeiro o script `smart-planning-tables.sql`
2. Execute o script `smart-planning-views.sql` no SQL Editor do Supabase

#### O que o Script Faz

O script cria:

1. **Views**:
   - `view_smart_plans`: Visão agregada dos planos com contagens de sessões e disciplinas
   - `view_smart_plan_sessions`: Visão expandida das sessões com nomes de disciplinas e assuntos
   - `view_smart_plan_daily_sessions`: Agrupamento de sessões por dia
   - `view_user_smart_plan_summary`: Resumo dos planos por usuário

2. **Funções de acesso seguro**:
   - `get_my_smart_plans()`: Retorna todos os planos do usuário atual
   - `get_my_smart_plan(plan_id)`: Retorna um plano específico
   - `get_my_smart_plan_sessions(plan_id)`: Retorna as sessões de um plano
   - `get_my_smart_plan_daily_sessions(plan_id)`: Retorna as sessões agrupadas por dia

#### Uso das Funções

Para usar estas funções no frontend ou backend da aplicação:

```typescript
// Obter todos os meus planos
const { data: myPlans, error } = await supabase.rpc('get_my_smart_plans');

// Obter um plano específico com detalhes
const { data: planDetails, error } = await supabase.rpc('get_my_smart_plan', { 
  plan_id: planId 
});

// Obter todas as sessões de um plano
const { data: sessions, error } = await supabase.rpc('get_my_smart_plan_sessions', { 
  plan_id: planId 
});

// Obter sessões agrupadas por dia
const { data: dailySessions, error } = await supabase.rpc('get_my_smart_plan_daily_sessions', { 
  plan_id: planId 
});
```

## Sequência de Instalação Recomendada

Para um ambiente limpo, recomendamos instalar os scripts na seguinte ordem:

1. `smart-planning-tables.sql` - Cria as tabelas básicas
2. `smart-planning-views.sql` - Cria as views e funções de consulta
3. `smart-planning-openai-setup.sql` - Adiciona a integração com OpenAI (opcional)

## Requisitos Prévios Gerais

Os scripts assumem que você já tem as seguintes tabelas/estruturas em seu banco de dados:

- Tabela `disciplines` (para referência nas sessões de estudo)
- Tabela `subjects` (para referência nas sessões de estudo)
- Sistema de autenticação Supabase configurado

## Solução de Problemas

Se os scripts falharem, verifique:

1. Que as tabelas mencionadas em "Requisitos Prévios" existem
2. Que você tem privilégios suficientes para criar tabelas e funções no banco de dados
3. Que não existem tabelas ou funções com os mesmos nomes (você pode adicionar cláusulas `DROP IF EXISTS` no início dos scripts para remover objetos existentes, mas isto pode apagar dados)
4. Para o script OpenAI, certifique-se de que a extensão pg_net está habilitada e a variável de ambiente da chave API está configurada

## Adaptação dos Scripts

Se você precisar adaptar os scripts:

- Para alterar o tipo de ID: substitua `BIGINT GENERATED BY DEFAULT AS IDENTITY` por outro tipo
- Para alterar as referências: modifique as partes `REFERENCES` para apontar para suas tabelas
- Para modificar as políticas RLS: edite as políticas para atender aos seus requisitos de segurança
- Para a integração OpenAI: ajuste o modelo usado (GPT-4 ou GPT-3.5-Turbo) e os parâmetros conforme necessário 