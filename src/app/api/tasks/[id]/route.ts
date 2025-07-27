import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';

// GET - Obter uma tarefa específica
export const GET = withApiAuth(async (request: Request, { userId, session, supabase: authSupabase, params }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    const taskId = params?.id;
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'ID da tarefa não fornecido' },
        { status: 400 }
      );
    }

    // Cliente Supabase a ser utilizado - com autenticação ou padrão
    const supabaseClient = authSupabase || supabase;
    
    // Buscar a tarefa específica
    const { data, error } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Tarefa não encontrada' },
          { status: 404 }
        );
      }
      
      console.error('Erro ao buscar tarefa:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar tarefa' },
        { status: 500 }
      );
    }
    
    // Formatar a data para o cliente
    const formattedTask = {
      ...data,
      dueDate: data.due_date ? new Date(data.due_date) : null
    };
    
    return NextResponse.json(formattedTask);
  } catch (error) {
    console.error('Erro ao processar requisição de tarefa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
});

// PATCH - Atualizar uma tarefa específica
export const PATCH = withApiAuth(async (request: Request, { userId, session, supabase: authSupabase, params }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    const taskId = params?.id;
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'ID da tarefa não fornecido' },
        { status: 400 }
      );
    }

    const { 
      title, 
      description, 
      status, 
      priority,
      dueDate,
      discipline,
      checklist
    } = await request.json();

    // Cliente Supabase a ser utilizado - com autenticação ou padrão
    const supabaseClient = authSupabase || supabase;

    // Verificar se a tarefa existe e pertence ao usuário
    const { data: existingTask, error: checkError } = await supabaseClient
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingTask) {
      return NextResponse.json(
        { error: 'Tarefa não encontrada ou não pertence ao usuário' },
        { status: 404 }
      );
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (discipline !== undefined) updateData.discipline = discipline;
    if (checklist !== undefined) updateData.checklist = checklist;

    // Atualizar a tarefa
    const { data, error } = await supabaseClient
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar tarefa:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar tarefa' },
        { status: 500 }
      );
    }

    // Formatar a data para o cliente
    const formattedTask = {
      ...data,
      dueDate: data.due_date ? new Date(data.due_date) : null
    };

    return NextResponse.json(formattedTask);
  } catch (error) {
    console.error('Erro ao processar requisição de atualização de tarefa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
});

// DELETE - Excluir uma tarefa específica
export const DELETE = withApiAuth(async (request: Request, { userId, session, supabase: authSupabase, params }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    const taskId = params?.id;
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'ID da tarefa não fornecido' },
        { status: 400 }
      );
    }

    // Cliente Supabase a ser utilizado - com autenticação ou padrão
    const supabaseClient = authSupabase || supabase;

    // Verificar se a tarefa existe e pertence ao usuário
    const { data: existingTask, error: checkError } = await supabaseClient
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingTask) {
      return NextResponse.json(
        { error: 'Tarefa não encontrada ou não pertence ao usuário' },
        { status: 404 }
      );
    }

    // Excluir a tarefa
    const { error } = await supabaseClient
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Erro ao excluir tarefa:', error);
      return NextResponse.json(
        { error: 'Erro ao excluir tarefa' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao processar requisição de exclusão de tarefa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
});