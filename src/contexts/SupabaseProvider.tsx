import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface SupabaseContext {
  supabase: SupabaseClient;
  realtimeEnabled: boolean;
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

  const value = {
    supabase,
    realtimeEnabled,
  };

  return (
    <SupabaseContextImpl.Provider value={value}>
      {children}
    </SupabaseContextImpl.Provider>
  );
}

export default SupabaseProvider; 