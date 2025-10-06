import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';

// Configurar Supabase Admin
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configurar Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!
});

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de acesso necessário' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const userId = user.id;
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 });
    }

    // Gerar ID único para a sessão
    const sessionId = randomUUID();

    console.log(`Processando conteúdo (${prompt.length} caracteres)...`);
    
    // Se o texto for muito grande, vamos truncar para evitar problemas
    const MAX_CONTENT_SIZE = 80000; // 80k caracteres
    let processedPrompt = prompt;
    
    if (prompt.length > MAX_CONTENT_SIZE) {
      console.log(`Texto muito grande (${prompt.length} chars), truncando para ${MAX_CONTENT_SIZE} chars`);
      processedPrompt = prompt.substring(0, MAX_CONTENT_SIZE) + "\n\n[CONTEÚDO TRUNCADO - FOQUE NOS CONCEITOS PRINCIPAIS APRESENTADOS]";
    }

    const systemPrompt = `Você é um especialista brasileiro em educação e criação de flashcards educacionais com vasta experiência em pedagogia e técnicas de memorização. Sua missão é criar flashcards EDUCATIVOS, CLAROS, PRECISOS e PEDAGOGICAMENTE EFICAZES em PORTUGUÊS BRASILEIRO.

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

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON válido):
{
  "deckName": "Nome do Deck",
  "description": "Descrição breve do conteúdo",
  "flashcards": [
    {
      "front": "Pergunta clara e direta",
      "back": "Resposta completa e precisa",
      "hint": "Dica opcional para memorização",
      "tags": ["tag1", "tag2"],
      "difficulty": "easy|medium|hard"
    }
  ]
}

REGRAS IMPORTANTES:
- Crie entre 8-15 flashcards por sessão
- Use APENAS português brasileiro
- Mantenha perguntas concisas (máx. 100 caracteres)
- Respostas devem ser informativas mas não extensas (máx. 300 caracteres)
- Tags devem ser relevantes e específicas
- Dificuldade deve refletir a complexidade do conceito
- SEMPRE retorne JSON válido
- NÃO inclua texto adicional fora do JSON`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 minutos timeout

    try {
      console.log('Enviando requisição para Groq...');
      
      const completion = await groq.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: systemPrompt
          },
          { role: 'user', content: processedPrompt }
        ],
        model: 'openai/gpt-oss-120b',
        max_completion_tokens: 10000,
        temperature: 0.3,
        top_p: 0.9
      }, { signal: controller.signal });

      clearTimeout(timeout);
      
      const rawResponse = completion.choices[0]?.message?.content || '';
      console.log('=== RESPOSTA BRUTA ===');
      console.log(rawResponse.substring(0, 500) + '...');
      console.log('=== FIM DO CONTEÚDO BRUTO ===');

      // Tentar extrair flashcards usando múltiplas estratégias
      let extractedFlashcards: any[] = [];
      
      try {
        // Estratégia 1: JSON parsing direto
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const parsed = JSON.parse(jsonStr);
          if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
            extractedFlashcards = parsed.flashcards;
            console.log(`✅ JSON parsing bem-sucedido, encontrados ${extractedFlashcards.length} flashcards`);
          }
        }
      } catch (jsonError) {
        console.log('❌ Falha no JSON parsing, tentando extração por regex...');
        
        // Estratégia 2: Extração por regex
        const flashcardPattern = /"front":\s*"([^"]+)"[\s\S]*?"back":\s*"([^"]+)"(?:[\s\S]*?"hint":\s*"([^"]*)")?(?:[\s\S]*?"tags":\s*\[([^\]]*)\])?(?:[\s\S]*?"difficulty":\s*"([^"]*)")?/g;
        let match;
        
        while ((match = flashcardPattern.exec(rawResponse)) !== null) {
          const [, front, back, hint, tagsStr, difficulty] = match;
          
          let tags: string[] = [];
          if (tagsStr) {
            tags = tagsStr.split(',').map(tag => tag.replace(/"/g, '').trim()).filter(tag => tag.length > 0);
          }
          
          extractedFlashcards.push({
            front: front.trim(),
            back: back.trim(),
            hint: hint?.trim() || '',
            tags: tags.length > 0 ? tags : ['geral'],
            difficulty: difficulty?.trim() || 'medium'
          });
        }
        
        if (extractedFlashcards.length > 0) {
          console.log(`✅ Extração por regex bem-sucedida, encontrados ${extractedFlashcards.length} flashcards`);
        } else {
          // Estratégia 3: Extração por blocos de texto
          const lines = rawResponse.split('\n');
          let currentFlashcard: any = {};
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (trimmedLine.includes('front') || trimmedLine.includes('Pergunta') || trimmedLine.includes('Front')) {
              if (currentFlashcard.front && currentFlashcard.back) {
                extractedFlashcards.push({
                  ...currentFlashcard,
                  tags: currentFlashcard.tags || ['geral'],
                  difficulty: currentFlashcard.difficulty || 'medium'
                });
              }
              currentFlashcard = { front: trimmedLine.replace(/.*?[:"]/, '').replace(/[",].*/, '').trim() };
            } else if (trimmedLine.includes('back') || trimmedLine.includes('Resposta') || trimmedLine.includes('Back')) {
              currentFlashcard.back = trimmedLine.replace(/.*?[:"]/, '').replace(/[",].*/, '').trim();
            } else if (trimmedLine.includes('hint') || trimmedLine.includes('Dica')) {
              currentFlashcard.hint = trimmedLine.replace(/.*?[:"]/, '').replace(/[",].*/, '').trim();
            } else if (trimmedLine.includes('tags') || trimmedLine.includes('Tags')) {
              const tagsMatch = trimmedLine.match(/\[(.*?)\]/);
              if (tagsMatch) {
                currentFlashcard.tags = tagsMatch[1].split(',').map(tag => tag.replace(/"/g, '').trim());
              }
            }
          }
          
          // Adicionar o último flashcard se válido
          if (currentFlashcard.front && currentFlashcard.back) {
            extractedFlashcards.push({
              ...currentFlashcard,
              tags: currentFlashcard.tags || ['geral'],
              difficulty: currentFlashcard.difficulty || 'medium'
            });
          }
          
          if (extractedFlashcards.length > 0) {
            console.log(`✅ Extração por blocos bem-sucedida, encontrados ${extractedFlashcards.length} flashcards`);
          }
        }
      }

      // Validar e filtrar flashcards
      const validFlashcards = extractedFlashcards.filter(card => 
        card.front && 
        card.back && 
        card.front.trim().length > 0 && 
        card.back.trim().length > 0 &&
        card.front.trim().length < 500 &&
        card.back.trim().length < 1000
      );

      if (validFlashcards.length === 0) {
        console.warn('Nenhum flashcard válido extraído');
        return NextResponse.json({ 
          error: 'Não foi possível extrair flashcards válidos do conteúdo fornecido' 
        }, { status: 400 });
      }

      // Primeiro, criar um deck para os flashcards
      const deckName = `Flashcards Gerados - ${new Date().toLocaleDateString('pt-BR')}`;
      const deckDescription = `Deck gerado automaticamente a partir do conteúdo fornecido`;
      
      const { data: deckData, error: deckError } = await adminSupabase
        .from('flashcard_decks')
        .insert({
          id: sessionId,
          user_id: userId,
          name: deckName,
          description: deckDescription,
          cover_color: '#6366f1',
          is_public: false,
          tags: ['IA', 'Gerado automaticamente']
        })
        .select()
        .single();

      if (deckError) {
        console.error('Erro ao criar deck:', deckError);
        return NextResponse.json({ 
          error: 'Erro ao criar deck para os flashcards' 
        }, { status: 500 });
      }

      // Agora salvar os flashcards no deck criado
      const flashcardsToSave = validFlashcards.map(flashcard => ({
        user_id: userId,
        deck_id: sessionId,
        front: flashcard.front,
        back: flashcard.back,
        hint: flashcard.hint || null,
        tags: flashcard.tags || ['geral'],
        difficulty: flashcard.difficulty || 'medium'
      }));

      const { error: insertError } = await adminSupabase
        .from('flashcards')
        .insert(flashcardsToSave);

      if (insertError) {
        console.error('Erro ao salvar flashcards:', insertError);
        return NextResponse.json({ 
          error: 'Erro ao salvar flashcards no banco de dados' 
        }, { status: 500 });
      }

      console.log(`✅ ${validFlashcards.length} flashcards salvos com sucesso`);

      // Retornar resposta com os flashcards
      return NextResponse.json({
        sessionId,
        status: 'completed',
        flashcards: validFlashcards,
        totalFlashcards: validFlashcards.length,
        message: `${validFlashcards.length} flashcards gerados com sucesso!`
      });

    } catch (error: any) {
      clearTimeout(timeout);
      console.error('Erro no processamento:', error);
      
      if (error.name === 'AbortError') {
        return NextResponse.json({ 
          error: 'Timeout: O processamento demorou muito tempo' 
        }, { status: 408 });
      }
      
      return NextResponse.json({ 
        error: 'Erro interno do servidor durante o processamento' 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Erro geral na API:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}