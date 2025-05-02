"use client";

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Play, X, Clock, Search, CalendarClock, 
  Loader2, GraduationCap, Calendar, Target, ChevronRight
} from 'lucide-react';
import { StudySession } from '../../lib/types/dashboard';
import { formatDate, formatTime } from '../../lib/utils';
import Link from 'next/link';

// Componente para o Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
}

const Modal = ({ isOpen, onClose, title, children, icon, iconColor = 'bg-indigo-600' }: ModalProps) => {
  // Log para diagnóstico
  useEffect(() => {
    console.log(`Modal "${title}": Estado isOpen mudou para:`, isOpen);
  }, [isOpen, title]);
  
  if (!isOpen) return null;
  
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Fecha o modal apenas se o clique for diretamente no backdrop
    if (e.target === e.currentTarget) {
      console.log(`Modal "${title}": Backdrop clicado, fechando modal`);
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {icon && (
                <div className={`p-2 rounded-md text-white ${iconColor}`}>
                  {icon}
                </div>
              )}
              <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  );
};

// Converte qualquer formato de data para string com formato específico
const safeFormatDate = (dateInput: Date | string): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

interface NextStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  studySessions?: StudySession[];
  onStartSession?: (session: StudySession) => void;
}

const NextStudyModal: React.FC<NextStudyModalProps> = ({ 
  isOpen, 
  onClose, 
  studySessions = [], 
  onStartSession 
}) => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'all'>('upcoming');
  
  // Log para diagnóstico quando o estado de isOpen muda
  useEffect(() => {
    console.log("NextStudyModal: Estado isOpen mudou para:", isOpen);
    if (isOpen) {
      console.log("NextStudyModal: Modal aberto, iniciando carregamento");
      setLoading(true);
      // Simular tempo de carregamento
      setTimeout(() => {
        setLoading(false);
        console.log("NextStudyModal: Carregamento concluído");
      }, 500);
    }
  }, [isOpen]);
  
  const handleStartSession = (session: StudySession) => {
    console.log("NextStudyModal: Iniciando sessão:", session.title);
    if (onStartSession) {
      onStartSession(session);
    } else {
      console.log('Iniciando sessão programada:', session);
      alert(`Sessão programada iniciada: ${session.title}`);
    }
    onClose();
  };
  
  // Funções para exibição e filtragem de dados
  const formatDateWithTime = (dateInput: Date | string): string => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: 'numeric'
    });
  };
  
  const isToday = (dateInput: Date | string): boolean => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };
  
  const isThisWeek = (dateInput: Date | string): boolean => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - dayOfWeek));
    
    return date >= startOfWeek && date <= endOfWeek;
  };
  
  const getRelativeTime = (dateInput: Date | string): string => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);
    
    if (diffMin < 0) return 'Agora';
    if (diffMin < 60) return `${diffMin}min`;
    
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ${diffMin % 60}min`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h`;
  };
  
  // Filtrar sessões com base na pesquisa e na aba selecionada
  const filteredSessions = studySessions.filter(session => {
    const matchesSearch = !searchQuery || 
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.disciplineName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTab === 'upcoming') {
      const sessionDate = typeof session.scheduledDate === 'string' ? 
        new Date(session.scheduledDate) : session.scheduledDate;
      const now = new Date();
      return matchesSearch && sessionDate >= now;
    }
    
    return matchesSearch;
  });
  
  // Organizar sessões por data
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    const dateA = typeof a.scheduledDate === 'string' ? new Date(a.scheduledDate) : a.scheduledDate;
    const dateB = typeof b.scheduledDate === 'string' ? new Date(b.scheduledDate) : b.scheduledDate;
    return dateA.getTime() - dateB.getTime();
  });
  
  // Agrupar sessões
  const todaySessions = sortedSessions.filter(s => isToday(s.scheduledDate));
  const thisWeekSessions = sortedSessions.filter(s => !isToday(s.scheduledDate) && isThisWeek(s.scheduledDate));
  const laterSessions = sortedSessions.filter(s => !isToday(s.scheduledDate) && !isThisWeek(s.scheduledDate));
  
  const nextSession = sortedSessions.length > 0 ? sortedSessions[0] : null;
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Estudos Programados" 
      icon={<BookOpen className="h-5 w-5" />}
      iconColor="bg-green-600"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-green-600 animate-spin mb-4" />
          <p className="text-gray-600">Carregando sessões de estudo...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tabs e pesquisa */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 border-b border-gray-200">
              <button 
                className={`px-3 py-2 text-sm font-medium transition-colors ${selectedTab === 'upcoming' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setSelectedTab('upcoming')}
              >
                Próximas sessões
              </button>
              <button 
                className={`px-3 py-2 text-sm font-medium transition-colors ${selectedTab === 'all' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600 hover:text-gray-800'}`}
                onClick={() => setSelectedTab('all')}
              >
                Todas as sessões
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título ou disciplina..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              />
            </div>
          </div>
          
          {sortedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 rounded-lg">
              <GraduationCap className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium">Nenhuma sessão de estudo encontrada</p>
              <p className="text-sm text-gray-500 mt-1">
                {searchQuery ? 'Tente ajustar sua busca' : 'Crie seu plano de estudos para começar'}
              </p>
            </div>
          ) : (
            <>
              {/* Próxima sessão destacada */}
              {nextSession && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Próxima sessão</span>
                        <span className="text-xs text-gray-500">
                          {getRelativeTime(nextSession.scheduledDate)}
                        </span>
                      </div>
                      <h4 className="text-xl font-semibold text-gray-800 mt-2">{nextSession.title}</h4>
                      <div className="mt-1 bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full inline-block">
                        {nextSession.disciplineName}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <Clock className="h-6 w-6 text-green-700" />
                    </div>
                  </div>
                  
                  <div className="mt-4 bg-white p-3 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-gray-700">
                      <CalendarClock className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Agendado para</p>
                        <p className="text-sm text-gray-600">{formatDateWithTime(nextSession.scheduledDate)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Duração</p>
                        <p className="text-sm text-gray-600">{nextSession.duration} minutos</p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleStartSession(nextSession)}
                    className="w-full mt-4 px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Play className="h-4 w-4" /> 
                    Iniciar agora
                  </button>
                </div>
              )}
              
              {/* Lista de sessões agrupadas */}
              <div className="space-y-6 mt-4">
                {/* Sessões de hoje */}
                {todaySessions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Para hoje
                    </h4>
                    <div className="space-y-2">
                      {todaySessions.map((session) => (
                        <div key={session.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-gray-800">{session.title}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {formatTime(session.duration)}
                                </span>
                                <span className="text-xs text-green-600">
                                  Em {getRelativeTime(session.scheduledDate)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleStartSession(session)}
                              className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                              aria-label="Iniciar sessão"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Sessões desta semana */}
                {thisWeekSessions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Esta semana
                    </h4>
                    <div className="space-y-2">
                      {thisWeekSessions.map((session) => (
                        <div key={session.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-gray-800">{session.title}</h5>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {session.disciplineName}
                                </span>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {formatTime(session.duration)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {safeFormatDate(session.scheduledDate)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleStartSession(session)}
                              className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                              aria-label="Iniciar sessão"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Sessões futuras */}
                {laterSessions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      Mais tarde
                    </h4>
                    <div className="space-y-2">
                      {laterSessions.map((session) => (
                        <div key={session.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium text-gray-800">{session.title}</h5>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {session.disciplineName}
                                </span>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                  {formatTime(session.duration)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {safeFormatDate(session.scheduledDate)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-4">
                <Link 
                  href="/planejamento"
                  className="text-sm text-green-700 hover:text-green-800 font-medium flex items-center gap-1.5"
                >
                  Ver planejamento completo
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

export default NextStudyModal; 