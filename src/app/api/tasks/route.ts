import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';

// GET - Obter todas as tarefas do usuário
export const GET = withApiAuth(async (request: Request, { userId, session, supabase: authSupabase }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    // Obter parâmetros da URL
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined;
    
    // Cliente Supabase a ser utilizado - com autenticação ou padrão
    const supabaseClient = authSupabase || supabase;
    
    // Construir a consulta
    let query = supabaseClient
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });
    
    // Filtrar por status se fornecido
    if (status) {
      query = query.eq('status', status);
    }
    
    // Limitar resultados se fornecido
    if (limit) {
      query = query.limit(limit);
    }
    
    // Executar a consulta
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar tarefas:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar tarefas' },
        { status: 500 }
      );
    }
    
    // Formatar as datas para o cliente
    const formattedTasks = data.map(task => ({
      ...task,
      dueDate: task.due_date ? new Date(task.due_date) : null
    }));
    
    return NextResponse.json(formattedTasks);
  } catch (error) {
    console.error('Erro ao processar requisição de tarefas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
});

// POST - Criar nova tarefa
export const POST = withApiAuth(async (request: Request, { userId, session, supabase: authSupabase }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    const { 
      title, 
      description, 
      status = 'pending', 
      priority = 'medium',
      dueDate,
      discipline,
      checklist = []
    } = await request.json();

    // Validar dados de entrada
    if (!title) {
      return NextResponse.json(
        { error: 'Título da tarefa é obrigatório' },
        { status: 400 }
      );
    }

    // Cliente Supabase a ser utilizado - com autenticação ou padrão
    const supabaseClient = authSupabase || supabase;

    // Preparar dados para inserção
    const taskData = {
      title,
      description,
      status,
      priority,
      due_date: dueDate,
      user_id: userId,
      discipline: discipline,
      checklist: checklist
    };

    // Inserir a tarefa
    const { data, error } = await supabaseClient
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar tarefa:', error);
      return NextResponse.json(
        { error: 'Erro ao criar tarefa' },
        { status: 500 }
      );
    }

    // Formatar a data para o cliente
    const formattedTask = {
      ...data,
      dueDate: data.due_date ? new Date(data.due_date) : null
    };

    return NextResponse.json(formattedTask, { status: 201 });
  } catch (error) {
    console.error('Erro ao processar requisição de criação de tarefa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
});