# Banco de Questões

## Visão Geral

O módulo "Banco de Questões" foi projetado para permitir que os usuários criem, organizem e gerenciem uma coleção pessoal de questões para estudo e avaliação. Diferente da abordagem de múltiplos bancos de questões, esta implementação utiliza um único banco centralizado, facilitando a organização e recuperação de questões.

## Estrutura de Arquivos

```
src/
├── app/
│   └── banco-questoes/
│       ├── page.tsx                 # Página principal com lista de questões
│       ├── layout.tsx               # Layout compartilhado 
│       ├── nova-questao/
│       │   └── page.tsx             # Página para adicionar nova questão
│       └── questao/
│           └── [id]/
│               └── page.tsx         # Página de detalhes da questão
└── services/
    └── questions-bank.service.ts    # Serviço para gerenciar operações com questões
```

## Componentes Principais

### 1. Página Principal (`/banco-questoes/page.tsx`)

A página principal apresenta todas as questões do usuário em um formato tabular, com recursos de:

- **Filtragem avançada**: por disciplina, assunto, dificuldade, tipo de questão
- **Pesquisa por texto**: busca em conteúdos e tags
- **Ordenação**: por data de criação (mais recentes ou mais antigas)
- **Visualização rápida**: exibe conteúdo resumido, disciplina, dificuldade, tags
- **Ações rápidas**: ver detalhes, editar, excluir

### 2. Página de Nova Questão (`/banco-questoes/nova-questao/page.tsx`)

Esta página permite adicionar novas questões ao banco, com suporte para diferentes tipos:

- **Múltipla escolha**: Permite criar opções de resposta e marcar as corretas
- **Verdadeiro/Falso**: Para afirmações com respostas binárias
- **Dissertativa**: Questões abertas com resposta esperada

Cada questão pode incluir:
- Conteúdo principal
- Explicação detalhada
- Disciplina e assunto associados
- Nível de dificuldade
- Tags para categorização

### 3. Página de Detalhes da Questão (`/banco-questoes/questao/[id]/page.tsx`)

Exibe todos os detalhes de uma questão específica:

- Conteúdo completo
- Resposta(s) correta(s)
- Explicação detalhada
- Metadados (disciplina, assunto, dificuldade, data de criação)
- Tags associadas
- Opções para editar ou excluir

### 4. Serviço de Banco de Questões (`/services/questions-bank.service.ts`)

Serviço responsável por todas as operações relacionadas às questões:

- **Interfaces**:
  - `Question`: Define a estrutura de uma questão
  - `AnswerOption`: Define a estrutura de opções de resposta

- **Funcionalidades**:
  - `getUserQuestions()`: Recupera todas as questões do usuário
  - `getQuestionById()`: Busca uma questão específica
  - `getAnswerOptions()`: Recupera opções de resposta para uma questão
  - `addQuestion()`: Adiciona nova questão
  - `updateQuestion()`: Atualiza uma questão existente
  - `deleteQuestion()`: Remove uma questão
  - `getFilteredQuestions()`: Busca questões com base em filtros

## Modelo de Dados

### Tabela `questions`

| Campo          | Tipo      | Descrição                                        |
|----------------|-----------|--------------------------------------------------|
| id             | int       | Identificador único                              |
| user_id        | string    | ID do usuário proprietário                       |
| discipline_id  | int       | Referência à disciplina                          |
| subject_id     | int       | Referência ao assunto                            |
| content        | text      | Conteúdo da questão                              |
| explanation    | text      | Explicação da resposta                           |
| difficulty     | string    | Nível de dificuldade (baixa, média, alta)        |
| question_type  | string    | Tipo (multiple_choice, true_false, essay)        |
| correct_answer | text      | Resposta correta (para V/F e dissertativa)       |
| tags           | string[]  | Array de tags                                    |
| created_at     | timestamp | Data de criação                                  |
| updated_at     | timestamp | Data de última atualização                       |

### Tabela `answer_options` (para questões de múltipla escolha)

| Campo       | Tipo      | Descrição                           |
|-------------|-----------|-------------------------------------|
| id          | int       | Identificador único                 |
| question_id | int       | Referência à questão                |
| text        | text      | Texto da opção                      |
| is_correct  | boolean   | Indica se é uma opção correta       |
| created_at  | timestamp | Data de criação                     |
| updated_at  | timestamp | Data de última atualização          |

## Funcionalidades Principais

1. **Gestão de Questões**
   - Criação de questões de múltiplos tipos
   - Edição e exclusão
   - Organização por disciplina/assunto

2. **Filtragem e Pesquisa**
   - Filtros por tipo, disciplina, assunto, dificuldade
   - Pesquisa por conteúdo ou tags

3. **Segurança e Privacidade**
   - Isolamento de dados por usuário (Row Level Security)
   - Cada usuário só tem acesso às suas próprias questões

## Implementação Técnica

A implementação utiliza:

- **Next.js 13+** com App Router
- **React Hooks** para gerenciamento de estado
- **Supabase** para persistência de dados
- **Tailwind CSS** para estilização
- **Lucide React** para ícones

### Considerações de Performance

- Uso de paginação em listas extensas
- Índices em colunas frequentemente pesquisadas
- Filtragem realizada no servidor para grandes volumes de dados

## Melhorias Futuras

1. **Exportação/Importação**
   - Suporte para CSV, JSON
   - Importação de questões de outras fontes

2. **Compartilhamento**
   - Compartilhar questões com outros usuários
   - Copiar questões compartilhadas para o próprio banco

3. **Recursos Avançados**
   - Adição de imagens, fórmulas e anexos às questões
   - Editor rico para conteúdo mais complexo
   - Estatísticas de acertos/erros

4. **Integração com Simulados**
   - Criação de simulados a partir de questões selecionadas
   - Análise de desempenho por tema/disciplina 