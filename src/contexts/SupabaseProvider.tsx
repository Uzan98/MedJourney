'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseClient, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface SupabaseContext {
  supabase: SupabaseClient;
  realtimeEnabled: boolean;
  session: Session | null;
  user: User | null;
}

const SupabaseContextImpl = createContext<SupabaseContext | undefined>(undefined);

export function useSupabase() {
  const context = useContext(SupabaseContextImpl);
  if (context === undefined) {
    throw new Error('useSupabase deve ser usado dentro de um SupabaseProvider');
  }
  return context;
}

interface SupabaseProviderProps {
  children: React.ReactNode;
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const [realtimeEnabled, setRealtimeEnabled] = useState<boolean>(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Verifica se o Realtime está habilitado
  useEffect(() => {
    const checkRealtimeStatus = async () => {
      try {
        // Tenta obter a lista de canais disponíveis como forma de testar o Realtime
        await supabase.channel('test').subscribe();
        setRealtimeEnabled(true);
      } catch (error) {
        console.error('Erro ao verificar status do Realtime:', error);
        setRealtimeEnabled(false);
      }
    };

    checkRealtimeStatus();
  }, []);

  // Inicializa e atualiza a sessão
  useEffect(() => {
    // Buscar a sessão inicial
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user || null);
      } catch (error) {
        console.error('Erro ao buscar sessão inicial:', error);
      }
    };

    getInitialSession();

    // Configurar listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    supabase,
    realtimeEnabled,
    session,
    user,
  };

  return (
    <SupabaseContextImpl.Provider value={value}>
      {children}
    </SupabaseContextImpl.Provider>
  );
}

export default SupabaseProvider; 
