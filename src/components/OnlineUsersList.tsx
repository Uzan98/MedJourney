'use client';

import React from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';
import { StudyRoomUser } from '@/services/study-room.service';
import StudyTimer from './StudyTimer';

interface OnlineUsersListProps {
  users: StudyRoomUser[];
  className?: string;
}

export default function OnlineUsersList({ users, className = '' }: OnlineUsersListProps) {
  if (!users || users.length === 0) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg text-center ${className}`}>
        <p className="text-gray-500">Nenhum usuário online no momento</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {users.map(user => (
        <div 
          key={user.id}
          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
        >
          <div className="flex items-center">
            {user.avatar_url ? (
              <Image 
                src={user.avatar_url}
                alt={user.username}
                width={32}
                height={32}
                className="rounded-full mr-3"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <User className="w-4 h-4 text-blue-600" />
              </div>
            )}
            <div>
              <h3 className="font-medium text-gray-800">{user.username}</h3>
              <StudyTimer 
                startTime={user.entrou_em} 
                initialSeconds={0}
                className="text-xs text-gray-500"
              />
            </div>
          </div>
          <div className="bg-green-100 w-2 h-2 rounded-full"></div>
        </div>
      ))}
    </div>
  );
} 