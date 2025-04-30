import { NextResponse } from 'next/server';

/**
 * Endpoint de verificação de integridade (health check) da API
 * Usado para verificar se o servidor está online/disponível
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
}

export async function HEAD() {
  return new Response(null, { 
    status: 200, 
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
} 