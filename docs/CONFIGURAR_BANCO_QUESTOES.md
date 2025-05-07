# Configuração do Banco de Questões no Supabase

Este documento fornece instruções detalhadas para configurar e solucionar problemas comuns relacionados ao módulo "Banco de Questões" no Supabase.

## Visão Geral do Problema

Se você está enfrentando um dos seguintes problemas:
- Questões que você criar não aparecem na interface
- Apenas dados mockados (simulados) são exibidos
- Erros ao tentar criar novas questões
- Mensagens de erro relacionadas a tabelas ausentes

Siga as etapas abaixo para resolver.

## Passo 1: Verificação e Criação das Tabelas

O primeiro passo é executar o script de verificação, que irá:
1. Verificar se as tabelas necessárias existem
2. Criar as tabelas ausentes
3. Configurar as políticas de segurança (RLS)
4. Adicionar índices para melhorar o desempenho

### Instruções:

1. Acesse o [Console do Supabase](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para a seção "SQL Editor"
4. Crie uma nova consulta (New Query)
5. Cole o conteúdo do arquivo `src/sql/verify_questions_tables.sql`
6. Execute a consulta

O script irá verificar e criar as seguintes tabelas:
- `questions`: Armazena as questões
- `answer_options`: Armazena opções de resposta para questões de múltipla escolha
- `disciplines`: Armazena disciplinas (se não existir)
- `subjects`: Armazena assuntos (se não existir)

## Passo 2: Adicionar Dados de Exemplo (Opcional)

Para popular seu banco de dados com questões de exemplo:

1. Acesse novamente a seção "SQL Editor" no console do Supabase
2. Crie uma nova consulta (New Query)
3. Cole o conteúdo do arquivo `src/sql/insert_sample_questions.sql`
4. Execute a consulta
5. Após a execução bem-sucedida, execute a seguinte consulta substituindo `seu-user-id-aqui` pelo ID do seu usuário:

```sql
SELECT create_sample_questions('seu-user-id-aqui');
```

Para encontrar seu ID de usuário:
1. Vá para "Authentication" > "Users" no console do Supabase
2. Encontre seu usuário na lista e copie o ID

## Passo 3: Verificar Configuração do Código

O código da aplicação foi ajustado para usar os dados reais do banco em vez de dados mockados. Certifique-se de que:

1. Em `src/app/banco-questoes/page.tsx`, a função `loadData()` está usando:
   ```typescript
   const questionsData = await QuestionsBankService.getUserQuestions();
   ```
   
2. Em `src/app/banco-questoes/nova-questao/page.tsx`, a função `handleSalvar()` está usando:
   ```typescript
   const questionId = await QuestionsBankService.addQuestion(question, answerOptions);
   ```

3. Em `src/services/questions-bank.service.ts`, verifique se existe o método `createQuestion()` que seria um alias para `addQuestion()`.

## Solução de Problemas Comuns

### Problema 1: Erros de Tipos no QuestionsBankService

Se você encontrar erros como:
```
Property 'createQuestion' does not exist on type 'typeof QuestionsBankService'
```

Adicione o método `createQuestion` ao arquivo `src/services/questions-bank.service.ts`:

```typescript
static async createQuestion(question: Question, answerOptions?: AnswerOption[]): Promise<Question | null> {
  const questionId = await this.addQuestion(question, answerOptions);
  if (questionId) {
    return {
      ...question,
      id: questionId
    };
  }
  return null;
}
```

### Problema 2: Erros de Tipo no Supabase

Se encontrar erros relacionados a tipos UUID em tabelas:

```
ERROR: column "user_id" is of type uuid but expression is of type character varying
```

Certifique-se de usar:

```typescript
const { data: user } = await supabase.auth.getUser();
const userId = user?.user?.id;
```

### Problema 3: Erro "RLS policy violated"

Este erro ocorre quando a política de segurança (Row Level Security) impede o acesso aos dados:

1. Verifique se você está autenticado
2. Certifique-se de que as políticas estão corretamente configuradas (executando o script de verificação)
3. Verifique se você está tentando acessar apenas os seus próprios dados

## Comandos SQL Úteis

### Verificar Tabelas Existentes
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Verificar Políticas RLS
```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public';
```

### Limpar Todas as Questões
```sql
-- Cuidado: isso excluirá permanentemente todas as questões
DELETE FROM public.answer_options;
DELETE FROM public.questions;
```

## Dados de Log para Debug

Adicione o seguinte código temporariamente nos componentes para ver logs detalhados:

```typescript
useEffect(() => {
  const checkAuth = async () => {
    const { data } = await supabase.auth.getUser();
    console.log("User auth data:", data);
  };
  checkAuth();
}, []);
```

```typescript
console.log("Loading questions:", questionsData);
```

## Suporte Adicional

Se você continuar enfrentando problemas:
1. Verifique os logs do console do navegador (F12 > Console)
2. Verifique os logs do servidor Supabase (Console > Database > Logs)
3. Entre em contato com a equipe de desenvolvimento

## Resumo das Alterações Realizadas

Para resolver o problema das questões que não aparecem na interface, realizamos as seguintes alterações:

1. **Modificação da função `loadData` em `src/app/banco-questoes/page.tsx`**: 
   - Alteramos o código para buscar dados reais do banco de dados em vez de usar apenas dados mockados
   - Adicionamos uma verificação para usar dados mockados apenas se não houver dados reais

2. **Correção na função `handleSalvar` em `src/app/banco-questoes/nova-questao/page.tsx`**:
   - Substituímos a simulação de sucesso pelo uso real do serviço `QuestionsBankService.addQuestion`
   - Adicionamos logs para facilitar a depuração

3. **Adição do método `createQuestion` em `src/services/questions-bank.service.ts`**:
   - Criamos um alias para o método `addQuestion` para compatibilidade com a interface do componente

4. **Criação de scripts SQL para verificação e configuração**:
   - Script `verify_questions_tables.sql`: Verifica e cria as tabelas necessárias
   - Script `insert_sample_questions.sql`: Insere dados de exemplo para teste

5. **Documentação com guia de solução de problemas**:
   - Criamos este documento com instruções detalhadas para configurar e solucionar problemas

Estas alterações garantem que a aplicação possa criar, ler, atualizar e excluir questões no banco de dados Supabase, corrigindo o problema onde apenas dados simulados eram exibidos.

---

Última atualização: 11 de novembro de 2023 