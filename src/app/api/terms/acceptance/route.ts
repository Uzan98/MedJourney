import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/api-auth';
import { checkTermsAcceptance, recordTermsAcceptance } from '@/lib/terms-service';

// GET - Verificar se o usuário aceitou os termos
export const GET = withApiAuth(async (request: Request, { userId, session, supabase }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    const result = await checkTermsAcceptance(userId);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        hasAccepted: result.hasAccepted,
        acceptanceDate: result.acceptanceDate
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Erro ao verificar aceitação dos termos' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao verificar aceitação dos termos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
});

// POST - Registrar aceitação dos termos
export const POST = withApiAuth(async (request: Request, { userId, session, supabase }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    const result = await recordTermsAcceptance(userId);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Aceitação dos termos registrada com sucesso'
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Erro ao registrar aceitação dos termos' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao registrar aceitação dos termos:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
});