'use client';

import React, { useEffect, useState } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { SubscriptionTier } from '../../types/subscription';
import { RefreshCw } from 'lucide-react';

/**
 * Component to display subscription limits
 */
export const SubscriptionLimits: React.FC = () => {
  const { subscriptionLimits, isLoading, session, user, refreshLimits } = useSubscription();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    console.log('SubscriptionLimits: Sessão atual:', session);
    console.log('SubscriptionLimits: Usuário atual:', user);
    console.log('SubscriptionLimits: Limites de assinatura:', subscriptionLimits);
    if (subscriptionLimits) {
      console.log('SubscriptionLimits: questionsLimitPerDay exibido:', subscriptionLimits.questionsLimitPerDay, typeof subscriptionLimits.questionsLimitPerDay);
    }
  }, [session, user, subscriptionLimits]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshLimits();
    } finally {
      setIsRefreshing(false);
    }
  };

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
        <div className="flex items-center">
          <button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className={`mr-2 p-1.5 rounded-full hover:bg-gray-100 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Atualizar limites"
          >
            <RefreshCw className={`h-4 w-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
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
      </div>

      <div className="space-y-4">
        {/* Disciplinas */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Disciplinas</span>
            <span className="font-medium">{subscriptionLimits.disciplinesUsed} / {formatLimit(subscriptionLimits.disciplinesLimit)}</span>
          </div>
          <ProgressBar used={subscriptionLimits.disciplinesUsed} limit={subscriptionLimits.disciplinesLimit} color={subscriptionLimits.tier} />
        </div>

        {/* Assuntos por disciplina */}
        {subscriptionLimits.maxSubjectsPerDiscipline !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Assuntos por disciplina</span>
              <span className="font-medium">{formatLimit(subscriptionLimits.maxSubjectsPerDiscipline)}</span>
            </div>
          </div>
        )}

        {/* Baralhos de Flashcards */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Baralhos de Flashcards</span>
            <span className="font-medium">{subscriptionLimits.flashcardDecksUsed} / {formatLimit(subscriptionLimits.flashcardDecksLimit)}</span>
          </div>
          <ProgressBar used={subscriptionLimits.flashcardDecksUsed} limit={subscriptionLimits.flashcardDecksLimit} color={subscriptionLimits.tier} />
        </div>

        {/* Cards por baralho */}
        {subscriptionLimits.maxFlashcardsPerDeck !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Cards por baralho</span>
              <span className="font-medium">{formatLimit(subscriptionLimits.maxFlashcardsPerDeck as number)}</span>
            </div>
          </div>
        )}

        {/* Questões por dia */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Questões por dia</span>
            <span className="font-medium">{subscriptionLimits.questionsUsedToday} / {formatLimit(subscriptionLimits.questionsLimitPerDay)}</span>
          </div>
          <ProgressBar used={subscriptionLimits.questionsUsedToday} limit={subscriptionLimits.questionsLimitPerDay} color={subscriptionLimits.tier} />
        </div>

        {/* Sessões de estudo por dia */}
        {subscriptionLimits.maxStudySessionsPerDay !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Sessões de estudo por dia</span>
              <span className="font-medium">{subscriptionLimits.studySessionsUsedToday || 0} / {formatLimit(subscriptionLimits.maxStudySessionsPerDay)}</span>
            </div>
            <ProgressBar used={subscriptionLimits.studySessionsUsedToday || 0} limit={subscriptionLimits.maxStudySessionsPerDay} color={subscriptionLimits.tier} />
          </div>
        )}

        {/* Simulados por semana */}
        {subscriptionLimits.maxSimuladosPerWeek !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Simulados por semana</span>
              <span className="font-medium">{subscriptionLimits.simuladosUsedThisWeek || 0} / {formatLimit(subscriptionLimits.maxSimuladosPerWeek)}</span>
            </div>
            <ProgressBar used={subscriptionLimits.simuladosUsedThisWeek || 0} limit={subscriptionLimits.maxSimuladosPerWeek} color={subscriptionLimits.tier} />
          </div>
        )}

        {/* Simulados por mês */}
        {subscriptionLimits.maxSimuladosPerMonth !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Simulados por mês</span>
              <span className="font-medium">{subscriptionLimits.simuladosUsedThisMonth || 0} / {formatLimit(subscriptionLimits.maxSimuladosPerMonth)}</span>
            </div>
            <ProgressBar used={subscriptionLimits.simuladosUsedThisMonth || 0} limit={subscriptionLimits.maxSimuladosPerMonth} color={subscriptionLimits.tier} />
          </div>
        )}

        {/* Questões por simulado */}
        {subscriptionLimits.maxQuestionsPerSimulado !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Questões por simulado</span>
              <span className="font-medium">{formatLimit(subscriptionLimits.maxQuestionsPerSimulado)}</span>
            </div>
          </div>
        )}
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
          {/* Importação em massa */}
          <li className="flex items-center">
            <span className={subscriptionLimits.tier !== SubscriptionTier.FREE ? "text-green-500" : "text-red-500"}>
              {subscriptionLimits.tier !== SubscriptionTier.FREE ? "✓" : "✗"}
            </span>
            <span className="ml-2">Importação em massa via Excel</span>
          </li>
          {/* Notas e faltas */}
          <li className="flex items-center">
            <span className={subscriptionLimits.tier !== SubscriptionTier.FREE ? "text-green-500" : "text-red-500"}>
              {subscriptionLimits.tier !== SubscriptionTier.FREE ? "✓" : "✗"}
            </span>
            <span className="ml-2">Gerenciamento de notas e faltas</span>
          </li>
        </ul>
      </div>
    </div>
  );
}; 

function ProgressBar({ used, limit, color }: { used: number, limit: number, color: any }) {
  if (limit === -1 || limit === undefined) return null;
  const percent = Math.min(100, (used / limit) * 100);
  let barColor = 'bg-gray-500';
  if (color === 'pro') barColor = 'bg-blue-500';
  if (color === 'pro_plus') barColor = 'bg-purple-500';
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 mt-1 mb-2">
      <div className={`h-3 rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${percent}%` }}></div>
    </div>
  );
} 