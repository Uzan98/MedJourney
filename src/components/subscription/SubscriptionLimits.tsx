'use client';

import React, { useState } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { SubscriptionTier } from '../../types/subscription';
import { 
  RefreshCw, 
  BookOpen, 
  Layers, 
  FileQuestion, 
  Clock, 
  PenTool, 
  Brain, 
  School, 
  BarChart2, 
  HeadphonesIcon, 
  FileSpreadsheet, 
  ClipboardList,
  Star
} from 'lucide-react';

/**
 * Componente redesenhado para exibir limites de assinatura de forma mais intuitiva
 */
export const SubscriptionLimits: React.FC = () => {
  const { subscriptionLimits, isLoading, refreshLimits } = useSubscription();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'usage' | 'features'>('usage');

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
      <div className="p-6 border rounded-lg bg-gray-50 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  if (!subscriptionLimits) {
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

  const getTierColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case SubscriptionTier.FREE:
        return 'bg-gray-500';
      case SubscriptionTier.PRO:
        return 'bg-blue-500';
      case SubscriptionTier.PRO_PLUS:
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTierBgColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case SubscriptionTier.FREE:
        return 'bg-gray-100';
      case SubscriptionTier.PRO:
        return 'bg-blue-100';
      case SubscriptionTier.PRO_PLUS:
        return 'bg-purple-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getTierTextColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case SubscriptionTier.FREE:
        return 'text-gray-800';
      case SubscriptionTier.PRO:
        return 'text-blue-800';
      case SubscriptionTier.PRO_PLUS:
        return 'text-purple-800';
      default:
        return 'text-gray-800';
    }
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? '∞' : limit.toString();
  };

  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Header com informações do plano */}
      <div className={`p-4 ${getTierBgColor(subscriptionLimits.tier)} border-b`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Star className={`h-5 w-5 mr-2 ${getTierTextColor(subscriptionLimits.tier)}`} />
            <h3 className="text-lg font-semibold">Plano {getTierName(subscriptionLimits.tier)}</h3>
          </div>
          <div className="flex items-center">
            <button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className={`mr-2 p-1.5 rounded-full hover:bg-white hover:bg-opacity-50 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Atualizar limites"
            >
              <RefreshCw className={`h-4 w-4 ${getTierTextColor(subscriptionLimits.tier)} ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierBgColor(subscriptionLimits.tier)} ${getTierTextColor(subscriptionLimits.tier)} border ${getTierTextColor(subscriptionLimits.tier).replace('text', 'border')}`}>
          {getTierName(subscriptionLimits.tier)}
        </span>
          </div>
        </div>
      </div>

      {/* Abas para alternar entre uso e recursos */}
      <div className="flex border-b">
        <button 
          className={`flex-1 py-2 text-center text-sm font-medium ${activeTab === 'usage' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('usage')}
        >
          Uso e Limites
        </button>
        <button 
          className={`flex-1 py-2 text-center text-sm font-medium ${activeTab === 'features' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('features')}
        >
          Recursos
        </button>
      </div>

      {activeTab === 'usage' && (
        <div className="p-4 space-y-5">
          {/* Grupo: Conteúdo Acadêmico */}
        <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
              <BookOpen className="h-4 w-4 mr-1.5" />
              Conteúdo Acadêmico
            </h4>
            
            {/* Disciplinas */}
            <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">Disciplinas</span>
            <span className="font-medium">{subscriptionLimits.disciplinesUsed} / {formatLimit(subscriptionLimits.disciplinesLimit)}</span>
          </div>
              <ProgressBar 
                used={subscriptionLimits.disciplinesUsed} 
                limit={subscriptionLimits.disciplinesLimit} 
                color={getTierColor(subscriptionLimits.tier)} 
              />
            </div>

            {/* Assuntos por disciplina */}
            {subscriptionLimits.maxSubjectsPerDiscipline !== undefined && (
              <div className="mb-4 pl-4 border-l-2 border-gray-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Assuntos por disciplina</span>
                  <span className="font-medium">{formatLimit(subscriptionLimits.maxSubjectsPerDiscipline)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Grupo: Banco de Questões */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
              <FileQuestion className="h-4 w-4 mr-1.5" />
              Banco de Questões
            </h4>
            
            {/* Questões por dia */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">Questões por dia</span>
                <span className="font-medium">{subscriptionLimits.questionsUsedToday} / {formatLimit(subscriptionLimits.questionsLimitPerDay)}</span>
              </div>
              <ProgressBar 
                used={subscriptionLimits.questionsUsedToday} 
                limit={subscriptionLimits.questionsLimitPerDay} 
                color={getTierColor(subscriptionLimits.tier)}
                warning={subscriptionLimits.questionsUsedToday / subscriptionLimits.questionsLimitPerDay > 0.8}
              />
          </div>
        </div>

          {/* Grupo: Flashcards */}
        <div>
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
              <Layers className="h-4 w-4 mr-1.5" />
              Flashcards
            </h4>
            
            {/* Baralhos */}
            <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">Baralhos</span>
            <span className="font-medium">{subscriptionLimits.flashcardDecksUsed} / {formatLimit(subscriptionLimits.flashcardDecksLimit)}</span>
          </div>
              <ProgressBar 
                used={subscriptionLimits.flashcardDecksUsed} 
                limit={subscriptionLimits.flashcardDecksLimit} 
                color={getTierColor(subscriptionLimits.tier)} 
              />
            </div>

            {/* Cards por baralho */}
            {subscriptionLimits.maxFlashcardsPerDeck !== undefined && (
              <div className="mb-4 pl-4 border-l-2 border-gray-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Cards por baralho</span>
                  <span className="font-medium">{formatLimit(subscriptionLimits.maxFlashcardsPerDeck as number)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Grupo: Sessões de Estudo */}
          {subscriptionLimits.maxStudySessionsPerDay !== undefined && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-1.5" />
                Sessões de Estudo
              </h4>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">Sessões por dia</span>
                  <span className="font-medium">{subscriptionLimits.studySessionsUsedToday || 0} / {formatLimit(subscriptionLimits.maxStudySessionsPerDay)}</span>
                </div>
                <ProgressBar 
                  used={subscriptionLimits.studySessionsUsedToday || 0} 
                  limit={subscriptionLimits.maxStudySessionsPerDay} 
                  color={getTierColor(subscriptionLimits.tier)} 
                />
              </div>
            </div>
          )}

          {/* Grupo: Simulados */}
          {(subscriptionLimits.maxSimuladosPerWeek !== undefined || 
            subscriptionLimits.maxSimuladosPerMonth !== undefined) && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <PenTool className="h-4 w-4 mr-1.5" />
                Simulados
              </h4>
              
              {/* Simulados por semana */}
              {subscriptionLimits.maxSimuladosPerWeek !== undefined && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">Simulados por semana</span>
                    <span className="font-medium">{subscriptionLimits.simuladosUsedThisWeek || 0} / {formatLimit(subscriptionLimits.maxSimuladosPerWeek)}</span>
                  </div>
                  <ProgressBar 
                    used={subscriptionLimits.simuladosUsedThisWeek || 0} 
                    limit={subscriptionLimits.maxSimuladosPerWeek} 
                    color={getTierColor(subscriptionLimits.tier)} 
                  />
                </div>
              )}

              {/* Simulados por mês */}
              {subscriptionLimits.maxSimuladosPerMonth !== undefined && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">Simulados por mês</span>
                    <span className="font-medium">{subscriptionLimits.simuladosUsedThisMonth || 0} / {formatLimit(subscriptionLimits.maxSimuladosPerMonth)}</span>
                  </div>
                  <ProgressBar 
                    used={subscriptionLimits.simuladosUsedThisMonth || 0} 
                    limit={subscriptionLimits.maxSimuladosPerMonth} 
                    color={getTierColor(subscriptionLimits.tier)} 
                  />
                </div>
              )}

              {/* Questões por simulado */}
              {subscriptionLimits.maxQuestionsPerSimulado !== undefined && (
                <div className="mb-4 pl-4 border-l-2 border-gray-100">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Questões por simulado</span>
                    <span className="font-medium">{formatLimit(subscriptionLimits.maxQuestionsPerSimulado)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'features' && (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coluna 1: Recursos Premium */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Recursos Premium</h4>
              <ul className="space-y-3">
                <FeatureItem 
                  icon={<Brain className="h-4 w-4" />}
                  label="Planejamento Inteligente com IA"
                  available={subscriptionLimits.hasAiPlanningAccess}
                />
                <FeatureItem 
                  icon={<BarChart2 className="h-4 w-4" />}
                  label="Análises Avançadas"
                  available={subscriptionLimits.hasAdvancedAnalytics}
                />
                <FeatureItem 
                  icon={<HeadphonesIcon className="h-4 w-4" />}
                  label="Suporte Prioritário"
                  available={subscriptionLimits.hasPrioritySupport}
                />
              </ul>
        </div>

            {/* Coluna 2: Recursos Adicionais */}
        <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Recursos Adicionais</h4>
              <ul className="space-y-3">
                <FeatureItem 
                  icon={<School className="h-4 w-4" />}
                  label="Recursos da Faculdade"
                  available={subscriptionLimits.hasFacultyAccess}
                />
                <FeatureItem 
                  icon={<FileSpreadsheet className="h-4 w-4" />}
                  label="Importação em massa via Excel"
                  available={subscriptionLimits.tier !== SubscriptionTier.FREE}
                />
                <FeatureItem 
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Gerenciamento de notas e faltas"
                  available={subscriptionLimits.tier !== SubscriptionTier.FREE}
                />
              </ul>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}; 

interface ProgressBarProps {
  used: number;
  limit: number;
  color: string;
  warning?: boolean;
}

function ProgressBar({ used, limit, color, warning = false }: ProgressBarProps) {
  if (limit === -1 || limit === undefined) return null;
  
  const percent = Math.min(100, (used / limit) * 100);
  let barColor = color;
  
  // Adiciona alerta visual quando próximo do limite
  if (warning && percent > 80) {
    barColor = 'bg-amber-500';
  }
  if (percent >= 100) {
    barColor = 'bg-red-500';
  }
  
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1 mb-2">
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${barColor}`} 
        style={{ width: `${percent}%` }}
      ></div>
    </div>
  );
}

interface FeatureItemProps {
  icon: React.ReactNode;
  label: string;
  available: boolean;
}

function FeatureItem({ icon, label, available }: FeatureItemProps) {
  return (
    <li className="flex items-center p-2 rounded-md hover:bg-gray-50">
      <div className={`flex items-center justify-center w-6 h-6 rounded-full mr-3 ${available ? 'bg-green-100' : 'bg-gray-100'}`}>
        <span className={available ? "text-green-600" : "text-gray-400"}>
          {icon}
        </span>
      </div>
      <span className={`${available ? "text-gray-800" : "text-gray-400"} font-medium`}>
        {label}
      </span>
      <span className={`ml-auto ${available ? "text-green-500" : "text-red-400"}`}>
        {available ? "✓" : "✗"}
      </span>
    </li>
  );
} 