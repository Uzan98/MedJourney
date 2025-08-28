'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { EventsClientService, CreateEventData } from '@/lib/services/events-client.service';
import { useIsMobile } from '@/hooks/useIsMobile';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  color?: string;
}

interface SimpleEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: (event: any) => void;
  selectedDate?: Date;
  editingEvent?: CalendarEvent | null;
}

export default function SimpleEventModal({ isOpen, onClose, onEventCreated, selectedDate, editingEvent }: SimpleEventModalProps) {
  const isMobile = useIsMobile();
  
  // Função para formatar data mantendo o horário local (Brasília)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [formData, setFormData] = useState<CreateEventData>({
    title: '',
    description: '',
    start_date: selectedDate ? formatDateForInput(selectedDate) : '',
    end_date: '',
    location: '',
    color: '#3b82f6'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para converter data do Schedule-X (YYYY-MM-DD HH:mm) para datetime-local (YYYY-MM-DDTHH:mm)
  const convertScheduleXToDatetimeLocal = (scheduleXDate: string): string => {
    if (!scheduleXDate) return '';
    // Schedule-X usa formato "YYYY-MM-DD HH:mm", datetime-local precisa "YYYY-MM-DDTHH:mm"
    return scheduleXDate.replace(' ', 'T');
  };

  // Inicializar formulário com dados do evento quando estiver editando
  useEffect(() => {
    if (editingEvent) {
      setFormData({
        title: editingEvent.title || '',
        description: editingEvent.description || '',
        start_date: convertScheduleXToDatetimeLocal(editingEvent.start),
        end_date: convertScheduleXToDatetimeLocal(editingEvent.end),
        location: '',
        color: editingEvent.color || '#3b82f6'
      });
    } else if (selectedDate) {
      setFormData({
        title: '',
        description: '',
        start_date: formatDateForInput(selectedDate),
        end_date: '',
        location: '',
        color: '#3b82f6'
      });
    }
  }, [editingEvent, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Verificar permissões primeiro
      const permission = await EventsClientService.checkEventPermission();
      if (!permission.hasPermission) {
        setError(permission.message || 'Sem permissão para criar eventos');
        return;
      }

      // Validar dados
      if (!formData.title.trim()) {
        setError('Título é obrigatório');
        return;
      }

      if (!formData.start_date) {
        setError('Data e hora de início são obrigatórias');
        return;
      }

      if (formData.end_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
        setError('Data de fim deve ser posterior à data de início');
        return;
      }

      // Preparar dados mantendo o horário local (Brasília)
      const eventDataToSend = {
        ...formData,
        // Manter as datas como estão, sem conversão para UTC
        start_date: formData.start_date,
        end_date: formData.end_date || undefined
      };

      let event;
      if (editingEvent) {
        // Atualizar evento existente
        event = await EventsClientService.updateEvent(editingEvent.id, eventDataToSend);
      } else {
        // Criar novo evento
        event = await EventsClientService.createEvent(eventDataToSend);
      }
      
      if (event) {
        onEventCreated?.(event);
        onClose();
        // Reset form
        setFormData({
          title: '',
          description: '',
          start_date: '',
          end_date: '',
          location: '',
          color: '#3b82f6'
        });
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar evento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateEventData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full max-h-[95vh] overflow-y-auto ${
        isMobile ? 'max-w-[95vw] mx-2' : 'max-w-md'
      }`}>
        <div className={`flex items-center justify-between border-b ${
          isMobile ? 'p-4' : 'p-6'
        }`}>
          <h2 className={`font-semibold text-gray-900 ${
            isMobile ? 'text-lg' : 'text-xl'
          }`}>{editingEvent ? 'Editar Evento' : 'Criar Novo Evento'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={isMobile ? 20 : 24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={`space-y-3 ${
          isMobile ? 'p-4' : 'p-6 space-y-4'
        }`}>
          {error && (
            <div className={`flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg text-red-700 ${
              isMobile ? 'p-2' : 'p-3'
            }`}>
              <AlertCircle size={14} />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>{error}</span>
            </div>
          )}

          <div>
            <label className={`block font-medium text-gray-700 mb-1 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              Título do evento
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'
              }`}
              placeholder="Título do evento"
              required
            />
          </div>

          <div>
            <label className={`block font-medium text-gray-700 mb-1 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              Descrição (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'
              }`}
              placeholder="Descrição (opcional)"
              rows={isMobile ? 2 : 3}
            />
          </div>

          <div>
            <label className={`block font-medium text-gray-700 mb-1 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              Data
            </label>
            <input
              type="date"
              value={formData.start_date ? formData.start_date.split('T')[0] : ''}
              onChange={(e) => {
                const time = formData.start_date ? formData.start_date.split('T')[1] : '09:00';
                handleInputChange('start_date', `${e.target.value}T${time}`);
              }}
              className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'
              }`}
              placeholder="dd/mm/aaaa"
              required
            />
          </div>

          <div className={`grid grid-cols-2 ${
            isMobile ? 'gap-2' : 'gap-4'
          }`}>
            <div>
              <label className={`block font-medium text-gray-700 mb-1 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>
                Hora de início
              </label>
              <input
                type="time"
                value={formData.start_date ? formData.start_date.split('T')[1] : ''}
                onChange={(e) => {
                  const date = formData.start_date ? formData.start_date.split('T')[0] : new Date().toISOString().split('T')[0];
                  handleInputChange('start_date', `${date}T${e.target.value}`);
                }}
                className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'
                }`}
                placeholder="--:--"
                required
              />
            </div>

            <div>
              <label className={`block font-medium text-gray-700 mb-1 ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>
                Hora de fim
              </label>
              <input
                type="time"
                value={formData.end_date ? formData.end_date.split('T')[1] : ''}
                onChange={(e) => {
                  const date = formData.start_date ? formData.start_date.split('T')[0] : new Date().toISOString().split('T')[0];
                  handleInputChange('end_date', `${date}T${e.target.value}`);
                }}
                className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'
                }`}
                placeholder="--:--"
              />
            </div>
          </div>

          <div>
            <label className={`block font-medium text-gray-700 mb-1 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              Cor
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                className={`border border-gray-300 rounded cursor-pointer ${
                  isMobile ? 'w-8 h-8' : 'w-12 h-10'
                }`}
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                className={`flex-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'
                }`}
                placeholder="#3b82f6"
              />
            </div>
          </div>

          <div className={`flex gap-2 ${
            isMobile ? 'pt-2' : 'gap-3 pt-4'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors ${
                isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'
              }`}
            >
              {isLoading ? (editingEvent ? 'Atualizando...' : 'Criando...') : (editingEvent ? 'Atualizar Evento' : 'Criar Evento')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}