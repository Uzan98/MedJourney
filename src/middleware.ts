import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateSession } from '@/utils/supabase/middleware';

// Rotas públicas que não precisam de autenticação
const publicRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password'];
const publicApiRoutes = ['/api/health', '/api/test-auth', '/api/auth-session', '/api/auth-debug'];

// Middleware completamente desabilitado - usando autenticação baseada em tokens nas APIs
export async function middleware(request: NextRequest) {
  // Simplesmente permitir todas as requisições passarem
  // A autenticação agora é feita individualmente em cada API usando tokens Bearer
  console.log(`Middleware: Permitindo acesso a ${request.nextUrl.pathname} (middleware desabilitado)`);
  return NextResponse.next();
}

// Configurar quais caminhos devem ser processados pelo middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|sw.js).*)',
  ],
};