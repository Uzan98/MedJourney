'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Tag, Type } from 'lucide-react';
import { FacultyService } from '@/services/faculty.service';
import { toast } from '@/components/ui/use-toast';
import { FacultyEvent } from '@/types/community';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: FacultyEvent | null;
  onEventUpdated: () => void;
  isAdmin: boolean;
  isMobile?: boolean;
}

export function EditEventModal({ isOpen, onClose, event, onEventUpdated, isAdmin, isMobile = false }: EditEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [eventType, setEventType] = useState<'exam' | 'assignment' | 'lecture' | 'meeting' | 'other'>('other');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preencher formulário com dados do evento
  useEffect(() => {
    if (event && isOpen) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setLocation(event.location || '');
      
      // Formatar datas para input datetime-local
      if (event.start_date) {
        const startDateTime = new Date(event.start_date);
        setStartDate(formatDateForInput(startDateTime));
      }
      
      if (event.end_date) {
        const endDateTime = new Date(event.end_date);
        setEndDate(formatDateForInput(endDateTime));
      } else {
        setEndDate('');
      }
      
      setAllDay(event.all_day || false);
      setColor(event.color || '#3b82f6');
      setEventType(event.type || 'other');
      setIsPublic(event.is_public !== false);
    }
  }, [event, isOpen]);

  // Função para formatar data para input datetime-local
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Função para formatar data com timezone
  const formatDateWithTimezone = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    try {
      const date = new Date(dateStr);
      return date.toISOString();
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return null;
    }
  };

  // Resetar o formulário
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setStartDate('');
    setEndDate('');
    setAllDay(false);
    setColor('#3b82f6');
    setEventType('other');
    setIsPublic(true);
  };

  // Fechar o modal
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Validar formulário
  const validateForm = (): string | null => {
    if (!title.trim()) {
      return 'O título é obrigatório';
    }
    
    if (!startDate) {
      return 'A data de início é obrigatória';
    }
    
    if (endDate && new Date(endDate) <= new Date(startDate)) {
      return 'A data de fim deve ser posterior à data de início';
    }
    
    return null;
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event) return;
    
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Erro de validação",
        description: validationError,
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await FacultyService.updateFacultyEvent(event.id, {
        title,
        description: description || undefined,
        location: location || undefined,
        start_date: formatDateWithTimezone(startDate)!,
        end_date: endDate ? formatDateWithTimezone(endDate) : undefined,
        all_day: allDay,
        color,
        type: eventType,
        is_public: isPublic
      });

      if (success) {
        toast({
          title: "Evento atualizado",
          description: "O evento foi atualizado com sucesso!",
        });
        resetForm();
        onEventUpdated();
        onClose();
      } else {
        throw new Error('Erro ao atualizar evento');
      }
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      toast({
        title: "Erro ao atualizar evento",
        description: "Não foi possível atualizar o evento. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-lg shadow-lg ${isMobile ? 'max-w-[95vw]' : 'max-w-[600px]'} w-full max-h-[90vh] overflow-y-auto`}>
        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`flex justify-between items-center ${isMobile ? 'mb-3' : 'mb-4'}`}>
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>Editar Evento</h2>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "20" : "24"} height={isMobile ? "20" : "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          
          <div className={`text-sm text-gray-500 ${isMobile ? 'mb-3' : 'mb-4'}`}>
            {isAdmin ? 
              "Edite as informações do evento." : 
              "Apenas administradores podem editar eventos da faculdade."}
          </div>
          
          {isAdmin ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Título do evento */}
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium flex items-center">
                  <Type className="h-4 w-4 mr-2 text-blue-500" />
                  Título
                </label>
                <input
                  id="title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Digite o título do evento"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              
              {/* Descrição */}
              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium">
                  Descrição (opcional)
                </label>
                <textarea
                  id="description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[80px]"
                  placeholder="Descreva os detalhes do evento..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              {/* Local */}
              <div className="space-y-2">
                <label htmlFor="location" className="block text-sm font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                  Local (opcional)
                </label>
                <input
                  id="location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Ex: Sala 101, Bloco A"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              
              {/* Data e hora de início */}
              <div className="space-y-2">
                <label htmlFor="startDate" className="block text-sm font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                  Data e hora de início
                </label>
                <input
                  id="startDate"
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              
              {/* Data e hora de fim */}
              <div className="space-y-2">
                <label htmlFor="endDate" className="block text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-blue-500" />
                  Data e hora de fim (opcional)
                </label>
                <input
                  id="endDate"
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              
              {/* Checkbox para dia inteiro */}
              <div className="flex items-center">
                <input
                  id="allDay"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                />
                <label htmlFor="allDay" className="ml-2 block text-sm text-gray-700">
                  Evento de dia inteiro
                </label>
              </div>
              
              {/* Tipo de evento */}
              <div className="space-y-2">
                <label htmlFor="eventType" className="block text-sm font-medium flex items-center">
                  <Tag className="h-4 w-4 mr-2 text-blue-500" />
                  Tipo de evento
                </label>
                <select
                  id="eventType"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                >
                  <option value="exam">Prova</option>
                  <option value="assignment">Trabalho/Entrega</option>
                  <option value="lecture">Aula/Palestra</option>
                  <option value="meeting">Reunião</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              
              {/* Cor do evento */}
              <div className="space-y-2">
                <label htmlFor="color" className="block text-sm font-medium">
                  Cor do evento
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="color"
                    type="color"
                    className="h-8 w-8 border-0 p-0"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                  <span className="text-sm text-gray-500">
                    Escolha uma cor para identificar o evento
                  </span>
                </div>
              </div>
              
              {/* Visibilidade */}
              <div className="flex items-center">
                <input
                  id="isPublic"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                  Evento público (visível para todos os membros)
                </label>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                  onClick={handleClose}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
                  disabled={isSubmitting || !title.trim() || !startDate}
                >
                  {isSubmitting ? 'Atualizando...' : 'Atualizar Evento'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-6">
              <div className="text-amber-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="m12 9 0 4"/><path d="m12 17 .01 0"/></svg>
              </div>
              <p className="text-gray-700 mb-4">
                Apenas administradores podem editar eventos da faculdade.
              </p>
              <Button onClick={handleClose} variant="outline">
                Fechar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}