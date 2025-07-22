'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from './SupabaseProvider';
import { SubscriptionTier, UserSubscriptionLimits } from '../types/subscription';
import { Session, User } from '@supabase/supabase-js';

interface SubscriptionContextType {
  isLoading: boolean;
  subscriptionLimits: UserSubscriptionLimits | null;
  checkFeatureAccess: (featureKey: string) => boolean;
  hasReachedLimit: (featureKey: string) => boolean;
  refreshLimits: () => Promise<void>;
  isProOrHigher: () => boolean;
  isProPlusOrHigher: () => boolean;
  showUpgradeModal: (requiredTier?: SubscriptionTier, limitReached?: string) => void;
  session: Session | null;
  user: User | null;
}

const defaultSubscriptionLimits: UserSubscriptionLimits = {
  tier: SubscriptionTier.FREE,
  disciplinesUsed: 0,
  disciplinesLimit: 5,
  flashcardDecksUsed: 0,
  flashcardDecksLimit: 2,
  questionsUsedToday: 0,
  questionsLimitPerDay: 20,
  hasAiPlanningAccess: false,
  hasCommunityAccess: true,
  hasFacultyAccess: false,
  hasAdvancedAnalytics: false,
  hasPrioritySupport: false,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  isLoading: true,
  subscriptionLimits: defaultSubscriptionLimits,
  checkFeatureAccess: () => false,
  hasReachedLimit: () => true,
  refreshLimits: async () => {},
  isProOrHigher: () => false,
  isProPlusOrHigher: () => false,
  showUpgradeModal: () => {},
  session: null,
  user: null,
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionLimits, setSubscriptionLimits] = useState<UserSubscriptionLimits | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalInfo, setModalInfo] = useState<{ requiredTier?: SubscriptionTier; limitReached?: string }>({});
  
  const { supabase, session, user } = useSupabase();
  const router = useRouter();

  // Fetch subscription limits when the user session changes
  useEffect(() => {
    const fetchSubscriptionLimits = async () => {
      if (!session?.user) {
        setSubscriptionLimits(defaultSubscriptionLimits);
        setIsLoading(false);
        return;
      }

      try {
        // First try to use the Edge Function
        try {
          const { data: functionData, error: functionError } = await supabase.functions.invoke('get-subscription-limits', {
          body: { userId: session.user.id },
        });

          console.log('Edge function response:', functionData, functionError);

          if (!functionError && functionData) {
            setSubscriptionLimits(functionData);
            setIsLoading(false);
            return;
          }
        } catch (functionCallError) {
          console.error('Edge function error:', functionCallError);
        }

        // If Edge Function fails or doesn't exist, use direct database queries
        // Get user subscription
        const { data: userSubscription } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans:plan_id(*)
          `)
          .eq('user_id', session.user.id)
          .single();
        
        // Get usage data
        const { data: usageData } = await supabase
          .from('subscription_usage')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        // Count disciplines
        const { count: disciplinesCount } = await supabase
          .from('disciplines')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
        
        // Count flashcard decks
        const { count: flashcardDecksCount } = await supabase
          .from('flashcard_decks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
        
        // If no subscription found, use FREE tier defaults
        if (!userSubscription) {
          const limits = {
            ...defaultSubscriptionLimits,
            disciplinesUsed: disciplinesCount || 0,
            flashcardDecksUsed: flashcardDecksCount || 0,
          };
          setSubscriptionLimits(limits);
        } else {
          // Extract features from the plan
          const plan = userSubscription.subscription_plans;
          const features = plan?.features || {};
          
          const limits: UserSubscriptionLimits = {
            tier: (userSubscription.tier as SubscriptionTier) || SubscriptionTier.FREE,
            disciplinesUsed: disciplinesCount || 0,
            disciplinesLimit: features.maxDisciplines || 5,
            flashcardDecksUsed: flashcardDecksCount || 0,
            flashcardDecksLimit: features.maxFlashcardDecks || 2,
            questionsUsedToday: usageData?.questions_used_today || 0,
            questionsLimitPerDay: features.maxQuestionsPerDay || 20,
            hasAiPlanningAccess: features.aiPlanningAccess || false,
            hasCommunityAccess: features.communityFeaturesAccess || true,
            hasFacultyAccess: features.facultyFeaturesAccess || false,
            hasAdvancedAnalytics: features.advancedAnalytics || false,
            hasPrioritySupport: features.prioritySupport || false,
          };
          
          setSubscriptionLimits(limits);
        }
      } catch (error) {
        console.error('Error fetching subscription limits:', error);
        setSubscriptionLimits(defaultSubscriptionLimits);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionLimits();
  }, [session, supabase]);

  // Check if the user has access to a specific feature
  const checkFeatureAccess = (featureKey: string): boolean => {
    if (!subscriptionLimits) return false;

    switch (featureKey) {
      case 'ai_planning':
        return subscriptionLimits.hasAiPlanningAccess;
      case 'community_features':
        return subscriptionLimits.hasCommunityAccess;
      case 'faculty_features':
        return subscriptionLimits.hasFacultyAccess;
      case 'advanced_analytics':
        return subscriptionLimits.hasAdvancedAnalytics;
      case 'priority_support':
        return subscriptionLimits.hasPrioritySupport;
      default:
        return false;
    }
  };

  // Check if the user has reached their limit for a specific feature
  const hasReachedLimit = (featureKey: string): boolean => {
    if (!subscriptionLimits) return true;

    switch (featureKey) {
      case 'disciplines':
        return subscriptionLimits.disciplinesLimit !== -1 && 
               subscriptionLimits.disciplinesUsed >= subscriptionLimits.disciplinesLimit;
      case 'flashcard_decks':
        return subscriptionLimits.flashcardDecksLimit !== -1 && 
               subscriptionLimits.flashcardDecksUsed >= subscriptionLimits.flashcardDecksLimit;
      case 'questions_per_day':
        return subscriptionLimits.questionsLimitPerDay !== -1 && 
               subscriptionLimits.questionsUsedToday >= subscriptionLimits.questionsLimitPerDay;
      default:
        return false;
    }
  };

  // Refresh subscription limits
  const refreshLimits = async (): Promise<void> => {
    if (!session?.user) return;

    setIsLoading(true);
    try {
      // First try to use the Edge Function
      try {
        const { data: functionData, error: functionError } = await supabase.functions.invoke('get-subscription-limits', {
        body: { userId: session.user.id },
      });

        console.log('Edge function response:', functionData, functionError);

        if (!functionError && functionData) {
          setSubscriptionLimits(functionData);
          setIsLoading(false);
          return;
        }
      } catch (functionCallError) {
        console.error('Edge function error:', functionCallError);
      }

      // If Edge Function fails or doesn't exist, use direct database queries (same as above)
      // Get user subscription
      const { data: userSubscription } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans:plan_id(*)
        `)
        .eq('user_id', session.user.id)
        .single();
      
      // Get usage data
      const { data: usageData } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      // Count disciplines
      const { count: disciplinesCount } = await supabase
        .from('disciplines')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      
      // Count flashcard decks
      const { count: flashcardDecksCount } = await supabase
        .from('flashcard_decks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      
      // If no subscription found, use FREE tier defaults
      if (!userSubscription) {
        const limits = {
          ...defaultSubscriptionLimits,
          disciplinesUsed: disciplinesCount || 0,
          flashcardDecksUsed: flashcardDecksCount || 0,
        };
        setSubscriptionLimits(limits);
      } else {
        // Extract features from the plan
        const plan = userSubscription.subscription_plans;
        const features = plan?.features || {};
        
        const limits: UserSubscriptionLimits = {
          tier: (userSubscription.tier as SubscriptionTier) || SubscriptionTier.FREE,
          disciplinesUsed: disciplinesCount || 0,
          disciplinesLimit: features.maxDisciplines || 5,
          flashcardDecksUsed: flashcardDecksCount || 0,
          flashcardDecksLimit: features.maxFlashcardDecks || 2,
          questionsUsedToday: usageData?.questions_used_today || 0,
          questionsLimitPerDay: features.maxQuestionsPerDay || 20,
          hasAiPlanningAccess: features.aiPlanningAccess || false,
          hasCommunityAccess: features.communityFeaturesAccess || true,
          hasFacultyAccess: features.facultyFeaturesAccess || false,
          hasAdvancedAnalytics: features.advancedAnalytics || false,
          hasPrioritySupport: features.prioritySupport || false,
        };
        
        setSubscriptionLimits(limits);
      }
    } catch (error) {
      console.error('Error refreshing subscription limits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if the user has Pro tier or higher
  const isProOrHigher = (): boolean => {
    if (!subscriptionLimits) return false;
    return [SubscriptionTier.PRO, SubscriptionTier.PRO_PLUS].includes(subscriptionLimits.tier);
  };

  // Check if the user has Pro+ tier
  const isProPlusOrHigher = (): boolean => {
    if (!subscriptionLimits) return false;
    return subscriptionLimits.tier === SubscriptionTier.PRO_PLUS;
  };

  // Show upgrade modal
  const showUpgradeModal = (requiredTier?: SubscriptionTier, limitReached?: string) => {
    setModalInfo({ requiredTier, limitReached });
    setShowModal(true);
  };

  // Handle upgrade button click
  const handleUpgrade = () => {
    setShowModal(false);
    router.push('/perfil/assinatura');
  };

  return (
    <SubscriptionContext.Provider
      value={{
        isLoading,
        subscriptionLimits: subscriptionLimits || defaultSubscriptionLimits,
        checkFeatureAccess,
        hasReachedLimit,
        refreshLimits,
        isProOrHigher,
        isProPlusOrHigher,
        showUpgradeModal,
        session,
        user,
      }}
    >
      {children}
      
      {/* Upgrade Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Atualize seu plano</h2>
            
            {modalInfo.requiredTier && (
              <p className="mb-4">
                Esta funcionalidade está disponível apenas para assinantes do plano{' '}
                <span className="font-bold">
                  {modalInfo.requiredTier === SubscriptionTier.PRO ? 'Pro' : 'Pro+'}
                </span>.
              </p>
            )}
            
            {modalInfo.limitReached && (
              <p className="mb-4">
                Você atingiu o limite de{' '}
                {modalInfo.limitReached === 'disciplines'
                  ? 'disciplinas'
                  : modalInfo.limitReached === 'flashcard_decks'
                  ? 'baralhos de flashcards'
                  : 'questões diárias'}{' '}
                do seu plano atual.
              </p>
            )}
            
            <p className="mb-6">
              Atualize agora para desbloquear mais recursos e aumentar seus limites!
            </p>
            
            <div className="flex justify-end space-x-4">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
                onClick={handleUpgrade}
              >
                Ver planos
              </button>
            </div>
          </div>
        </div>
      )}
    </SubscriptionContext.Provider>
  );
}; 