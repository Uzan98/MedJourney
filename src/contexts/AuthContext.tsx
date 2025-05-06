"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

// Tipo para o contexto de autenticação
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    success: boolean;
  }>;
  signUp: (email: string, password: string, name: string) => Promise<{
    error: Error | null;
    success: boolean;
  }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
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

  // Calcular se está autenticado
  const isAuthenticated = !!user;

  // Função para atualizar o estado de sessão
  const refreshSession = async () => {
    try {
      setIsLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Erro ao atualizar sessão:', error);
      } else if (session) {
        setSession(session);
        setUser(session.user);
      } else {
        setSession(null);
        setUser(null);
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

    // Assinar para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('AuthContext: Evento de autenticação:', event, 'User ID:', session?.user?.id);
        
        setSession(session);
        setUser(session?.user || null);
        setIsLoading(false);
        
        // Log detalhado do evento
        if (event === 'SIGNED_IN') {
          console.log('AuthContext: Usuário logado com sucesso. Email:', session?.user?.email);
          toast.success('Login realizado com sucesso!');
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthContext: Usuário deslogado com sucesso');
          toast.success('Logout realizado com sucesso!');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('AuthContext: Token de autenticação atualizado');
        }
      }
    );

    // Desinscrever ao desmontar
    return () => {
      console.log('AuthContext: Cleanup - Removendo subscription de auth');
      subscription.unsubscribe();
    };
  }, []);

  // Login com email e senha
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Erro no login:', error.message);
        return {
          success: false,
          error: error,
        };
      }
      
      // Atualizar sessão imediatamente após login
      await refreshSession();
      
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

  // Registrar novo usuário
  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        console.error('Erro no cadastro:', error.message);
        return {
          success: false,
          error: error,
        };
      }

      // Quando o usuário se registra automaticamente 
      // o Supabase envia um email de confirmação
      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Erro desconhecido ao cadastrar'),
      };
    }
  };

  // Logout
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Session será atualizado pelo evento onAuthStateChange
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Valor do contexto
  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    isAuthenticated,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 