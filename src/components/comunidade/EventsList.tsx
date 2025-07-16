'use client';

import { useState, useEffect } from 'react';
import { FacultyEvent } from '@/types/community';
import { FacultyService } from '@/services/faculty.service';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventsListProps {
  facultyId: number;
  limit?: number;
  showEmpty?: boolean;
  className?: string;
}

export function EventsList({ facultyId, limit = 5, showEmpty = true, className = '' }: EventsListProps) {
  const [events, setEvents] = useState<FacultyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar eventos
  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const eventsData = await FacultyService.getUpcomingFacultyEvents(facultyId, limit);
      setEvents(eventsData);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar eventos ao montar o componente
  useEffect(() => {
    if (facultyId) {
      loadEvents();
    }
  }, [facultyId]);

  // Formatar a data do evento
  const formatEventDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      
      if (isToday(date)) {
        return `Hoje, ${format(date, 'HH:mm', { locale: ptBR })}`;
      } else if (isTomorrow(date)) {
        return `Amanhã, ${format(date, 'HH:mm', { locale: ptBR })}`;
      } else if (isThisWeek(date)) {
        return format(date, "EEEE', ' HH:mm", { locale: ptBR });
      } else {
        return format(date, "dd 'de' MMMM', ' HH:mm", { locale: ptBR });
      }
    } catch (error) {
      console.error('Erro ao formatar data:', error, dateStr);
      return 'Data inválida';
    }
  };

  // Obter a cor de fundo baseada no tipo de evento
  const getEventTypeColor = (type: string, color?: string) => {
    // Se o evento tem uma cor personalizada, usar ela
    if (color) {
      // Converter para um formato de cor mais claro para o fundo
      return {
        bg: `${color}20`, // 20% de opacidade
        text: color,
        border: `${color}40` // 40% de opacidade
      };
    }
    
    // Cores padrão por tipo
    switch (type) {
      case 'exam':
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
      case 'assignment':
        return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
      case 'lecture':
        return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
      case 'meeting':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  // Obter o nome do tipo de evento
  const getEventTypeName = (type: string) => {
    switch (type) {
      case 'exam': return 'Prova';
      case 'assignment': return 'Trabalho';
      case 'lecture': return 'Aula';
      case 'meeting': return 'Reunião';
      default: return 'Evento';
    }
  };

  // Renderizar estado de carregamento
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }

  // Renderizar mensagem quando não há eventos
  if (events.length === 0 && showEmpty) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">Nenhum evento agendado</p>
        <p className="text-xs text-muted-foreground mt-1">Use o botão "Novo" para adicionar eventos</p>
      </div>
    );
  }

  // Renderizar lista de eventos
  return (
    <div className={`space-y-3 ${className}`}>
      {events.map((event) => {
        const typeColors = getEventTypeColor(event.type, event.color);
        
        return (
          <div 
            key={event.id} 
            className={`p-3 rounded-lg border ${typeColors.border} ${typeColors.bg} relative overflow-hidden`}
          >
            {/* Barra lateral colorida */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-1" 
              style={{ backgroundColor: event.color || getEventTypeName(event.type) }}
            ></div>
            
            <div className="pl-2">
              {/* Título e tipo */}
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium text-gray-900">{event.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${typeColors.bg} ${typeColors.text} border ${typeColors.border}`}>
                  {getEventTypeName(event.type)}
                </span>
              </div>
              
              {/* Data e hora */}
              <div className="flex items-center text-sm text-gray-600 mb-1">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                {formatEventDate(event.start_date)}
                {event.end_date && (
                  <span className="ml-1">
                    até {format(parseISO(event.end_date), 'HH:mm', { locale: ptBR })}
                  </span>
                )}
              </div>
              
              {/* Local, se disponível */}
              {event.location && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-3.5 w-3.5 mr-1.5" />
                  {event.location}
                </div>
              )}
              
              {/* Descrição, se disponível */}
              {event.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 