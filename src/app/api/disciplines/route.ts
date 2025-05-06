import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../../lib/db';
import { withApiAuth } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';

// Interface para os resultados de consulta do adaptador de BD
interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
}

// Interface para disciplina com nomes em minúsculos
interface Discipline {
  id: number;
  name: string;
  description: string;
  theme?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// GET - Listar todas as disciplinas
export const GET = withApiAuth(async (request: NextRequest, { userId, supabase: authSupabase }) => {
  try {
    console.log('API disciplines: Usuário autenticado:', userId);
    
    // Obter parâmetros da requisição
    const { searchParams } = new URL(request.url);
    const onlyUser = searchParams.get('onlyUser') === 'true';
    
    console.log('API disciplines: Parâmetros:', { onlyUser });
    
    // Em modo de desenvolvimento, verificar se está usando o bypass
    const isDev = process.env.NODE_ENV === 'development';
    const isDevBypass = userId === 'dev-user-123456789';
    
    // Se estiver em modo de desenvolvimento com bypass, usar configuração especial
    let userIdToUse = userId;
    
    // Cliente Supabase a ser utilizado - com autenticação ou padrão
    const supabaseClient = authSupabase || supabase;
    
    if (isDev && isDevBypass) {
      console.log('API disciplines: Modo de desenvolvimento - exibindo todas as disciplinas');
      // Em desenvolvimento, não filtrar por usuário
      
      const { data: disciplines, error } = await supabaseClient
        .from('disciplines')
        .select('*')
        .order('name');
        
      if (error) {
        console.error('Erro ao listar disciplinas:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
      
      console.log(`API disciplines: Retornando ${disciplines.length} disciplinas em modo de desenvolvimento`);
      
      return NextResponse.json({
        success: true,
        disciplines,
        devMode: true
      });
    }
    
    // Usar diretamente o cliente Supabase com autenticação
    let query = supabaseClient
      .from('disciplines')
      .select('*');
    
    // Se onlyUser for true, retornar apenas disciplinas do usuário atual
    // ou disciplinas do sistema (is_system = true)
    if (onlyUser) {
      query = query.or(`user_id.eq.${userIdToUse},is_system.eq.true`);
    }
    
    // Ordenar por nome
    query = query.order('name');
    
    const { data: disciplines, error } = await query;
    
    if (error) {
      console.error('Erro ao listar disciplinas:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log(`API disciplines: Retornando ${disciplines.length} disciplinas. onlyUser=${onlyUser}`);
    
    return NextResponse.json({
      success: true,
      disciplines
    });
  } catch (error) {
    console.error('Erro ao listar disciplinas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
});

// POST - Criar nova disciplina
export const POST = withApiAuth(async (request: Request, { userId, session, supabase: authSupabase }) => {
  try {
    const { name, description, theme } = await request.json();

    // Validar dados de entrada
    if (!name) {
      return NextResponse.json(
        { error: 'Nome da disciplina é obrigatório' },
        { status: 400 }
      );
    }

    console.log('API disciplines: Criando disciplina para usuário:', userId);
    
    // Cliente Supabase a ser utilizado - com autenticação ou padrão
    const supabaseClient = authSupabase || supabase;
    
    // Verificar se o usuário existe na tabela users e criar se não existir
    console.log('API disciplines: Verificando se o usuário existe na tabela users');
    const { data: existingUser, error: userCheckError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (userCheckError) {
      console.error('API disciplines: Erro ao verificar usuário:', userCheckError);
    }
    
    if (!existingUser) {
      console.log('API disciplines: Usuário não encontrado na tabela users, criando registro');
      
      // Obter email do usuário da sessão
      const userEmail = session?.user?.email;
      const userName = userEmail ? userEmail.split('@')[0] : 'Usuário';
      
      // Inserir usuário na tabela users
      const { data: newUser, error: createUserError } = await supabaseClient
        .from('users')
        .insert([
          {
            user_id: userId,
            email: userEmail || `${userId}@example.com`,
            name: userName,
            is_active: true
          }
        ])
        .select()
        .single();
      
      if (createUserError) {
        console.error('API disciplines: Erro ao criar usuário na tabela users:', createUserError);
        console.warn('API disciplines: Continuando mesmo sem conseguir criar usuário');
      } else {
        console.log('API disciplines: Usuário criado com sucesso:', newUser);
      }
    } else {
      console.log('API disciplines: Usuário encontrado na tabela users:', existingUser);
    }

    // Verificar se já existe uma disciplina com o mesmo nome para este usuário
    const { data: existingDisciplines, error: checkError } = await supabaseClient
      .from('disciplines')
      .select('id')
      .eq('name', name)
      .eq('user_id', userId);

    if (checkError) {
      console.error('Erro ao verificar disciplina existente:', checkError);
      return NextResponse.json(
        { error: 'Erro ao verificar disciplina existente' },
        { status: 500 }
      );
    }

    if (existingDisciplines && existingDisciplines.length > 0) {
      return NextResponse.json(
        { error: 'Já existe uma disciplina com este nome' },
        { status: 409 }
      );
    }

    // Inserir nova disciplina com o ID do usuário autenticado
    const { data: newDiscipline, error: insertError } = await supabaseClient
      .from('disciplines')
      .insert([
        {
          name,
          description: description || null,
          theme: theme || null,
          user_id: userId,
          is_system: false
        }
      ])
      .select()
      .single();
    
    if (insertError) {
      console.error('Erro ao criar disciplina:', insertError);
      return NextResponse.json(
        { error: insertError.message || 'Erro ao criar disciplina', details: insertError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      discipline: newDiscipline
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar disciplina:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}); 