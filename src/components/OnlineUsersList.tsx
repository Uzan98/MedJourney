'use client';

import React from 'react';
import Image from 'next/image';
import { User, Clock } from 'lucide-react';
import { StudyRoomUser } from '@/services/study-room.service';
import StudyTimer from './StudyTimer';

interface OnlineUsersListProps {
  users: StudyRoomUser[];
  className?: string;
}

// Função para gerar iniciais do nome do usuário
function getInitials(name: string): string {
  if (!name) return '';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Função para gerar uma cor de fundo baseada no nome
function getColorFromName(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-600',
    'bg-green-100 text-green-600',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-yellow-100 text-yellow-600',
    'bg-indigo-100 text-indigo-600',
    'bg-red-100 text-red-600',
    'bg-cyan-100 text-cyan-600',
  ];
  
  // Usar a soma dos códigos de caractere do nome para escolher uma cor
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  
  return colors[sum % colors.length];
}

export default function OnlineUsersList({ users, className = '' }: OnlineUsersListProps) {
  if (!users || users.length === 0) {
    return (
      <div className={`p-6 bg-gray-50 rounded-lg text-center ${className}`}>
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500">Nenhum usuário online no momento</p>
          <p className="text-xs text-gray-400 mt-1">Seja o primeiro a entrar na sala</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {users.map(user => (
        <div 
          key={user.id}
          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all"
        >
          <div className="flex items-center">
            {user.avatar_url ? (
              <div className="relative mr-3">
                <Image 
                  src={user.avatar_url}
                  alt={user.username}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
                <div className="absolute -bottom-0.5 -right-0.5 bg-green-400 w-3 h-3 rounded-full border-2 border-white"></div>
              </div>
            ) : (
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mr-3 relative ${getColorFromName(user.username)}`}>
                <span className="text-sm font-medium">{getInitials(user.username)}</span>
                <div className="absolute -bottom-0.5 -right-0.5 bg-green-400 w-3 h-3 rounded-full border-2 border-white"></div>
              </div>
            )}
            <div>
              <h3 className="font-medium text-gray-800">{user.username}</h3>
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1 text-blue-500" />
                <StudyTimer 
                  startTime={user.entrou_em} 
                  initialSeconds={0}
                  compact={true}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              Estudando
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 