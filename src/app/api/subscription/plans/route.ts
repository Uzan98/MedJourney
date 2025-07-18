import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createRequestSupabaseClient } from '../../../../lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

// Estas variáveis de ambiente são necessárias para criar o cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * GET /api/subscription/plans
 * Get all available subscription plans
 */
export async function GET(request: NextRequest) {
  try {
    let supabase;
    
    // Verificar o header de autorização
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Criar um cliente Supabase com o token
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    } else {
      // Fallback para o método anterior
      supabase = createRequestSupabaseClient(request);
    }
    
    // Get all subscription plans
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true });
    
    if (error) {
      console.error('Error fetching subscription plans:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 