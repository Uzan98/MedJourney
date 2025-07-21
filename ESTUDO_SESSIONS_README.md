# Implementação de Sessões de Estudo com Supabase

Este documento descreve as alterações realizadas para implementar o sistema de registro de sessões de estudo usando o Supabase como banco de dados.

## Visão Geral

O sistema permite que os usuários registrem sessões de estudo de duas formas:
1. **Sessões Rápidas** - Registradas imediatamente após a conclusão
2. **Sessões Agendadas** - Planejadas com antecedência e marcadas como concluídas posteriormente

## Estrutura do Banco de Dados

Foram criadas duas tabelas principais:

### 1. `study_activity`

Registra atividades de estudo de forma genérica, incluindo logins diários, conclusão de assuntos, sessões de estudo, etc.

```sql
CREATE TABLE IF NOT EXISTS study_activity (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'subject_completed', 'study_session', 'quiz_completed', etc.
  reference_id INTEGER, -- ID opcional de referência (assunto, disciplina, etc.)
  reference_type VARCHAR(50), -- 'subject', 'discipline', etc.
  duration_minutes INTEGER DEFAULT 0, -- Duração da atividade em minutos (se aplicável)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Garantir que cada usuário tenha apenas um registro por dia por tipo de atividade
  UNIQUE(user_id, activity_date, activity_type)
);
```

### 2. `study_sessions`

Armazena informações detalhadas sobre sessões de estudo específicas.

```sql
CREATE TABLE IF NOT EXISTS study_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline_id INTEGER, -- ID da disciplina associada
  subject_id INTEGER, -- ID do assunto associado (opcional)
  title VARCHAR(255) NOT NULL,
  scheduled_date TIMESTAMPTZ, -- Data e hora agendada (pode ser nulo para sessões não agendadas)
  duration_minutes INTEGER NOT NULL DEFAULT 0, -- Duração planejada em minutos
  actual_duration_minutes INTEGER, -- Duração real (após conclusão)
  notes TEXT, -- Notas sobre a sessão
  completed BOOLEAN NOT NULL DEFAULT false, -- Indica se a sessão foi concluída
  status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- 'pendente', 'agendada', 'em-andamento', 'concluida', 'cancelada'
  type VARCHAR(20), -- 'new-content', 'revision', 'practice', 'exam-prep'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Serviços Implementados

### `StudySessionService`

Um novo serviço foi criado em `src/services/study-sessions.service.ts` para gerenciar as operações CRUD relacionadas às sessões de estudo:

- `createSession` - Criar uma nova sessão de estudo
- `updateSession` - Atualizar uma sessão existente
- `completeSession` - Marcar uma sessão como concluída
- `deleteSession` - Excluir uma sessão
- `getUserSessions` - Listar todas as sessões do usuário
- `getUpcomingSessions` - Listar sessões futuras agendadas
- `recordQuickSession` - Registrar uma sessão rápida

### Integração com `StudyStreakService`

Quando uma sessão de estudo é registrada ou marcada como concluída, também é feito um registro na tabela `study_activity` para manter o controle da sequência de estudos do usuário (streak).

## Componentes da Interface Atualizados

### 1. `QuickStudySessionModal`

Permite registrar rapidamente uma sessão de estudo, especificando:
- Disciplina
- Duração (em minutos)
- Notas (opcional)

### 2. `StudySessionModal`

Permite agendar sessões futuras ou iniciar sessões imediatas com detalhes adicionais:
- Título
- Disciplina
- Data e hora
- Duração
- Notas

## Correções Importantes

1. **Filtro de Disciplinas**: Foi removido um filtro que estava excluindo disciplinas do sistema, permitindo agora que todas as disciplinas relevantes sejam exibidas.

2. **Tipagem de Status**: Foi corrigida a tipagem do campo `status` para garantir compatibilidade com o tipo definido na interface `StudySession`.

## Como Implementar

1. Execute os scripts SQL no console SQL do Supabase para criar as tabelas:
   - `src/sql/create_study_activity_table.sql`
   - `src/sql/create_study_sessions_table.sql`

2. Certifique-se de que todos os arquivos modificados estão atualizados:
   - `src/services/study-sessions.service.ts`
   - `src/components/estudos/QuickStudySessionModal.tsx`
   - `src/components/estudos/StudySessionModal.tsx`

## Fluxo de Dados

1. Usuário seleciona uma disciplina e insere informações da sessão
2. `StudySessionService` cria um registro na tabela `study_sessions`
3. Se a sessão é marcada como concluída, o `StudyStreakService` também registra uma atividade na tabela `study_activity`
4. A interface é atualizada para refletir a nova sessão de estudo

## Considerações de Segurança

- Todas as tabelas têm políticas RLS (Row Level Security) implementadas para garantir que usuários só possam acessar seus próprios dados
- As consultas são sempre filtradas pelo `user_id` atual

---

**Nota**: Para visualizar os dados registrados, você pode consultar as tabelas diretamente no console do Supabase:

```sql
-- Listar todas as sessões de estudo
SELECT * FROM study_sessions ORDER BY created_at DESC;

-- Listar atividades de estudo
SELECT * FROM study_activity ORDER BY activity_date DESC;
``` 