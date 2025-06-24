import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  Clock, 
  BookOpen, 
  Award, 
  Loader2,
  Medal
} from 'lucide-react';

interface RankingUser {
  id: string;
  position: number;
  score: number;
  users: {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string;
  };
}

interface UserRankingData {
  score: number;
  position: number | null;
}

interface RankingsResponse {
  rankings: RankingUser[];
  user_ranking: UserRankingData;
}

export default function UserRankings() {
  const [loading, setLoading] = useState(true);
  const [rankingData, setRankingData] = useState<RankingsResponse | null>(null);
  const [selectedType, setSelectedType] = useState('global_xp');
  const [selectedPeriod, setSelectedPeriod] = useState('all_time');

  const rankingTypes = [
    { id: 'global_xp', name: 'XP Global', icon: <Trophy className="h-4 w-4" /> },
    { id: 'study_time', name: 'Tempo de Estudo', icon: <Clock className="h-4 w-4" /> },
    { id: 'sessions_completed', name: 'Sessões Completadas', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'exams_score', name: 'Nota em Simulados', icon: <Award className="h-4 w-4" /> }
  ];

  const periods = [
    { id: 'all_time', name: 'Todo Período' },
    { id: 'weekly', name: 'Semanal' },
    { id: 'monthly', name: 'Mensal' }
  ];

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/gamification/rankings?type=${selectedType}&period=${selectedPeriod}`);
        
        if (!response.ok) {
          throw new Error('Erro ao buscar rankings');
        }
        
        const data = await response.json();
        setRankingData(data);
      } catch (error) {
        console.error('Erro ao carregar rankings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [selectedType, selectedPeriod]);

  // Função para renderizar o ícone de posição
  const renderPositionIcon = (position: number) => {
    if (position === 1) {
      return <div className="p-1.5 bg-amber-100 rounded-full"><Trophy className="h-4 w-4 text-amber-600" /></div>;
    } else if (position === 2) {
      return <div className="p-1.5 bg-gray-100 rounded-full"><Medal className="h-4 w-4 text-gray-500" /></div>;
    } else if (position === 3) {
      return <div className="p-1.5 bg-amber-100/60 rounded-full"><Medal className="h-4 w-4 text-amber-700/70" /></div>;
    } else {
      return <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">{position}</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!rankingData) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <p className="text-gray-500 text-center">Dados de ranking não disponíveis</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Rankings</h2>
        <p className="text-sm text-gray-500 mt-1">Compare seu desempenho com outros estudantes</p>
      </div>

      {/* Filtros */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Ranking</label>
            <select 
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {rankingTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Período</label>
            <select 
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              {periods.map((period) => (
                <option key={period.id} value={period.id}>{period.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sua posição */}
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-800">Sua posição</h3>
            <p className="text-xs text-gray-500 mt-1">
              {rankingData.user_ranking.position 
                ? `Você está em ${rankingData.user_ranking.position}º lugar` 
                : 'Você ainda não está classificado neste ranking'}
            </p>
          </div>
          <div className="flex items-center">
            <div className="mr-2">
              <span className="block text-right text-sm font-bold text-blue-600">{rankingData.user_ranking.score}</span>
              <span className="block text-xs text-gray-500">pontos</span>
            </div>
            {rankingData.user_ranking.position && (
              <div className="p-1 rounded-lg bg-blue-100">
                <Trophy className="h-5 w-5 text-blue-600" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista de rankings */}
      <div className="p-6">
        <h3 className="text-sm font-medium text-gray-800 mb-4">Top 10 Estudantes</h3>
        
        {rankingData.rankings.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nenhum estudante classificado neste ranking</p>
        ) : (
          <div className="space-y-3">
            {rankingData.rankings.map((rankingItem) => (
              <div 
                key={rankingItem.id} 
                className="flex items-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="mr-3">
                  {renderPositionIcon(rankingItem.position)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden mr-2">
                      {rankingItem.users.avatar_url ? (
                        <img 
                          src={rankingItem.users.avatar_url} 
                          alt={`Avatar de ${rankingItem.users.display_name}`} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Users className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {rankingItem.users.display_name || rankingItem.users.email.split('@')[0]}
                    </span>
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <span className="block text-sm font-bold text-gray-800">{rankingItem.score}</span>
                  <span className="block text-xs text-gray-500">pontos</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 