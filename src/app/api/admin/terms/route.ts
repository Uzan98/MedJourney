import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/api-auth';
import { updateTermsInDatabase } from '@/lib/terms-service';

// POST - Criar nova versão dos termos de uso (apenas administradores)
export const POST = withApiAuth(async (request: Request, { userId, session, supabase }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    // Verificar se o usuário é administrador
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Acesso negado. Apenas administradores podem criar novos termos.' 
        },
        { status: 403 }
      );
    }

    // Obter dados do corpo da requisição
    const body = await request.json();
    const { version, title, content, effective_date } = body;

    // Validar dados obrigatórios
    if (!version || !title || !content) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Versão, título e conteúdo são obrigatórios' 
        },
        { status: 400 }
      );
    }

    // Criar nova versão dos termos
    const result = await updateTermsInDatabase({
      version,
      title,
      content,
      effective_date: effective_date || new Date().toISOString()
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Nova versão dos termos criada com sucesso',
        data: result.data
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Erro ao criar nova versão dos termos' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao criar nova versão dos termos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
});

// GET - Listar todas as versões dos termos (apenas administradores)
export const GET = withApiAuth(async (request: Request, { userId, session, supabase }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    // Verificar se o usuário é administrador
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Acesso negado. Apenas administradores podem visualizar todas as versões.' 
        },
        { status: 403 }
      );
    }

    // Obter todas as versões dos termos
    const { data: terms, error: termsError } = await supabase
      .from('terms_of_service')
      .select('*')
      .order('created_at', { ascending: false });

    if (termsError) {
      console.error('Erro ao obter versões dos termos:', termsError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erro ao obter versões dos termos' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: terms
    });
  } catch (error) {
    console.error('Erro ao listar versões dos termos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
});