import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';

// POST - Criar novo assunto
export const POST = withApiAuth(async (request: Request, { userId, session, supabase: authSupabase }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    const { 
      disciplineId, 
      title, 
      content, 
      difficulty = 'média', 
      importance = 'média', 
      estimatedHours = 2 
    } = await request.json();

    // Validar dados de entrada
    if (!disciplineId) {
      return NextResponse.json(
        { error: 'ID da disciplina é obrigatório' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Título do assunto é obrigatório' },
        { status: 400 }
      );
    }

    console.log('API subjects: Criando assunto para disciplina:', disciplineId);
    
    // Cliente Supabase a ser utilizado - com autenticação ou padrão
    const supabaseClient = authSupabase || supabase;

    // Verificar se a disciplina existe e pertence ao usuário
    const { data: discipline, error: disciplineError } = await supabaseClient
      .from('disciplines')
      .select('id, name')
      .eq('id', disciplineId)
      .eq('user_id', userId)
      .single();

    if (disciplineError) {
      console.error('Erro ao verificar disciplina:', disciplineError);
      return NextResponse.json(
        { error: 'Disciplina não encontrada ou sem permissão de acesso' },
        { status: 404 }
      );
    }

    // Inserir novo assunto
    const { data: newSubject, error: insertError } = await supabaseClient
      .from('subjects')
      .insert([
        {
          discipline_id: disciplineId,
          user_id: userId,
          title,
          content: content || null,
          name: title,
          difficulty,
          importance,
          estimated_hours: estimatedHours,
          status: 'pending'
        }
      ])
      .select()
      .single();
    
    if (insertError) {
      console.error('Erro ao criar assunto:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Erro ao criar assunto' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subject: newSubject
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar assunto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
});

// GET - Listar assuntos de uma disciplina
export const GET = withApiAuth(async (request: NextRequest, { userId, supabase: authSupabase }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    // Obter parâmetros da requisição
    const { searchParams } = new URL(request.url);
    const disciplineId = searchParams.get('disciplineId');
    
    if (!disciplineId) {
      return NextResponse.json(
        { error: 'ID da disciplina é obrigatório' },
        { status: 400 }
      );
    }
    
    console.log('API subjects: Buscando assuntos para disciplina:', disciplineId);
    
    // Cliente Supabase a ser utilizado - com autenticação ou padrão
    const supabaseClient = authSupabase || supabase;
    
    // Buscar assuntos da disciplina que pertencem ao usuário
    const { data: subjects, error } = await supabaseClient
      .from('subjects')
      .select('*')
      .eq('discipline_id', disciplineId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao listar assuntos:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      subjects
    });
  } catch (error) {
    console.error('Erro ao listar assuntos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}); 