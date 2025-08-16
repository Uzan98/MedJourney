import { NextRequest, NextResponse } from 'next/server';
import { getActivePrivacyPolicy } from '@/lib/privacy-policy-service';

// GET - Obter política de privacidade ativa
export async function GET(request: NextRequest) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ message: 'Build mode: no data' }, { status: 200 });
  }

  try {
    const result = await getActivePrivacyPolicy();
    
    if (result.policy) {
      return NextResponse.json({
        success: true,
        data: result.policy
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error?.message || 'Erro ao obter política de privacidade' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao obter política de privacidade:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}