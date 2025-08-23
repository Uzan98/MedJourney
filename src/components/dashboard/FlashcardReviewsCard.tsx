"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FlashcardsService } from '@/services/flashcards.service';
import { Deck } from '@/types/flashcards';
import { Clock, ChevronRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function FlashcardReviewsCard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function loadDecksForReview() {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const userDecks = await FlashcardsService.getDecks(user.id);
        
        // Filtra apenas decks que têm cartões para revisar hoje
        // CORREÇÃO: Usar cards_to_review da view em vez de hasCardsForTodayStudy
        const decksWithReviews = userDecks.filter(deck => {
          const cardsToReview = deck.cards_to_review || deck.cards_due || 0;
          return cardsToReview > 0;
        });
        
        setDecks(decksWithReviews);
      } catch (error) {
        console.error('Erro ao carregar decks para revisão:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDecksForReview();
  }, [user?.id]);

  function adjustColor(color: string, amount: number): string {
    // Função para ajustar a cor (clareando ou escurecendo)
    return color;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 rounded w-full"></div>
          <div className="h-16 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 flex items-center mb-4">
        <div className="p-2 rounded-md bg-amber-100 text-amber-600 mr-3">
          <Clock className="h-5 w-5" />
        </div>
        Revisões para Hoje
      </h2>
      
      {decks.length > 0 ? (
        <div className="space-y-3">
          {decks.map((deck) => (
            <div key={deck.deck_id || deck.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center">
                <div 
                  className="w-10 h-10 rounded-md mr-3 flex-shrink-0"
                  style={{ 
                    backgroundColor: deck.cover_color || '#4f46e5',
                    background: deck.cover_color ? 
                      `linear-gradient(to right top, ${deck.cover_color}, ${adjustColor(deck.cover_color, 30)})` : 
                      undefined 
                  }}
                ></div>
                <div>
                  <h3 className="font-medium text-gray-900">{deck.name}</h3>
                  <p className="text-xs text-gray-500">
                    {deck.cards_to_review || deck.cards_due || 0} cartões para revisar • {Math.round(Number(deck.mastery_level || 0))}% dominado
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-0 h-8"
                onClick={() => router.push(`/flashcards/study/${deck.deck_id || deck.id}`)}
              >
                <span className="text-sm">Estudar</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <Link 
              href="/flashcards"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
            >
              Ver todos os decks <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <BookOpen className="mx-auto h-10 w-10 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-2">Nenhum deck para revisar hoje</p>
          <Link
            href="/flashcards"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
          >
            Ver todos os decks <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      )}
    </div>
  );
}