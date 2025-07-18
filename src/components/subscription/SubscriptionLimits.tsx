'use client';

import React, { useEffect } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { SubscriptionTier } from '../../types/subscription';

/**
 * Component to display subscription limits
 */
export const SubscriptionLimits: React.FC = () => {
  const { subscriptionLimits, isLoading, session, user } = useSubscription();

  useEffect(() => {
    console.log('SubscriptionLimits: Sessão atual:', session);
    console.log('SubscriptionLimits: Usuário atual:', user);
    console.log('SubscriptionLimits: Limites de assinatura:', subscriptionLimits);
  }, [session, user, subscriptionLimits]);

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-center text-gray-500">Carregando informações da assinatura...</p>
      </div>
    );
  }

  if (!subscriptionLimits) {
    console.error('SubscriptionLimits: Limites de assinatura não disponíveis!');
    return null;
  }

  const getTierName = (tier: SubscriptionTier) => {
    switch (tier) {
      case SubscriptionTier.FREE:
        return 'Gratuito';
      case SubscriptionTier.PRO:
        return 'Pro';
      case SubscriptionTier.PRO_PLUS:
        return 'Pro+';
      default:
        return 'Desconhecido';
    }
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Ilimitado' : limit.toString();
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Seu plano: {getTierName(subscriptionLimits.tier)}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          subscriptionLimits.tier === SubscriptionTier.FREE
            ? 'bg-gray-100 text-gray-800'
            : subscriptionLimits.tier === SubscriptionTier.PRO
            ? 'bg-blue-100 text-blue-800'
            : 'bg-purple-100 text-purple-800'
        }`}>
          {getTierName(subscriptionLimits.tier)}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Disciplinas</span>
            <span className="font-medium">{subscriptionLimits.disciplinesUsed} / {formatLimit(subscriptionLimits.disciplinesLimit)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                subscriptionLimits.tier === SubscriptionTier.FREE
                  ? 'bg-gray-500'
                  : subscriptionLimits.tier === SubscriptionTier.PRO
                  ? 'bg-blue-500'
                  : 'bg-purple-500'
              }`}
              style={{ 
                width: subscriptionLimits.disciplinesLimit === -1 
                  ? '10%' 
                  : `${Math.min(100, (subscriptionLimits.disciplinesUsed / subscriptionLimits.disciplinesLimit) * 100)}%` 
              }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Baralhos de Flashcards</span>
            <span className="font-medium">{subscriptionLimits.flashcardDecksUsed} / {formatLimit(subscriptionLimits.flashcardDecksLimit)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                subscriptionLimits.tier === SubscriptionTier.FREE
                  ? 'bg-gray-500'
                  : subscriptionLimits.tier === SubscriptionTier.PRO
                  ? 'bg-blue-500'
                  : 'bg-purple-500'
              }`}
              style={{ 
                width: subscriptionLimits.flashcardDecksLimit === -1 
                  ? '10%' 
                  : `${Math.min(100, (subscriptionLimits.flashcardDecksUsed / subscriptionLimits.flashcardDecksLimit) * 100)}%` 
              }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Questões Hoje</span>
            <span className="font-medium">{subscriptionLimits.questionsUsedToday} / {formatLimit(subscriptionLimits.questionsLimitPerDay)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                subscriptionLimits.tier === SubscriptionTier.FREE
                  ? 'bg-gray-500'
                  : subscriptionLimits.tier === SubscriptionTier.PRO
                  ? 'bg-blue-500'
                  : 'bg-purple-500'
              }`}
              style={{ 
                width: subscriptionLimits.questionsLimitPerDay === -1 
                  ? '10%' 
                  : `${Math.min(100, (subscriptionLimits.questionsUsedToday / subscriptionLimits.questionsLimitPerDay) * 100)}%` 
              }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">Recursos do plano</h4>
        <ul className="space-y-1 text-sm">
          <li className="flex items-center">
            <span className={subscriptionLimits.hasAiPlanningAccess ? "text-green-500" : "text-red-500"}>
              {subscriptionLimits.hasAiPlanningAccess ? "✓" : "✗"}
            </span>
            <span className="ml-2">Planejamento Inteligente com IA</span>
          </li>
          <li className="flex items-center">
            <span className={subscriptionLimits.hasFacultyAccess ? "text-green-500" : "text-red-500"}>
              {subscriptionLimits.hasFacultyAccess ? "✓" : "✗"}
            </span>
            <span className="ml-2">Recursos da Faculdade</span>
          </li>
          <li className="flex items-center">
            <span className={subscriptionLimits.hasAdvancedAnalytics ? "text-green-500" : "text-red-500"}>
              {subscriptionLimits.hasAdvancedAnalytics ? "✓" : "✗"}
            </span>
            <span className="ml-2">Análises Avançadas</span>
          </li>
          <li className="flex items-center">
            <span className={subscriptionLimits.hasPrioritySupport ? "text-green-500" : "text-red-500"}>
              {subscriptionLimits.hasPrioritySupport ? "✓" : "✗"}
            </span>
            <span className="ml-2">Suporte Prioritário</span>
          </li>
        </ul>
      </div>
    </div>
  );
}; 