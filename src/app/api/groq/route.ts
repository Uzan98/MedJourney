import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt é obrigatório.' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Chave da API Groq não configurada no servidor.' }, { status: 500 });
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-r1-distill-llama-70b',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em educação médica que cria questões de alta qualidade para estudantes de medicina. Crie questões claras, precisas e educativas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      return NextResponse.json({ error: `Erro na API Groq: ${errorData}` }, { status: 500 });
    }

    const data = await groqResponse.json();
    return NextResponse.json({ result: data.choices[0].message.content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro desconhecido' }, { status: 500 });
  }
} 