import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionService } from '@/services/subscription.service';
import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    // Verificar autorização do worker (service role key)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await request.json();
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID é obrigatório' }, { status: 400 });
    }

    // Configuração do cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Variáveis de ambiente do Supabase não encontradas');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Buscar o job
    const { data: job, error: jobError } = await adminSupabase
      .from('flashcard_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Job não encontrado:', jobError);
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    if (job.status !== 'pending') {
      console.log('Job já processado:', job.status);
      return NextResponse.json({ message: 'Job já processado' });
    }

    // Atualizar status para 'processing'
    await adminSupabase
      .from('flashcard_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    try {
      const prompt = job.input_data.prompt;

      // Processar com Groq (timeout maior para worker)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000); // 5 minutos para worker

      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista brasileiro em educação e criação de flashcards educacionais com vasta experiência em pedagogia e técnicas de memorização. Sua missão é criar flashcards EDUCATIVOS, CLAROS, PRECISOS e PEDAGOGICAMENTE EFICAZES em PORTUGUÊS BRASILEIRO.

PRINCÍPIOS FUNDAMENTAIS:
1. CLAREZA: Perguntas diretas e respostas completas mas concisas
2. PRECISÃO: Informações corretas e atualizadas
3. PEDAGOGIA: Estrutura que facilita o aprendizado e memorização
4. PROGRESSÃO: Dificuldade adequada ao nível especificado
5. RELEVÂNCIA: Foco nos conceitos mais importantes

ESTRUTURA DOS FLASHCARDS:
- FRENTE: Pergunta clara, específica e direta
- VERSO: Resposta completa mas concisa, com explicação quando necessário
- DICA: Pista útil para ajudar na memorização (quando apropriado)
- TAGS: Categorização para organização e busca
- DIFICULDADE: Adequada ao nível solicitado

TIPOS DE PERGUNTAS A INCLUIR:
- Definições e conceitos fundamentais
- Aplicações práticas
- Relações entre conceitos
- Processos e procedimentos
- Fórmulas e cálculos (quando aplicável)
- Comparações e contrastes

QUALIDADE EXIGIDA:
- Linguagem apropriada ao nível educacional
- Informações verificáveis e confiáveis
- Estrutura que promove retenção de longo prazo
- Variedade nos tipos de questões
- Cobertura abrangente do tópico

FORMATO DE RESPOSTA:
Retorne SEMPRE um JSON válido seguindo exatamente a estrutura solicitada no prompt do usuário.`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_completion_tokens: 8000
      }, { signal: controller.signal });

      clearTimeout(timeout);

      const result = completion.choices[0]?.message?.content || '';

      // Logs detalhados sobre a resposta da IA
      console.log('Resposta da IA recebida. Tamanho:', result.length);
      console.log('Primeiros 200 caracteres:', result.substring(0, 200));
      console.log('Últimos 200 caracteres:', result.substring(result.length - 200));
      
      // Verificar se é um JSON válido antes de salvar
      try {
        JSON.parse(result);
        console.log('JSON da IA é válido');
      } catch (parseError) {
        console.error('ERRO: Resposta da IA não é um JSON válido:', parseError);
        console.error('Resposta completa da IA:', result);
        
        // Salvar erro no job
        await adminSupabase
          .from('flashcard_jobs')
          .update({
            status: 'failed',
            error_message: `Resposta da IA inválida: ${parseError.message}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);
          
        return NextResponse.json({ error: 'Resposta da IA inválida' }, { status: 500 });
      }

      // Atualizar job com resultado
      await adminSupabase
        .from('flashcard_jobs')
        .update({
          status: 'completed',
          result_data: { result },
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      console.log('Job processado com sucesso:', jobId);
      return NextResponse.json({ success: true, jobId });

    } catch (error: any) {
      console.error('Erro ao processar job:', error);
      
      let errorMessage = 'Erro desconhecido';
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout no processamento';
      } else if (error?.message?.includes('rate_limit_exceeded')) {
        errorMessage = 'Limite da API atingido';
      } else {
        errorMessage = error.message || 'Erro desconhecido';
      }

      // Atualizar job com erro
      await adminSupabase
        .from('flashcard_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage
        })
        .eq('id', jobId);

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Erro no worker de flashcards:', error);
    return NextResponse.json({ error: error.message || 'Erro desconhecido' }, { status: 500 });
  }
}