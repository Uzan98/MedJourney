'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  X, 
  Check, 
  RotateCcw, 
  Clock, 
  Flag, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Pause,
  BarChart,
  TrendingUp,
  TrendingDown,
  Gauge,
  CheckCircle,
  BookOpen,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Deck, Flashcard, StudySession, CardReview } from '@/types/flashcards';

interface MobileStudyProps {
  deck: Deck | null;
  currentCard: Flashcard | null;
  currentCardIndex: number;
  totalCards: number;
  isFlipped: boolean;
  studyStats: {
    correct: number;
    incorrect: number;
    total: number;
    completed: number;
  };
  timeElapsed: number;
  isLoading: boolean;
  showCompletionScreen: boolean;
  onFlipCard: () => void;
  onAnswerCard: (difficulty: 'easy' | 'medium' | 'hard' | 'incorrect') => void;
  onPreviousCard: () => void;
  onFinishSession: () => void;
  onRestartSession: () => void;
  onGoBack: () => void;
  calculateProjectedMastery: (currentMastery: number, difficulty: string) => number;
  formatTime: (seconds: number) => string;
}

const styles = {
  flipCard: "relative w-full h-56 bg-white rounded-lg shadow-lg cursor-pointer mb-4",
  flipCardInner: "relative w-full h-full transition-transform duration-500",
  flipped: "",
  flipCardFront: "absolute inset-0 w-full h-full p-4 rounded-lg border border-gray-200 bg-white",
  flipCardBack: "absolute inset-0 w-full h-full p-4 rounded-lg border border-gray-200 bg-white",
  flipCardContent: "flex flex-col items-center justify-center h-full text-gray-900",
  flipCardTitle: "text-base font-semibold mb-3 text-gray-800",
  flipCardText: "text-center text-sm text-gray-700 leading-relaxed",
  masteryIndicator: "transition-all duration-500 ease-out"
};

export default function MobileStudy({
  deck,
  currentCard,
  currentCardIndex,
  totalCards,
  isFlipped,
  studyStats,
  timeElapsed,
  isLoading,
  showCompletionScreen,
  onFlipCard,
  onAnswerCard,
  onPreviousCard,
  onFinishSession,
  onRestartSession,
  onGoBack,
  calculateProjectedMastery,
  formatTime
}: MobileStudyProps) {
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-center py-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Deck não encontrado</h2>
          <Button onClick={onGoBack} className="bg-blue-600 hover:bg-blue-700">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (showCompletionScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={onGoBack}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-gray-800">Estudo Concluído</h1>
            <div className="w-9" />
          </div>

          {/* Completion Card */}
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Parabéns!</h2>
              <p className="text-gray-600">Você completou o estudo do deck "{deck.name}"</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{studyStats.correct}</div>
                <div className="text-sm text-green-700">Corretos</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{studyStats.incorrect}</div>
                <div className="text-sm text-red-700">Incorretos</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{studyStats.total}</div>
                <div className="text-sm text-blue-700">Total</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{formatTime(timeElapsed)}</div>
                <div className="text-sm text-purple-700">Tempo</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={onRestartSession}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Estudar Novamente
              </Button>
              <Button
                onClick={onGoBack}
                variant="outline"
                className="w-full py-3"
              >
                Voltar aos Flashcards
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="text-center py-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Nenhum cartão disponível</h2>
          <Button onClick={onGoBack} className="bg-blue-600 hover:bg-blue-700">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={onGoBack}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-800">{deck.name}</h1>
            <p className="text-sm text-gray-600">
              {currentCardIndex + 1} de {totalCards}
            </p>
          </div>
          <div className="w-9" />
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <Progress 
            value={(studyStats.completed / studyStats.total) * 100} 
            className="h-2 bg-gray-200"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{studyStats.completed} completados</span>
            <span>{formatTime(timeElapsed)}</span>
          </div>
        </div>

        {/* Flashcard */}
        <div 
          className={styles.flipCard} 
          onClick={!isFlipped ? onFlipCard : undefined}
          style={{ perspective: '1000px' }}
        >
          <div 
            className={styles.flipCardInner}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Front */}
            <div 
              className={styles.flipCardFront}
              style={{ 
                backfaceVisibility: 'hidden',
                zIndex: isFlipped ? 1 : 2
              }}
            >
              <div className={styles.flipCardContent}>
                <div className={styles.flipCardTitle}>Pergunta</div>
                <div className={styles.flipCardText} style={{ color: '#374151', fontSize: '14px' }}>
                   {currentCard?.front || 'Pergunta não encontrada'}
                 </div>
                {!isFlipped && (
                  <div className="mt-4 text-xs text-gray-500 text-center">
                    Toque para ver a resposta
                  </div>
                )}
              </div>
            </div>

            {/* Back */}
            <div 
              className={styles.flipCardBack}
              style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                zIndex: isFlipped ? 2 : 1
              }}
            >
              <div className={styles.flipCardContent}>
                <div className={styles.flipCardTitle}>Resposta</div>
                <div className={styles.flipCardText} style={{ color: '#374151', fontSize: '14px' }}>
                   {currentCard?.back || 'Resposta não encontrada'}
                 </div>
                
                {/* Card Info */}
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {currentCard?.tags && currentCard.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {currentCard.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="mt-2 text-xs text-gray-600 text-center">
                  Domínio atual: {currentCard?.mastery_level || 0}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Answer Buttons */}
        {isFlipped && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => onAnswerCard('easy')}
              className="bg-gradient-to-r from-green-500 to-green-600 p-3 rounded-lg text-center hover:shadow-lg transition-all border border-green-400 shadow-md"
            >
              <div className="font-semibold text-white mb-1 text-sm flex items-center justify-center">
                <Check className="h-4 w-4 mr-1" />
                Fácil
              </div>
              <span className="text-xs text-green-100">+20% → {calculateProjectedMastery(Number(currentCard.mastery_level || 0), 'easy')}%</span>
            </button>
            
            <button
              onClick={() => onAnswerCard('medium')}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-3 rounded-lg text-center hover:shadow-lg transition-all border border-yellow-400 shadow-md"
            >
              <div className="font-semibold text-white mb-1 text-sm flex items-center justify-center">
                <Flag className="h-4 w-4 mr-1" />
                Médio
              </div>
              <span className="text-xs text-yellow-100">+10% → {calculateProjectedMastery(Number(currentCard.mastery_level || 0), 'medium')}%</span>
            </button>
            
            <button
              onClick={() => onAnswerCard('hard')}
              className="bg-gradient-to-r from-orange-500 to-orange-600 p-3 rounded-lg text-center hover:shadow-lg transition-all border border-orange-400 shadow-md"
            >
              <div className="font-semibold text-white mb-1 text-sm flex items-center justify-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                Difícil
              </div>
              <span className="text-xs text-orange-100">+5% → {calculateProjectedMastery(Number(currentCard.mastery_level || 0), 'hard')}%</span>
            </button>
            
            <button
              onClick={() => onAnswerCard('incorrect')}
              className="bg-gradient-to-r from-red-500 to-red-600 p-3 rounded-lg text-center hover:shadow-lg transition-all border border-red-400 shadow-md"
            >
              <div className="font-semibold text-white mb-1 text-sm flex items-center justify-center">
                <X className="h-4 w-4 mr-1" />
                Incorreto
              </div>
              <span className="text-xs text-red-100">-10% → {calculateProjectedMastery(Number(currentCard.mastery_level || 0), 'incorrect')}%</span>
            </button>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="space-y-3">
          {isFlipped ? (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onPreviousCard}
                disabled={currentCardIndex === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg flex-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onFinishSession}
                className="flex items-center gap-2 px-4 py-2 rounded-lg flex-1"
              >
                <span>Finalizar</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onPreviousCard}
                disabled={currentCardIndex === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Anterior</span>
              </Button>
              
              <Button 
                variant="default"
                onClick={onFlipCard}
                className="flex-1 mx-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <span className="flex items-center justify-center">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Virar Cartão
                </span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onFinishSession}
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
              >
                <span>Finalizar</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Stats Bar */}
          <div className="flex justify-between bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">Corretos</div>
              <div className="text-lg font-bold text-green-600">{studyStats.correct}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">Incorretos</div>
              <div className="text-lg font-bold text-red-600">{studyStats.incorrect}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">Restantes</div>
              <div className="text-lg font-bold text-blue-600">{studyStats.total - studyStats.completed}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">Tempo</div>
              <div className="text-lg font-bold text-purple-600">{formatTime(timeElapsed)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}