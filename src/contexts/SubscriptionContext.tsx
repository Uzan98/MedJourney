'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from './SupabaseProvider';
import { SubscriptionTier, UserSubscriptionLimits, SubscriptionStatus } from '../types/subscription';
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
  flashcardDecksLimit: 1,
  questionsUsedToday: 0,
  questionsLimitPerDay: 10,
  hasAiPlanningAccess: false,
  hasCommunityAccess: true,
  hasFacultyAccess: true,
  hasAdvancedAnalytics: false,
  hasPrioritySupport: false,
  maxSubjectsPerDiscipline: 5,
  maxStudySessionsPerDay: 3,
  studySessionsUsedToday: 0,
  maxSimuladosPerWeek: 1,
  simuladosUsedThisWeek: 0,
  maxSimuladosPerMonth: 4,
  simuladosUsedThisMonth: 0,
  maxExamAttemptsPerWeek: 1,
  examAttemptsUsedThisWeek: 0,
  maxExamAttemptsPerMonth: 4,
  examAttemptsUsedThisMonth: 0,
  maxQuestionsPerSimulado: 30,
  maxFlashcardsPerDeck: 30,
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
        const { data: userSubscriptions } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans:plan_id(*)
          `)
          .eq('user_id', session.user.id)
          .eq('status', 'active');
        
        const userSubscription = userSubscriptions?.[0] || null;
        
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

        // Count study sessions used today
        const today = new Date().toISOString().split('T')[0];
        const { count: studySessionsToday } = await supabase
          .from('study_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .gte('created_at', today);

        // Count simulados used this week
        const firstDayOfWeek = new Date();
        const day = firstDayOfWeek.getDay();
        const diff = firstDayOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        firstDayOfWeek.setDate(diff);
        firstDayOfWeek.setHours(0, 0, 0, 0);
        
        const { count: simuladosThisWeek } = await supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .gte('created_at', firstDayOfWeek.toISOString());

        // Count simulados used this month
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        
        const { count: simuladosThisMonth } = await supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .gte('created_at', firstDayOfMonth.toISOString());
        
        // If no subscription found, use FREE tier defaults
        if (!userSubscription) {
          const limits = {
            ...defaultSubscriptionLimits,
            disciplinesUsed: disciplinesCount || 0,
            flashcardDecksUsed: flashcardDecksCount || 0,
            studySessionsUsedToday: studySessionsToday || 0,
            simuladosUsedThisWeek: simuladosThisWeek || 0,
            simuladosUsedThisMonth: simuladosThisMonth || 0,
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
            flashcardDecksLimit: features.maxFlashcardDecks || 1,
            questionsUsedToday: usageData?.questions_used_today || 0,
            questionsLimitPerDay: Number(features.maxQuestionsPerDay) || 10,
            hasAiPlanningAccess: features.aiPlanningAccess || false,
            hasCommunityAccess: features.communityFeaturesAccess || true,
            hasFacultyAccess: features.facultyFeaturesAccess || true,
            hasAdvancedAnalytics: features.advancedAnalytics || false,
            hasPrioritySupport: features.prioritySupport || false,
            maxSubjectsPerDiscipline: features.maxSubjectsPerDiscipline || 5,
            maxStudySessionsPerDay: features.maxStudySessionsPerDay || 3,
            studySessionsUsedToday: studySessionsToday || 0,
            maxSimuladosPerWeek: features.maxSimuladosPerWeek || 1,
            simuladosUsedThisWeek: simuladosThisWeek || 0,
            maxSimuladosPerMonth: features.maxSimuladosPerMonth,
            simuladosUsedThisMonth: simuladosThisMonth || 0,
            maxQuestionsPerSimulado: features.maxQuestionsPerSimulado || 30,
            maxFlashcardsPerDeck: features.maxFlashcardsPerDeck || 30,
          };
          console.log('SubscriptionContext: limits recebidos:', limits);
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
      case 'bulk_import':
        return subscriptionLimits.tier !== SubscriptionTier.FREE;
      case 'grades_attendance':
        return subscriptionLimits.tier !== SubscriptionTier.FREE;
      case 'unlimited_study_sessions':
        return subscriptionLimits.tier !== SubscriptionTier.FREE;
      case 'unlimited_disciplines':
        return subscriptionLimits.tier !== SubscriptionTier.FREE;
      case 'unlimited_subjects':
        return subscriptionLimits.tier !== SubscriptionTier.FREE;
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
      case 'study_sessions_per_day':
        return subscriptionLimits.maxStudySessionsPerDay !== undefined && 
               subscriptionLimits.maxStudySessionsPerDay !== -1 && 
               (subscriptionLimits.studySessionsUsedToday || 0) >= subscriptionLimits.maxStudySessionsPerDay;
      case 'simulados_per_week':
        return subscriptionLimits.maxSimuladosPerWeek !== undefined && 
               subscriptionLimits.maxSimuladosPerWeek !== -1 && 
               (subscriptionLimits.simuladosUsedThisWeek || 0) >= subscriptionLimits.maxSimuladosPerWeek;
      case 'simulados_per_month':
        return subscriptionLimits.maxSimuladosPerMonth !== undefined && 
               subscriptionLimits.maxSimuladosPerMonth !== -1 && 
               (subscriptionLimits.simuladosUsedThisMonth || 0) >= subscriptionLimits.maxSimuladosPerMonth;
      case 'exam_attempts_per_week':
        return subscriptionLimits.maxExamAttemptsPerWeek !== undefined && 
               subscriptionLimits.maxExamAttemptsPerWeek !== -1 && 
               (subscriptionLimits.examAttemptsUsedThisWeek || 0) >= subscriptionLimits.maxExamAttemptsPerWeek;
      case 'exam_attempts_per_month':
        return subscriptionLimits.maxExamAttemptsPerMonth !== undefined && 
               subscriptionLimits.maxExamAttemptsPerMonth !== -1 && 
               (subscriptionLimits.examAttemptsUsedThisMonth || 0) >= subscriptionLimits.maxExamAttemptsPerMonth;
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
      const { data: userSubscriptions } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans:plan_id(*)
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'active');
      
      const userSubscription = userSubscriptions?.[0] || null;
      
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

      // Count study sessions used today
      const today = new Date().toISOString().split('T')[0];
      const { count: studySessionsToday } = await supabase
        .from('study_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('created_at', today);

      // Count simulados used this week
      const firstDayOfWeek = new Date();
      const day = firstDayOfWeek.getDay();
      const diff = firstDayOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      firstDayOfWeek.setDate(diff);
      firstDayOfWeek.setHours(0, 0, 0, 0);
      
      const { count: simuladosThisWeek } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('created_at', firstDayOfWeek.toISOString());

      // Count simulados used this month
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const { count: simuladosThisMonth } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('created_at', firstDayOfMonth.toISOString());

      // Get exam attempts from subscription_usage table
      const examAttemptsThisWeek = usageData?.exam_attempts_used_this_week || 0;
      const examAttemptsThisMonth = usageData?.exam_attempts_used_this_month || 0;
      
      // Debug logs
      console.log('Debug - userSubscription:', userSubscription);
      console.log('Debug - userSubscription.status:', userSubscription?.status);
      console.log('Debug - SubscriptionStatus.CANCELED:', SubscriptionStatus.CANCELED);
      console.log('Debug - comparison result:', userSubscription?.status === SubscriptionStatus.CANCELED);
      
      // If no subscription found or subscription is canceled, use FREE tier defaults
      if (!userSubscription || userSubscription.status === SubscriptionStatus.CANCELED) {
        const limits = {
          ...defaultSubscriptionLimits,
          disciplinesUsed: disciplinesCount || 0,
          flashcardDecksUsed: flashcardDecksCount || 0,
          studySessionsUsedToday: studySessionsToday || 0,
          simuladosUsedThisWeek: simuladosThisWeek || 0,
          simuladosUsedThisMonth: simuladosThisMonth || 0,
          examAttemptsUsedThisWeek: examAttemptsThisWeek || 0,
          examAttemptsUsedThisMonth: examAttemptsThisMonth || 0,
          // Add subscription status information for canceled subscriptions
          status: userSubscription?.status as SubscriptionStatus || SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: userSubscription?.cancel_at_period_end || false,
          currentPeriodEnd: userSubscription?.current_period_end,
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
          flashcardDecksLimit: features.maxFlashcardDecks || 1,
          questionsUsedToday: usageData?.questions_used_today || 0,
          questionsLimitPerDay: Number(features.maxQuestionsPerDay) || 10,
          hasAiPlanningAccess: features.aiPlanningAccess || false,
          hasCommunityAccess: features.communityFeaturesAccess || true,
          hasFacultyAccess: features.facultyFeaturesAccess || true,
          hasAdvancedAnalytics: features.advancedAnalytics || false,
          hasPrioritySupport: features.prioritySupport || false,
          maxSubjectsPerDiscipline: features.maxSubjectsPerDiscipline || 5,
          maxStudySessionsPerDay: features.maxStudySessionsPerDay || 3,
          studySessionsUsedToday: studySessionsToday || 0,
          maxSimuladosPerWeek: features.maxSimuladosPerWeek || 1,
          simuladosUsedThisWeek: simuladosThisWeek || 0,
          maxSimuladosPerMonth: features.maxSimuladosPerMonth,
          simuladosUsedThisMonth: simuladosThisMonth || 0,
          maxExamAttemptsPerWeek: features.maxExamAttemptsPerWeek || 1,
          examAttemptsUsedThisWeek: examAttemptsThisWeek || 0,
          maxExamAttemptsPerMonth: features.maxExamAttemptsPerMonth,
          examAttemptsUsedThisMonth: examAttemptsThisMonth || 0,
          maxQuestionsPerSimulado: features.maxQuestionsPerSimulado || 30,
          maxFlashcardsPerDeck: features.maxFlashcardsPerDeck || 30,
          // Add subscription status information
          status: userSubscription.status as SubscriptionStatus,
          cancelAtPeriodEnd: userSubscription.cancel_at_period_end || false,
          currentPeriodEnd: userSubscription.current_period_end,
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
            <h3 className="text-xl font-semibold mb-4">Recurso Premium</h3>
            
            {modalInfo.limitReached && (
              <p className="mb-4 text-amber-600">
                Você atingiu o limite de {modalInfo.limitReached} do seu plano atual.
              </p>
            )}
            
            <p className="mb-6">
              {modalInfo.requiredTier === SubscriptionTier.PRO_PLUS
                ? 'Este recurso está disponível apenas para assinantes do plano Pro+.'
                : modalInfo.requiredTier === SubscriptionTier.PRO
                ? 'Este recurso está disponível apenas para assinantes dos planos Pro e Pro+.'
                : 'Faça upgrade do seu plano para acessar mais recursos e remover limites.'}
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpgrade}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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