import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Star, 
  Medal, 
  Award, 
  Zap, 
  Sparkles, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Flame, 
  Check, 
  Crown, 
  Loader2 
} from 'lucide-react';

interface Achievement {
  id: string;
  achievement: {
    id: string;
    title: string;
    description: string;
    code: string;
    icon: string;
    category: string;
    rarity: string;
  };
  unlocked_at: string;
}

interface Badge {
  id: string;
  badge: {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
  };
  unlocked_at: string;
}

interface Challenge {
  id: string;
  challenge: {
    id: string;
    title: string;
    description: string;
    type: string;
    target_value: number;
    reward_xp: number;
    reward_coins: number;
    duration_days: number;
  };
  progress: number;
  started_at: string;
  expires_at: string;
  completed: boolean;
}

interface GamificationData {
  level: {
    current_level: number;
    current_xp: number;
    next_level_xp: number;
  };
  coins: {
    balance: number;
  };
  achievements: Achievement[];
  badges: Badge[];
  challenges: Challenge[];
  streak: {
    current_streak: number;
    longest_streak: number;
  };
}

// Componente para ícones de raridade
const RarityBadge = ({ rarity }: { rarity: string }) => {
  const rarityColors: Record<string, { bg: string; text: string; icon: JSX.Element }> = {
    common: { 
      bg: 'bg-gray-200', 
      text: 'text-gray-700',
      icon: <Star className="h-3 w-3" />
    },
    uncommon: { 
      bg: 'bg-green-200', 
      text: 'text-green-700',
      icon: <Star className="h-3 w-3" />
    },
    rare: { 
      bg: 'bg-blue-200', 
      text: 'text-blue-700',
      icon: <Star className="h-3 w-3" />
    },
    epic: { 
      bg: 'bg-purple-200', 
      text: 'text-purple-700',
      icon: <Star className="h-3 w-3" />
    },
    legendary: { 
      bg: 'bg-amber-200', 
      text: 'text-amber-700',
      icon: <Crown className="h-3 w-3" />
    },
  };

  const style = rarityColors[rarity.toLowerCase()] || rarityColors.common;

  return (
    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${style.bg} ${style.text}`}>
      {style.icon}
      <span className="ml-1 capitalize">{rarity}</span>
    </div>
  );
};

// Componente para ícones de conquistas
const AchievementIcon = ({ category }: { category: string }) => {
  const icons: Record<string, JSX.Element> = {
    study: <BookOpen className="h-5 w-5" />,
    exam: <ClipboardList className="h-5 w-5" />,
    streak: <Flame className="h-5 w-5" />,
    question: <FileQuestion className="h-5 w-5" />,
    social: <Users className="h-5 w-5" />,
    planning: <Calendar className="h-5 w-5" />,
    default: <Award className="h-5 w-5" />
  };

  return icons[category.toLowerCase()] || icons.default;
};

// Componente para ícones de distintivos
const BadgeIcon = ({ icon }: { icon: string }) => {
  const icons: Record<string, JSX.Element> = {
    trophy: <Trophy className="h-5 w-5" />,
    medal: <Medal className="h-5 w-5" />,
    star: <Star className="h-5 w-5" />,
    zap: <Zap className="h-5 w-5" />,
    sparkles: <Sparkles className="h-5 w-5" />,
    target: <Target className="h-5 w-5" />,
    trending_up: <TrendingUp className="h-5 w-5" />,
    crown: <Crown className="h-5 w-5" />,
    default: <Award className="h-5 w-5" />
  };

  return icons[icon.toLowerCase()] || icons.default;
};

// Componentes específicos para o import
import { ClipboardList, FileQuestion, Users, Calendar } from 'lucide-react';

export default function GamificationProfile() {
  const [loading, setLoading] = useState(true);
  const [gamificationData, setGamificationData] = useState<GamificationData | null>(null);
  const [activeTab, setActiveTab] = useState('achievements');

  useEffect(() => {
    const fetchGamificationData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/gamification');
        
        if (!response.ok) {
          throw new Error('Erro ao buscar dados de gamificação');
        }
        
        const data = await response.json();
        setGamificationData(data);
      } catch (error) {
        console.error('Erro ao carregar dados de gamificação:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGamificationData();
  }, []);

  // Calcular a porcentagem de XP para o próximo nível
  const calculateXpPercentage = () => {
    if (!gamificationData) return 0;
    const { current_xp, next_level_xp } = gamificationData.level;
    return Math.min(Math.round((current_xp / next_level_xp) * 100), 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!gamificationData) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <p className="text-gray-500 text-center">Dados de gamificação não disponíveis</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Perfil de Gamificação</h2>
      </div>

      {/* Sumário de nível e moedas */}
      <div className="p-6 border-b border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nível e XP */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Star className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="text-md font-bold text-gray-800">Nível {gamificationData.level.current_level}</h3>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${calculateXpPercentage()}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>{gamificationData.level.current_xp} XP</span>
              <span>{gamificationData.level.next_level_xp} XP</span>
            </div>
          </div>
          
          {/* MedCoins */}
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Award className="h-5 w-5 text-amber-600 mr-2" />
              <h3 className="text-md font-bold text-gray-800">MedCoins</h3>
            </div>
            <div className="flex items-center">
              <span className="text-2xl font-bold text-amber-600">{gamificationData.coins.balance}</span>
              <span className="text-xs text-gray-500 ml-2">moedas disponíveis</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs para diferentes seções */}
      <div className="border-b border-gray-100">
        <div className="flex">
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'achievements' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('achievements')}
          >
            Conquistas
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'badges' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('badges')}
          >
            Distintivos
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'challenges' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('challenges')}
          >
            Desafios
          </button>
        </div>
      </div>

      {/* Conteúdo da tab */}
      <div className="p-6">
        {activeTab === 'achievements' && (
          <div>
            <h3 className="text-md font-medium text-gray-800 mb-4">
              Conquistas Desbloqueadas ({gamificationData.achievements.length})
            </h3>
            
            {gamificationData.achievements.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Você ainda não desbloqueou nenhuma conquista</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {gamificationData.achievements.map((achievement) => (
                  <div 
                    key={achievement.id} 
                    className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex items-start"
                  >
                    <div className="p-2 bg-blue-100 rounded-full mr-3 flex-shrink-0">
                      <AchievementIcon category={achievement.achievement.category} />
                    </div>
                    <div>
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-800">{achievement.achievement.title}</h4>
                        <div className="ml-2">
                          <RarityBadge rarity={achievement.achievement.rarity} />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{achievement.achievement.description}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Desbloqueado em {new Date(achievement.unlocked_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'badges' && (
          <div>
            <h3 className="text-md font-medium text-gray-800 mb-4">
              Distintivos Especiais ({gamificationData.badges.length})
            </h3>
            
            {gamificationData.badges.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Você ainda não conquistou nenhum distintivo especial</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {gamificationData.badges.map((badge) => (
                  <div 
                    key={badge.id} 
                    className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex flex-col items-center text-center"
                  >
                    <div className="p-3 bg-amber-100 rounded-full mb-3">
                      <BadgeIcon icon={badge.badge.icon} />
                    </div>
                    <h4 className="text-sm font-medium text-gray-800">{badge.badge.title}</h4>
                    <div className="my-1">
                      <RarityBadge rarity={badge.badge.rarity} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{badge.badge.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'challenges' && (
          <div>
            <h3 className="text-md font-medium text-gray-800 mb-4">
              Desafios Ativos ({gamificationData.challenges.length})
            </h3>
            
            {gamificationData.challenges.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Você não tem desafios ativos no momento</p>
            ) : (
              <div className="space-y-4">
                {gamificationData.challenges.map((challenge) => (
                  <div 
                    key={challenge.id} 
                    className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <div className="p-2 bg-purple-100 rounded-full mr-3 flex-shrink-0">
                          <Target className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-800">{challenge.challenge.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">{challenge.challenge.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="mr-2 flex flex-col items-end">
                          <span className="text-xs text-blue-600">+{challenge.challenge.reward_xp} XP</span>
                          <span className="text-xs text-amber-600">+{challenge.challenge.reward_coins} moedas</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progresso</span>
                        <span>{challenge.progress}/{challenge.challenge.target_value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(Math.round((challenge.progress / challenge.challenge.target_value) * 100), 100)}%` 
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Expira em {new Date(challenge.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Streak de estudo */}
      <div className="p-6 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-full mr-3">
              <Flame className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-800">Sequência de Estudos</h4>
              <p className="text-xs text-gray-500">Mantenha sua rotina de estudos</p>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{gamificationData.streak.current_streak}</div>
            <p className="text-xs text-gray-500">dias consecutivos</p>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500 text-right">
          Recorde: {gamificationData.streak.longest_streak} dias
        </div>
      </div>
    </div>
  );
} 