import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export type ApiAuthContext = {
  userId: string;
  session: any;
  supabase: any; // Simplificando para evitar erros de tipagem
};

type ApiHandlerWithAuth = (
  request: NextRequest | Request,
  context: ApiAuthContext
) => Promise<NextResponse | Response>;

// Função para criar cliente Supabase no servidor
function createSupabaseServerClient() {
  // Usando a abordagem mais recente da documentação Supabase
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Usar o método de cookies manual para evitar erros de tipagem
      cookies: {
        get(name: string) {
          try {
            // @ts-ignore - Ignorar erro de tipagem aqui, pois já sabemos que a implementação funciona
            return cookies().get(name)?.value;
          } catch {
            return undefined;
          }
        },
        set(name: string, value: string, options: any) {
          try {
            // @ts-ignore - Ignorar erro de tipagem aqui
            cookies().set(name, value, options);
          } catch (error) {
            // Lidar com falha silenciosa
          }
        },
        remove(name: string, options: any) {
          try {
            // @ts-ignore - Ignorar erro de tipagem aqui
            cookies().delete(name, options);
          } catch (error) {
            // Lidar com falha silenciosa
          }
        },
      },
    }
  );
}

/**
 * Wrapper para handlers de API que requerem autenticação
 * Verifica se o usuário está autenticado e passa o userId, session e cliente supabase para o handler
 */
export function withApiAuth(handler: ApiHandlerWithAuth) {
  return async (request: NextRequest | Request) => {
    try {
      // Inicializar cliente Supabase
      const supabase = createSupabaseServerClient();

      // Verificar autenticação
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError);
        return NextResponse.json(
          { error: 'Erro de autenticação' },
          { status: 500 }
        );
      }
      
      if (!session) {
        return NextResponse.json(
          { error: 'Não autorizado' },
          { status: 401 }
        );
      }
      
      const userId = session.user.id;
      
      // Chamar o handler com o contexto autenticado
      return handler(request, { userId, session, supabase });
    } catch (error) {
      console.error('Erro ao processar requisição autenticada:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  };
} 