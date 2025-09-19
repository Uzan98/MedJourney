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
    const subjectId = parseInt(params.id);

    if (isNaN(subjectId)) {
      return NextResponse.json(
        { error: 'ID do assunto inválido' },
        { status: 400 }
      );
    }

    // Verificar se o assunto existe
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name, title')
      .eq('id', subjectId)
      .single();

    if (subjectError || !subject) {
      return NextResponse.json(
        { error: 'Assunto não encontrado' },
        { status: 404 }
      );
    }

    // Buscar tópicos do assunto
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select(`
        id,
        name,
        description,
        subject_id,
        created_at,
        updated_at
      `)
      .eq('subject_id', subjectId)
      .order('name');

    if (topicsError) {
      console.error('Erro ao buscar tópicos:', topicsError);
      return NextResponse.json(
        { error: 'Erro ao buscar tópicos' },
        { status: 500 }
      );
    }

    return NextResponse.json(topics || []);
  } catch (error) {
    console.error('Erro na API de tópicos do assunto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}