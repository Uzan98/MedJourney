'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FlashcardsService } from '@/services/flashcards.service';
import { Deck } from '@/types/flashcards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import type { Discipline, Subject } from '@/lib/supabase';

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (deck: Deck) => void;
}

export default function CreateDeckModal({ isOpen, onClose, onSuccess }: CreateDeckModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [coverColor, setCoverColor] = useState('#3B82F6');
  const [disciplineId, setDisciplineId] = useState<string>('none');
  const [subjectId, setSubjectId] = useState<string>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Cores predefinidas para escolha
  const colorOptions = [
    { value: '#4f46e5', label: 'Azul' },
    { value: '#0891b2', label: 'Ciano' },
    { value: '#15803d', label: 'Verde' },
    { value: '#ca8a04', label: 'Amarelo' },
    { value: '#dc2626', label: 'Vermelho' },
    { value: '#7e22ce', label: 'Roxo' },
    { value: '#be185d', label: 'Rosa' },
    { value: '#78716c', label: 'Cinza' }
  ];

  useEffect(() => {
    // Carregar as disciplinas do usuário quando o modal for aberto
    if (isOpen) {
      const loadDisciplines = async () => {
        try {
          const userDisciplines = await DisciplinesRestService.getDisciplines(true);
          setDisciplines(userDisciplines);
        } catch (err) {
          console.error('Erro ao carregar disciplinas:', err);
          setError('Não foi possível carregar as disciplinas');
        }
      };
      
      loadDisciplines();
    }
  }, [isOpen]);

  useEffect(() => {
    // Quando a disciplina muda, atualiza as matérias disponíveis
    if (disciplineId && disciplineId !== 'none') {
      const loadSubjects = async () => {
        try {
          const disciplineSubjects = await DisciplinesRestService.getSubjects(Number(disciplineId));
          setSubjects(disciplineSubjects);
        } catch (err) {
          console.error('Erro ao carregar assuntos:', err);
          setSubjects([]);
        }
      };
      
      loadSubjects();
    } else {
      setSubjects([]);
    }
    setSubjectId('none');
  }, [disciplineId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Você precisa estar logado para criar um deck');
      return;
    }
    
    if (!name.trim()) {
      setError('O nome do deck é obrigatório');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const newDeck = await FlashcardsService.createDeck({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || undefined,
        cover_color: coverColor,
        is_public: isPublic,
        discipline_id: disciplineId !== 'none' && !isNaN(Number(disciplineId)) ? Number(disciplineId) : null,
        subject_id: subjectId !== 'none' && !isNaN(Number(subjectId)) ? Number(subjectId) : null,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
      });
      
      if (newDeck) {
        if (onSuccess) {
          onSuccess(newDeck);
        }
        onClose();
        router.refresh();
      } else {
        setError('Erro ao criar o deck');
      }
    } catch (err) {
      console.error('Erro ao criar deck:', err);
      setError('Ocorreu um erro ao criar o deck');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm sm:max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-3 sm:p-4 border-b bg-gray-50 rounded-t-lg">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Criar Novo Deck</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-200" onClick={onClose} disabled={isLoading}>
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Nome do Deck *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Anatomia - Sistema Nervoso"
                disabled={isLoading}
                required
                className="text-sm"
              />
            </div>
          
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Uma breve descrição do conteúdo deste deck"
                disabled={isLoading}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="discipline" className="text-sm font-medium text-gray-700">Disciplina</Label>
                <Select 
                  value={disciplineId} 
                  onValueChange={setDisciplineId}
                  disabled={isLoading}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {disciplines.map(discipline => (
                    <SelectItem key={discipline.id} value={discipline.id.toString()}>
                      {discipline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium text-gray-700">Matéria</Label>
                <Select 
                  value={subjectId} 
                  onValueChange={setSubjectId}
                  disabled={isLoading || !disciplineId || disciplineId === 'none'}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="color" className="text-sm font-medium text-gray-700">Cor do Deck</Label>
              <div className="grid grid-cols-8 sm:grid-cols-6 gap-1.5 sm:gap-2">
                {colorOptions.map(color => (
                  <div 
                    key={color.value}
                    className={`h-6 sm:h-8 rounded-md cursor-pointer transition-all ${coverColor === color.value ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setCoverColor(color.value)}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-sm font-medium text-gray-700">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Ex: anatomia, sistema nervoso"
                disabled={isLoading}
                className="text-sm"
              />
            </div>
          
            <div className="flex items-center space-x-2">
              <Switch 
                id="public" 
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={isLoading}
              />
              <Label htmlFor="public" className="cursor-pointer text-sm font-medium text-gray-700">Deck Público</Label>
            </div>
          
            {error && (
              <div className="p-2 sm:p-3 text-xs sm:text-sm bg-red-50 border border-red-200 rounded-md text-red-700">
                {error}
              </div>
            )}
          </div>
          
          <div className="border-t bg-gray-50 p-3 sm:p-4 rounded-b-lg">
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
                className="text-sm h-9 sm:h-10"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isLoading}
                className="text-sm h-9 sm:h-10"
              >
                {isLoading ? 'Criando...' : 'Criar Deck'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}