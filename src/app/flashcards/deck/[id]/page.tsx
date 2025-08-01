'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  PlusCircle, 
  Search, 
  Filter, 
  Play, 
  Edit, 
  Trash2, 
  Download, 
  Share2,
  Clock,
  Star,
  Tag,
  BarChart,
  AlertTriangle,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FlashcardsService } from '@/services/flashcards.service';
import { Deck, Flashcard } from '@/types/flashcards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import CreateFlashcardModal from '@/components/flashcards/CreateFlashcardModal';
import EditDeckModal from '@/components/flashcards/EditDeckModal';
import ImportFromExcel from '@/components/flashcards/ImportFromExcel';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'react-hot-toast';

// Confirmation Modal component
function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center mb-4 text-red-600">
          <AlertTriangle className="h-6 w-6 mr-2" />
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        
        <p className="text-gray-700 mb-6">{message}</p>
        
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}

// Modal para importação de Excel
function ImportModal({ 
  isOpen, 
  onClose, 
  deckId,
  onSuccess,
  disableImport,
  maxCardsPerDeck,
  currentCardCount
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  deckId: string;
  onSuccess: () => void;
  disableImport: boolean;
  maxCardsPerDeck: number;
  currentCardCount: number;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Importar Flashcards de Excel</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <ImportFromExcel 
          deckId={deckId} 
          onSuccess={() => {
            onSuccess();
            onClose();
          }} 
          disableImport={disableImport}
          maxCardsPerDeck={maxCardsPerDeck}
          currentCardCount={currentCardCount}
        />
      </div>
    </div>
  );
}

export default function DeckPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const { subscriptionLimits } = useSubscription();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteCardModal, setShowDeleteCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (user && params.id) {
        try {
          // Primeiro busca o deck
          const deckData = await FlashcardsService.getDeck(params.id);
          setDeck(deckData);
          
          // Só busca os flashcards se o deck existir
          if (deckData) {
            const deckId = deckData.deck_id || params.id;
            const cardsData = await FlashcardsService.getFlashcards(deckId);
            setFlashcards(cardsData);
          }
        } catch (error) {
          console.error('Erro ao buscar dados do deck:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, params.id]);

  const filteredFlashcards = flashcards.filter(card => {
    const matchesSearch = 
      card.front.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.back.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'mastered') return matchesSearch && card.mastery_level >= 80;
    if (activeTab === 'learning') return matchesSearch && card.mastery_level < 80 && card.mastery_level > 0;
    if (activeTab === 'new') return matchesSearch && card.mastery_level === 0;
    if (activeTab === 'due') {
      const now = new Date();
      return matchesSearch && card.next_review && new Date(card.next_review) <= now;
    }
    
    return matchesSearch;
  });

  const handleStartStudy = () => {
    const deckId = deck?.deck_id || params.id;
    router.push(`/flashcards/study/${deckId}`);
  };

  // Limite de cards por deck
  const maxCardsPerDeck = subscriptionLimits?.maxFlashcardsPerDeck ?? 30;
  const reachedCardLimit = flashcards.length >= maxCardsPerDeck && maxCardsPerDeck !== -1;

  const handleAddCard = () => {
    setShowAddCardModal(true);
  };

  const handleImportFromExcel = () => {
    if (reachedCardLimit) {
      toast.error(`Você atingiu o limite de ${maxCardsPerDeck} cartões por deck do seu plano. Faça upgrade para criar decks com mais cartões.`);
      return;
    }
    setShowImportModal(true);
  };

  const handleCardCreated = (newCard: Flashcard) => {
    setFlashcards([...flashcards, newCard]);
  };

  const refreshCards = async () => {
    if (deck) {
      const deckId = deck.deck_id || params.id;
      const cardsData = await FlashcardsService.getFlashcards(deckId);
      setFlashcards(cardsData);
    }
  };

  const handleDeleteDeck = async () => {
    if (!deck) return;
    
    setIsDeleting(true);
    try {
      const deckId = deck.deck_id || params.id;
      await FlashcardsService.deleteDeck(deckId);
      
      toast.success('Deck excluído com sucesso!');
      router.push('/flashcards');
    } catch (error) {
      console.error('Erro ao excluir deck:', error);
      toast.error('Ocorreu um erro ao excluir o deck.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDeleteFlashcard = async () => {
    if (!selectedCard) return;
    
    setIsDeletingCard(true);
    try {
      await FlashcardsService.deleteFlashcard(selectedCard.id);
      
      // Remove o cartão da lista local
      setFlashcards(flashcards.filter(card => card.id !== selectedCard.id));
      setShowDeleteCardModal(false);
      toast.success('Cartão excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir flashcard:', error);
      toast.error('Ocorreu um erro ao excluir o cartão.');
    } finally {
      setIsDeletingCard(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMasteryColor = (level: number) => {
    if (level >= 80) return 'text-green-600';
    if (level >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h3 className="text-lg font-medium mb-2">Deck não encontrado</h3>
          <p className="text-gray-500 mb-4">
            O deck que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={() => router.push('/flashcards')}>
            Voltar para Flashcards
          </Button>
        </div>
      </div>
    );
  }

  // Bloqueio visual e funcional para limite de cards por deck
  if (reachedCardLimit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-8 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="bg-amber-100 p-3 rounded-full mb-4">
              <PlusCircle className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Limite de cartões por deck atingido</h2>
            <p className="text-gray-600 mb-6">
              Este deck já possui {flashcards.length} de {maxCardsPerDeck} cartões permitidos pelo seu plano.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6 text-left w-full">
              <p className="text-blue-700">
                Faça upgrade para o plano <strong>Pro</strong> ou <strong>Pro+</strong> para criar decks com mais cartões.
              </p>
            </div>
            <div className="flex gap-4 justify-center">
              <Link href="/perfil/assinatura" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
                <PlusCircle className="h-5 w-5 mr-2" /> Ver planos
              </Link>
              <Link href="/flashcards" className="border border-gray-300 px-4 py-2 rounded-lg text-gray-700">
                Voltar
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex items-center mb-6">
        <Link href="/flashcards" className="mr-4">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{deck.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar esquerdo */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="font-semibold text-lg mb-4">Informações</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Progresso</p>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Domínio</span>
                  <span className="text-sm font-semibold">{Math.round(Number(deck.mastery_level || 0))}%</span>
                </div>
                <Progress value={Math.round(Number(deck.mastery_level || 0))} className="h-2 mb-3" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Total de Cartões</p>
                  <p className="font-bold text-lg">{flashcards.length}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Dominados</p>
                  <p className="font-bold text-lg text-green-600">
                    {flashcards.filter(card => card.mastery_level >= 80).length}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {deck.tags?.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {!deck.tags?.length && (
                    <span className="text-sm text-gray-500">Nenhuma tag definida</span>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  className="w-full flex items-center justify-center gap-2 mb-2"
                  onClick={handleStartStudy}
                >
                  <Play className="h-4 w-4" />
                  <span>Iniciar Estudo</span>
                </Button>
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center justify-center gap-1"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Edit className="h-3 w-3" />
                    <span>Editar</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center justify-center gap-1">
                    <Share2 className="h-3 w-3" />
                    <span>Compartilhar</span>
                  </Button>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-1 border-red-200 hover:bg-red-50 text-red-600"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Excluir Deck</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
              <h2 className="font-semibold text-lg">Cartões</h2>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleImportFromExcel} 
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Importar de Excel</span>
                </Button>
                <Button onClick={handleAddCard} className="flex items-center gap-2" disabled={reachedCardLimit}>
                  <PlusCircle className="h-4 w-4" />
                  <span>Adicionar Cartão</span>
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Buscar cartões..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                  <TabsList className="grid grid-cols-5 w-full sm:w-auto">
                    <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                    <TabsTrigger value="mastered" className="text-xs">Dominados</TabsTrigger>
                    <TabsTrigger value="learning" className="text-xs">Aprendendo</TabsTrigger>
                    <TabsTrigger value="new" className="text-xs">Novos</TabsTrigger>
                    <TabsTrigger value="due" className="text-xs">Pendentes</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {filteredFlashcards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    {searchTerm 
                      ? "Não encontramos cartões que correspondam à sua pesquisa."
                      : "Este deck ainda não possui cartões."}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={handleAddCard}>
                      Adicionar Cartão
                    </Button>
                    <Button variant="outline" onClick={handleImportFromExcel}>
                      Importar de Excel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFlashcards.map((card) => (
                    <Card key={card.id} className="overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium">Frente</h3>
                            <Badge className={getDifficultyColor(card.difficulty)}>
                              {card.difficulty || 'Não definido'}
                            </Badge>
                          </div>
                          <p className="text-gray-700">{card.front}</p>
                        </CardContent>
                        
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium">Verso</h3>
                            <div className="flex items-center">
                              <span className={`font-medium mr-1 ${getMasteryColor(Number(card.mastery_level || 0))}`}>
                                {Number(card.mastery_level || 0)}%
                              </span>
                              <Star className={`h-4 w-4 ${getMasteryColor(Number(card.mastery_level || 0))}`} />
                            </div>
                          </div>
                          <p className="text-gray-700 whitespace-pre-line">{card.back}</p>
                        </CardContent>
                      </div>
                      
                      <CardFooter className="bg-gray-50 flex justify-between py-2">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-500 mr-1" />
                          <span className="text-xs text-gray-500">
                            {card.next_review 
                              ? `Próxima revisão: ${new Date(card.next_review).toLocaleDateString()}`
                              : 'Ainda não revisado'}
                          </span>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedCard(card);
                              setShowDeleteCardModal(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para adicionar cartão */}
      <CreateFlashcardModal
        isOpen={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        deckId={params.id}
        onSuccess={handleCardCreated}
        disableCreate={reachedCardLimit}
        maxCardsPerDeck={maxCardsPerDeck}
      />
      
      {/* Modal para importar de Excel */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        deckId={deck?.deck_id || params.id}
        onSuccess={refreshCards}
        disableImport={reachedCardLimit}
        maxCardsPerDeck={maxCardsPerDeck}
        currentCardCount={flashcards.length}
      />
      
      {/* Modal de confirmação para excluir deck */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteDeck}
        title="Excluir Deck"
        message={`Tem certeza que deseja excluir o deck "${deck?.name}" e todos os seus ${flashcards.length} cartões? Esta ação não pode ser desfeita.`}
      />
      
      {/* Modal de edição de deck */}
      {deck && (
        <EditDeckModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          deck={deck}
          onSuccess={(updatedDeck) => {
            setDeck(updatedDeck);
            toast.success('Deck atualizado com sucesso!');
          }}
        />
      )}
      
      {/* Modal de confirmação para excluir cartão */}
      <ConfirmationModal
        isOpen={showDeleteCardModal}
        onClose={() => setShowDeleteCardModal(false)}
        onConfirm={handleDeleteFlashcard}
        title="Excluir Cartão"
        message="Tem certeza que deseja excluir este cartão? Esta ação não pode ser desfeita."
      />
    </div>
  );
}