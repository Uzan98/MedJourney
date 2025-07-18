'use client';

import React, { useEffect } from 'react';
import { SubscriptionLimits } from '../../../components/subscription/SubscriptionLimits';
import { SubscriptionPlans } from '../../../components/subscription/SubscriptionPlans';
import { useSubscription } from '../../../contexts/SubscriptionContext';
import { useSupabase } from '../../../contexts/SupabaseProvider';

export default function SubscriptionPage() {
  const { isLoading, session, user } = useSubscription();
  const supabaseContext = useSupabase();

  useEffect(() => {
    console.log('SubscriptionPage: Contexto de assinatura carregado:', { isLoading, session, user });
    console.log('SubscriptionPage: Contexto Supabase:', supabaseContext);
  }, [isLoading, session, user, supabaseContext]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Minha Assinatura</h1>

      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4">Meu Plano Atual</h2>
        <SubscriptionLimits />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Planos Disponíveis</h2>
        <SubscriptionPlans />
      </div>
    </div>
  );
} 