"use client";

import { useState, useEffect } from 'react';
import { X, Clock, BookOpen, FileText, Calendar } from 'lucide-react';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { StudySessionService } from '@/services/study-sessions.service';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ManualStudyTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Discipline {
  id: number;
  name: string;
}

const ManualStudyTimeModal: React.FC<ManualStudyTimeModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [disciplineId, setDisciplineId] = useState<number | undefined>();
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [studyDate, setStudyDate] = useState('');
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar disciplinas
  useEffect(() => {
    const loadDisciplines = async () => {
      if (!user?.id) return;
      
      try {
        const disciplinesData = await DisciplinesRestService.getDisciplines(user.id);
        setDisciplines(disciplinesData || []);
      } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
      }
    };

    if (isOpen) {
      loadDisciplines();
      // Definir data atual como padrão
      const today = new Date().toISOString().split('T')[0];
      setStudyDate(today);
    }
  }, [isOpen, user?.id]);

  // Resetar formulário ao fechar
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDisciplineId(undefined);
      setDuration('');
      setNotes('');
      setStudyDate('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (!duration || parseInt(duration) <= 0) {
      toast.error('Duração deve ser maior que 0');
      return;
    }

    if (!studyDate) {
      toast.error('Data é obrigatória');
      return;
    }

    setIsLoading(true);

    try {
      const durationMinutes = parseInt(duration);
      
      // Criar sessão de estudo já completada
      const sessionData = {
        user_id: user.id,
        title: title.trim(),
        discipline_id: disciplineId,
        duration_minutes: durationMinutes,
        actual_duration_minutes: durationMinutes,
        notes: notes.trim() || undefined,
        scheduled_date: studyDate,
        completed: true,
        status: 'completed',
        type: 'manual'
      };

      await StudySessionService.createSession(sessionData);
      
      toast.success('Tempo de estudo adicionado com sucesso!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao adicionar tempo de estudo:', error);
      toast.error('Erro ao adicionar tempo de estudo');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Adicionar Tempo Manual
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título da Sessão *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Revisão de Anatomia"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Disciplina */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disciplina (Opcional)
            </label>
            <select
              value={disciplineId || ''}
              onChange={(e) => setDisciplineId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione uma disciplina</option>
              {disciplines.map((discipline) => (
                <option key={discipline.id} value={discipline.id}>
                  {discipline.name}
                </option>
              ))}
            </select>
          </div>

          {/* Duração */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duração (minutos) *
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ex: 60"
              min="1"
              max="1440"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data do Estudo *
            </label>
            <input
              type="date"
              value={studyDate}
              onChange={(e) => setStudyDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre a sessão de estudo..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Botões */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                'Adicionar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualStudyTimeModal;