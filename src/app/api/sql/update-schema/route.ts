import { NextRequest, NextResponse } from 'next/server';
import { alterStudyPlansTable } from '../alter-study-plans';

/**
 * Endpoint para executar atualizações no esquema do banco de dados
 * Este endpoint deve ser protegido em produção
 */
export async function POST(request: NextRequest) {
  try {
    // Em um ambiente de produção, deve-se adicionar autenticação e autorização aqui
    // Por exemplo, verificando um token de API ou um cabeçalho especial
    const authHeader = request.headers.get('x-api-key');
    if (!authHeader || authHeader !== process.env.DB_UPDATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 401 }
      );
    }
    
    // Obter parâmetros da requisição
    const { action } = await request.json();
    
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Ação não especificada' },
        { status: 400 }
      );
    }
    
    // Executar a ação solicitada
    if (action === 'add-metadata-column') {
      const result = await alterStudyPlansTable();
      return NextResponse.json(result);
    }
    
    // Se a ação não for reconhecida
    return NextResponse.json(
      { success: false, error: 'Ação não reconhecida' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erro ao executar atualização do esquema:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 