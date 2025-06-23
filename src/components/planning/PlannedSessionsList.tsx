import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StudyPlanSession } from '@/services/planning.service';
import { BookOpen, Clock, Calendar, MoreVertical, Edit, Trash2, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface PlannedSessionsListProps {
  sessions: StudyPlanSession[];
  onEditSession?: (session: StudyPlanSession) => void;
  onDeleteSession?: (sessionId: number) => void;
  onStartSession?: (session: StudyPlanSession) => void;
  showActions?: boolean;
  showDate?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  className?: string;
  disciplineNames?: Record<number, string>;
}

export default function PlannedSessionsList({
  sessions,
  onEditSession,
  onDeleteSession,
  onStartSession,
  showActions = true,
  showDate = true,
  compact = false,
  emptyMessage = "Nenhuma sessão planejada",
  className = "",
  disciplineNames = {}
}: PlannedSessionsListProps) {
  const router = useRouter();

  if (!sessions || sessions.length === 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  function formatSessionDate(dateString: string | undefined) {
    if (!dateString) return "Data não definida";
    try {
      return format(parseISO(dateString), "dd 'de' MMMM", { locale: ptBR });
    } catch (error) {
      return "Data inválida";
    }
  }

  function formatSessionTime(dateString: string | undefined) {
    if (!dateString) return "Horário não definido";
    try {
      return format(parseISO(dateString), "HH:mm");
    } catch (error) {
      return "Horário inválido";
    }
  }

  function handleViewSession(sessionId: number | undefined) {
    if (sessionId) {
      router.push(`/planejamento/sessao/${sessionId}`);
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {sessions.map((session) => (
        <div
          key={session.id || `temp-${Math.random()}`}
          className={`flex items-start p-3 rounded-lg bg-white border hover:shadow-md transition-shadow ${compact ? 'py-2' : ''}`}
          onClick={() => !showActions && session.id && handleViewSession(session.id)}
        >
          <div className="bg-blue-100 p-2 rounded-lg mr-3">
            <BookOpen className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-blue-700`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-medium ${compact ? 'text-sm' : ''}`}>
              {disciplineNames[session.discipline_id || 0] || 'Disciplina'}
            </h3>
            <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600`}>
              {session.title || 'Sessão de estudo'}
            </p>
            <div>
              <div className={`flex items-center ${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>
                <Clock className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
                <span>{formatSessionTime(session.scheduled_date)} - {session.duration_minutes || 0} min</span>
              </div>
              
              {showDate && (
                <div className={`flex items-center ${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>
                  <Calendar className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
                  <span>{formatSessionDate(session.scheduled_date)}</span>
                </div>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onStartSession && (
                    <DropdownMenuItem 
                      onClick={() => onStartSession(session)}
                      className="text-green-600 focus:text-green-600"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Iniciar Sessão
                    </DropdownMenuItem>
                  )}
                  {onEditSession && (
                    <DropdownMenuItem onClick={() => onEditSession(session)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {onDeleteSession && session.id && (
                    <DropdownMenuItem 
                      onClick={() => session.id ? onDeleteSession(session.id) : undefined}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 
