import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Award, 
  Star, 
  ArrowUpRight, 
  Loader2,
  BookOpen, 
  ClipboardList, 
  FileQuestion, 
  Users, 
  Calendar, 
  Flame 
} from 'lucide-react';
import Link from 'next/link';

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

// Componente para ícones de raridade
const RarityBadge = ({ rarity }: { rarity: string }) => {
  const rarityColors: Record<string, { bg: string; text: string }> = {
    common: { bg: 'bg-gray-200', text: 'text-gray-700' },
    uncommon: { bg: 'bg-green-200', text: 'text-green-700' },
    rare: { bg: 'bg-blue-200', text: 'text-blue-700' },
    epic: { bg: 'bg-purple-200', text: 'text-purple-700' },
    legendary: { bg: 'bg-amber-200', text: 'text-amber-700' }
  };

  const style = rarityColors[rarity.toLowerCase()] || rarityColors.common;

  return (
    <div className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs ${style.bg} ${style.text}`}>
      <span className="capitalize">{rarity}</span>
    </div>
  );
};

export default function AchievementsWidget() {
  const [loading, setLoading] = useState(true);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [totalAchievements, setTotalAchievements] = useState(0);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/gamification');
        
        if (!response.ok) {
          throw new Error('Erro ao buscar dados de gamificação');
        }
        
        const data = await response.json();
        
        // Ordenar conquistas por data (mais recentes primeiro)
        const sortedAchievements = [...data.achievements].sort((a, b) => 
          new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
        );
        
        setRecentAchievements(sortedAchievements.slice(0, 3)); // Apenas as 3 mais recentes
        setTotalAchievements(data.achievements.length);
      } catch (error) {
        console.error('Erro ao carregar conquistas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Conquistas Recentes
          </h2>
          <Trophy className="text-amber-600 h-5 w-5" />
        </div>
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Conquistas Recentes
        </h2>
        <div className="flex items-center bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
          <Trophy className="h-3.5 w-3.5 mr-1" />
          {totalAchievements} total
        </div>
      </div>

      {recentAchievements.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <Award className="mx-auto h-10 w-10 text-gray-400 mb-2" />
          <p className="text-gray-600 mb-1">Você ainda não conquistou nenhuma conquista</p>
          <p className="text-sm text-gray-500">Continue estudando para desbloquear conquistas!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentAchievements.map((achievement) => (
            <div 
              key={achievement.id} 
              className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="p-2 rounded-lg mr-3 flex-shrink-0" style={{ 
                background: `linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)`,
                boxShadow: '0 2px 5px rgba(251, 191, 36, 0.2)'
              }}>
                <AchievementIcon category={achievement.achievement.category} />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-800 truncate mr-2">
                    {achievement.achievement.title}
                  </h3>
                  <RarityBadge rarity={achievement.achievement.rarity} />
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">
                  {achievement.achievement.description}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(achievement.unlocked_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link 
          href="/perfil/gamificacao" 
          className="text-amber-600 hover:text-amber-800 text-sm font-medium flex items-center"
        >
          Ver todas as conquistas <ArrowUpRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  );
}
