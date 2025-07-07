"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FlashcardsService } from '@/services/flashcards.service';
import { FlashcardStats } from '@/types/flashcards';
import { Brain, BookOpen, Clock, Award, Sparkles } from 'lucide-react';

export default function FlashcardStatsCard() {
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function loadFlashcardStats() {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const userStats = await FlashcardsService.getUserStats(user.id);
        setStats(userStats);
      } catch (error) {
        console.error('Erro ao carregar estatísticas de flashcards:', error);
      } finally {
        setLoading(false);
      }
    }

    loadFlashcardStats();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-4">
          <div className="p-2 rounded-md bg-purple-100 text-purple-600 mr-3">
            <Brain className="h-5 w-5" />
          </div>
          Flashcards
        </h2>
        <p className="text-gray-500">Nenhuma estatística disponível.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-4">
        <div className="p-2 rounded-md bg-purple-100 text-purple-600 mr-3">
          <Brain className="h-5 w-5" />
        </div>
        Flashcards
      </h2>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center p-3 bg-blue-50 rounded-lg">
          <div className="p-2 rounded-full bg-blue-100 mr-3">
            <BookOpen className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total de Cartões</p>
            <p className="text-lg font-semibold">{stats.total_cards}</p>
          </div>
        </div>
        
        <div className="flex items-center p-3 bg-green-50 rounded-lg">
          <div className="p-2 rounded-full bg-green-100 mr-3">
            <Sparkles className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Cartões Dominados</p>
            <p className="text-lg font-semibold">{stats.mastered_cards}</p>
          </div>
        </div>
        
        <div className="flex items-center p-3 bg-amber-50 rounded-lg">
          <div className="p-2 rounded-full bg-amber-100 mr-3">
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Para Revisar</p>
            <p className="text-lg font-semibold">{stats.cards_to_review}</p>
          </div>
        </div>
        
        <div className="flex items-center p-3 bg-purple-50 rounded-lg">
          <div className="p-2 rounded-full bg-purple-100 mr-3">
            <Award className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Domínio</p>
            <p className="text-lg font-semibold">{stats.mastery_percentage}%</p>
          </div>
        </div>
      </div>
      
      {/* Barra de progresso de domínio */}
      <div className="mt-4">
        <div className="flex justify-between mb-1 text-sm">
          <span>Progresso de Domínio</span>
          <span className="font-medium">{stats.mastery_percentage}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-600" 
            style={{ width: `${stats.mastery_percentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
} 