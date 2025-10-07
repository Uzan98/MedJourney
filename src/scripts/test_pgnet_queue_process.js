const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuração do cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessários.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    // Configurar parâmetros de ambiente para o pg_net
    const appSiteUrl = process.env.APP_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    const internalKey = process.env.INTERNAL_QUEUE_KEY || 'default-internal-key';

    if (!appSiteUrl) {
      console.error('Defina APP_SITE_URL ou NEXT_PUBLIC_SITE_URL apontando para seu domínio público.');
      process.exit(1);
    }

    console.log('Definindo parâmetros app.site_url e app.internal_queue_key...');
    const setSql = `
      SELECT set_config('app.site_url', '${appSiteUrl}', true);
      SELECT set_config('app.internal_queue_key', '${internalKey}', true);
    `;
    const { error: setError } = await supabase.rpc('exec_sql', { sql_query: setSql });
    if (setError) {
      console.error('Erro ao definir parâmetros:', setError);
      process.exit(1);
    }

    console.log('Disparando processamento da fila via pg_net...');
    const { data: reqData, error: reqError } = await supabase
      .rpc('http_process_flashcard_queue');

    if (reqError) {
      console.error('Erro ao chamar http_process_flashcard_queue:', reqError);
      process.exit(1);
    }

    const requestId = Array.isArray(reqData) && reqData.length > 0 ? reqData[0].request_id : null;
    if (!requestId) {
      console.error('Não foi possível obter request_id da chamada pg_net. Resposta:', reqData);
      process.exit(1);
    }

    console.log('request_id obtido:', requestId);

    // Aguardar alguns segundos para permitir que a resposta seja registrada
    await new Promise(res => setTimeout(res, 4000));

    console.log('Coletando resposta...');
    const { data: respData, error: respError } = await supabase
      .rpc('collect_queue_process_response', { p_request_id: requestId });

    if (respError) {
      console.error('Erro ao coletar resposta:', respError);
      process.exit(1);
    }

    if (!respData || respData.length === 0) {
      console.log('Nenhuma resposta encontrada ainda. Tente novamente mais tarde.');
    } else {
      for (const row of respData) {
        console.log('Status HTTP:', row.status);
        console.log('Criado em:', row.created_at);
        console.log('Resposta JSON:', JSON.stringify(row.response, null, 2));
      }
    }

    console.log('Concluído.');
  } catch (err) {
    console.error('Erro inesperado:', err);
    process.exit(1);
  }
}

main();