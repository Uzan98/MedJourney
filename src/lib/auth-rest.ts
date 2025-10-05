// auth-rest.ts
// Serviço de autenticação usando apenas REST API do Supabase
import { User, Session } from '@supabase/supabase-js';

/**
 * Serviço de autenticação usando apenas REST API do Supabase
 * Evita problemas com o cliente JavaScript e loops de polling
 */
export class AuthRestService {
  private static supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  private static supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /**
   * Obtém headers básicos para requisições
   */
  private static getBaseHeaders(): Record<string, string> {
    return {
      'apikey': this.supabaseAnonKey || '',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Obtém headers com autenticação
   */
  private static getAuthHeaders(token: string): Record<string, string> {
    return {
      ...this.getBaseHeaders(),
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Faz login com email e senha
   */
  static async signIn(email: string, password: string): Promise<{
    user: User | null;
    session: Session | null;
    error: Error | null;
  }> {
    try {
      const response = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: this.getBaseHeaders(),
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          user: null,
          session: null,
          error: new Error(errorData.error_description || 'Erro no login'),
        };
      }

      const data = await response.json();
      
      // Salvar token nos cookies (simulando comportamento do cliente)
      if (typeof window !== 'undefined') {
        document.cookie = `sb-${this.supabaseUrl?.split('//')[1]?.split('.')[0]}-auth-token=${JSON.stringify(data)}; path=/; max-age=3600`;
      }

      return {
        user: data.user,
        session: data,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido'),
      };
    }
  }

  /**
   * Faz cadastro de novo usuário
   */
  static async signUp(email: string, password: string, name: string): Promise<{
    user: User | null;
    session: Session | null;
    error: Error | null;
  }> {
    try {
      const response = await fetch(`${this.supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: this.getBaseHeaders(),
        body: JSON.stringify({
          email,
          password,
          data: {
            name,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          user: null,
          session: null,
          error: new Error(errorData.error_description || 'Erro no cadastro'),
        };
      }

      const data = await response.json();
      
      // Salvar token nos cookies se o usuário foi criado e confirmado
      if (data.session && typeof window !== 'undefined') {
        document.cookie = `sb-${this.supabaseUrl?.split('//')[1]?.split('.')[0]}-auth-token=${JSON.stringify(data.session)}; path=/; max-age=3600`;
      }

      return {
        user: data.user,
        session: data.session,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error : new Error('Erro desconhecido'),
      };
    }
  }

  /**
   * Obtém a sessão atual dos cookies
   */
  static async getSession(): Promise<{
    user: User | null;
    session: Session | null;
    error: Error | null;
  }> {
    try {
      if (typeof window === 'undefined') {
        return { user: null, session: null, error: null };
      }

      // Tentar obter token dos cookies
      const cookies = document.cookie.split(';');
      let authToken = null;

      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name.includes('auth-token')) {
          try {
            authToken = JSON.parse(decodeURIComponent(value));
            break;
          } catch (e) {
            // Continuar procurando
          }
        }
      }

      if (!authToken || !authToken.access_token) {
        return { user: null, session: null, error: null };
      }

      // Verificar se o token ainda é válido
      const response = await fetch(`${this.supabaseUrl}/auth/v1/user`, {
        method: 'GET',
        headers: this.getAuthHeaders(authToken.access_token),
      });

      if (!response.ok) {
        // Token inválido, limpar cookies
        this.clearAuthCookies();
        return { user: null, session: null, error: null };
      }

      const user = await response.json();

      return {
        user,
        session: authToken,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error : new Error('Erro ao obter sessão'),
      };
    }
  }

  /**
   * Faz logout
   */
  static async signOut(): Promise<{ error: Error | null }> {
    try {
      // Obter token atual
      const { session } = await this.getSession();
      
      if (session?.access_token) {
        // Fazer logout no servidor
        await fetch(`${this.supabaseUrl}/auth/v1/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders(session.access_token),
        });
      }

      // Limpar cookies localmente
      this.clearAuthCookies();

      return { error: null };
    } catch (error) {
      // Mesmo com erro, limpar cookies localmente
      this.clearAuthCookies();
      return {
        error: error instanceof Error ? error : new Error('Erro no logout'),
      };
    }
  }

  /**
   * Verifica se o usuário é admin
   */
  static async checkAdminStatus(userId: string): Promise<boolean> {
    try {
      const { session } = await this.getSession();
      
      if (!session?.access_token) {
        return false;
      }

      const response = await fetch(`${this.supabaseUrl}/rest/v1/users?user_id=eq.${userId}&select=is_admin`, {
        method: 'GET',
        headers: this.getAuthHeaders(session.access_token),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data[0]?.is_admin || false;
    } catch (error) {
      console.error('Erro ao verificar status de admin:', error);
      return false;
    }
  }

  /**
   * Limpa cookies de autenticação
   */
  private static clearAuthCookies(): void {
    if (typeof window === 'undefined') return;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name] = cookie.trim().split('=');
      if (name.includes('sb-') || name.includes('auth')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    }
  }

  /**
   * Atualiza a sessão (refresh token)
   */
  static async refreshSession(): Promise<{
    user: User | null;
    session: Session | null;
    error: Error | null;
  }> {
    try {
      const { session: currentSession } = await this.getSession();
      
      if (!currentSession?.refresh_token) {
        return { user: null, session: null, error: new Error('Nenhuma sessão para atualizar') };
      }

      const response = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: this.getBaseHeaders(),
        body: JSON.stringify({
          refresh_token: currentSession.refresh_token,
        }),
      });

      if (!response.ok) {
        // Token de refresh inválido, limpar cookies
        this.clearAuthCookies();
        return { user: null, session: null, error: new Error('Sessão expirada') };
      }

      const data = await response.json();
      
      // Salvar novo token nos cookies
      if (typeof window !== 'undefined') {
        document.cookie = `sb-${this.supabaseUrl?.split('//')[1]?.split('.')[0]}-auth-token=${JSON.stringify(data)}; path=/; max-age=3600`;
      }

      return {
        user: data.user,
        session: data,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error : new Error('Erro ao atualizar sessão'),
      };
    }
  }
}