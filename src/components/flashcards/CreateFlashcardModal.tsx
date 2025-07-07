'use client';

import { useState } from 'react';
import { X, Loader2, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FlashcardsService } from '@/services/flashcards.service';
import { Flashcard } from '@/types/flashcards';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CreateFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId: string;
  onSuccess?: (flashcard: Flashcard) => void;
}

export default function CreateFlashcardModal({ isOpen, onClose, deckId, onSuccess }: CreateFlashcardModalProps) {
  const { user } = useAuth();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [tags, setTags] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Você precisa estar logado para criar um flashcard');
      return;
    }
    
    if (!front.trim() || !back.trim()) {
      setError('Frente e verso do cartão são obrigatórios');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const newFlashcard = await FlashcardsService.createFlashcard({
        deck_id: deckId,
        user_id: user.id,
        front: front.trim(),
        back: back.trim(),
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        difficulty
      });
      
      if (newFlashcard) {
        if (onSuccess) {
          onSuccess(newFlashcard);
        }
        
        // Limpar o formulário
        setFront('');
        setBack('');
        setTags('');
        setDifficulty('medium');
        
        onClose();
      } else {
        setError('Erro ao criar o flashcard');
      }
    } catch (err) {
      console.error('Erro ao criar flashcard:', err);
      setError('Ocorreu um erro ao criar o flashcard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Adicionar Flashcard</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose} disabled={isLoading}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor={isFlipped ? "back" : "front"}>
                {isFlipped ? "Verso do Cartão *" : "Frente do Cartão *"}
              </Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleFlip}
                className="flex items-center gap-1 h-8 px-2"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span className="text-xs">Virar</span>
              </Button>
            </div>
            
            {isFlipped ? (
              <Textarea
                id="back"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Digite a resposta ou explicação aqui"
                disabled={isLoading}
                rows={5}
                required
              />
            ) : (
              <Textarea
                id="front"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="Digite a pergunta ou conceito aqui"
                disabled={isLoading}
                rows={5}
                required
              />
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={isFlipped ? "front" : "back"}>
              {isFlipped ? "Frente do Cartão *" : "Verso do Cartão *"}
            </Label>
            
            {isFlipped ? (
              <Textarea
                id="front"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="Digite a pergunta ou conceito aqui"
                disabled={isLoading}
                rows={5}
                required
              />
            ) : (
              <Textarea
                id="back"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Digite a resposta ou explicação aqui"
                disabled={isLoading}
                rows={5}
                required
              />
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ex: neurônios, sinapses"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="difficulty">Dificuldade</Label>
            <RadioGroup 
              id="difficulty" 
              value={difficulty} 
              onValueChange={(value) => setDifficulty(value as 'easy' | 'medium' | 'hard')}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="easy" id="easy" />
                <Label htmlFor="easy" className="text-green-600">Fácil</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="text-yellow-600">Médio</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hard" id="hard" />
                <Label htmlFor="hard" className="text-red-600">Difícil</Label>
              </div>
            </RadioGroup>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="flex justify-end pt-4 space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adicionando...
                </>
              ) : 'Adicionar Cartão'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 