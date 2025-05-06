import { NextRequest, NextResponse } from 'next/server';
import { supabase } from './supabase';
import { createRequestSupabaseClient } from './supabase-server';

// Configuração para bypass de autenticação em desenvolvimento
const DEV_MODE_BYPASS = false; // Desativado para usar autenticação real
const DEV_USER_ID = 'dev-user-123456789'; // ID de usuário de desenvolvimento

/**
 * Utilitário para verificar autenticação nas rotas de API
 * @param request Request da API
 * @returns Objeto com userId se autenticado, ou null se não autenticado
 */
export async function verifyApiAuth(request: NextRequest) {
  try {
    // Bypass para desenvolvimento, se configurado
    if (process.env.NODE_ENV === 'development' && DEV_MODE_BYPASS) {
      console.log('API Auth: Modo de desenvolvimento com bypass ativado');
      return { 
        userId: DEV_USER_ID, 
        isAuthenticated: true,
        session: { user: { id: DEV_USER_ID, email: 'dev@example.com' } },
        hasCookie: true,
        devMode: true
      };
    }

    // Verificar cookies da requisição
    const cookieHeader = request.headers.get('cookie');
    const hasSbCookie = cookieHeader?.includes('sb-');
    
    console.log('API Auth: Verificando autenticação');
    console.log('API Auth: Cookies presentes:', !!cookieHeader);
    console.log('API Auth: Cookie de autenticação Supabase:', hasSbCookie);
    
    // Criar um cliente Supabase que utilize os cookies da requisição
    const supabaseWithAuth = createRequestSupabaseClient(request);
    
    // Verificar sessão no Supabase usando o cliente com cookies do request
    const { data: { session }, error } = await supabaseWithAuth.auth.getSession();
    
    if (error) {
      console.error('API Auth: Erro ao verificar sessão:', error.message);
      return { 
        userId: null, 
        isAuthenticated: false, 
        error: error.message,
        hasCookie: hasSbCookie 
      };
    }
    
    const userId = session?.user?.id;
    console.log('API Auth: Sessão encontrada:', !!session);
    console.log('API Auth: UserId recuperado:', userId || 'nenhum');
    
    return { 
      userId, 
      isAuthenticated: !!userId,
      session,
      hasCookie: hasSbCookie,
      supabaseClient: supabaseWithAuth // Incluir o cliente autenticado para uso nos handlers
    };
  } catch (error: any) {
    console.error('API Auth: Erro crítico:', error);
    return { 
      userId: null, 
      isAuthenticated: false, 
      error: error.message || 'Erro desconhecido' 
    };
  }
}

/**
 * Wrapper para proteger rotas de API que requerem autenticação
 * @param handler Função handler da API
 * @returns Handler protegido que verifica autenticação
 */
export function withApiAuth(
  handler: (
    request: NextRequest, 
    auth: { userId: string, session: any, supabase?: any }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    // Verificar autenticação
    const { userId, isAuthenticated, error, session, supabaseClient } = await verifyApiAuth(request);
    
    // Se não estiver autenticado, retornar erro 401
    if (!isAuthenticated) {
      return NextResponse.json(
        { 
          error: 'Não autorizado. Faça login para acessar este recurso.',
          details: error
        }, 
        { status: 401 }
      );
    }
    
    // Se estiver autenticado, prosseguir com o handler original
    // O userId é garantido não-nulo aqui por causa da verificação acima
    return handler(request, { 
      userId: userId!, 
      session,
      supabase: supabaseClient // Passar o cliente autenticado para o handler
    });
  };
} 