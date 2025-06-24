"use client";

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import GamificationProfile from '@/components/gamification/GamificationProfile';
import UserRankings from '@/components/gamification/UserRankings';

export default function GamificationPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Cabeçalho da página */}
      <div className="mb-6 flex items-center">
        <Link href="/perfil" className="mr-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfil de Gamificação</h1>
          <p className="text-gray-600 mt-1">Acompanhe seu progresso, conquistas e desafios</p>
        </div>
      </div>

      {/* Layout em grid para componentes de gamificação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Perfil de Gamificação (ocupa 2 colunas em telas grandes) */}
        <div className="lg:col-span-2">
          <GamificationProfile />
        </div>

        {/* Rankings (ocupa 1 coluna) */}
        <div>
          <UserRankings />
        </div>
      </div>
    </div>
  );
} 