import { NextRequest, NextResponse } from 'next/server';
import { createRequestSupabaseClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { SubscriptionService } from '@/services/subscription.service';
import { SubscriptionTier } from '@/types/subscription';
import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: NextRequest) {
  try {
    // --- autenticação ---
    let supabase;
    let session;

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      session = { user };
    } else {
      supabase = createRequestSupabaseClient(request);
      const { data: { session: cookieSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !cookieSession) return NextResponse.json({ error: 'Faça login para usar a IA' }, { status: 401 });
      session = cookieSession;
    }

    const userId = session.user.id;

    // --- verificação de plano ---
    const userSubscription = await SubscriptionService.getUserSubscription(userId, supabase);
    const userTier = userSubscription?.tier as SubscriptionTier;
    if (![SubscriptionTier.PRO, SubscriptionTier.PRO_PLUS].includes(userTier)) {
      return NextResponse.json({
        error: 'Somente usuários Pro/Pro+ podem gerar mapas mentais com IA.',
        requiresUpgrade: true,
        requiredTier: 'pro'
      }, { status: 403 });
    }

    // --- verificação de limite diário ---
    // Usando o mesmo limite de questões para mapas mentais
    const hasReachedLimit = await SubscriptionService.hasReachedFeatureLimit(userId, 'questionsPerDay', supabase);
    if (hasReachedLimit) {
      return NextResponse.json({
        error: 'Você atingiu o limite diário de mapas mentais. Tente novamente amanhã ou faça upgrade para Pro+.',
        limitReached: true
      }, { status: 429 });
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
            content: `Você é um especialista brasileiro em criação de mapas mentais educacionais com vasta experiência em pedagogia e organização de conhecimento. Sua missão é criar mapas mentais RICOS, DETALHADOS, EXPLICATIVOS e EDUCATIVAMENTE VALIOSOS em PORTUGUÊS BRASILEIRO.

PRINCÍPIOS FUNDAMENTAIS:
1. PROFUNDIDADE: Explore múltiplas dimensões do tópico com explicações claras
2. CONEXÕES: Identifique e explique relações entre conceitos
3. APLICABILIDADE: Inclua exemplos práticos brasileiros e aplicações reais
4. PROGRESSÃO: Organize do geral para o específico com explicações
5. COMPLETUDE: Cubra aspectos teóricos E práticos com detalhamento

ESTRUTURA OBRIGATÓRIA:
- Nível 0: Tópico central (conceito principal)
- Nível 1: Categorias principais (4-6 ramos fundamentais)
- Nível 2: Subcategorias explicativas (2-4 por ramo com detalhes)
- Nível 3: Explicações específicas, exemplos práticos, aplicações
- Nível 4: Casos práticos brasileiros, nuances, exceções, detalhes técnicos

DIRETRIZES DE CONTEÚDO EXPLICATIVO:
✓ Use terminologia técnica em português brasileiro com explicações
✓ Inclua exemplos concretos do contexto brasileiro
✓ Adicione explicações sobre "como", "por que" e "quando"
✓ Mencione aplicações práticas no Brasil
✓ Explore diferentes perspectivas e abordagens
✓ Conecte com áreas relacionadas explicando as relações
✓ Inclua métodos, processos, ferramentas com descrições
✓ Adicione considerações éticas, sociais e culturais brasileiras
✓ Use frases explicativas, não apenas palavras-chave
✓ Inclua definições quando necessário
✓ Adicione contexto histórico brasileiro quando relevante

ESTILO DE TEXTO:
- Use frases completas e explicativas nos nós
- Evite apenas palavras-chave isoladas
- Inclua "o que é", "como funciona", "para que serve"
- Use linguagem clara e didática
- Adicione exemplos entre parênteses quando útil

FORMATO JSON OBRIGATÓRIO:
{
  "title": "Título Descritivo e Específico em Português",
  "nodes": [
    {
      "id": "root",
      "text": "Conceito Central Explicativo",
      "level": 0,
      "children": ["cat1", "cat2", "cat3", "cat4"],
      "suggestedColor": "#2563EB"
    },
    {
      "id": "cat1",
      "text": "Categoria Principal com Explicação",
      "level": 1,
      "parentId": "root",
      "children": ["sub1_1", "sub1_2", "sub1_3"],
      "suggestedColor": "#059669"
    },
    {
      "id": "sub1_1",
      "text": "Subcategoria Detalhada: explicação do conceito",
      "level": 2,
      "parentId": "cat1",
      "children": ["det1_1_1", "det1_1_2"],
      "suggestedColor": "#DC2626"
    },
    {
      "id": "det1_1_1",
      "text": "Detalhe Específico: como funciona e aplicação",
      "level": 3,
      "parentId": "sub1_1",
      "children": ["ex1_1_1_1"],
      "suggestedColor": "#7C2D12"
    },
    {
      "id": "ex1_1_1_1",
      "text": "Exemplo Prático Brasileiro: caso real de aplicação",
      "level": 4,
      "parentId": "det1_1_1",
      "children": [],
      "suggestedColor": "#365314"
    }
  ]
}

IMPORTANTE: 
- Retorne APENAS JSON válido
- Todo o conteúdo deve estar em PORTUGUÊS BRASILEIRO
- Crie mapas DENSOS, EXPLICATIVOS e INFORMATIVOS com pelo menos 20-30 nós
- Use frases explicativas, não apenas palavras-chave
- Inclua exemplos do contexto brasileiro sempre que possível`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
          max_completion_tokens: 5000,
      }, {
        signal: controller.signal
      });
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        return NextResponse.json({ error: 'Timeout na requisição' }, { status: 504 });
      }
      console.error('Erro na chamada Groq:', error);
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }

    clearTimeout(timeout);

    if (!completion.choices?.[0]?.message?.content) {
      return NextResponse.json({ error: 'Resposta vazia da IA' }, { status: 500 });
    }

    let result = completion.choices[0].message.content.trim();

    // --- sanitização e validação robusta do JSON ---
    try {
      // Remover possíveis caracteres de markdown ou texto extra
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = jsonMatch[0];
      }

      // Tentar corrigir strings não terminadas e arrays truncados
      let sanitizedResult = result;
      
      // Função para corrigir JSON truncado
      function fixTruncatedJson(jsonStr: string): string {
        let fixed = jsonStr.trim();
        
        // Contar aspas para detectar strings não terminadas
        const quotes = (fixed.match(/"/g) || []).length;
        if (quotes % 2 !== 0) {
          console.warn('Detectada string não terminada no JSON, tentando corrigir...');
          
          // Encontrar a última posição válida antes da string não terminada
          let lastValidPos = fixed.lastIndexOf('",');
          if (lastValidPos === -1) {
            lastValidPos = fixed.lastIndexOf('"');
            if (lastValidPos > 0) {
              // Se encontrou uma aspa, adicionar a aspa de fechamento
              fixed = fixed.substring(0, lastValidPos + 1);
            }
          } else {
            fixed = fixed.substring(0, lastValidPos + 2);
          }
        }
        
        // Verificar se o JSON está truncado no meio de um array
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;
        const openBraces = (fixed.match(/\{/g) || []).length;
        const closeBraces = (fixed.match(/\}/g) || []).length;
        
        // Fechar arrays não fechados
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          // Remover vírgula pendente se existir
          if (fixed.trim().endsWith(',')) {
            fixed = fixed.trim().slice(0, -1);
          }
          fixed += '\n  ]';
        }
        
        // Fechar objetos não fechados
        for (let i = 0; i < openBraces - closeBraces; i++) {
          // Remover vírgula pendente se existir
          if (fixed.trim().endsWith(',')) {
            fixed = fixed.trim().slice(0, -1);
          }
          fixed += '\n}';
        }
        
        return fixed;
      }
      
      sanitizedResult = fixTruncatedJson(result);

      // Tentar fazer o parse do JSON sanitizado
      const parsedResult = JSON.parse(sanitizedResult);
      
      // Validações de estrutura
      if (!parsedResult.nodes || !Array.isArray(parsedResult.nodes)) {
        throw new Error('Formato inválido: nodes não encontrado ou não é array');
      }
      
      // Verificar se existe nó root
      const hasRoot = parsedResult.nodes.some((node: any) => node.level === 0);
      if (!hasRoot) {
        throw new Error('Formato inválido: nó root (level 0) não encontrado');
      }

      // Validar estrutura básica dos nós
      for (const node of parsedResult.nodes) {
        if (!node.id || !node.text || typeof node.level !== 'number') {
          throw new Error(`Nó inválido encontrado: ${JSON.stringify(node)}`);
        }
      }

      // Atualizar result com a versão sanitizada
      result = sanitizedResult;
      
    } catch (parseError) {
      console.error('Erro ao validar JSON da IA:', parseError);
      console.error('Resposta original recebida:', completion.choices[0].message.content);
      console.error('Resposta após sanitização:', result);
      return NextResponse.json({ 
        error: 'Resposta da IA não está em formato válido. Tente novamente.' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      result,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0
      }
    });

  } catch (error: any) {
    console.error('Erro na API de mapa mental:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}