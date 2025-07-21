import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../lib/supabase-server';
import { SubscriptionService } from '../services/subscription.service';
import { SubscriptionTier } from '../types/subscription';

/**
 * Middleware to check if a user has access to a feature based on their subscription
 * 
 * @param req - The Next.js request object
 * @param featureKey - The feature key to check access for
 * @returns NextResponse or null if the user has access
 */
export async function checkSubscriptionAccess(
  req: NextRequest,
  featureKey: string
): Promise<NextResponse | null> {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    
    const userId = session.user.id;
    
    // Check if the user has access to the feature
    const hasAccess = await SubscriptionService.hasFeatureAccess(userId, featureKey);
    
    if (!hasAccess) {
      // Redirect to upgrade page if no access
      return NextResponse.redirect(new URL('/perfil/assinatura', req.url));
    }
    
    // Check if the user has reached their limit for the feature
    const hasReachedLimit = await SubscriptionService.hasReachedFeatureLimit(userId, featureKey);
    
    if (hasReachedLimit) {
      // Redirect to upgrade page if limit reached
      return NextResponse.redirect(
        new URL(`/perfil/assinatura?limitReached=${featureKey}`, req.url)
      );
    }
    
    // User has access and hasn't reached their limit
    return null;
  } catch (error) {
    console.error('Error checking subscription access:', error);
    // In case of error, allow access to avoid blocking users
    return null;
  }
}

/**
 * Middleware to check if a user has a specific subscription tier or higher
 * 
 * @param req - The Next.js request object
 * @param minimumTier - The minimum subscription tier required
 * @returns NextResponse or null if the user has access
 */
export async function checkSubscriptionTier(
  req: NextRequest,
  minimumTier: SubscriptionTier
): Promise<NextResponse | null> {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Redirect to login if not authenticated
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    
    const userId = session.user.id;
    
    // Get the user's subscription
    const userSubscription = await SubscriptionService.getUserSubscription(userId);
    
    if (!userSubscription) {
      // Redirect to upgrade page if no subscription
      return NextResponse.redirect(new URL('/perfil/assinatura', req.url));
    }
    
    // Check if the user's subscription tier is sufficient
    const userTier = userSubscription.tier as SubscriptionTier;
    const tierValues = {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.PRO]: 1,
      [SubscriptionTier.PRO_PLUS]: 2,
    };
    
    if (tierValues[userTier] < tierValues[minimumTier]) {
      // Redirect to upgrade page if tier is insufficient
      return NextResponse.redirect(
        new URL(`/perfil/assinatura?requiredTier=${minimumTier}`, req.url)
      );
    }
    
    // User has sufficient subscription tier
    return null;
  } catch (error) {
    console.error('Error checking subscription tier:', error);
    // In case of error, allow access to avoid blocking users
    return null;
  }
} 