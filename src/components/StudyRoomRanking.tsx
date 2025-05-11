import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { StudyRoomUser } from '@/services/study-room.service';
import Image from 'next/image';
import { Trophy } from 'lucide-react';

interface StudyRoomRankingProps {
  users: StudyRoomUser[];
  className?: string;
  isHorizontal?: boolean;
}

const formatStudyTime = (seconds: number): string => {
  if (!seconds) return '0h 0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${hours}h ${minutes}m`;
};

const getAvatarInitials = (name: string): string => {
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
      return 'bg-yellow-400'; // Ouro
    case 2:
      return 'bg-gray-300'; // Prata
    case 3:
      return 'bg-amber-600'; // Bronze
    default:
      return 'bg-gray-200';
  }
};

const getMedalEmoji = (position: number): string => {
  switch (position) {
    case 1:
      return '🥇'; 
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return '';
  }
};

export default function StudyRoomRanking({ 
  users, 
  className = '',
  isHorizontal = false
}: StudyRoomRankingProps) {
  
  if (isHorizontal) {
    return (
      <div className={`bg-white rounded-xl shadow-md overflow-hidden ${className}`}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-3 flex items-center">
          <Trophy className="h-5 w-5 text-yellow-300 mr-2" />
          <h2 className="text-white font-bold text-lg">Ranking de Estudo</h2>
        </div>
        
        <div className="p-4">
          {users.length === 0 ? (
            <div className="text-center py-3 text-gray-500">
              Nenhum registro de estudo ainda.
            </div>
          ) : (
            <div className="flex flex-wrap justify-around gap-4">
              {users.map((user, index) => (
                <div key={user.id} className={`flex flex-col items-center ${index === 0 ? 'order-2 scale-110' : index === 1 ? 'order-1' : 'order-3'}`}>
                  <div className="relative">
                    <div className={`h-16 w-16 rounded-full overflow-hidden border-2 ${index === 0 ? 'border-yellow-400' : index === 1 ? 'border-gray-300' : 'border-amber-600'} bg-gray-100 flex items-center justify-center mb-1`}>
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={user.username}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 font-medium text-xl">
                          {getAvatarInitials(user.username)}
                        </span>
                      )}
                    </div>
                    <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-lg ${getPositionColor(index + 1)} text-white shadow-md`}>
                      {index + 1}
                    </div>
                  </div>
                  
                  <p className="font-medium text-center mt-3 text-gray-900 truncate max-w-[100px]">
                    {user.username}
                  </p>
                  
                  <div className="mt-1 text-blue-600 font-bold">
                    {formatStudyTime(user.tempo_total || 0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Versão vertical original
  return (
    <div className={`${className}`}>
      <div className="bg-blue-600 text-white text-center py-3 rounded-t-xl text-xl font-bold">
        STUDY ROOM
      </div>
      
      <div className="bg-white rounded-b-xl shadow-md overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center p-6 text-gray-500">
            Nenhum registro de estudo ainda.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((user, index) => (
              <div key={user.id} className="flex items-center p-4">
                <div className={`relative flex items-center justify-center rounded-full w-10 h-10 ${getPositionColor(index + 1)} text-white font-bold mr-3 flex-shrink-0`}>
                  {index + 1}
                </div>
                
                <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.username}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-gray-500 font-medium text-sm">
                      {getAvatarInitials(user.username)}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {user.username}
                  </p>
                </div>
                
                <div className="text-right text-gray-500 font-medium">
                  {formatStudyTime(user.tempo_total || 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 