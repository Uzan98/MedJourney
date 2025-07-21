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
  const [isPublic, setIsPublic] = useState(false);
  const [coverColor, setCoverColor] = useState('#4f46e5');
  const [tags, setTags] = useState('');
  const [disciplineId, setDisciplineId] = useState<string>('none');
  const [subjectId, setSubjectId] = useState<string>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

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
        discipline_id: disciplineId !== 'none' ? disciplineId : undefined,
        subject_id: subjectId !== 'none' ? subjectId : undefined,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Criar Novo Deck</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose} disabled={isLoading}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Deck *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Anatomia - Sistema Nervoso"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Uma breve descrição do conteúdo deste deck"
              disabled={isLoading}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discipline">Disciplina</Label>
              <Select 
                value={disciplineId} 
                onValueChange={setDisciplineId}
                disabled={isLoading}
              >
                <SelectTrigger>
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
              <Label htmlFor="subject">Matéria</Label>
              <Select 
                value={subjectId} 
                onValueChange={setSubjectId}
                disabled={isLoading || !disciplineId || disciplineId === 'none'}
              >
                <SelectTrigger>
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
            <Label htmlFor="color">Cor do Deck</Label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map(color => (
                <div 
                  key={color.value}
                  className={`h-8 rounded-md cursor-pointer transition-all ${coverColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setCoverColor(color.value)}
                  title={color.label}
                />
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ex: anatomia, sistema nervoso, neurologia"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch 
              id="public" 
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isLoading}
            />
            <Label htmlFor="public" className="cursor-pointer">Deck Público</Label>
          </div>
          
          {error && (
            <div className="p-3 text-sm bg-red-50 border-l-4 border-red-500 text-red-700">
              {error}
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Criando...' : 'Criar Deck'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 