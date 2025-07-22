import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Health check endpoint to verify API is working
 */
export async function GET() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return new Response(JSON.stringify({ message: 'Build mode: no data' }), { status: 200 });
  }
  const { supabase } = await import('@/lib/supabase');
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}

/**
 * HEAD /api/health
 * Health check endpoint for monitoring services
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
} 