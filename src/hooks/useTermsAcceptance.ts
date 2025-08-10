import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { recordTermsAcceptance } from '@/lib/terms-service';

/**
 * Hook para registrar automaticamente a aceitação dos termos
 * quando um usuário se autentica via OAuth (Google)
 */
export function useTermsAcceptance(termsAccepted: boolean) {
  const { user, session } = useAuth();

  useEffect(() => {
    const registerTermsForOAuthUser = async () => {
      // Só registrar se:
      // 1. Usuário está autenticado
      // 2. Termos foram aceitos
      // 3. É uma sessão nova (evitar registros duplicados)
      if (user && termsAccepted && session) {
        try {
          const result = await recordTermsAcceptance(user.id);
          
          if (result.success) {
            console.log('Aceitação dos termos registrada para usuário OAuth:', user.id);
          } else {
            console.warn('Erro ao registrar aceitação dos termos para usuário OAuth:', result.error);
          }
        } catch (error) {
          console.error('Erro inesperado ao registrar termos para usuário OAuth:', error);
        }
      }
    };

    registerTermsForOAuthUser();
  }, [user, termsAccepted, session]);
}