import { supabase } from '@/lib/supabase';
import { SubscriptionTier } from '../types/subscription';

export class SubscriptionClientService {
  private static supabaseClient = supabase;

  /**
   * Verifica se o usuário tem permissão para criar eventos/metas (Pro/Pro+)
   */
  static async checkUserPermission(): Promise<{ hasPermission: boolean; tier?: SubscriptionTier; message?: string }> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      
      if (!user) {
        return {
          hasPermission: false,
          message: 'Usuário não autenticado'
        };
      }

      // Buscar assinatura ativa do usuário
      const { data: subscription, error } = await this.supabaseClient
        .from('user_subscriptions')
        .select('tier, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error || !subscription) {
        return {
          hasPermission: false,
          tier: 'free',
          message: 'Você precisa de um plano Pro ou Pro+ para acessar este recurso'
        };
      }

      const hasPermission = subscription.tier === 'pro' || subscription.tier === 'pro_plus';
      
      return {
        hasPermission,
        tier: subscription.tier as SubscriptionTier,
        message: hasPermission ? undefined : 'Você precisa de um plano Pro ou Pro+ para acessar este recurso'
      };
    } catch (error) {
      console.error('Erro ao verificar permissões do usuário:', error);
      return {
        hasPermission: false,
        message: 'Erro ao verificar permissões'
      };
    }
  }

  /**
   * Obtém informações da assinatura do usuário
   */
  static async getUserSubscription() {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data: subscription, error } = await this.supabaseClient
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Erro ao buscar assinatura:', error);
        return null;
      }

      return subscription;
    } catch (error) {
      console.error('Erro ao obter assinatura do usuário:', error);
      return null;
    }
  }
}