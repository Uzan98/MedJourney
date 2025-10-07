import { NextRequest, NextResponse } from 'next/server';
import { FlashcardQueueService } from '@/services/flashcard-queue.service';

export async function POST(request: NextRequest) {
  try {
    // Verificar se é uma requisição interna (pode adicionar autenticação específica aqui)
    const authHeader = request.headers.get('x-internal-key');
    const expectedKey = process.env.INTERNAL_QUEUE_KEY || 'default-internal-key';
    
    if (authHeader !== expectedKey) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    console.log('🔄 Iniciando processamento de jobs pendentes na queue PGMQ...');
    
    // Processar todos os jobs pendentes
    await FlashcardQueueService.processAllPendingJobs();
    
    return NextResponse.json({
      success: true,
      message: 'Processamento de jobs PGMQ concluído'
    });

  } catch (error: any) {
    console.error('Erro no processador de queue PGMQ:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Endpoint para processar um job específico na queue PGMQ
export async function PUT(request: NextRequest) {
  try {
    // Verificar se é uma requisição interna
    const authHeader = request.headers.get('x-internal-key');
    const expectedKey = process.env.INTERNAL_QUEUE_KEY || 'default-internal-key';
    
    if (authHeader !== expectedKey) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const { jobId } = await request.json();
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`🔄 Processando job específico na queue PGMQ: ${jobId}`);
    
    // Processar o job específico na queue PGMQ
    const success = await FlashcardQueueService.processSpecificJob(jobId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Job não encontrado na queue ou já foi processado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Job ${jobId} processado com sucesso`
    });

  } catch (error: any) {
    console.error('Erro ao processar job específico na queue PGMQ:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error.message 
      },
      { status: 500 }
    );
  }
}