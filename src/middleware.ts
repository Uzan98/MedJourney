import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateSession } from '@/utils/supabase/middleware';

// Rotas públicas que não precisam de autenticação
const publicRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password'];
const publicApiRoutes = ['/api/health', '/api/test-auth', '/api/auth-session', '/api/auth-debug'];

// Configuração para desabilitar a verificação de autenticação para fins de diagnóstico
const disableAuth = true; // Temporariamente desabilitada para diagnóstico

export async function middleware(request: NextRequest) {
  // Primeiro, atualize a sessão para garantir que os tokens estão atualizados
  const response = await updateSession(request);
  
  // Criar cliente Supabase para o middleware para verificar a sessão atual
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      },
    }
  );
  
  // Obter a sessão atual do usuário a partir dos cookies
  const { data: { session } } = await supabase.auth.getSession();
  
  // Obter informações da rota
  const path = request.nextUrl.pathname;
  const isApiRoute = path.startsWith('/api/');
  const isAuthRoute = publicRoutes.some(route => path === route);
  const isPublicApiRoute = publicApiRoutes.some(route => path === route);
  
  console.log(`Middleware: ${path} (API: ${isApiRoute}, Auth: ${isAuthRoute}, Public API: ${isPublicApiRoute})`);
  console.log(`Middleware: Cookie presente: ${!!request.headers.get('cookie')}`);
  console.log(`Middleware: Sessão autenticada: ${!!session}`);
  
  if (session) {
    console.log(`Middleware: Usuário autenticado: ${session.user.id}`);
  }
  
  // Se a verificação de autenticação estiver desabilitada, permitir todas as requisições
  if (disableAuth) {
    console.log('Middleware: Verificação de autenticação desabilitada, permitindo todas as requisições');
    return response;
  }
  
  // Sempre permitir acesso a rotas públicas
  if (isAuthRoute || isPublicApiRoute) {
    console.log('Middleware: Rota pública, permitindo acesso');
    return response;
  }
  
  // Verificar se é uma rota de API que não é pública
  if (isApiRoute && !isPublicApiRoute) {
    if (!session) {
      console.log('Middleware: API protegida, usuário não autenticado, retornando 401');
      return Response.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    console.log('Middleware: API protegida, usuário autenticado, permitindo acesso');
    return response;
  }
  
  // Verificar rotas protegidas (não-API, não-públicas)
  if (!session) {
    // Usuário não autenticado tentando acessar rota protegida, redirecionar para login
    console.log('Middleware: Rota protegida, usuário não autenticado, redirecionando para login');
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Usuário autenticado acessando rota de autenticação, redirecionar para dashboard
  if (isAuthRoute && session) {
    console.log('Middleware: Rota de autenticação, usuário já autenticado, redirecionando para dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Usuário autenticado acessando rota protegida, permitir acesso
  console.log('Middleware: Rota protegida, usuário autenticado, permitindo acesso');
  return response;
}

// Configurar quais caminhos devem ser processados pelo middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|sw.js).*)',
  ],
};