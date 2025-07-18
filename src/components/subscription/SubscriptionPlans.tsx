'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { SubscriptionTier, SubscriptionPeriod } from '../../types/subscription';
import { DbSubscriptionPlan } from '../../types/database-subscription';
import { supabase } from '../../lib/supabase';

// Default plans to show if API call fails
const DEFAULT_PLANS: DbSubscriptionPlan[] = [
  {
    id: 'free-plan',
    name: 'Plano Gratuito',
    description: 'Ideal para começar seus estudos',
    tier: SubscriptionTier.FREE,
    period: SubscriptionPeriod.MONTHLY,
    price_cents: 0,
    stripe_price_id: '',
    features: {
      maxDisciplines: 5,
      maxFlashcardDecks: 2,
      maxQuestionsPerDay: 20,
      aiPlanningAccess: false,
      communityFeaturesAccess: true,
      facultyFeaturesAccess: false,
      advancedAnalytics: false,
      prioritySupport: false
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pro-monthly',
    name: 'Genoma Pro',
    description: 'Para estudantes que querem mais recursos',
    tier: SubscriptionTier.PRO,
    period: SubscriptionPeriod.MONTHLY,
    price_cents: 2990,
    stripe_price_id: 'price_1RNmFOPDAWBZddLbvLvvVYAA',
    features: {
      maxDisciplines: 15,
      maxFlashcardDecks: 10,
      maxQuestionsPerDay: 100,
      aiPlanningAccess: true,
      communityFeaturesAccess: true,
      facultyFeaturesAccess: true,
      advancedAnalytics: false,
      prioritySupport: false
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pro-plus-monthly',
    name: 'Genoma Pro+',
    description: 'Acesso ilimitado a todos os recursos',
    tier: SubscriptionTier.PRO_PLUS,
    period: SubscriptionPeriod.MONTHLY,
    price_cents: 4490,
    stripe_price_id: 'price_1RNmFOPDAWBZddLbXYzxYZAB',
    features: {
      maxDisciplines: -1,
      maxFlashcardDecks: -1,
      maxQuestionsPerDay: -1,
      aiPlanningAccess: true,
      communityFeaturesAccess: true,
      facultyFeaturesAccess: true,
      advancedAnalytics: true,
      prioritySupport: true
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pro-annual',
    name: 'Genoma Pro',
    description: 'Para estudantes que querem mais recursos',
    tier: SubscriptionTier.PRO,
    period: SubscriptionPeriod.ANNUAL,
    price_cents: 28752, // 2990 * 12 * 0.8 (20% discount)
    stripe_price_id: 'price_1RNmFOPDAWBZddLbKLmnOPQR',
    features: {
      maxDisciplines: 15,
      maxFlashcardDecks: 10,
      maxQuestionsPerDay: 100,
      aiPlanningAccess: true,
      communityFeaturesAccess: true,
      facultyFeaturesAccess: true,
      advancedAnalytics: false,
      prioritySupport: false
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pro-plus-annual',
    name: 'Genoma Pro+',
    description: 'Acesso ilimitado a todos os recursos',
    tier: SubscriptionTier.PRO_PLUS,
    period: SubscriptionPeriod.ANNUAL,
    price_cents: 43104, // 4490 * 12 * 0.8 (20% discount)
    stripe_price_id: 'price_1RNmFOPDAWBZddLbSTUVWXYZ',
    features: {
      maxDisciplines: -1,
      maxFlashcardDecks: -1,
      maxQuestionsPerDay: -1,
      aiPlanningAccess: true,
      communityFeaturesAccess: true,
      facultyFeaturesAccess: true,
      advancedAnalytics: true,
      prioritySupport: true
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

/**
 * Component to display subscription plans
 */
export const SubscriptionPlans: React.FC = () => {
  const [plans, setPlans] = useState<DbSubscriptionPlan[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<SubscriptionPeriod>(SubscriptionPeriod.MONTHLY);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiError, setApiError] = useState(false);
  const { subscriptionLimits, session, user } = useSubscription();
  const router = useRouter();

  // Log para depuração
  useEffect(() => {
    console.log('SubscriptionPlans: Sessão atual:', session);
    console.log('SubscriptionPlans: Usuário atual:', user);
  }, [session, user]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        console.log('SubscriptionPlans: Buscando planos...');
        
        // Verificar se temos uma sessão válida
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        // Adicionar token de autorização se disponível
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          console.log('SubscriptionPlans: Enviando token de autorização:', session.access_token.substring(0, 20) + '...');
        } else {
          console.log('SubscriptionPlans: Sem token de autorização disponível');
        }
        
        const response = await fetch('/api/subscription/plans', {
          headers,
          credentials: 'include'
        });
        
        console.log('SubscriptionPlans: Status da resposta:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch plans: ${response.status}`);
        }
        const data = await response.json();
        console.log('SubscriptionPlans: Planos recebidos:', data);
        
        // If no plans returned, use defaults
        if (!data || data.length === 0) {
          console.log('No plans returned from API, using defaults');
          setPlans(DEFAULT_PLANS);
          setApiError(true);
        } else {
          setPlans(data);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        setPlans(DEFAULT_PLANS);
        setApiError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, [session]);

  const handleSubscribe = async (planId: string) => {
    setIsProcessing(true);
    try {
      // If we're using default plans because API failed, show a message
      if (apiError) {
        alert('Sistema de assinaturas em manutenção. Por favor, tente novamente mais tarde.');
        setIsProcessing(false);
        return;
      }
      
      console.log('SubscriptionPlans: Iniciando assinatura para o plano:', planId);
      
      // Verificar autenticação antes de prosseguir
      console.log('SubscriptionPlans: Estado da sessão no momento do clique:', session);
      console.log('SubscriptionPlans: Estado do usuário no momento do clique:', user);
      
      // Verificar autenticação no Supabase diretamente
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('SubscriptionPlans: Sessão atual do Supabase:', currentSession);
      
      if (!session || !user) {
        console.error('SubscriptionPlans: Usuário não autenticado!');
        alert('Você precisa estar logado para assinar um plano.');
        setIsProcessing(false);
        return;
      }
      
      // Obter token de acesso para autenticação
      const accessToken = session.access_token;
      
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ planId }),
        credentials: 'include', // Importante: incluir cookies na requisição
      });

      console.log('SubscriptionPlans: Status da resposta de assinatura:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('SubscriptionPlans: Erro na resposta:', errorData);
        throw new Error(`Failed to create checkout session: ${response.status}`);
      }

      const { url } = await response.json();
      console.log('SubscriptionPlans: URL de checkout recebida:', url);
      
      // Redirect to the checkout page
      if (url) {
        router.push(url);
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Erro ao processar assinatura. Por favor, tente novamente mais tarde.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/subscription', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      const { success } = await response.json();
      
      if (success) {
        alert('Assinatura cancelada com sucesso!');
        // Refresh the page to update subscription status
        router.refresh();
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Erro ao cancelar assinatura. Por favor, tente novamente mais tarde.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPlans = plans.filter(plan => plan.period === selectedPeriod);

  const getPlanFeatures = (tier: SubscriptionTier) => {
    switch (tier) {
      case SubscriptionTier.FREE:
        return [
          { name: 'Até 5 disciplinas', included: true },
          { name: 'Até 2 baralhos de flashcards', included: true },
          { name: 'Até 20 questões por dia', included: true },
          { name: 'Recursos da comunidade', included: true },
          { name: 'Planejamento Inteligente com IA', included: false },
          { name: 'Recursos da faculdade', included: false },
          { name: 'Análises avançadas', included: false },
          { name: 'Suporte prioritário', included: false },
        ];
      case SubscriptionTier.PRO:
        return [
          { name: 'Até 15 disciplinas', included: true },
          { name: 'Até 10 baralhos de flashcards', included: true },
          { name: 'Até 100 questões por dia', included: true },
          { name: 'Recursos da comunidade', included: true },
          { name: 'Planejamento Inteligente com IA', included: true },
          { name: 'Recursos da faculdade', included: true },
          { name: 'Análises avançadas', included: false },
          { name: 'Suporte prioritário', included: false },
        ];
      case SubscriptionTier.PRO_PLUS:
        return [
          { name: 'Disciplinas ilimitadas', included: true },
          { name: 'Baralhos de flashcards ilimitados', included: true },
          { name: 'Questões ilimitadas por dia', included: true },
          { name: 'Recursos da comunidade', included: true },
          { name: 'Planejamento Inteligente com IA', included: true },
          { name: 'Recursos da faculdade', included: true },
          { name: 'Análises avançadas', included: true },
          { name: 'Suporte prioritário', included: true },
        ];
      default:
        return [];
    }
  };

  const formatPrice = (priceCents: number) => {
    const price = priceCents / 100;
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-center text-gray-500">Carregando planos...</p>
      </div>
    );
  }

  const currentTier = subscriptionLimits?.tier || SubscriptionTier.FREE;

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border ${
                selectedPeriod === SubscriptionPeriod.MONTHLY
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-l-lg`}
              onClick={() => setSelectedPeriod(SubscriptionPeriod.MONTHLY)}
            >
              Mensal
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border ${
                selectedPeriod === SubscriptionPeriod.ANNUAL
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-r-lg`}
              onClick={() => setSelectedPeriod(SubscriptionPeriod.ANNUAL)}
            >
              Anual <span className="text-xs font-bold text-green-500">Economize 20%</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => {
          const tierEnum = plan.tier as SubscriptionTier;
          const features = getPlanFeatures(tierEnum);
          const isCurrentPlan = tierEnum === currentTier;
          
          return (
            <div 
              key={plan.id}
              className={`border rounded-lg overflow-hidden ${
                tierEnum === SubscriptionTier.PRO_PLUS
                  ? 'border-purple-400 shadow-lg'
                  : 'border-gray-200'
              }`}
            >
              <div className={`p-6 ${
                tierEnum === SubscriptionTier.FREE
                  ? 'bg-gray-50'
                  : tierEnum === SubscriptionTier.PRO
                  ? 'bg-blue-50'
                  : 'bg-purple-50'
              }`}>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{formatPrice(plan.price_cents)}</span>
                  {plan.period === SubscriptionPeriod.MONTHLY ? (
                    <span className="text-gray-500 ml-1">/mês</span>
                  ) : (
                    <span className="text-gray-500 ml-1">/ano</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
              </div>
              
              <div className="p-6">
                <ul className="space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <span className={`flex-shrink-0 ${feature.included ? 'text-green-500' : 'text-gray-400'}`}>
                        {feature.included ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      <span className="ml-2 text-sm text-gray-600">{feature.name}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-6">
                  {isCurrentPlan ? (
                    <div>
                      <button
                        className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-md font-medium"
                        disabled
                      >
                        Plano atual
                      </button>
                      {tierEnum !== SubscriptionTier.FREE && (
                        <button
                          className="w-full mt-2 px-4 py-2 border border-red-500 text-red-500 rounded-md font-medium hover:bg-red-50"
                          onClick={handleCancelSubscription}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Processando...' : 'Cancelar assinatura'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      className={`w-full px-4 py-2 rounded-md font-medium ${
                        tierEnum === SubscriptionTier.FREE
                          ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          : tierEnum === SubscriptionTier.PRO
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isProcessing || (tierEnum === SubscriptionTier.FREE)}
                    >
                      {isProcessing ? 'Processando...' : tierEnum === SubscriptionTier.FREE ? 'Plano atual' : 'Assinar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {apiError && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 text-sm">
            Aviso: O sistema de assinaturas está em manutenção. Os planos exibidos são apenas para visualização.
          </p>
        </div>
      )}
    </div>
  );
}; 