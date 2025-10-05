import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Verificar variáveis de ambiente críticas
    const envCheck = {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'NOT_SET',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT_SET',
      GROQ_API_KEY: process.env.GROQ_API_KEY ? 'SET' : 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      VERCEL_ENV: process.env.VERCEL_ENV || 'NOT_SET'
    };

    // Testar conexão com Supabase
    let supabaseTest = 'FAILED';
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      
      if (supabaseUrl && supabaseServiceRoleKey) {
        const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        const { data, error } = await adminSupabase
          .from('flashcard_jobs')
          .select('count')
          .limit(1);
        
        supabaseTest = error ? `ERROR: ${error.message}` : 'SUCCESS';
      } else {
        supabaseTest = 'MISSING_CREDENTIALS';
      }
    } catch (error: any) {
      supabaseTest = `EXCEPTION: ${error.message}`;
    }

    // Testar se consegue fazer fetch para o worker
    let workerTest = 'FAILED';
    try {
      const workerUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/workers/flashcards`;
      
      // Fazer um teste de conectividade (sem autenticação, só para ver se a URL responde)
      const testResponse = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true })
      });
      
      workerTest = `STATUS: ${testResponse.status}`;
    } catch (error: any) {
      workerTest = `FETCH_ERROR: ${error.message}`;
    }

    // Verificar jobs recentes
    let recentJobsTest = 'FAILED';
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      
      if (supabaseUrl && supabaseServiceRoleKey) {
        const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        const { data: jobs, error } = await adminSupabase
          .from('flashcard_jobs')
          .select('id, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) {
          recentJobsTest = `ERROR: ${error.message}`;
        } else {
          recentJobsTest = `FOUND ${jobs?.length || 0} recent jobs`;
        }
      }
    } catch (error: any) {
      recentJobsTest = `EXCEPTION: ${error.message}`;
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        variables: envCheck,
        supabase_connection: supabaseTest,
        worker_connectivity: workerTest,
        recent_jobs: recentJobsTest
      },
      debug_info: {
        user_agent: request.headers.get('user-agent'),
        host: request.headers.get('host'),
        x_forwarded_for: request.headers.get('x-forwarded-for'),
        x_real_ip: request.headers.get('x-real-ip')
      }
    });

  } catch (error: any) {
    console.error('Erro no debug endpoint:', error);
    return NextResponse.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}