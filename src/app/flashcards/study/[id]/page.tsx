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
import { useAuth } from '@/contexts/AuthContext';
import { FlashcardsService } from '@/services/flashcards.service';
import { Deck, Flashcard, StudySession, CardReview } from '@/types/flashcards';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useIsMobile } from '@/hooks/useIsMobile';
import MobileStudy from '@/components/flashcards/MobileStudy';

// Estilos CSS para a página de estudo
const styles = {
  flipCard: `
    relative w-full h-64 md:h-80 bg-white rounded-lg shadow-lg cursor-pointer perspective-1000 mb-6
  `,
  flipCardInner: `
    relative w-full h-full transition-transform duration-500 transform-style-preserve-3d
  `,
  flipped: `
    [transform:rotateY(180deg)]
  `,
  flipCardFront: `
    absolute w-full h-full backface-hidden p-6 rounded-lg border border-gray-200
  `,
  flipCardBack: `
    absolute w-full h-full backface-hidden [transform:rotateY(180deg)] p-6 rounded-lg border border-gray-200
  `,
  flipCardContent: `
    flex flex-col items-center justify-center h-full
  `,
  flipCardTitle: `
    text-lg font-semibold mb-4
  `,
  flipCardText: `
    text-center text-lg
  `,
  masteryIndicator: `
    transition-all duration-500 ease-out
  `
};

export default function StudyPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [studySession, setStudySession] = useState<StudySession | null>(null);
  const [studyStats, setStudyStats] = useState({
    correct: 0,
    incorrect: 0,
    skipped: 0,
    total: 0,
    completed: 0
  });
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [allCardsCompleted, setAllCardsCompleted] = useState(false);
  const [showCustomStudyModal, setShowCustomStudyModal] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (user && params.id) {
        try {
          // Primeiro busca o deck
          const deckData = await FlashcardsService.getDeck(params.id);
          
          if (deckData) {
            setDeck(deckData);
            
            // Busca o ID correto do deck
            const deckId = deckData.deck_id || params.id;
            
            // Busca todos os flashcards do deck
            const cardsData = await FlashcardsService.getFlashcards(deckId);
            
            if (cardsData.length > 0) {
              // Verifica se há cards disponíveis para estudo hoje
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Início do dia atual
              
              const dueCards = cardsData.filter(card => {
                // Cards sem data de revisão (novos) ou com data menor ou igual a hoje
                if (!card.next_review) return true;
                
                const reviewDate = new Date(card.next_review);
                reviewDate.setHours(0, 0, 0, 0); // Normaliza para início do dia
                
                return reviewDate <= today;
              });
              
              console.log(`Total cards: ${cardsData.length}, Due cards: ${dueCards.length}`);
              
              if (dueCards.length === 0) {
                // Se não há cards para hoje, mostra a tela de conclusão com opção de estudo personalizado
                setFlashcards(cardsData);
                setStudyStats(prev => ({ ...prev, total: cardsData.length }));
                
                // Iniciar sessão de estudo
                const session = await FlashcardsService.startStudySession(deckId, user.id);
                setStudySession(session);
                
                // Mostrar tela de conclusão com opção de estudo personalizado
                setAllCardsCompleted(true);
                setIsLoading(false);
                return;
              }
              
              // Ordenar cartões - primeiro os que precisam de revisão, depois os novos
              const sortedCards = [...dueCards].sort((a, b) => {
                // Priorizar cartões com data de revisão vencida
                const aNextReview = a.next_review ? new Date(a.next_review) : new Date(0); // Novos cards primeiro
                const bNextReview = b.next_review ? new Date(b.next_review) : new Date(0);
                
                // Depois priorizar cartões com menor nível de domínio
                if (aNextReview.getTime() === bNextReview.getTime()) {
                  return (a.mastery_level || 0) - (b.mastery_level || 0);
                }
                
                return aNextReview.getTime() - bNextReview.getTime();
              });
              
              setFlashcards(sortedCards);
              setStudyStats(prev => ({ ...prev, total: sortedCards.length }));
              
              // Iniciar sessão de estudo
              const session = await FlashcardsService.startStudySession(deckId, user.id);
              setStudySession(session);
            }
          }
        } catch (error) {
          console.error('Erro ao buscar dados para estudo:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, params.id]);

  // Timer para controlar o tempo de estudo
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (!isPaused && studySession && !isLoading) {
      timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    
    // Função de cleanup para finalizar a sessão quando o componente for desmontado
    return () => {
      if (timer) clearInterval(timer);
      
      // Finaliza a sessão se existir e não tiver sido finalizada
      if (studySession && studySession.id) {
        // Não podemos usar async diretamente no return do useEffect
        // então criamos uma função imediata
        (async () => {
          try {
            await FlashcardsService.endStudySession(studySession.id, {
              cards_studied: studyStats.completed,
              cards_mastered: studyStats.correct,
              duration_seconds: timeElapsed
            });
            console.log('Sessão de estudo finalizada automaticamente');
          } catch (error) {
            console.error('Erro ao finalizar sessão de estudo:', error);
          }
        })();
      }
    };
  }, [isPaused, studySession, isLoading]);

  // Adicionar useEffect para log do mastery_level quando ele mudar
  useEffect(() => {
    if (flashcards.length > 0 && currentCardIndex < flashcards.length) {
      console.log('Nível de domínio atual do card:', flashcards[currentCardIndex].mastery_level);
    }
  }, [flashcards, currentCardIndex]);

  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleCardResponse = async (result: 'correct' | 'incorrect' | 'hard' | 'easy') => {
    if (!user || !studySession || currentCardIndex >= flashcards.length) return;
    
    const currentCard = flashcards[currentCardIndex];
    
    // Calcular novo nível de domínio baseado na resposta
    let newMasteryLevel = Number(currentCard.mastery_level || 0);
    console.log('Nível de domínio atual:', newMasteryLevel);
    
    switch (result) {
      case 'correct':
        newMasteryLevel = Math.min(100, newMasteryLevel + 10);
        setStudyStats(prev => ({ ...prev, correct: prev.correct + 1, completed: prev.completed + 1 }));
        break;
      case 'easy':
        newMasteryLevel = Math.min(100, newMasteryLevel + 15);
        setStudyStats(prev => ({ ...prev, correct: prev.correct + 1, completed: prev.completed + 1 }));
        break;
      case 'hard':
        newMasteryLevel = Math.max(0, newMasteryLevel + 5);
        setStudyStats(prev => ({ ...prev, correct: prev.correct + 1, completed: prev.completed + 1 }));
        break;
      case 'incorrect':
        newMasteryLevel = Math.max(0, newMasteryLevel - 10);
        setStudyStats(prev => ({ ...prev, incorrect: prev.incorrect + 1, completed: prev.completed + 1 }));
        break;
    }
    
    console.log('Novo nível de domínio calculado:', newMasteryLevel);
    
    // Registrar revisão
    try {
      // Verifica se é estudo personalizado (usando apenas a flag local)
      if (showCustomStudyModal) {
        await FlashcardsService.recordCustomCardReview({
          card_id: currentCard.id,
          session_id: studySession.id,
          result,
          response_time_ms: 0,
          previous_mastery: currentCard.mastery_level,
          new_mastery: currentCard.mastery_level, // Mantém o mesmo nível de domínio
          user_id: user.id
        });
        
        // Atualizar o cartão localmente sem alterar o nível de domínio
        const updatedFlashcards = [...flashcards];
        updatedFlashcards[currentCardIndex] = {
          ...currentCard,
          review_count: currentCard.review_count + 1,
          last_reviewed: new Date().toISOString()
          // Não atualiza mastery_level ou next_review
        };
        
        setFlashcards(updatedFlashcards);
      } else {
        // Estudo normal que afeta o domínio
        await FlashcardsService.recordCardReview({
          card_id: currentCard.id,
          session_id: studySession.id,
          result,
          response_time_ms: 0,
          previous_mastery: Number(currentCard.mastery_level || 0),
          new_mastery: newMasteryLevel,
          user_id: user.id
        });
        
        // Atualiza o flashcard no banco
        await FlashcardsService.updateFlashcard(currentCard.id, {
          mastery_level: newMasteryLevel,
          review_count: (currentCard.review_count || 0) + 1,
          last_reviewed: new Date().toISOString(),
          next_review: calculateNextReviewDate(newMasteryLevel, result)
        });
        
        console.log('Flashcard atualizado no banco');
        
        // Atualizar o cartão no estado local com o novo nível de domínio
        const updatedCard = {
          ...currentCard,
          mastery_level: newMasteryLevel,
          review_count: (currentCard.review_count || 0) + 1,
          last_reviewed: new Date().toISOString(),
          next_review: calculateNextReviewDate(newMasteryLevel, result)
        };
        
        // Criar um novo array para forçar a renderização
        const newFlashcards = [...flashcards];
        newFlashcards[currentCardIndex] = updatedCard;
        
        // Forçar atualização imediata do estado
        setFlashcards(newFlashcards);
        
        console.log('Estado local atualizado com novo nível de domínio:', newMasteryLevel);
        
        // Forçar uma segunda atualização após um pequeno delay para garantir a renderização
        setTimeout(() => {
          const forcedUpdate = [...flashcards];
          forcedUpdate[currentCardIndex] = {
            ...forcedUpdate[currentCardIndex],
            mastery_level: newMasteryLevel
          };
          setFlashcards(forcedUpdate);
          console.log('Forçando segunda atualização do estado');
        }, 100);
      }
      
      // Avançar para o próximo cartão após um delay maior para garantir que a UI foi atualizada
      setTimeout(() => {
        goToNextCard();
      }, 800);
    } catch (error) {
      console.error('Erro ao registrar revisão:', error);
    }
  };

  const calculateNextReviewDate = (masteryLevel: number, result: string): string => {
    const now = new Date();
    let daysToAdd = 1;
    
    // Algoritmo simples de repetição espaçada
    if (masteryLevel >= 90) {
      daysToAdd = result === 'easy' ? 30 : 20; // Revisão em 20-30 dias
    } else if (masteryLevel >= 70) {
      daysToAdd = result === 'easy' ? 14 : 10; // Revisão em 10-14 dias
    } else if (masteryLevel >= 50) {
      daysToAdd = result === 'easy' ? 7 : 5; // Revisão em 5-7 dias
    } else if (masteryLevel >= 30) {
      daysToAdd = result === 'easy' ? 3 : 2; // Revisão em 2-3 dias
    } else {
      daysToAdd = result === 'easy' ? 2 : 1; // Revisão em 1-2 dias
    }
    
    now.setDate(now.getDate() + daysToAdd);
    return now.toISOString();
  };

  // Calcula o nível de domínio projetado após cada tipo de resposta
  const calculateProjectedMastery = (currentMastery: number, responseType: 'correct' | 'incorrect' | 'hard' | 'easy'): number => {
    switch (responseType) {
      case 'easy':
        return Math.min(100, currentMastery + 15);
      case 'correct':
        return Math.min(100, currentMastery + 10);
      case 'hard':
        return Math.min(100, currentMastery + 5);
      case 'incorrect':
        return Math.max(0, currentMastery - 10);
    }
  };

  const goToNextCard = () => {
    setIsFlipped(false);
    
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      setAllCardsCompleted(true);
    }
  };

  const goToPreviousCard = () => {
    if (currentCardIndex > 0) {
      setIsFlipped(false);
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const finishStudySession = async () => {
    if (!studySession) return;
    
    try {
      setIsFinishing(true);
      
      // Registrar o fim da sessão
      await FlashcardsService.endStudySession(studySession.id, {
        cards_studied: studyStats.completed,
        cards_mastered: studyStats.correct,
        duration_seconds: timeElapsed
      });
      
      // Atualizar o deck para refletir as alterações
      if (deck && deck.deck_id) {
        await FlashcardsService.updateDeck(deck.deck_id, {
          last_studied: new Date().toISOString()
        });
      }
      
      // Redirecionar para a página do deck
      router.push(`/flashcards/deck/${params.id}`);
    } catch (error) {
      console.error('Erro ao finalizar sessão de estudo:', error);
    } finally {
      setIsFinishing(false);
    }
  };

  const startCustomStudy = async () => {
    if (!user || !deck) return;
    
    try {
      // Inicia uma nova sessão de estudo personalizado
      const deckId = deck.deck_id || params.id;
      const customSession = await FlashcardsService.startCustomStudySession(deckId, user.id);
      
      // Busca todos os flashcards do deck para estudo personalizado
      const allCards = await FlashcardsService.getFlashcards(deckId);
      
      // Atualiza o estado
      setStudySession(customSession);
      setAllCardsCompleted(false);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      
      // Reordenar os cards aleatoriamente para estudo personalizado
      if (allCards.length > 0) {
        const shuffledCards = [...allCards].sort(() => Math.random() - 0.5);
        setFlashcards(shuffledCards);
      }
      
      setStudyStats({
        correct: 0,
        incorrect: 0,
        skipped: 0,
        total: allCards.length,
        completed: 0
      });
      setTimeElapsed(0);
      setShowCustomStudyModal(true); // Marca como estudo personalizado
    } catch (error) {
      console.error('Erro ao iniciar estudo personalizado:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const restartStudySession = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudyStats({
      correct: 0,
      incorrect: 0,
      skipped: 0,
      total: flashcards.length,
      completed: 0
    });
    setTimeElapsed(0);
    setAllCardsCompleted(false);
    setShowCustomStudyModal(false);
  };

  const handleAnswerCard = (difficulty: 'easy' | 'medium' | 'hard' | 'incorrect') => {
    // Mapeia as dificuldades do mobile para as do sistema existente
    const difficultyMap = {
      'easy': 'easy' as const,
      'medium': 'correct' as const,
      'hard': 'hard' as const,
      'incorrect': 'incorrect' as const
    };
    
    handleCardResponse(difficultyMap[difficulty]);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!deck || flashcards.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-lg font-medium mb-2">
            {!deck ? "Deck não encontrado" : "Este deck não possui cartões"}
          </h3>
          <p className="text-gray-500 mb-4">
            {!deck 
              ? "O deck que você está procurando não existe ou foi removido."
              : "Adicione cartões ao deck antes de iniciar uma sessão de estudo."}
          </p>
          <Button onClick={() => router.push('/flashcards')}>
            Voltar para Flashcards
          </Button>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentCardIndex] || null;
  const progress = (studyStats.completed / studyStats.total) * 100;

  // Debug log para verificar o estado
  console.log('Debug - currentCard:', currentCard);
  console.log('Debug - flashcards length:', flashcards.length);
  console.log('Debug - currentCardIndex:', currentCardIndex);

  if (allCardsCompleted) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="mb-6 text-green-500">
              <CheckCircle className="h-16 w-16" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Parabéns!</h2>
            <p className="text-lg mb-6">
              Você terminou todos os cards programados para hoje.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6 max-w-md">
              <p className="text-sm text-blue-700">
                Você pode usar o <span className="font-semibold">estudo personalizado</span> para revisar todos os cards do baralho, 
                incluindo aqueles que ainda não estão programados para revisão. Este estudo não afetará o sistema de repetição espaçada.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/flashcards/deck/${deck?.deck_id || params.id}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar ao Deck</span>
              </Button>
              
              <Button 
                onClick={startCustomStudy}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
              >
                <BookOpen className="h-4 w-4" />
                <span>Iniciar Estudo Personalizado</span>
              </Button>
              
              <Button 
                onClick={finishStudySession}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
              >
                <Save className="h-4 w-4" />
                <span>Salvar e Finalizar</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileStudy
        deck={deck}
        currentCard={currentCard}
        currentCardIndex={currentCardIndex}
        totalCards={flashcards.length}
        isFlipped={isFlipped}
        studyStats={studyStats}
        timeElapsed={timeElapsed}
        isLoading={isLoading}
        showCompletionScreen={allCardsCompleted}
        onFlipCard={handleFlipCard}
        onAnswerCard={handleAnswerCard}
        onPreviousCard={goToPreviousCard}
        onFinishSession={finishStudySession}
        onRestartSession={restartStudySession}
        onGoBack={() => router.push('/flashcards')}
        calculateProjectedMastery={calculateProjectedMastery}
        formatTime={formatTime}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Link href={`/flashcards/deck/${params.id}`} className="mr-4">
              <Button variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0 hover:bg-white/80">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{deck?.name || 'Carregando...'}</h1>
              <p className="text-sm text-gray-600">{deck?.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-600">Progresso</div>
              <div className="font-medium">{studyStats.completed} / {studyStats.total}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-sm font-medium">{formatTime(timeElapsed)}</div>
          </div>
        </div>
        
        <div className="w-full bg-white rounded-full h-2 mb-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(studyStats.completed / studyStats.total) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="mb-6">
        <div className={`flip-card ${isFlipped ? 'flipped' : ''} ${
          Number(currentCard.mastery_level || 0) >= 80 ? 'green' : 
          Number(currentCard.mastery_level || 0) >= 50 ? 'blue' : 
          'purple'
        }`} onClick={handleFlipCard}>
          <div className="flip-card-inner">
            <div className="flip-card-front">
              <div className="absolute top-4 left-4">
                {currentCard.tags?.map((tag, index) => (
                  <span key={index} className="inline-block bg-gray-200 rounded-full px-2 py-1 text-xs font-semibold text-gray-700 mr-1 mb-1">
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="absolute top-4 right-4">
                <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                  currentCard.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                  currentCard.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  currentCard.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {currentCard.difficulty || 'Não definido'}
                </span>
              </div>
              
              <div className="flip-card-content">
                <h3 className="flip-card-title">Pergunta</h3>
                <p className="flip-card-text">{currentCard.front}</p>
                <p className="text-sm text-gray-500 mt-4">
                  Clique para virar
                </p>
              </div>
            </div>
            
            <div className="flip-card-back">
              <div className="flip-card-content">
                <h3 className="flip-card-title">Resposta</h3>
                <p className="flip-card-text">{currentCard.back}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-col mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-gray-700">Nível de Domínio Atual</span>
            </div>
            <div className="mb-4 relative">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-2xl text-blue-700" key={`mastery-${currentCardIndex}-${currentCard.mastery_level}`}>
                  {Number(currentCard.mastery_level || 0)}%
                </span>
                <div className="flex items-center">
                  {Number(currentCard.mastery_level || 0) >= 80 ? (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">Dominado</span>
                  ) : Number(currentCard.mastery_level || 0) >= 50 ? (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">Aprendendo</span>
                  ) : Number(currentCard.mastery_level || 0) > 0 ? (
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full font-medium">Iniciante</span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full font-medium">Novo</span>
                  )}
                </div>
              </div>
              
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    Number(currentCard.mastery_level || 0) >= 80 ? "bg-gradient-to-r from-green-400 to-green-600" :
                    Number(currentCard.mastery_level || 0) >= 50 ? "bg-gradient-to-r from-blue-400 to-blue-600" :
                    Number(currentCard.mastery_level || 0) >= 30 ? "bg-gradient-to-r from-amber-400 to-amber-600" :
                    "bg-gradient-to-r from-red-400 to-red-600"
                  }`}
                  style={{ width: `${Number(currentCard.mastery_level || 0)}%` }}
                  key={`progress-${currentCardIndex}-${currentCard.mastery_level}`}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <button
              onClick={() => handleCardResponse('correct')}
              className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-center hover:shadow-lg transition-all transform hover:-translate-y-1 border border-blue-400 shadow-md"
            >
              <div className="font-semibold text-white mb-2 text-base flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Correto
              </div>
              <span className="font-medium text-blue-100">+10% → {calculateProjectedMastery(Number(currentCard.mastery_level || 0), 'correct')}%</span>
            </button>
            
            <button
              onClick={() => handleCardResponse('easy')}
              className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-center hover:shadow-lg transition-all transform hover:-translate-y-1 border border-green-400 shadow-md"
            >
              <div className="font-semibold text-white mb-2 text-base flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Fácil
              </div>
              <span className="font-medium text-green-100">+15% → {calculateProjectedMastery(Number(currentCard.mastery_level || 0), 'easy')}%</span>
            </button>
            
            <button
              onClick={() => handleCardResponse('hard')}
              className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 rounded-xl text-center hover:shadow-lg transition-all transform hover:-translate-y-1 border border-amber-400 shadow-md"
            >
              <div className="font-semibold text-white mb-2 text-base flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Difícil
              </div>
              <span className="font-medium text-amber-100">+5% → {calculateProjectedMastery(Number(currentCard.mastery_level || 0), 'hard')}%</span>
            </button>
            
            <button
              onClick={() => handleCardResponse('incorrect')}
              className="bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-xl text-center hover:shadow-lg transition-all transform hover:-translate-y-1 border border-red-400 shadow-md"
            >
              <div className="font-semibold text-white mb-2 text-base flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Incorreto
              </div>
              <span className="font-medium text-red-100">-10% → {calculateProjectedMastery(Number(currentCard.mastery_level || 0), 'incorrect')}%</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {isFlipped ? (
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={goToPreviousCard}
              disabled={currentCardIndex === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl border-gray-300 hover:bg-gray-100 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Anterior</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={finishStudySession}
              className="flex items-center gap-2 px-5 py-2 rounded-xl border-gray-300 hover:bg-gray-100 transition-all"
            >
              <span>Finalizar</span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={goToPreviousCard}
              disabled={currentCardIndex === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl border-gray-300 hover:bg-gray-100 transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Anterior</span>
            </Button>
            
            <Button 
              variant="default"
              onClick={handleFlipCard}
              className="flex-1 mx-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-5 py-2 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              <span className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                </svg>
                Virar Cartão
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={finishStudySession}
              className="flex items-center gap-2 px-5 py-2 rounded-xl border-gray-300 hover:bg-gray-100 transition-all"
            >
              <span>Finalizar</span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
        
        <div className="flex justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col items-center">
            <div className="text-sm text-gray-500 mb-1">Corretos</div>
            <div className="text-xl font-bold text-green-600">{studyStats.correct}</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-sm text-gray-500 mb-1">Incorretos</div>
            <div className="text-xl font-bold text-red-600">{studyStats.incorrect}</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-sm text-gray-500 mb-1">Restantes</div>
            <div className="text-xl font-bold text-blue-600">{studyStats.total - studyStats.completed}</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-sm text-gray-500 mb-1">Tempo</div>
            <div className="text-xl font-bold text-purple-600">{formatTime(timeElapsed)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}