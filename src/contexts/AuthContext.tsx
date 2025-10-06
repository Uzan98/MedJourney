"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { AuthRestService } from '@/lib/auth-rest';
import { toast } from 'react-hot-toast';
import { performCompleteDataCleanup, forceCleanRedirect } from '@/utils/data-cleanup';
import { supabase } from '@/lib/supabase';

// Tipo para o contexto de autenticação
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    success: boolean;
  }>;
  signInWithGoogle: () => Promise<{
    error: Error | null;
    success: boolean;
  }>;
  signUp: (email: string, password: string, name: string, additionalData?: Record<string, any>) => Promise<{
    error: Error | null;
    success: boolean;
  }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  isAdmin: boolean;
  checkAdminStatus: () => Promise<boolean>;
};

// Criar o contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personalizado para usar o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

// Provider do contexto
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  // Ref para rastrear se o usuário já estava autenticado
  const wasAuthenticated = useRef(false);
  // Ref para rastrear se a página está visível
  const isPageVisibleRef = useRef(true);
  // Ref para rastrear se o login já foi anunciado
  const loginAnnouncedRef = useRef(false);

  // Calcular se está autenticado
  const isAuthenticated = !!user;

  // Atualizar o ref quando o estado de autenticação mudar
  useEffect(() => {
    wasAuthenticated.current = isAuthenticated;
    
    // Se o usuário está autenticado e ainda não anunciamos o login
    if (isAuthenticated && !loginAnnouncedRef.current && isPageVisibleRef.current) {
      loginAnnouncedRef.current = true;
    }
  }, [isAuthenticated]);

  // Monitorar visibilidade da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = document.visibilityState === 'visible';
      console.log(`AuthContext: Visibilidade alterada: ${isPageVisibleRef.current ? 'visível' : 'oculta'}`);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Função para verificar se o usuário é administrador
  const checkAdminStatus = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const adminStatus = await AuthRestService.checkAdminStatus(user.id);
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (error) {
      console.error('Erro ao verificar status de administrador:', error);
      setIsAdmin(false);
      return false;
    }
  };

  // Função para atualizar o estado de sessão
  const refreshSession = async () => {
    try {
      setIsLoading(true);
      const { user: sessionUser, session, error } = await AuthRestService.getSession();
      
      if (error) {
        console.error('Erro ao atualizar sessão:', error);
      } else if (session && sessionUser) {
        setSession(session);
        setUser(sessionUser);
        // Verificar status de administrador quando a sessão é atualizada
        await checkAdminStatus();
      } else {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        // Resetar o estado de anúncio de login
        loginAnnouncedRef.current = false;
      }
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Verificar se há uma sessão ativa
    console.log('AuthContext: Verificando sessão ativa no mount');
    refreshSession();

    // Verificar sessão periodicamente (a cada 5 minutos)
    const sessionCheckInterval = setInterval(() => {
      console.log('AuthContext: Verificação periódica de sessão');
      refreshSession();
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, []);

  // Login com email e senha
  const signIn = async (email: string, password: string) => {
    try {
      const { user, session, error } = await AuthRestService.signIn(email, password);
      
      if (error) {
        console.error('Erro no login:', error.message);
        return {
          success: false,
          error: error,
        };
      }
      
      // Atualizar estado imediatamente após login
      if (user && session) {
        setUser(user);
        setSession(session);
        await checkAdminStatus();
        
        // Mostrar toast de sucesso
        if (isPageVisibleRef.current && !loginAnnouncedRef.current) {
          toast.success('Login realizado com sucesso!');
          loginAnnouncedRef.current = true;
        }
      }
      
      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Erro desconhecido ao fazer login'),
      };
    }
  };

  // Login com Google
  const signInWithGoogle = async () => {
    try {
      // Para OAuth, ainda precisamos usar o cliente Supabase
      // Mas vamos manter a funcionalidade mínima
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback',
        },
      });
      
      if (error) {
        console.error('Erro no login com Google:', error.message);
        return {
          success: false,
          error: error,
        };
      }
      
      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Erro desconhecido ao fazer login com Google'),
      };
    }
  };

  // Registrar novo usuário
  const signUp = async (email: string, password: string, name: string, additionalData?: Record<string, any>) => {
    try {
      const { user, session, error } = await AuthRestService.signUp(email, password, name, additionalData);
      
      if (error) {
        console.error('Erro no registro:', error.message);
        return {
          success: false,
          error: error,
        };
      }
      
      // Atualizar estado imediatamente após registro
      if (user && session) {
        setUser(user);
        setSession(session);
        await checkAdminStatus();
      }
      
      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Erro desconhecido ao registrar usuário'),
      };
    }
  };
  // Logout com limpeza completa
  const signOut = async () => {
    try {
      // 1. Fazer logout via REST API
      await AuthRestService.signOut();
      
      // 2. Resetar estados imediatamente
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      loginAnnouncedRef.current = false;
      
      // 3. Executar limpeza completa de dados
      await performCompleteDataCleanup();
      
      console.log('Logout completo: dados locais limpos');
      
      // 4. Mostrar toast de sucesso
      toast.success('Logout realizado com sucesso!');
      
      // 5. Forçar redirecionamento limpo para login
      setTimeout(() => {
        forceCleanRedirect('/auth/login');
      }, 100);
      
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      
      // Em caso de erro, ainda tentar redirecionar
      setTimeout(() => {
        forceCleanRedirect('/auth/login');
      }, 500);
    }
  };

  // Valor do contexto
  const value = {
    user,
    session,
    isLoading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    isAuthenticated,
    refreshSession,
    isAdmin,
    checkAdminStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
