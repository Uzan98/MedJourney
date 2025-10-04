import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionService } from '@/services/subscription.service';
import { SubscriptionTier } from '@/types/subscription';
import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    // Configuração do cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Variáveis de ambiente do Supabase não encontradas');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Validar token de autenticação
    let userId = '';
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Token extraído:', token.substring(0, 20) + '...');
      
      // Usar cliente com anon key para validar o token do usuário
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: userData, error } = await authClient.auth.getUser(token);
      
      if (error || !userData?.user) {
        console.error('Erro ao verificar token:', error);
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      }
      
      userId = userData.user.id;
      console.log('Usuário validado:', userId);
    } else {
      console.error('Token de autorização não encontrado ou formato inválido');
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Cliente com service role key para operações administrativas
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // --- verificação de plano ---
    const userSubscription = await SubscriptionService.getUserSubscription(userId, adminSupabase);
    const userTier = userSubscription?.tier as SubscriptionTier;
    if (![SubscriptionTier.PRO, SubscriptionTier.PRO_PLUS].includes(userTier)) {
      return NextResponse.json({
        error: 'Somente usuários Pro/Pro+ podem gerar flashcards.',
        requiresUpgrade: true,
        requiredTier: 'pro'
      }, { status: 403 });
    }

    // --- verificação de limite diário ---
    const hasReachedLimit = await SubscriptionService.hasReachedFeatureLimit(userId, 'flashcardsPerDay', adminSupabase);
    if (hasReachedLimit) {
      return NextResponse.json({
        error: 'Você atingiu o limite diário de flashcards. Tente novamente amanhã ou faça upgrade para Pro+.',
        requiresUpgrade: true,
        requiredTier: 'pro_plus'
      }, { status: 403 });
    }

    const { prompt } = await request.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 });

    // --- chamada Groq com timeout ---
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 120s para dar mais tempo à API Groq

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b', // Modelo correto usado no projeto
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
        max_completion_tokens: 3000
      }, { signal: controller.signal });
    } catch (err: any) {
      if (err.name === 'AbortError') return NextResponse.json({ error: 'A requisição demorou demais. Tente novamente.' }, { status: 504 });
      if (err?.message?.includes('rate_limit_exceeded')) return NextResponse.json({ error: 'Limite diário da Groq atingido. Tente mais tarde.' }, { status: 429 });
      return NextResponse.json({ error: err.message || 'Erro desconhecido na Groq' }, { status: 500 });
    } finally {
      clearTimeout(timeout);
    }

    const result = completion.choices[0]?.message?.content || '';
    
    // Incrementar o contador de uso de flashcards
    try {
      await SubscriptionService.incrementFeatureUsage(userId, 'flashcardsPerDay', adminSupabase);
    } catch (error) {
      console.error('Erro ao incrementar contador de uso:', error);
      // Não falhar a requisição por causa do contador
    }
    
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Erro na API de flashcards:', error);
    return NextResponse.json({ error: error.message || 'Erro desconhecido' }, { status: 500 });
  }
}