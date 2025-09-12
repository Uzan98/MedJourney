'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FacultyService } from '@/services/faculty.service';
import { FacultyEvent } from '@/types/community';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, Plus, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { Spinner } from '@/components/Spinner';
import { CreateEventModal } from '@/components/comunidade/CreateEventModal';
import { format, parseISO, isSameDay, isSameMonth, isSameYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';

export default function FacultyEventsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [faculty, setFaculty] = useState<any>(null);
  const [events, setEvents] = useState<FacultyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Carregar detalhes da faculdade e eventos
  useEffect(() => {
    const facultyId = Number(params.id);
    if (isNaN(facultyId) || !user) {
      router.push('/minha-faculdade');
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Carregar detalhes da faculdade
        const facultyDetails = await FacultyService.getFacultyDetails(facultyId);
        if (!facultyDetails) {
          router.push('/minha-faculdade');
          return;
        }
        setFaculty(facultyDetails);

        // Verificar se o usuário é membro
        const membership = await FacultyService.checkMembership(facultyId, user.id);
        if (!membership) {
          router.push('/minha-faculdade');
          return;
        }

        // Verificar se é administrador
        const isUserAdmin = membership.role === 'admin' || facultyDetails.owner_id === user.id;
        setIsAdmin(isUserAdmin);

        // Carregar todos os eventos
        const eventsData = await FacultyService.getFacultyEvents(facultyId, undefined, undefined, 100);
        setEvents(eventsData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [params.id, user, router]);

  // Função para abrir o modal de criação de eventos
  const openCreateEventModal = () => {
    setCreateEventModalOpen(true);
  };

  // Função para lidar com a criação de eventos
  const handleEventCreated = async () => {
    console.log('handleEventCreated chamado');
    
    toast({
      title: "Evento criado",
      description: "O evento foi adicionado ao calendário.",
    });

    // Recarregar eventos
    if (faculty) {
      try {
        console.log('Recarregando eventos para faculdade:', faculty.id);
        const eventsData = await FacultyService.getFacultyEvents(faculty.id, undefined, undefined, 100);
        console.log('Novos eventos carregados:', eventsData.length);
        setEvents(eventsData);
      } catch (error) {
        console.error('Erro ao recarregar eventos:', error);
      }
    } else {
      console.log('Faculty não encontrada para recarregar eventos');
    }
  };

  // Função para excluir um evento
  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) {
      return;
    }

    try {
      const success = await FacultyService.deleteFacultyEvent(eventId);
      if (success) {
        toast({
          title: "Evento excluído",
          description: "O evento foi removido com sucesso.",
        });
        // Remover do estado
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      } else {
        throw new Error('Falha ao excluir evento');
      }
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      toast({
        title: "Erro ao excluir evento",
        description: "Não foi possível excluir o evento. Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };

  // Função para editar um evento (placeholder)
  const handleEditEvent = (event: FacultyEvent) => {
    // TODO: Implementar modal de edição
    console.log('Editar evento:', event);
    alert('Funcionalidade de edição será implementada em breve!');
  };

  // Agrupar eventos por mês
  const groupEventsByMonth = (events: FacultyEvent[]) => {
    const grouped: { [key: string]: FacultyEvent[] } = {};
    
    events.forEach(event => {
      const date = parseISO(event.start_date);
      const monthYear = format(date, 'MMMM yyyy', { locale: ptBR });
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      
      grouped[monthYear].push(event);
    });
    
    // Ordenar eventos dentro de cada grupo por data
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      });
    });
    
    return grouped;
  };

  // Formatar data do evento
  const formatEventDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      const now = new Date();
      
      if (isSameDay(date, now)) {
        return `Hoje às ${format(date, 'HH:mm', { locale: ptBR })}`;
      }
      
      if (isSameMonth(date, now) && isSameYear(date, now)) {
        return format(date, "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
      }
      
      return format(date, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error, dateStr);
      return 'Data inválida';
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

  // Estado de carregamento
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  // Eventos agrupados por mês
  const groupedEvents = groupEventsByMonth(events);
  const monthKeys = Object.keys(groupedEvents);

  return (
    <div className="container max-w-5xl mx-auto py-6 px-4">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2" 
            onClick={() => router.push(`/minha-faculdade/${params.id}`)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-blue-600" />
            Eventos
          </h1>
        </div>
        {isAdmin && (
          <Button onClick={openCreateEventModal}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        )}
      </div>

      {/* Lista de eventos */}
      {events.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhum evento agendado</h2>
          <p className="text-gray-500 mb-6">
            {isAdmin 
              ? "Crie seu primeiro evento para compartilhar com os membros da faculdade."
              : "Não há eventos agendados para a faculdade no momento."}
          </p>
          {isAdmin && (
            <Button onClick={openCreateEventModal}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Evento
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {monthKeys.map(month => (
            <div key={month} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-3">
                <h2 className="text-lg font-medium capitalize">{month}</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {groupedEvents[month].map(event => (
                  <div key={event.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium text-lg">{event.title}</h3>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Calendar className="h-4 w-4 mr-1.5" />
                          {formatEventDate(event.start_date)}
                          {event.end_date && (
                            <span className="ml-1">
                              até {format(parseISO(event.end_date), 'HH:mm', { locale: ptBR })}
                            </span>
                          )}
                        </div>
                        {event.location && (
                          <div className="text-sm text-gray-500 mt-1">
                            Local: {event.location}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                          <span 
                            className="px-2 py-1 text-xs rounded-full"
                            style={{ 
                              backgroundColor: event.color ? `${event.color}20` : '#f3f4f6',
                              color: event.color || '#4b5563',
                              border: `1px solid ${event.color ? `${event.color}40` : '#e5e7eb'}`
                            }}
                          >
                            {getEventTypeName(event.type)}
                          </span>
                          
                          {/* Botões de ação */}
                          {(isAdmin || event.creator_id === user?.id) && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleEditEvent(event)}
                                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Editar evento"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteEvent(event.id)}
                                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Excluir evento"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação de eventos */}
      {faculty && (
        <CreateEventModal
          isOpen={createEventModalOpen}
          onClose={() => setCreateEventModalOpen(false)}
          facultyId={faculty.id}
          onEventCreated={handleEventCreated}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}