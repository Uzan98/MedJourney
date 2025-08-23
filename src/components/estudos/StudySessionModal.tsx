"use client";

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, BookOpen, FileText, CheckCircle } from 'lucide-react';
import { createStudySession } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { StudyStreakService } from "@/lib/study-streak-service";
import { DisciplinesRestService } from "@/lib/supabase-rest";
import { Discipline as SupabaseDiscipline } from "@/lib/supabase";
import { StudySessionService } from "@/services/study-sessions.service";

interface StudySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isScheduling?: boolean; // true = agendar para futuro, false = iniciar agora
  disciplineId?: number;
  disciplineName?: string;
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
  isScheduling = true,
  disciplineId,
  disciplineName
}) => {
  const [title, setTitle] = useState('');
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
      
      // Usar o DisciplinesRestService para buscar as disciplinas
      const disciplinesData = await DisciplinesRestService.getDisciplines(true);
      console.log('Disciplinas obtidas do DisciplinesRestService:', disciplinesData);
      
      if (disciplinesData && disciplinesData.length > 0) {
        // Não filtrar as disciplinas - usar todas retornadas pelo serviço
        // O parâmetro true em getDisciplines já retorna apenas as disciplinas
        // do usuário atual e disciplinas do sistema (is_system = true)
        console.log(`Disciplinas disponíveis: ${disciplinesData.length}`);
        
        // Formatar as disciplinas para o formato esperado pelo componente
        const formattedDisciplines = disciplinesData.map((discipline: SupabaseDiscipline) => {
          return {
            id: discipline.id.toString(),
            name: discipline.name,
            displayName: discipline.name // O nome já vem sem o prefixo "User:" no DisciplinesRestService
          };
        });
        
        setDisciplines(formattedDisciplines);
        console.log('Disciplinas atualizadas no estado:', formattedDisciplines);
        
        // Se não há disciplina selecionada e existem disciplinas disponíveis, selecione a primeira
        if (!selectedDiscipline && formattedDisciplines.length > 0) {
          setSelectedDiscipline(formattedDisciplines[0].id);
          setTitle(`Sessão de ${formattedDisciplines[0].displayName}`);
        }
      } else {
        console.warn('Nenhuma disciplina encontrada:', disciplinesData);
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
  
  // Adicione este useEffect para definir o valor inicial de selectedDiscipline quando disciplineId é fornecido
  useEffect(() => {
    if (isOpen && disciplineId && disciplines.length > 0) {
      const discipline = disciplines.find(d => d.id === disciplineId.toString());
      if (discipline) {
        setSelectedDiscipline(discipline.id);
      }
    }
  }, [isOpen, disciplineId, disciplines]);

  // Função para resetar o formulário
  const resetForm = () => {
    setTitle('');
    setSelectedDiscipline(null);
    setScheduledDate('');
    setScheduledTime('');
    setDuration(60);
    setNotes('');
    setError(null);
  };

  // Redefinir formulário ao fechar
  useEffect(() => {
    if (!isOpen) {
      resetForm();
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
      
      const disciplineId = parseInt(selectedDiscipline);
      
      // Formatar a data e hora corretamente para lidar com o fuso horário
      let formattedDate = '';
      if (isScheduling && scheduledDate && scheduledTime) {
        // Criamos uma data com a data e hora selecionadas pelo usuário
        // Isso garantirá que a data e hora serão processadas no fuso horário local
        const dateParts = scheduledDate.split('-').map(part => parseInt(part));
        const timeParts = scheduledTime.split(':').map(part => parseInt(part));
        
        const year = dateParts[0];
        const month = dateParts[1] - 1; // Meses em JS são 0-indexed
        const day = dateParts[2];
        const hours = timeParts[0];
        const minutes = timeParts[1];
        
        const dateObj = new Date(year, month, day, hours, minutes);
        formattedDate = dateObj.toISOString();
        
        console.log('Data formatada para ISO:', formattedDate);
        console.log('Data local original:', `${scheduledDate} ${scheduledTime}`);
      } else {
        formattedDate = new Date().toISOString();
      }
      
      // Preparar os dados da sessão com tipagem corrigida
      const sessionData = {
        user_id: '', // Será preenchido pelo serviço
        discipline_id: disciplineId,
        title: title.trim() || `Sessão de ${selectedDiscipline}`,
        scheduled_date: formattedDate,
        duration_minutes: duration,
        notes: notes.trim() || undefined,
        completed: !isScheduling, // Se não é agendamento, já marca como concluída
        status: isScheduling ? 'agendada' as const : 'concluida' as const
      };
      
      console.log('Criando sessão:', sessionData);
      
      // Usar o StudySessionService para salvar a sessão
      const result = await StudySessionService.createSession(sessionData);
      
      if (result) {
        toast.success('Sessão de estudo criada com sucesso!');
        resetForm();
        onSuccess?.();
        onClose();
      } else {
        setError('Erro ao criar sessão de estudo');
      }
    } catch (err: any) {
      console.error('Erro ao criar sessão:', err);
      
      // Verificar se é um erro de upgrade necessário
      if (err?.message && err.message.includes('UPGRADE_REQUIRED:')) {
        const message = err.message.replace('UPGRADE_REQUIRED:', '');
        setError(message);
        
        // Mostrar toast de erro
        toast.error(message, { duration: 5000 });
      } else if (err?.message && err.message.includes('Limite diário')) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError('Erro ao se comunicar com o servidor');
      }
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
                    value={selectedDiscipline || ""}
                    onChange={(e) => setSelectedDiscipline(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    required
                    disabled={loadingDisciplines}
                  >
                    <option value="">
                      {loadingDisciplines ? "Carregando disciplinas..." : "Selecione uma disciplina"}
                    </option>
                    {disciplines.length > 0 ? (
                      disciplines.map((discipline) => (
                        <option key={discipline.id} value={discipline.id}>
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

              {/* Informação sobre a sequência de estudos */}
              <div className="bg-orange-50 p-3 rounded-md">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-orange-800">
                    Essa sessão será contabilizada na sua sequência de estudos. Continue estudando diariamente para manter sua sequência!
                  </p>
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
