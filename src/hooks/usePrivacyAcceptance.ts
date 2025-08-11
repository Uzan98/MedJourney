import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { recordPrivacyAcceptance } from '@/lib/privacy-policy-service';

/**
 * Hook para registrar automaticamente a aceitação da política de privacidade
 * quando um usuário se autentica via OAuth (Google)
 */
export function usePrivacyAcceptance(privacyAccepted: boolean) {
  const { user, session } = useAuth();

  useEffect(() => {
    const registerPrivacyForOAuthUser = async () => {
      // Só registrar se:
      // 1. Usuário está autenticado
      // 2. Política foi aceita
      // 3. É uma sessão nova (evitar registros duplicados)
      if (user && privacyAccepted && session) {
        try {
          const result = await recordPrivacyAcceptance(user.id);
          
          if (result.success) {
            console.log('Aceitação da política de privacidade registrada para usuário OAuth:', user.id);
          } else {
            console.warn('Erro ao registrar aceitação da política de privacidade para usuário OAuth:', result.error);
          }
        } catch (error) {
          console.error('Erro inesperado ao registrar política de privacidade para usuário OAuth:', error);
        }
      }
    };

    registerPrivacyForOAuthUser();
  }, [user, privacyAccepted, session]);
}