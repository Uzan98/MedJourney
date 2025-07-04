import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StudyPlanSession } from '@/services/planning.service';
import { BookOpen, Clock, Calendar, MoreVertical, Edit, Trash2, Play, RefreshCw, Award, Star } from 'lucide-react';
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

  // Separar sessões em dois grupos: estudo e revisão
  const studySessions = sessions.filter(session => !session.is_revision);
  const revisionSessions = sessions.filter(session => session.is_revision);

  // Função para obter a cor da dificuldade
  const getDifficultyColor = (difficulty: string | undefined) => {
    if (!difficulty) return "bg-gray-100 text-gray-700";
    
    switch (difficulty.toLowerCase()) {
      case 'fácil':
      case 'facil':
      case 'easy':
        return "bg-green-100 text-green-700";
      case 'médio':
      case 'medio':
      case 'medium':
        return "bg-yellow-100 text-yellow-700";
      case 'difícil':
      case 'dificil':
      case 'hard':
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Função para obter a cor da importância
  const getImportanceColor = (importance: string | undefined) => {
    if (!importance) return "bg-gray-100 text-gray-700";
    
    switch (importance.toLowerCase()) {
      case 'baixa':
      case 'low':
        return "bg-blue-100 text-blue-700";
      case 'média':
      case 'media':
      case 'medium':
        return "bg-indigo-100 text-indigo-700";
      case 'alta':
      case 'high':
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Função para renderizar uma sessão individual
  const renderSession = (session: StudyPlanSession, isRevision: boolean) => (
        <div
          key={session.id || `temp-${Math.random()}`}
      className={`flex items-start p-3 rounded-lg bg-white border hover:shadow-md transition-shadow 
        ${compact ? 'py-2' : ''} 
        ${isRevision ? 'border-purple-200' : 'border-blue-200'}`}
          onClick={() => !showActions && session.id && handleViewSession(session.id)}
        >
      <div className={`p-2 rounded-lg mr-3 ${isRevision ? 'bg-purple-100' : 'bg-blue-100'}`}>
        {isRevision ? (
          <RefreshCw className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${isRevision ? 'text-purple-700' : 'text-blue-700'}`} />
        ) : (
          <BookOpen className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${isRevision ? 'text-purple-700' : 'text-blue-700'}`} />
        )}
          </div>
          <div className="flex-1">
        <div className="flex items-center justify-between">
            <h3 className={`font-medium ${compact ? 'text-sm' : ''}`}>
              {disciplineNames[session.discipline_id || 0] || 'Disciplina'}
            </h3>
          
          {/* Duração em minutos */}
          <div className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
            {session.duration_minutes || 0} min
          </div>
              </div>
        
        <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 mb-2`}>
          {session.title || (isRevision ? 'Sessão de revisão' : 'Sessão de estudo')}
        </p>
              
              {showDate && (
          <div className={`flex items-center ${compact ? 'text-xs' : 'text-sm'} text-gray-500 mb-2`}>
                  <Calendar className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
                  <span>{formatSessionDate(session.scheduled_date)}</span>
                </div>
              )}
        
        {/* Dificuldade e Importância */}
        <div className="flex flex-wrap gap-2 mb-3">
          {session.subject_difficulty && (
            <div className={`flex items-center text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(session.subject_difficulty)}`}>
              <Award className="h-3 w-3 mr-1" />
              <span>Dificuldade: {session.subject_difficulty}</span>
            </div>
          )}
          
          {session.subject_importance && (
            <div className={`flex items-center text-xs px-2 py-0.5 rounded-full ${getImportanceColor(session.subject_importance)}`}>
              <Star className="h-3 w-3 mr-1" />
              <span>Importância: {session.subject_importance}</span>
            </div>
          )}
          </div>
        
        {/* Botão de iniciar sessão */}
        <div className="flex items-center justify-between mt-2">
          {onStartSession && (
            <Button 
              size="sm" 
              variant="outline"
              className={`text-xs ${isRevision ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'}`}
              onClick={(e) => {
                e.stopPropagation();
                onStartSession(session);
              }}
            >
              <Play className="h-3 w-3 mr-1" />
              Iniciar Sessão
            </Button>
          )}
          
          {showActions && (
            <div className="ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
      </div>
    </div>
  );

  return (
    <div className={className}>
      {/* Sessões de estudo */}
      {studySessions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Sessões de Estudo</h2>
            <div className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {studySessions.length}
            </div>
          </div>
          <div className="space-y-3">
            {studySessions.map(session => renderSession(session, false))}
          </div>
        </div>
      )}

      {/* Sessões de revisão */}
      {revisionSessions.length > 0 && (
        <div>
          <div className="flex items-center mb-3">
            <RefreshCw className="h-5 w-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Sessões de Revisão</h2>
            <div className="ml-2 bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {revisionSessions.length}
            </div>
          </div>
          <div className="space-y-3">
            {revisionSessions.map(session => renderSession(session, true))}
          </div>
        </div>
      )}
    </div>
  );
} 
