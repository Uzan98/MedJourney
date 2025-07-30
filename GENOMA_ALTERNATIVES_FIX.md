# Fix para Alternativas do Banco Genoma

Este documento explica como corrigir o problema das questões do "banco genoma" que não possuem alternativas na tabela `answer_options`.

## Problema Identificado

Durante a investigação, foi descoberto que:
- 13 questões do "banco genoma" existem na tabela `questions`
- 12 dessas questões (92%) não possuem alternativas na tabela `answer_options`
- Apenas 1 questão possui as 5 alternativas corretas

## Soluções Disponíveis

### 1. Script SQL Automático (`fix_genoma_alternatives.sql`)

**Descrição**: Script SQL completo que:
- Cria funções para extrair alternativas do conteúdo das questões
- Corrige questões existentes automaticamente
- Cria triggers para garantir que futuras questões sejam processadas

**Como usar**:
1. Abra o Supabase Dashboard
2. Vá para SQL Editor
3. Cole o conteúdo do arquivo `fix_genoma_alternatives.sql`
4. Execute o script

**Vantagens**:
- Solução completa e automática
- Inclui triggers para futuras questões
- Extrai alternativas automaticamente do texto

### 2. Script SQL Manual (`manual_fix_alternatives.sql`)

**Descrição**: Script mais simples para inserção manual das alternativas.

**Como usar**:
1. Execute o script para criar as funções auxiliares
2. Use a função `add_alternatives_to_question()` para cada questão:

```sql
SELECT add_alternatives_to_question(
    'QUESTION_ID_HERE'::UUID,
    'Texto da alternativa A',
    'Texto da alternativa B', 
    'Texto da alternativa C',
    'Texto da alternativa D',
    'Texto da alternativa E',
    'C'  -- Letra da resposta correta
);
```

**Vantagens**:
- Controle total sobre as alternativas
- Mais confiável para questões com formato não padrão

### 3. Script TypeScript (`scripts/fix-genoma-alternatives.ts`)

**Descrição**: Script Node.js que usa a API do Supabase para processar as questões.

**Como usar**:
1. Certifique-se de que as variáveis de ambiente estão configuradas:
   ```
   NEXT_PUBLIC_SUPABASE_URL=sua_url
   SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
   ```

2. Execute o script:
   ```bash
   npx ts-node scripts/fix-genoma-alternatives.ts
   ```

**Vantagens**:
- Execução local
- Logs detalhados do progresso
- Verificação automática dos resultados

## Queries Úteis para Diagnóstico

### Verificar questões sem alternativas:
```sql
SELECT 
    q.id,
    q.content,
    q.correct_answer,
    COUNT(ao.id) as alternative_count
FROM questions q
LEFT JOIN answer_options ao ON q.id = ao.question_id
WHERE q.from_genoma_bank = true
GROUP BY q.id, q.content, q.correct_answer
HAVING COUNT(ao.id) = 0
ORDER BY q.created_at;
```

### Verificar status geral:
```sql
SELECT 
    COUNT(*) as total_genoma_questions,
    COUNT(CASE WHEN ao.question_id IS NOT NULL THEN 1 END) as questions_with_alternatives,
    COUNT(CASE WHEN ao.question_id IS NULL THEN 1 END) as questions_without_alternatives
FROM questions q
LEFT JOIN (
    SELECT DISTINCT question_id 
    FROM answer_options
) ao ON q.id = ao.question_id
WHERE q.from_genoma_bank = true;
```

### Ver alternativas de uma questão específica:
```sql
SELECT 
    q.content,
    ao.text as alternative_text,
    ao.is_correct
FROM questions q
JOIN answer_options ao ON q.id = ao.question_id
WHERE q.id = 'QUESTION_ID_HERE'
ORDER BY ao.created_at;
```

## Prevenção para o Futuro

Os scripts incluem triggers que automaticamente:
1. Detectam quando uma nova questão do "banco genoma" é inserida
2. Tentam extrair alternativas do conteúdo da questão
3. Inserem as alternativas na tabela `answer_options`

Isso garante que futuras importações não tenham o mesmo problema.

## Recomendações

1. **Para correção imediata**: Use o script SQL automático (`fix_genoma_alternatives.sql`)
2. **Para controle total**: Use o script manual e insira as alternativas manualmente
3. **Para automação**: Use o script TypeScript em um processo de CI/CD

## Verificação Final

Após executar qualquer solução, execute esta query para verificar se o problema foi resolvido:

```sql
SELECT 
    'Questões do banco genoma' as tipo,
    COUNT(*) as total,
    COUNT(CASE WHEN alternative_count > 0 THEN 1 END) as com_alternativas,
    COUNT(CASE WHEN alternative_count = 0 THEN 1 END) as sem_alternativas
FROM (
    SELECT 
        q.id,
        COUNT(ao.id) as alternative_count
    FROM questions q
    LEFT JOIN answer_options ao ON q.id = ao.question_id
    WHERE q.from_genoma_bank = true
    GROUP BY q.id
) stats;
```

O resultado ideal deve mostrar 0 questões sem alternativas.