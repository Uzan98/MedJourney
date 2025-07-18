/**
 * Database types for subscription tables in Supabase
 */

import { SubscriptionPeriod, SubscriptionStatus, SubscriptionTier } from './subscription';

// Database representation of subscription plans
export interface DbSubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  tier: SubscriptionTier;
  period: SubscriptionPeriod;
  price_cents: number;
  stripe_price_id: string;
  features: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Database representation of user subscriptions
export interface DbUserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

// Database representation of subscription usage
export interface DbSubscriptionUsage {
  id: string;
  user_id: string;
  subscription_id: string;
  disciplines_count: number;
  flashcard_decks_count: number;
  questions_used_today: number;
  last_usage_date: string;
  created_at: string;
  updated_at: string;
}

// Database representation of subscription transactions
export interface DbSubscriptionTransaction {
  id: string;
  user_id: string;
  subscription_id: string;
  amount_cents: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  payment_method: string | null;
  created_at: string;
}

// Database representation of subscription feature access
export interface DbSubscriptionFeatureAccess {
  id: string;
  subscription_tier: SubscriptionTier;
  feature_key: string;
  has_access: boolean;
  max_usage: number | null; // null means unlimited
  created_at: string;
  updated_at: string;
} 