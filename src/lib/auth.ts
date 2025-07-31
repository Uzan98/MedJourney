// Tipos para autenticação
export interface User {
  Id: number;
  Name: string;
  Email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

// Função para login
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Erro ao fazer login',
      };
    }

    // Em uma aplicação real, aqui você armazenaria o token JWT em cookies ou localStorage
    // e configuraria o contexto de autenticação

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return {
      success: false,
      error: 'Erro ao se comunicar com o servidor',
    };
  }
}

// Função para registro
export async function register(data: RegisterData): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: responseData.error || 'Erro ao registrar usuário',
      };
    }

    return {
      success: true,
      user: responseData.user,
    };
  } catch (error) {
    console.error('Erro ao registrar:', error);
    return {
      success: false,
      error: 'Erro ao se comunicar com o servidor',
    };
  }
}

// Função para logout
export async function logout(): Promise<void> {
  // Esta função é mantida para compatibilidade, mas recomenda-se usar o AuthContext.signOut()
  // que implementa limpeza completa de dados
  console.warn('Função logout() depreciada. Use AuthContext.signOut() para limpeza completa.');
  
  // Limpeza básica para compatibilidade usando utilitário
  try {
    const { clearLocalStorageData } = await import('../utils/data-cleanup');
    clearLocalStorageData();
    console.log('Logout básico realizado - dados locais limpos');
  } catch (error) {
    console.error('Erro na limpeza básica de logout:', error);
    
    // Fallback: limpeza manual
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('@medjourney:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (fallbackError) {
      console.error('Erro no fallback de limpeza:', fallbackError);
    }
  }
}

// Função para verificar se o usuário está autenticado
export function isAuthenticated(): boolean {
  // Em uma aplicação real, verificar se há um token JWT válido
  // Por enquanto, sempre retornamos true para fins de desenvolvimento
  return true;
}

// Função para obter o usuário atual
export function getCurrentUser(): User | null {
  // Em uma aplicação real, decodificar o token JWT para obter as informações do usuário
  // Por enquanto, retornamos um usuário fixo para fins de desenvolvimento
  return {
    Id: 1,
    Name: 'Usuário de Teste',
    Email: 'teste@exemplo.com',
  };
}