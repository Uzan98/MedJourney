'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Star, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

// Estender a interface UserRankingItem para incluir o rank
interface UserRankingWithRank {
  user_id: string;
  username: string;
  avatar_url?: string;
  total_xp: number;
  rank: number;
}

interface RankingUser {
  user_id: string;
  username: string;
  avatar_url?: string;
  total_xp: number;
  rank: number;
}

export default function UserRanking() {
  const [users, setUsers] = useState<UserRankingWithRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankingData();
  }, []);

  const fetchRankingData = async () => {
    setLoading(true);
    try {
      // Tentar usar a função RPC get_global_xp_ranking
      const { data: xpData, error: xpError } = await supabase
        .rpc('get_global_xp_ranking', { p_limit: 10 });

      if (!xpError && xpData && xpData.length > 0) {
        // A função RPC já retorna os dados no formato correto com o rank
        // Converter o rank para number, já que pode vir como BIGINT do PostgreSQL
        const formattedData = xpData.map((user: RankingUser) => ({
          ...user,
          rank: Number(user.rank)
        }));
        
        console.log('Dados do ranking:', formattedData);
        setUsers(formattedData);
      } else {
        console.log('Função RPC não disponível, usando fallback:', xpError);
        
        // Fallback: usar os dados dos participantes de desafios
        const { data, error } = await supabase
          .from('challenge_participants')
          .select('user_id, username, avatar_url, current_value')
          .order('current_value', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        
        // Agrupar por usuário e somar o XP total
        const userXpMap = new Map<string, {
          user_id: string;
          username: string;
          avatar_url?: string;
          total_xp: number;
        }>();
        
        data.forEach(participant => {
          const userId = participant.user_id;
          if (!userXpMap.has(userId)) {
            userXpMap.set(userId, {
              user_id: userId,
              username: participant.username || 'Usuário',
              avatar_url: participant.avatar_url,
              total_xp: participant.current_value || 0
            });
          } else {
            const existingUser = userXpMap.get(userId)!;
            existingUser.total_xp += participant.current_value || 0;
          }
        });
        
        // Converter o Map para array e ordenar por XP
        const result = Array.from(userXpMap.values())
          .sort((a, b) => b.total_xp - a.total_xp)
          .slice(0, 10);
        
        // Adicionar o rank aos usuários
        const usersWithRank = result.map((user, index) => ({
          ...user,
          rank: index + 1
        }));
        
        console.log('Dados do fallback:', usersWithRank);
        setUsers(usersWithRank);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-700" />;
      default:
        return <span className="text-sm font-medium text-gray-500">{rank}</span>;
    }
  };

  const getGradientByRank = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/10 to-yellow-100/20 border-l-4 border-yellow-500';
      case 2:
        return 'bg-gradient-to-r from-gray-400/10 to-gray-100/20 border-l-4 border-gray-400';
      case 3:
        return 'bg-gradient-to-r from-amber-700/10 to-amber-100/20 border-l-4 border-amber-700';
      default:
        return 'bg-white dark:bg-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-700/70';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Trophy className="h-6 w-6 text-yellow-300 mr-2" />
            <h2 className="text-lg font-bold text-white">Ranking de XP</h2>
          </div>
          <TrendingUp className="h-5 w-5 text-blue-200" />
        </div>
        <p className="text-xs text-blue-200 mt-1">Competindo pelos melhores resultados</p>
      </div>
      
      {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              <div className="ml-3 flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {users.length === 0 ? (
            <div className="p-4 text-center">
              <Star className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhum usuário no ranking ainda.
              </p>
            </div>
          ) : (
            users.map((user) => (
              <div 
                key={user.user_id} 
                className={`flex items-center p-3 transition-colors ${getGradientByRank(user.rank)}`}
              >
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(user.rank)}
                </div>
                
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex-shrink-0 border-2 border-white dark:border-gray-700 shadow-sm">
                  {user.avatar_url ? (
                    <Image 
                      src={user.avatar_url} 
                      alt={user.username}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold truncate">{user.username}</p>
                  <div className="flex items-center mt-0.5">
                    <Star className="h-3.5 w-3.5 text-yellow-500 mr-1" />
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {user.total_xp} XP
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
} 