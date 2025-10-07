import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { FlashcardQueueService } from '@/services/flashcard-queue.service';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!
});

async function generateFlashcardsSync(prompt: string, numberOfCards: number, difficulty: string): Promise<any[]> {
  const systemPrompt = `Você é um gerador de flashcards concisos em pt-BR.
Crie exatamente ${numberOfCards} flashcards com base no conteúdo fornecido.
Nível de dificuldade: ${difficulty}.

REQUISITOS DE IDIOMA:
- Responda EXCLUSIVAMENTE em Português Brasileiro (pt-BR).
- Utilize vocabulário, ortografia e exemplos do Brasil.
- Se o conteúdo de entrada estiver em outro idioma, traduza fielmente para pt-BR.
- Evite termos em inglês; mantenha siglas e nomes próprios quando necessário.

REGRAS DE FORMATAÇÃO DO VERSO:
- Verso deve ter 2–4 bullets curtos (6–12 palavras cada).
- Limite o verso a, no máximo, 240 caracteres totais.
- Nunca use tabelas, HTML, cabeçalhos, emojis ou parágrafos longos.
- Use formatação simples: cada bullet inicia com "- " e separação por quebra de linha.
- Concentre nos pontos essenciais e no que mais cai em prova; evite redundâncias.
- Se houver listas longas no material, sintetize apenas os critérios-chave.

FORMATO DE SAÍDA:
- Retorne APENAS um array JSON válido com objetos no formato:
  [{"front": "pergunta clara em pt-BR", "back": "bullets curtos em pt-BR"}]
- No campo "back", retorne bullets simples separados por \n, cada um iniciando com "- ".
- Não inclua explicações adicionais, apenas o JSON.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    model: 'openai/gpt-oss-120b',
    temperature: 0.7,
    max_tokens: 10000
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Resposta vazia da API Groq');
  }

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Formato de resposta inválido da API Groq');
  }

  const flashcards = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(flashcards) || flashcards.length === 0) {
    throw new Error('Nenhum flashcard válido foi gerado');
  }
  return flashcards;
}

function chunkText(text: string, targetChunks: number): string[] {
  const MAX_CHUNK_SIZE = 4000;
  if (text.length <= MAX_CHUNK_SIZE) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + MAX_CHUNK_SIZE, text.length);
    chunks.push(text.slice(i, end));
    i = end;
  }
  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Criar cliente Supabase com o token do usuário
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    // Verificar token e obter usuário
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Obter dados da requisição
    const { prompt, type = 'text', source, deckName = 'Deck Gerado por IA', numberOfCards = 10, difficulty = 'medium', cover_color } = await request.json();

    if (!prompt || String(prompt).trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt é obrigatório' },
        { status: 400 }
      );
    }

    if (!numberOfCards || Number(numberOfCards) <= 0) {
      return NextResponse.json(
        { error: 'Número de cards deve ser maior que 0' },
        { status: 400 }
      );
    }

    console.log(`Gerando flashcards de forma síncrona para usuário ${user.id}, tipo: ${type}`);
    console.log(`Tamanho do prompt: ${String(prompt).length} caracteres`);

    // Chunking simples para textos longos
    const textChunks = chunkText(String(prompt), Math.ceil(String(prompt).length / 4000));
    const totalChunks = textChunks.length;
    const cardsPerChunk = Math.max(1, Math.floor(Number(numberOfCards) / totalChunks));
    const flashcardsAll: any[] = [];

    for (let idx = 0; idx < totalChunks; idx++) {
      const remaining = Number(numberOfCards) - flashcardsAll.length;
      const thisChunkCards = idx === totalChunks - 1 ? remaining : Math.min(cardsPerChunk, remaining);
      if (thisChunkCards <= 0) break;
      const generated = await generateFlashcardsSync(textChunks[idx], thisChunkCards, String(difficulty));
      flashcardsAll.push(...generated);
    }

    // Trunca ao número solicitado
    const flashcardsResponse = flashcardsAll.slice(0, Number(numberOfCards));
    if (!flashcardsResponse || flashcardsResponse.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum flashcard foi gerado' },
        { status: 400 }
      );
    }

    // Cria o deck com o usuário autenticado
    const { data: deckData, error: deckError } = await supabaseClient
      .from('flashcard_decks')
      .insert({
        name: String(deckName),
        user_id: user.id,
        description: `Deck gerado automaticamente - ${String(type)}`,
        cover_color: cover_color || null
      })
      .select('id')
      .single();

    if (deckError) {
      return NextResponse.json(
        { error: `Erro ao criar deck: ${deckError.message}` },
        { status: 500 }
      );
    }

    const deckId = deckData.id;

    // Salva os flashcards
    const flashcardsToInsert = flashcardsResponse.map((card: any) => ({
      deck_id: deckId,
      user_id: user.id,
      front: card.front || card.pergunta,
      back: card.back || card.resposta,
      difficulty: String(difficulty),
      created_at: new Date().toISOString()
    }));

    const { error: flashcardsError } = await supabaseClient
      .from('flashcards')
      .insert(flashcardsToInsert);

    if (flashcardsError) {
      return NextResponse.json(
        { error: `Erro ao salvar flashcards: ${flashcardsError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isAsync: false,
      flashcards: flashcardsResponse,
      totalGenerated: flashcardsResponse.length,
      deckName: String(deckName),
      description: `Deck gerado automaticamente - ${String(type)}`,
      deckId
    });

  } catch (error: any) {
    console.error('Erro na API de flashcards:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Nova rota GET para verificar status do job
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Criar cliente Supabase com o token do usuário
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    // Verificar token e obter usuário
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Obter jobId da URL
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`Verificando status do job ${jobId} para usuário ${user.id}`);

    // Verificar status do job usando o cliente autenticado
    const jobStatus = await FlashcardQueueService.getJobStatus(supabaseClient, jobId);

    if (!jobStatus) {
      return NextResponse.json(
        { error: 'Job não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o job pertence ao usuário
    if (jobStatus.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

  // Retornar status do job
  return NextResponse.json({
    success: true,
    jobId,
    status: jobStatus.status,
    result_data: jobStatus.result_data,
    error_message: jobStatus.error_message,
    created_at: jobStatus.created_at,
    updated_at: jobStatus.updated_at,
    completed_at: jobStatus.completed_at
  });

  } catch (error: any) {
    console.error('Erro ao verificar status do job:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error.message 
      },
      { status: 500 }
    );
  }
}