import { serve } from 'https://deno.land/std@0.181.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  // Logs para depuração
  console.log('SUPABASE_URL:', supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'OK' : 'MISSING');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('subscription_usage')
    .update({
      questions_used_today: 0,
      last_usage_date: today,
    })
    .neq('questions_used_today', 0); // WHERE questions_used_today != 0

  if (error) {
    console.error('Erro ao resetar contagem diária:', error);
    return new Response(JSON.stringify({ error, message: error.message, details: error.details }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, updated: data }), { status: 200 });
}); 