# Guia de Configuração dos Simulados no Supabase

Este guia vai ajudar você a configurar as tabelas necessárias para o funcionamento dos simulados no Supabase, eliminando a necessidade de usar dados mockup.

## 1. Criar as Tabelas no Supabase

Para criar as tabelas necessárias, siga os passos abaixo:

1. Acesse o [Console do Supabase](https://app.supabase.io/)
2. Selecione seu projeto
3. Vá para a seção "SQL Editor"
4. Crie uma nova consulta
5. Cole o conteúdo do arquivo `src/sql/create_exams_tables.sql`
6. Execute a consulta

Este script irá criar as seguintes tabelas:

- `exams`: Armazena os simulados
- `exam_questions`: Relaciona simulados com questões
- `exam_attempts`: Armazena as tentativas dos usuários de realizar simulados
- `exam_answers`: Armazena as respostas dos usuários para cada questão do simulado

Além disso, o script configura as permissões de segurança (RLS) necessárias para proteger os dados.

## 2. Inserir Dados Iniciais

Para inserir alguns dados de amostra para testar a funcionalidade:

1. No Supabase, vá para a seção "Authentication" e copie o ID do seu usuário
2. Volte para o SQL Editor e crie uma nova consulta
3. Cole o conteúdo do arquivo `src/sql/insert_sample_exams.sql`
4. Substitua `YOUR_USER_ID` pelo ID do seu usuário copiado anteriormente
5. Execute a parte superior do script para criar os simulados
6. Execute as consultas sugeridas no script para verificar os IDs dos simulados e questões
7. Descomente e ajuste as declarações INSERT de `exam_questions` com os IDs corretos para adicionar questões aos simulados
8. Execute essas instruções

## 3. Modificações no Código

Já atualizamos o arquivo `src/app/simulados/page.tsx` para não usar mais dados mock. A principal alteração foi no método `loadExams`, que agora sempre usa dados reais do Supabase.

O código modificado ficou assim:

```javascript
const loadExams = async () => {
  setLoading(true);
  try {
    // Carregar simulados do usuário
    const exams = await ExamsService.getUserExams();
    setMyExams(exams);
    
    // Carregar simulados públicos
    const pubExams = await ExamsService.getPublicExams();
    // Filtrar para não mostrar os próprios simulados novamente
    const filteredPublicExams = pubExams.filter(exam => 
      !exams.some(myExam => myExam.id === exam.id)
    );
    setPublicExams(filteredPublicExams);
  } catch (error) {
    console.error('Erro ao carregar simulados:', error);
    toast.error('Ocorreu um erro ao carregar os simulados');
  } finally {
    setLoading(false);
  }
};
```

A diferença é que removemos o bloco que usava dados mockup quando não havia dados reais:

```javascript
// Código removido
if (exams.length === 0 && process.env.NODE_ENV === 'development') {
  // Usar dados de amostra durante o desenvolvimento se não houver dados reais
  exams = ExamsService.getMockExams();
  toast.success('Usando dados de amostra para simulados');
}
```

## 4. Verificação

Após configurar as tabelas e inserir os dados iniciais, você deve:

1. Iniciar a aplicação em modo de desenvolvimento
2. Navegar até a página de Simulados
3. Verificar se os simulados que você inseriu no banco de dados são exibidos
4. Testar a criação de um novo simulado
5. Adicionar questões a um simulado
6. Testar a realização de um simulado

Se tudo estiver funcionando corretamente, você estará usando dados reais do Supabase em vez de dados mockup.

## 5. Notas Adicionais

- A função `ExamsService.getMockExams()` ainda existe no código-fonte, mas não é mais utilizada. Você pode mantê-la como referência ou removê-la se preferir.
- Certifique-se de que sua aplicação está corretamente configurada para se conectar ao Supabase através das variáveis de ambiente:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Para ambientes de produção, lembre-se de não incluir dados de amostra e gerenciar corretamente as permissões RLS. 