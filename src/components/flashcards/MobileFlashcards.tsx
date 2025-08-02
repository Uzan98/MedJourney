"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  Search,
  Layers,
  Clock,
  Star,
  ChevronRight,
  BookOpen,
  Calendar,
  CreditCard,
  Filter,
  MoreVertical,
  Play,
  TrendingUp,
  Target
} from 'lucide-react';
import { Deck, FlashcardStats } from '@/types/flashcards';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CreateDeckModal from '@/components/flashcards/CreateDeckModal';

interface MobileFlashcardsProps {
  decks: Deck[];
  stats: FlashcardStats | null;
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showCreateDeckModal: boolean;
  setShowCreateDeckModal: (show: boolean) => void;
  handleCreateDeck: () => void;
  handleDeckCreated: () => void;
  filteredDecks: Deck[];
  adjustColor: (color: string, amount: number) => string;
}

export default function MobileFlashcards({
  decks,
  stats,
  isLoading,
  searchTerm,
  setSearchTerm,
  showCreateDeckModal,
  setShowCreateDeckModal,
  handleCreateDeck,
  handleDeckCreated,
  filteredDecks,
  adjustColor
}: MobileFlashcardsProps) {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-20">
      {/* Header Mobile */}
      <div className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Flashcards
              </h1>
              <p className="text-sm text-gray-600">
                {filteredDecks.length} {filteredDecks.length === 1 ? 'deck' : 'decks'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
                className="p-2"
              >
                <Search className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleCreateDeck}
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                Novo
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar decks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/90 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - Mobile Optimized */}
      {stats && (
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Total Cards */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Layers className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-blue-700">{stats.total_cards}</span>
              </div>
              <p className="text-xs font-medium text-blue-600">Total de Cartões</p>
            </div>

            {/* Mastery */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-yellow-100 rounded-xl">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <span className="text-2xl font-bold text-yellow-700">{Math.round(stats.mastery_percentage)}%</span>
              </div>
              <p className="text-xs font-medium text-yellow-600">Domínio</p>
              <div className="mt-2 bg-yellow-200/30 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.round(stats.mastery_percentage)}%` }}
                ></div>
              </div>
            </div>

            {/* Cards to Review */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-orange-100 rounded-xl">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <span className="text-2xl font-bold text-orange-700">{stats.cards_to_review}</span>
              </div>
              <p className="text-xs font-medium text-orange-600">Para Revisar</p>
            </div>

            {/* Study Streak */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 rounded-xl">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-green-700">{stats.study_streak_days}</span>
              </div>
              <p className="text-xs font-medium text-green-600">Dias Seguidos</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {stats && stats.cards_to_review > 0 && (
        <div className="px-4 mb-6">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Hora de Revisar!</h3>
                <p className="text-orange-100 text-sm">
                  {stats.cards_to_review} cartões aguardando
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                onClick={() => {
                  // Navigate to review mode
                  if (filteredDecks.length > 0) {
                    router.push(`/flashcards/study/${filteredDecks[0].deck_id || filteredDecks[0].id}`);
                  }
                }}
              >
                <Play className="h-4 w-4 mr-1" />
                Revisar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Decks List */}
      <div className="px-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 text-center shadow-lg border border-white/20">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhum deck encontrado</h3>
            <p className="text-gray-500 mb-4 text-sm">
              {searchTerm 
                ? "Não encontramos decks que correspondam à sua pesquisa."
                : "Você ainda não criou nenhum deck de flashcards."}
            </p>
            <Button onClick={handleCreateDeck} className="bg-gradient-to-r from-blue-500 to-purple-600">
              Criar Primeiro Deck
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Meus Decks</h2>
              <span className="text-sm text-gray-500">{filteredDecks.length} decks</span>
            </div>
            
            {filteredDecks
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              .map((deck) => (
                <div
                  key={deck.deck_id || deck.id}
                  className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden"
                >
                  <Link href={`/flashcards/deck/${deck.deck_id || deck.id}`}>
                    <div className="p-4">
                      {/* Deck Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800 mb-1 line-clamp-2">
                            {deck.name}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {deck.description || `${deck.card_count} cartões`}
                          </p>
                        </div>
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center ml-3 flex-shrink-0"
                          style={{ 
                            backgroundColor: deck.cover_color || '#4f46e5',
                            background: deck.cover_color ? 
                              `linear-gradient(135deg, ${deck.cover_color}, ${adjustColor(deck.cover_color, 30)})` : 
                              undefined 
                          }}
                        >
                          <CreditCard className="h-6 w-6 text-white" />
                        </div>
                      </div>

                      {/* Tags */}
                      {deck.tags && deck.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {deck.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-2 py-1">
                              {tag}
                            </Badge>
                          ))}
                          {deck.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs px-2 py-1">
                              +{deck.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Stats Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Layers className="h-4 w-4" />
                            <span>{deck.card_count || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            <span>{Math.round(Number(deck.mastery_level || 0))}%</span>
                          </div>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2"
                          onClick={(e) => {
                            e.preventDefault();
                            router.push(`/flashcards/study/${deck.deck_id || deck.id}`);
                          }}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Estudar
                        </Button>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round(Number(deck.mastery_level || 0))}%` }}
                        ></div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Create Deck Modal */}
      <CreateDeckModal 
        isOpen={showCreateDeckModal} 
        onClose={() => setShowCreateDeckModal(false)}
        onSuccess={handleDeckCreated}
      />
    </div>
  );
}