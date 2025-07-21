'use client';

import { useState, useEffect } from 'react';
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
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FlashcardsService } from '@/services/flashcards.service';
import { Deck, FlashcardStats } from '@/types/flashcards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import CreateDeckModal from '@/components/flashcards/CreateDeckModal';

export default function FlashcardsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);

  // Função para ajustar a cor para criar um gradiente
  const adjustColor = (color: string, amount: number): string => {
    // Se a cor não for um valor hexadecimal válido, retorna a cor original
    if (!color || !color.startsWith('#') || color.length !== 7) {
      return color;
    }
    
    // Converte a cor hex para RGB
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);
    
    // Ajusta os valores RGB
    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));
    
    // Converte de volta para hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          const [userDecks, userStats] = await Promise.all([
            FlashcardsService.getDecks(user.id),
            FlashcardsService.getUserStats(user.id)
          ]);
          setDecks(userDecks);
          setStats(userStats);
        } catch (error) {
          console.error('Erro ao buscar dados de flashcards:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [user]);

  const filteredDecks = decks.filter(deck => {
    return deck.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deck.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deck.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleCreateDeck = () => {
    setShowCreateDeckModal(true);
  };

  const handleDeckCreated = (newDeck: Deck) => {
    setDecks([newDeck, ...decks]);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Flashcards</h1>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Buscar decks..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={handleCreateDeck} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            <span>Criar Deck</span>
          </Button>
        </div>
      </div>

      {stats && (
        <>
          <div className="flex items-center mb-4">
            <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full mr-3"></div>
            <h2 className="text-xl font-semibold">Estatísticas de Desempenho</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Card de Total de Cartões */}
            <div className="stats-card-1 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md overflow-hidden transform transition-all hover:shadow-lg hover:scale-[1.02]">
              <div className="relative p-6">
                <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                  <Layers className="w-full h-full text-blue-500" />
                </div>
                <div className="relative z-10">
                  <p className="text-sm font-medium text-blue-600 mb-1">Total de Cartões</p>
                  <div className="flex items-center">
                    <p className="text-3xl font-bold text-blue-700">{stats.total_cards}</p>
                    <div className="ml-3 p-2 bg-blue-100 rounded-lg">
                      <Layers className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card de Domínio Geral */}
            <div className="stats-card-2 bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl shadow-md overflow-hidden transform transition-all hover:shadow-lg hover:scale-[1.02]">
              <div className="relative p-6">
                <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                  <Star className="w-full h-full text-yellow-500" />
                </div>
                <div className="relative z-10">
                  <p className="text-sm font-medium text-yellow-600 mb-1">Domínio Geral</p>
                  <div className="flex items-center">
                    <p className="text-3xl font-bold text-yellow-700">{Math.round(stats.mastery_percentage)}%</p>
                    <div className="ml-3 p-2 bg-yellow-100 rounded-lg">
                      <Star className="h-5 w-5 text-yellow-600" />
                    </div>
                  </div>
                  <div className="mt-3 bg-yellow-200/30 rounded-full h-2 overflow-hidden">
                    <div 
                      className="progress-animate h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
                      style={{ '--target-width': `${Math.round(stats.mastery_percentage)}%` } as React.CSSProperties}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card de Cartões para Revisar */}
            <div className="stats-card-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-md overflow-hidden transform transition-all hover:shadow-lg hover:scale-[1.02]">
              <div className="relative p-6">
                <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                  <Clock className="w-full h-full text-orange-500" />
                </div>
                <div className="relative z-10">
                  <p className="text-sm font-medium text-orange-600 mb-1">Cartões para Revisar</p>
                  <div className="flex items-center">
                    <p className="text-3xl font-bold text-orange-700">{stats.cards_to_review}</p>
                    <div className="ml-3 p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card de Sequência de Estudos */}
            <div className="stats-card-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md overflow-hidden transform transition-all hover:shadow-lg hover:scale-[1.02]">
              <div className="relative p-6">
                <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                  <Calendar className="w-full h-full text-green-500" />
                </div>
                <div className="relative z-10">
                  <p className="text-sm font-medium text-green-600 mb-1">Sequência de Estudos</p>
                  <div className="flex items-center">
                    <p className="text-3xl font-bold text-green-700">{stats.study_streak_days} <span className="text-lg font-medium">dias</span></p>
                    <div className="ml-3 p-2 bg-green-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Seção de decks recentes com scroll horizontal */}
      {!isLoading && filteredDecks.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Meus Decks</h2>
          </div>
          <div className="flashcards-container scroll-1">
            {filteredDecks
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              .map((deck) => (
                <Link href={`/flashcards/deck/${deck.deck_id || deck.id}`} key={deck.deck_id || deck.id} className="flashcard">
                  <div 
                    className="flashcard-image" 
                    style={{ 
                      backgroundColor: deck.cover_color || '#4f46e5',
                      background: deck.cover_color ? 
                        `linear-gradient(to right top, ${deck.cover_color}, ${adjustColor(deck.cover_color, 30)})` : 
                        undefined 
                    }}
                  >
                    {/* Ícone de flashcard com efeito 3D */}
                    <div className="flashcard-icon">
                      <div className="flashcard-icon-inner">
                        <div className="flashcard-icon-front">
                          <CreditCard className="h-5 w-5" style={{ color: deck.cover_color || '#4f46e5' }} />
                        </div>
                        <div className="flashcard-icon-back">
                          <CreditCard className="h-5 w-5" style={{ color: deck.cover_color || '#4f46e5' }} />
                        </div>
                      </div>
                    </div>
                    
                    {/* Contador de cartões */}
                    <div className="flashcard-count">
                      <span>{deck.card_count || 0}</span>
                      <span className="flashcard-count-label">cartões</span>
                    </div>
                  </div>
                  <div className="flashcard-content">
                    <h3 className="flashcard-title">{deck.name}</h3>
                    <p className="flashcard-describe">{deck.description || `${deck.card_count} cartões`}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {deck.tags?.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flashcard-footer">
                    <span className="text-xs text-gray-500">{Math.round(Number(deck.mastery_level || 0))}% dominado</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-0 h-8"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/flashcards/study/${deck.deck_id || deck.id}`);
                      }}
                    >
                      <span className="text-sm">Estudar</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Estado de carregamento ou sem decks */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredDecks.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhum deck encontrado</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm 
              ? "Não encontramos decks que correspondam à sua pesquisa."
              : "Você ainda não criou nenhum deck de flashcards."}
          </p>
          <Button onClick={handleCreateDeck}>
            Criar Primeiro Deck
          </Button>
        </div>
      )}

      {/* Modal de criação de deck */}
      <CreateDeckModal 
        isOpen={showCreateDeckModal} 
        onClose={() => setShowCreateDeckModal(false)}
        onSuccess={handleDeckCreated}
      />
    </div>
  );
} 