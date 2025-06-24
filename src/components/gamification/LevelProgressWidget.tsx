import React, { useState, useEffect } from 'react';
import { Star, Sparkles, Loader2, Award, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface LevelData {
  current_level: number;
  current_xp: number;
  next_level_xp: number;
}

interface CoinData {
  balance: number;
}

export default function LevelProgressWidget() {
  const [loading, setLoading] = useState(true);
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [coinsData, setCoinsData] = useState<CoinData | null>(null);

  useEffect(() => {
    const fetchGamificationData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/gamification');
        
        if (!response.ok) {
          throw new Error('Erro ao buscar dados de gamificação');
        }
        
        const data = await response.json();
        setLevelData(data.level);
        setCoinsData(data.coins);
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
    if (!levelData) return 0;
    const { current_xp, next_level_xp } = levelData;
    return Math.min(Math.round((current_xp / next_level_xp) * 100), 100);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Seu Nível
          </h2>
          <Star className="text-blue-600 h-5 w-5" />
        </div>
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!levelData) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md p-6 text-white relative overflow-hidden">
      {/* Elemento decorativo */}
      <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/10 rounded-full blur-xl" />
      <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-white/10 rounded-full blur-xl" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Sparkles className="h-5 w-5 mr-2" />
            Nível {levelData.current_level}
          </h2>
          <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
            {levelData.current_xp} / {levelData.next_level_xp} XP
          </div>
        </div>
        
        <div className="mb-4">
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full" 
              style={{ width: `${calculateXpPercentage()}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-blue-100">
            <span>Progresso: {calculateXpPercentage()}%</span>
            <span>Próximo: Nível {levelData.current_level + 1}</span>
          </div>
        </div>
        
        {coinsData && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                <span className="font-medium">MedCoins</span>
              </div>
              <div className="font-bold text-xl">{coinsData.balance}</div>
            </div>
          </div>
        )}
        
        <Link 
          href="/perfil/gamificacao" 
          className="mt-4 inline-flex items-center text-sm font-medium text-white hover:text-blue-100 transition-colors"
        >
          Ver detalhes <ArrowUpRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  );
} 