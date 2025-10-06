import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Armazenamento temporário do progresso (em produção, usar Redis ou banco de dados)
const progressStore = new Map<string, {
  userId: string;
  totalChunks: number;
  processedChunks: number;
  currentChunk: number;
  status: 'processing' | 'completed' | 'error';
  flashcardsGenerated: number;
  error?: string;
  timestamp: number;
}>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID é obrigatório' }, { status: 400 });
    }

    // Configuração do cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Validar token de autenticação
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error } = await authClient.auth.getUser(token);
    
    if (error || !userData?.user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const userId = userData.user.id;
    const progress = progressStore.get(sessionId);

    if (!progress) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    // Verificar se o usuário tem permissão para acessar esta sessão
    if (progress.userId !== userId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Limpar sessões antigas (mais de 1 hora)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    if (progress.timestamp < oneHourAgo) {
      progressStore.delete(sessionId);
      return NextResponse.json({ error: 'Sessão expirada' }, { status: 404 });
    }

    return NextResponse.json({
      sessionId,
      totalChunks: progress.totalChunks,
      processedChunks: progress.processedChunks,
      currentChunk: progress.currentChunk,
      status: progress.status,
      flashcardsGenerated: progress.flashcardsGenerated,
      progress: progress.totalChunks > 0 ? (progress.processedChunks / progress.totalChunks) * 100 : 0,
      error: progress.error
    });

  } catch (error: any) {
    console.error('Erro na API de progresso de flashcards:', error);
    return NextResponse.json({ error: error.message || 'Erro desconhecido' }, { status: 500 });
  }
}

// Função utilitária para atualizar o progresso (usada pela API principal)
export function updateProgress(sessionId: string, update: Partial<{
  totalChunks: number;
  processedChunks: number;
  currentChunk: number;
  status: 'processing' | 'completed' | 'error';
  flashcardsGenerated: number;
  error: string;
}>) {
  const existing = progressStore.get(sessionId);
  if (existing) {
    progressStore.set(sessionId, {
      ...existing,
      ...update,
      timestamp: Date.now()
    });
  }
}

// Função utilitária para criar uma nova sessão de progresso
export function createProgressSession(sessionId: string, userId: string, totalChunks: number) {
  progressStore.set(sessionId, {
    userId,
    totalChunks,
    processedChunks: 0,
    currentChunk: 0,
    status: 'processing',
    flashcardsGenerated: 0,
    timestamp: Date.now()
  });
}

// Função utilitária para limpar sessão
export function clearProgressSession(sessionId: string) {
  progressStore.delete(sessionId);
}