import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/api-auth';
import { checkPrivacyAcceptance, recordPrivacyAcceptance } from '@/lib/privacy-policy-service';

// GET - Verificar se o usuário aceitou a política de privacidade
export const GET = withApiAuth(async (request: Request, { userId, session, supabase }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    const result = await checkPrivacyAcceptance(userId);
    
    if (!result.error) {
      return NextResponse.json({
        success: true,
        accepted: result.accepted
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error.message || 'Erro ao verificar aceitação da política de privacidade' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao verificar aceitação da política de privacidade:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
});

// POST - Registrar aceitação da política de privacidade
export const POST = withApiAuth(async (request: Request, { userId, session, supabase }) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }

  try {
    const result = await recordPrivacyAcceptance(userId);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Aceitação da política de privacidade registrada com sucesso'
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error?.message || 'Erro ao registrar aceitação da política de privacidade' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao registrar aceitação da política de privacidade:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
});