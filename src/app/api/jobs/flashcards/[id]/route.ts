import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Interface para o job de flashcards
interface FlashcardJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_data?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Configuração do cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Variáveis de ambiente do Supabase não encontradas');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Validar token de autenticação
    let userId = '';
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Usar cliente com anon key para validar o token do usuário
      const authClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: userData, error } = await authClient.auth.getUser(token);
      
      if (error || !userData?.user) {
        console.error('Erro ao verificar token:', error);
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      }
      
      userId = userData.user.id;
    } else {
      console.error('Token de autorização não encontrado ou formato inválido');
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Cliente com service role key para operações administrativas
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Buscar o job (RLS garante que só vê seus próprios jobs)
    const { data: job, error: jobError } = await adminSupabase
      .from('flashcard_jobs')
      .select('id, status, result_data, error_message, created_at, completed_at')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (jobError || !job) {
      console.error('Job não encontrado:', jobError);
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    // Retornar status do job
    const response: FlashcardJob = {
      id: job.id,
      status: job.status,
      created_at: job.created_at,
      updated_at: job.created_at, // Usando created_at como fallback
      completed_at: job.completed_at
    };

    if (job.status === 'completed' && job.result_data) {
      // Parsear o resultado JSON se necessário
      let resultData;
      if (typeof job.result_data.result === 'string') {
        try {
          resultData = JSON.parse(job.result_data.result);
        } catch {
          resultData = job.result_data.result;
        }
      } else {
        resultData = job.result_data.result;
      }
      response.result_data = resultData;
    }

    if (job.status === 'failed' && job.error_message) {
      response.error_message = job.error_message;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Erro ao consultar job:', error);
    return NextResponse.json({ error: error.message || 'Erro desconhecido' }, { status: 500 });
  }
}