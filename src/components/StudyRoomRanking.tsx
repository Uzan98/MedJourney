import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { StudyRoomUser } from '@/services/study-room.service';
import Image from 'next/image';
import { Trophy, Clock, Medal, Crown } from 'lucide-react';
import StudyTimer from './StudyTimer';

interface StudyRoomRankingProps {
  users: StudyRoomUser[];
  className?: string;
  isHorizontal?: boolean;
}

// Função auxiliar para converter segundos para um formato ISO de data
// Isso é necessário para usar com o StudyTimer que espera uma string de data de início
const secondsToISODate = (seconds: number): string => {
  if (!seconds) return new Date().toISOString();
  const now = new Date();
  const pastDate = new Date(now.getTime() - seconds * 1000);
  return pastDate.toISOString();
};

const getAvatarInitials = (name: string): string => {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const getPositionColor = (position: number): string => {
  switch (position) {
    case 1:
      return 'bg-yellow-500 text-yellow-50 border-yellow-400'; // Ouro
    case 2:
      return 'bg-gray-400 text-gray-50 border-gray-300'; // Prata
    case 3:
      return 'bg-amber-600 text-amber-50 border-amber-500'; // Bronze
    default:
      return 'bg-blue-100 text-blue-600 border-blue-200';
  }
};

const getPositionIcon = (position: number) => {
  switch (position) {
    case 1:
      return <Crown className="h-4 w-4" />;
    case 2:
      return <Medal className="h-4 w-4" />;
    case 3:
      return <Medal className="h-4 w-4" />;
    default:
      return position;
  }
};

export default function StudyRoomRanking({ 
  users, 
  className = '',
  isHorizontal = false
}: StudyRoomRankingProps) {
  
  // Se não houver usuários, ordenamos um array vazio
  const sortedUsers = [...(users || [])].sort((a, b) => 
    (b.tempo_total || 0) - (a.tempo_total || 0)
  ).slice(0, 5); // Limitamos a 5 usuários para melhor exibição
  
  if (isHorizontal) {
    return (
      <div className={`bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 ${className}`}>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
          <Trophy className="h-5 w-5 text-yellow-300 mr-2" />
            <h2 className="text-white font-bold text-base">Ranking de Estudantes</h2>
          </div>
          <span className="text-xs text-blue-100">Top 5</span>
        </div>
        
        <div className="p-4">
          {sortedUsers.length === 0 ? (
            <div className="text-center py-6 px-3 bg-gray-50 rounded-lg">
              <Trophy className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Nenhum registro de estudo ainda.</p>
              <p className="text-xs text-gray-400 mt-1">Os estudantes mais dedicados aparecerão aqui.</p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-around gap-4">
              {sortedUsers.slice(0, 3).map((user, index) => (
                <div 
                  key={user.id} 
                  className={`flex flex-col items-center ${index === 0 ? 'order-2 scale-110' : index === 1 ? 'order-1' : 'order-3'}`}
                >
                  <div className="relative">
                    <div className={`h-16 w-16 rounded-full overflow-hidden border-2 ${index === 0 ? 'border-yellow-400' : index === 1 ? 'border-gray-300' : 'border-amber-500'} flex items-center justify-center mb-1 bg-white`}>
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={user.username}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 font-medium text-xl">
                          {getAvatarInitials(user.username)}
                        </span>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm ${getPositionColor(index + 1)} shadow-sm border`}>
                      {getPositionIcon(index + 1)}
                    </div>
                  </div>
                  
                  <p className="font-medium text-center mt-2 text-gray-800 truncate max-w-[80px] text-sm">
                    {user.username}
                  </p>
                  
                  <div className="mt-1 text-blue-600 font-semibold flex items-center text-xs">
                    <Clock className="h-3 w-3 mr-1 text-blue-500" />
                    <StudyTimer 
                      startTime={secondsToISODate(user.tempo_total || 0)} 
                      initialSeconds={0}
                      compact={true}
                      active={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Lista de outros classificados */}
          {sortedUsers.length > 3 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {sortedUsers.slice(3).map((user, index) => (
                <div key={user.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs ${getPositionColor(index + 4)}`}>
                      {index + 4}
                    </div>
                    {user.avatar_url ? (
                      <div className="relative h-6 w-6 mr-2">
                        <Image
                          src={user.avatar_url}
                          alt={user.username}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                        <span className="text-gray-500 text-xs font-medium">
                          {getAvatarInitials(user.username)}
                        </span>
                      </div>
                    )}
                    <span className="text-sm text-gray-700 truncate max-w-[100px]">
                      {user.username}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1 text-blue-500" />
                    <StudyTimer 
                      startTime={secondsToISODate(user.tempo_total || 0)} 
                      initialSeconds={0}
                      compact={true}
                      active={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Versão vertical
  return (
    <div className={`${className}`}>
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center py-3 rounded-t-xl flex items-center justify-center">
        <Trophy className="h-5 w-5 text-yellow-300 mr-2" />
        <span className="font-bold">RANKING DE ESTUDO</span>
      </div>
      
      <div className="bg-white rounded-b-xl shadow-sm overflow-hidden border border-gray-100">
        {sortedUsers.length === 0 ? (
          <div className="text-center p-6 bg-gray-50">
            <Trophy className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Nenhum registro de estudo ainda.</p>
            <p className="text-xs text-gray-400 mt-1">Entre na sala para aparecer no ranking!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedUsers.map((user, index) => (
              <div key={user.id} className="flex items-center p-3 hover:bg-gray-50 transition-colors">
                <div className={`relative flex items-center justify-center rounded-full w-7 h-7 ${getPositionColor(index + 1)} text-sm font-medium mr-3 flex-shrink-0`}>
                  {getPositionIcon(index + 1)}
                </div>
                
                <div className="relative h-8 w-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.username}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 font-medium text-xs">
                      {getAvatarInitials(user.username)}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate text-sm">
                    {user.username}
                  </p>
                </div>
                
                <div className="text-right text-blue-600 font-medium text-xs flex items-center">
                  <Clock className="h-3 w-3 mr-1 text-blue-500" />
                  <StudyTimer 
                    startTime={secondsToISODate(user.tempo_total || 0)} 
                    initialSeconds={0}
                    compact={true}
                    active={false}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 