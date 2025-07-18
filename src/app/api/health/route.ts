import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Health check endpoint to verify API is working
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}

/**
 * HEAD /api/health
 * Health check endpoint for monitoring services
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
} 