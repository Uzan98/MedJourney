"use client";

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, BookOpen, FileText } from 'lucide-react';
import { createStudySession, getDisciplines } from '../../lib/api';
import { toast } from '../../components/ui/Toast';
import { useRouter } from 'next/navigation';

interface StudySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isScheduling?: boolean; // true = agendar para futuro, false = iniciar agora
}

interface Discipline {
  id: string;
  name: string;
  displayName: string;
}

const StudySessionModal: React.FC<StudySessionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  isScheduling = true
}) => {
  const [title, setTitle] = useState('');
  const [disciplineName, setDisciplineName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDisciplines, setLoadingDisciplines] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null);
  const router = useRouter();

      const fetchDisciplines = async () => {
        try {
          setLoadingDisciplines(true);
      console.log('Buscando disciplinas do usuário...');
          const response = await getDisciplines(true);
      console.log('Resposta da API de disciplinas (apenas usuário):', response);
      
      if (response.success && response.disciplines && Array.isArray(response.disciplines)) {
            console.log(`${response.disciplines.length} disciplinas do usuário encontradas`);
            
            // Adicionar filtro adicional para garantir que só temos disciplinas com prefixo User:
            const userDisciplines = response.disciplines.filter(d => d.Name.startsWith('User:'));
            console.log(`Após filtragem: ${userDisciplines.length} disciplinas com prefixo User:`);
        
        // Para garantir que estamos recebendo dados no formato correto
            const formattedDisciplines = userDisciplines.map(discipline => {
                console.log('Disciplina recebida:', discipline);
            return {
            id: discipline.Id.toString(),
            name: discipline.Name,
            // Armazenar o nome de exibição (sem o prefixo User:)
            displayName: discipline.Name.startsWith('User:') 
              ? discipline.Name.substring(5) // Remover "User:"
              : discipline.Name
            };
          });
          
        setDisciplines(formattedDisciplines);
        console.log('Disciplinas do usuário atualizadas no estado:', formattedDisciplines);
        
        // Se não há disciplina selecionada e existem disciplinas disponíveis, selecione a primeira
        if (!selectedDiscipline && formattedDisciplines.length > 0) {
          setSelectedDiscipline(formattedDisciplines[0].id);
          setDisciplineName(formattedDisciplines[0].name); // Também defina o nome da disciplina
        }
      } else {
        console.warn('Formato inesperado na resposta da API de disciplinas:', response);
        setDisciplines([]);
          }
    } catch (error) {
      console.error('Erro ao buscar disciplinas do usuário:', error);
      setDisciplines([]);
        } finally {
          setLoadingDisciplines(false);
        }
      };

  // useEffect para carregar disciplinas quando o componente monta
  useEffect(() => {
    if (isOpen) {
      console.log('Modal aberto - buscando disciplinas atualizadas');
      fetchDisciplines();
    }
  }, [isOpen]);
  
  // Adicione este useEffect para manipular a mudança de visibilidade do modal
  useEffect(() => {
    if (isOpen) {
      // Reseta o estado do formulário quando o modal é aberto
      resetForm();
      // Busca as disciplinas mais recentes
      fetchDisciplines();
      console.log('Modal aberto, formulário resetado e disciplinas atualizadas');
    }
  }, [isOpen]);
  
  // Função para resetar o formulário
  const resetForm = () => {
    setTitle('');
    setSelectedDiscipline(null);
    setScheduledDate('');
    setDuration(60);
    setError(null);
  };

  // Redefinir formulário ao fechar
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDisciplineName('');
      setScheduledDate('');
      setScheduledTime('');
      setDuration(60);
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar disciplina
    if (!selectedDiscipline) {
      setError('Selecione uma disciplina');
      return;
    }
    
    try {
      setLoading(true);
      
      // Adicionar a duração em minutos
      const sessionData = {
        title: title.trim() || `Sessão de ${selectedDiscipline}`,
        disciplineName: selectedDiscipline,
        scheduledDate: isScheduling 
          ? `${scheduledDate}T${scheduledTime}` 
          : new Date().toISOString(),
        duration,
        notes: notes.trim() || undefined
      };
      
      console.log('Criando sessão:', sessionData);
      
      const response = await createStudySession(sessionData);
      
      if (response.success) {
        // Adicionar a sessão ao cache local se for uma sessão agendada
        if (isScheduling) {
          try {
            // Obter sessões do cache local
            const localSessionsData = localStorage.getItem('@medjourney:study_sessions');
            const localSessions = localSessionsData ? JSON.parse(localSessionsData) : [];
            
            // Adicionar a nova sessão
            localSessions.push({
              ...sessionData,
              id: response.session?.id || `session_${Date.now()}`,
              completed: false
            });
            
            // Salvar no cache
            localStorage.setItem('@medjourney:study_sessions', JSON.stringify(localSessions));
            console.log('Sessão adicionada ao cache local');
          } catch (err) {
            console.error('Erro ao atualizar cache local de sessões:', err);
          }
        }
        
        toast.success('Sessão de estudo criada com sucesso!');
        resetForm();
        onSuccess();
        onClose();
      } else {
        setError(response.error || 'Erro ao criar sessão de estudo');
      }
    } catch (err) {
      console.error('Erro ao criar sessão:', err);
      setError('Erro ao se comunicar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  // Função para redirecionar para a página de disciplinas
  const handleAddDisciplineClick = () => {
    // Fechar o modal atual
    onClose();
    // Redirecionar para a página de disciplinas
    router.push('/disciplinas');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              {isScheduling ? 'Agendar Nova Sessão' : 'Iniciar Sessão de Estudo'}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Título */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Título da sessão *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Revisão de Anatomia"
                  required
                />
              </div>

              {/* Disciplina */}
              <div>
                <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 mb-1">
                  Disciplina *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                  </div>
                  <select
                    id="discipline"
                    value={disciplineName}
                    onChange={(e) => setDisciplineName(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    required
                    disabled={loadingDisciplines}
                  >
                    <option value="">
                      {loadingDisciplines ? "Carregando disciplinas..." : "Selecione uma disciplina"}
                    </option>
                    {disciplines.length > 0 ? (
                      disciplines.map((discipline) => (
                        <option key={discipline.id} value={discipline.name}>
                          {discipline.displayName || discipline.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        {loadingDisciplines ? "Carregando..." : "Nenhuma disciplina cadastrada"}
                      </option>
                    )}
                  </select>
                </div>
                {disciplines.length === 0 && (
                  <p className="mt-1 text-sm text-blue-600">
                    <button 
                      type="button"
                      onClick={handleAddDisciplineClick}
                      className="hover:underline focus:outline-none"
                    >
                      Adicionar nova disciplina
                    </button>
                  </p>
                )}
              </div>

              {/* Data */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Data *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Hora */}
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                  Hora *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="time"
                    id="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Duração */}
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Duração (minutos) *
                </label>
                <input
                  type="number"
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  min="5"
                  max="480"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Notas */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Anotações (opcional)
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-4 w-4 text-gray-400" />
                  </div>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Objetivos, material de estudo, etc."
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : isScheduling ? 'Agendar' : 'Iniciar agora'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudySessionModal; 