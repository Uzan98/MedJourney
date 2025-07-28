import { supabase } from '../lib/supabase';

/**
 * Inicializa o registro de subscription_usage para o usuário atual
 * Esta função deve ser chamada quando o usuário encontra erro 406 ao tentar adicionar questões
 */
export async function initializeSubscriptionUsage(): Promise<{ success: boolean; message: string }> {
  try {
    // Obter o token de autenticação atual
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return {
        success: false,
        message: 'Usuário não autenticado'
      };
    }

    // Chamar o endpoint para inicializar subscription_usage
    const response = await fetch('/api/subscription/initialize-usage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro ao inicializar subscription_usage:', data);
      return {
        success: false,
        message: data.error || 'Erro ao inicializar registro de uso'
      };
    }

    console.log('Subscription usage inicializado:', data);
    return {
      success: true,
      message: 'Registro de uso inicializado com sucesso'
    };

  } catch (error) {
    console.error('Erro na função initializeSubscriptionUsage:', error);
    return {
      success: false,
      message: 'Erro interno ao inicializar registro de uso'
    };
  }
}

/**
 * Verifica se o usuário tem registro de subscription_usage
 * Retorna true se existe, false caso contrário
 */
export async function checkSubscriptionUsageExists(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('subscription_usage')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.log('Usuário não tem registro de subscription_usage:', error.message);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Erro ao verificar subscription_usage:', error);
    return false;
  }
}