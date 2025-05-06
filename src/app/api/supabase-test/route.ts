import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Verificar se conseguimos nos conectar ao Supabase
    const { data, error } = await supabase.from('users').select('id').limit(1);
    
    if (error) {
      console.error('Erro na conexão com Supabase:', error);
      
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        config: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Não configurado',
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Conexão com Supabase estabelecida com sucesso',
      data: data,
      config: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Não configurado',
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        env: process.env.NODE_ENV
      }
    });
  } catch (error: any) {
    console.error('Erro geral na rota de teste:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro desconhecido',
      stack: error.stack,
      config: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Não configurado',
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    }, { status: 500 });
  }
} 