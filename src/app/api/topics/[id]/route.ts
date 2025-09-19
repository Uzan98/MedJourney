import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const topicId = parseInt(params.id);

    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: 'ID do tópico inválido' },
        { status: 400 }
      );
    }

    const { data: topic, error } = await supabase
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
          discipline_id,
          disciplines (
            id,
            name,
            title
          )
        )
      `)
      .eq('id', topicId)
      .single();

    if (error || !topic) {
      return NextResponse.json(
        { error: 'Tópico não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(topic);
  } catch (error) {
    console.error('Erro ao buscar tópico:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const topicId = parseInt(params.id);
    const body = await request.json();
    const { name, description } = body;

    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: 'ID do tópico inválido' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o tópico existe
    const { data: existingTopic, error: checkError } = await supabase
      .from('topics')
      .select('id')
      .eq('id', topicId)
      .single();

    if (checkError || !existingTopic) {
      return NextResponse.json(
        { error: 'Tópico não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar o tópico
    const { data: topic, error: updateError } = await supabase
      .from('topics')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', topicId)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar tópico:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar tópico' },
        { status: 500 }
      );
    }

    return NextResponse.json(topic);
  } catch (error) {
    console.error('Erro na API de tópicos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const topicId = parseInt(params.id);

    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: 'ID do tópico inválido' },
        { status: 400 }
      );
    }

    // Verificar se o tópico existe
    const { data: existingTopic, error: checkError } = await supabase
      .from('topics')
      .select('id, name')
      .eq('id', topicId)
      .single();

    if (checkError || !existingTopic) {
      return NextResponse.json(
        { error: 'Tópico não encontrado' },
        { status: 404 }
      );
    }

    // Excluir o tópico
    const { error: deleteError } = await supabase
      .from('topics')
      .delete()
      .eq('id', topicId);

    if (deleteError) {
      console.error('Erro ao excluir tópico:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao excluir tópico' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Tópico excluído com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro na API de tópicos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}