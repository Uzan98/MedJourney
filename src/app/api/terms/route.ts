import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/api-auth';
import { getActiveTerms, checkTermsAcceptance } from '@/lib/terms-service';

// GET - Obter termos de uso ativos
export async function GET(request: NextRequest) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ message: 'Build mode: no data' }, { status: 200 });
  }

  try {
    const result = await getActiveTerms();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Erro ao obter termos de uso' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao obter termos de uso:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}