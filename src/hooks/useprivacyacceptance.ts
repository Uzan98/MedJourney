import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { recordPrivacyAcceptance, checkPrivacyAcceptance } from '@/lib/privacy-policy-service';
import { privacyPolicy } from '@/data/privacy-policy';

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
          // Verificar se o usuário já aceitou a política atual
          const checkResult = await checkPrivacyAcceptance(user.id, privacyPolicy.version);
          
          if (checkResult.error) {
            console.warn('Erro ao verificar aceitação da política de privacidade:', checkResult.error);
            return;
          }
          
          // Se já aceitou, não registrar novamente
          if (checkResult.accepted) {
            console.log('Usuário já aceitou a política de privacidade atual:', user.id);
            return;
          }
          
          // Registrar a aceitação
          const result = await recordPrivacyAcceptance(user.id, privacyPolicy.version);
          
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