import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/database.types';

export type ApiAuthContext = {
  userId: string;
  session: any;
  supabase: ReturnType<typeof createServerClient<Database>>;
};

type ApiHandlerWithAuth = (
  request: NextRequest | Request,
  context: ApiAuthContext
) => Promise<NextResponse | Response>;

/**
 * Wrapper para handlers de API que requerem autenticação
 * Verifica se o usuário está autenticado e passa o userId, session e cliente supabase para o handler
 */
export function withApiAuth(handler: ApiHandlerWithAuth) {
  return async (request: NextRequest | Request) => {
    try {
      // Inicializar cliente Supabase
      const cookieStore = cookies();
      
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name: string, options: any) {
              cookieStore.set({ name, value: '', ...options });
            },
          },
        }
      );

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