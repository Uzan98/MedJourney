import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, subject_id, discipline_id } = body;

    // Validação básica
    if (!name || !subject_id) {
      return NextResponse.json(
        { error: 'Nome e ID do assunto são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se o assunto existe e pertence à disciplina
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, discipline_id')
      .eq('id', subject_id)
      .single();

    if (subjectError || !subject) {
      return NextResponse.json(
        { error: 'Assunto não encontrado' },
        { status: 404 }
      );
    }

    if (discipline_id && subject.discipline_id !== discipline_id) {
      return NextResponse.json(
        { error: 'Assunto não pertence à disciplina especificada' },
        { status: 400 }
      );
    }

    // Criar o tópico
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        subject_id: subject_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (topicError) {
      console.error('Erro ao criar tópico:', topicError);
      return NextResponse.json(
        { error: 'Erro ao criar tópico' },
        { status: 500 }
      );
    }

    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    console.error('Erro na API de tópicos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subject_id');
    const disciplineId = searchParams.get('discipline_id');

    let query = supabase
      .from('topics')
      .select(`
        id,
        name,
        description,
        subject_id,
        created_at,
        updated_at,
        subjects (
          id,
          name,
          title,
          discipline_id
        )
      `)
      .order('name');

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    if (disciplineId) {
      query = query.eq('subjects.discipline_id', disciplineId);
    }

    const { data: topics, error } = await query;

    if (error) {
      console.error('Erro ao buscar tópicos:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar tópicos' },
        { status: 500 }
      );
    }

    return NextResponse.json(topics || []);
  } catch (error) {
    console.error('Erro na API de tópicos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}