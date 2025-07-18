# Configurando o Reset Programado dos Contadores de Uso

Se você estiver usando o Supabase, é possível que a extensão `pg_cron` não esteja disponível ou não tenha permissões para usá-la. Neste caso, você precisará configurar uma solução alternativa para resetar os contadores de uso diariamente. Aqui estão algumas opções:

## Opção 1: Supabase Edge Functions com Agendamento

O Supabase oferece Edge Functions que podem ser agendadas para executar periodicamente.

### Passo 1: Criar uma Edge Function

1. Configure o CLI do Supabase:
   ```bash
   npm install -g supabase
   supabase login
   ```

2. Inicialize o projeto Supabase:
   ```bash
   supabase init
   ```

3. Crie uma nova Edge Function:
   ```bash
   supabase functions new reset-usage-counters
   ```

4. Edite o arquivo `supabase/functions/reset-usage-counters/index.ts`:
   ```typescript
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
   import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

   const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
   const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

   serve(async (req) => {
     // Verificar se a requisição vem de um serviço autorizado
     const authHeader = req.headers.get('Authorization')
     if (!authHeader || authHeader !== `Bearer ${Deno.env.get('FUNCTION_SECRET')}`) {
       return new Response(JSON.stringify({ error: 'Não autorizado' }), { 
         status: 401,
         headers: { 'Content-Type': 'application/json' }
       })
     }

     // Criar cliente Supabase com chave de serviço
     const supabase = createClient(supabaseUrl, supabaseServiceKey)
     
     // Executar a função de reset
     const { data, error } = await supabase.rpc('reset_usage_counters')
     
     if (error) {
       return new Response(JSON.stringify({ error: error.message }), { 
         status: 500,
         headers: { 'Content-Type': 'application/json' }
       })
     }
     
     return new Response(JSON.stringify({ success: true }), { 
       status: 200,
       headers: { 'Content-Type': 'application/json' }
     })
   })
   ```

5. Deploy da função:
   ```bash
   supabase functions deploy reset-usage-counters --no-verify-jwt
   ```

### Passo 2: Agendar a execução

Você pode usar um serviço externo para chamar sua Edge Function diariamente:

1. **Opção A: cron-job.org**
   - Crie uma conta em [cron-job.org](https://cron-job.org)
   - Adicione um novo cronjob para chamar sua Edge Function:
     - URL: `https://[seu-projeto].supabase.co/functions/v1/reset-usage-counters`
     - Método: `GET`
     - Cabeçalhos: `Authorization: Bearer [seu-segredo]`
     - Agendamento: `0 0 * * *` (meia-noite todos os dias)

2. **Opção B: GitHub Actions**
   - Crie um arquivo `.github/workflows/reset-counters.yml` no seu repositório:
   ```yaml
   name: Reset Usage Counters

   on:
     schedule:
       - cron: '0 0 * * *'  # Meia-noite UTC todos os dias
     workflow_dispatch:  # Permite execução manual

   jobs:
     reset-counters:
       runs-on: ubuntu-latest
       steps:
         - name: Call Reset Function
           run: |
             curl -X POST https://[seu-projeto].supabase.co/functions/v1/reset-usage-counters \
               -H "Authorization: Bearer ${{ secrets.FUNCTION_SECRET }}"
   ```

## Opção 2: Serviço Externo com Banco de Dados Conectado

Se você tiver um servidor Node.js rodando continuamente (como um servidor Express ou Next.js):

1. Instale o pacote `node-cron`:
   ```bash
   npm install node-cron
   ```

2. Adicione o seguinte código ao seu servidor:
   ```javascript
   const cron = require('node-cron');
   const { createClient } = require('@supabase/supabase-js');

   // Configurar cliente Supabase com chave de serviço
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.SUPABASE_SERVICE_ROLE_KEY
   );

   // Agendar tarefa para rodar à meia-noite todos os dias
   cron.schedule('0 0 * * *', async () => {
     try {
       const { data, error } = await supabase.rpc('reset_usage_counters');
       
       if (error) {
         console.error('Erro ao resetar contadores:', error);
       } else {
         console.log('Contadores resetados com sucesso');
       }
     } catch (err) {
       console.error('Erro ao executar job de reset:', err);
     }
   });
   ```

## Opção 3: Solução Temporária Manual

Se você não puder implementar nenhuma das soluções acima imediatamente, pode criar um endpoint de administração que execute a função de reset:

1. Crie um endpoint de API no seu aplicativo:
   ```typescript
   // src/app/api/admin/reset-counters/route.ts
   import { NextRequest, NextResponse } from 'next/server';
   import { createServerSupabaseClient } from '../../../../lib/supabase-server';

   export async function POST(request: NextRequest) {
     try {
       const supabase = createServerSupabaseClient();
       
       // Verificar se o usuário é admin
       const { data: { session } } = await supabase.auth.getSession();
       
       if (!session) {
         return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
       }
       
       const { data: profile } = await supabase
         .from('profiles')
         .select('role')
         .eq('user_id', session.user.id)
         .single();
       
       if (!profile || profile.role !== 'admin') {
         return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
       }
       
       // Executar a função de reset
       const { data, error } = await supabase.rpc('reset_usage_counters');
       
       if (error) {
         return NextResponse.json({ error: error.message }, { status: 500 });
       }
       
       return NextResponse.json({ success: true });
     } catch (error) {
       console.error('Erro ao resetar contadores:', error);
       return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
     }
   }
   ```

2. Crie uma página de admin para chamar este endpoint quando necessário.

## Verificando o Funcionamento

Para verificar se o reset está funcionando corretamente:

1. Insira alguns dados de teste na tabela `subscription_usage`
2. Execute manualmente a função `reset_usage_counters`:
   ```sql
   SELECT reset_usage_counters();
   ```
3. Verifique se os contadores foram resetados:
   ```sql
   SELECT * FROM subscription_usage;
   ```

Escolha a solução que melhor se adapta ao seu ambiente e necessidades. O importante é garantir que os contadores sejam resetados regularmente para que os limites de uso funcionem corretamente. 