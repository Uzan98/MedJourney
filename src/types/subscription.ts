/**
 * Subscription types and interfaces for MedJourney app
 */

// Enum for subscription tiers
export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  PRO_PLUS = 'pro_plus',
}

// Subscription status
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
}

// Subscription period
export enum SubscriptionPeriod {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

// Subscription features
export interface SubscriptionFeatures {
  maxDisciplines: number;
  maxFlashcardDecks: number;
  maxQuestionsPerDay: number;
  maxSimuladosPerWeek?: number;
  maxSimuladosPerMonth?: number;
  maxExamAttemptsPerWeek?: number;
  maxExamAttemptsPerMonth?: number;
  aiPlanningAccess: boolean;
  communityFeaturesAccess: boolean;
  facultyFeaturesAccess: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
}

// Subscription plan
export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: SubscriptionTier;
  period: SubscriptionPeriod;
  price: number; // in cents
  features: SubscriptionFeatures;
  stripePriceId: string;
}

// User subscription
export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription limits for the current user
export interface UserSubscriptionLimits {
  tier: SubscriptionTier;
  disciplinesUsed: number;
  disciplinesLimit: number;
  flashcardDecksUsed: number;
  flashcardDecksLimit: number;
  questionsUsedToday: number;
  questionsLimitPerDay: number;
  hasAiPlanningAccess: boolean;
  hasCommunityAccess: boolean;
  hasFacultyAccess: boolean;
  hasAdvancedAnalytics: boolean;
  hasPrioritySupport: boolean;
  maxSubjectsPerDiscipline?: number;
  maxFlashcardsPerDeck?: number;
  maxStudySessionsPerDay?: number;
  studySessionsUsedToday?: number;
  maxSimuladosPerWeek?: number;
  simuladosUsedThisWeek?: number;
  maxSimuladosPerMonth?: number;
  simuladosUsedThisMonth?: number;
  maxExamAttemptsPerWeek?: number;
  examAttemptsUsedThisWeek?: number;
  maxExamAttemptsPerMonth?: number;
  examAttemptsUsedThisMonth?: number;
  maxQuestionsPerSimulado?: number;
  // Subscription status information
  status?: SubscriptionStatus;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
}

// Default features for each subscription tier
export const DEFAULT_SUBSCRIPTION_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  [SubscriptionTier.FREE]: {
    maxDisciplines: 5,
    maxFlashcardDecks: 2,
    maxQuestionsPerDay: 10,
    maxSimuladosPerWeek: 1,
    maxSimuladosPerMonth: 4,
    maxExamAttemptsPerWeek: 1,
    aiPlanningAccess: false,
    communityFeaturesAccess: true,
    facultyFeaturesAccess: false,
    advancedAnalytics: false,
    prioritySupport: false,
  },
  [SubscriptionTier.PRO]: {
    maxDisciplines: 15,
    maxFlashcardDecks: 10,
    maxQuestionsPerDay: 100,
    maxSimuladosPerWeek: 30,
    maxSimuladosPerMonth: 30,
    maxExamAttemptsPerWeek: 30,
    maxExamAttemptsPerMonth: 30,
    aiPlanningAccess: true,
    communityFeaturesAccess: true,
    facultyFeaturesAccess: true,
    advancedAnalytics: false,
    prioritySupport: false,
  },
  [SubscriptionTier.PRO_PLUS]: {
    maxDisciplines: -1, // unlimited
    maxFlashcardDecks: -1, // unlimited
    maxQuestionsPerDay: -1, // unlimited
    maxSimuladosPerWeek: -1, // unlimited
    maxSimuladosPerMonth: -1, // unlimited
    maxExamAttemptsPerWeek: -1, // unlimited
    maxExamAttemptsPerMonth: -1, // unlimited
    aiPlanningAccess: true,
    communityFeaturesAccess: true,
    facultyFeaturesAccess: true,
    advancedAnalytics: true,
    prioritySupport: true,
  },
};