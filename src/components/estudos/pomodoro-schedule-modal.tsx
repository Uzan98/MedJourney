'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, BookOpen, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PomodoroSchedulingService } from '@/services/pomodoro-scheduling.service';
import { DisciplinesRestService } from '@/lib/supabase-rest';

interface PomodoroScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: () => void;
}

interface Discipline {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  title: string;
  discipline_id: number;
}

const PomodoroScheduleModal = ({ isOpen, onClose, onSessionCreated }: PomodoroScheduleModalProps) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(25); // Duração padrão do pomodoro
  const [disciplineId, setDisciplineId] = useState<number | undefined>();
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Carregar disciplinas
  useEffect(() => {
    const loadDisciplines = async () => {
      try {
        const disciplinesData = await DisciplinesRestService.getDisciplines(true);
        setDisciplines(disciplinesData);
      } catch (error) {
        console.error('Erro ao carregar disciplinas:', error);
      }
    };

    if (isOpen) {
      loadDisciplines();
    }
  }, [isOpen]);

  // Carregar matérias quando disciplina for selecionada
  useEffect(() => {
    const loadSubjects = async () => {
      if (!disciplineId) {
        setSubjects([]);
        return;
      }

      try {
        const subjectsData = await DisciplinesRestService.getSubjects(disciplineId);
        setSubjects(subjectsData);
      } catch (error) {
        console.error('Erro ao carregar matérias:', error);
        setSubjects([]);
      }
    };

    loadSubjects();
  }, [disciplineId]);

  // Resetar formulário quando modal abrir
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      setTitle('');
      setDate(tomorrow.toISOString().split('T')[0]);
      setTime('09:00');
      setDuration(25);
      setDisciplineId(undefined);
      setSubjectId(undefined);
      setNotes('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    
    if (!date || !time) {
      toast.error('Data e hora são obrigatórios');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const scheduledDate = new Date(`${date}T${time}:00`);
      
      const sessionData = {
        title: title.trim(),
        scheduled_date: scheduledDate.toISOString(),
        duration_minutes: duration,
        discipline_id: disciplineId,
        subject_id: subjectId,
        notes: notes.trim() || undefined
      };
      
      const createdSession = await PomodoroSchedulingService.createScheduledSession(sessionData);
      
      if (createdSession) {
        toast.success('Sessão pomodoro agendada com sucesso!');
        onSessionCreated();
        onClose();
      } else {
        toast.error('Erro ao agendar sessão');
      }
    } catch (error) {
      console.error('Erro ao criar sessão agendada:', error);
      toast.error('Erro ao agendar sessão');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500" />
            Agendar Sessão Pomodoro
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

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
              placeholder="Ex: Estudo de Matemática"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora *
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Duração */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duração (minutos)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={15}>15 minutos</option>
              <option value={25}>25 minutos (Pomodoro)</option>
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos</option>
              <option value={90}>90 minutos</option>
            </select>
          </div>

          {/* Disciplina */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Disciplina (opcional)
            </label>
            <select
              value={disciplineId || ''}
              onChange={(e) => {
                const value = e.target.value;
                setDisciplineId(value ? Number(value) : undefined);
                setSubjectId(undefined); // Reset subject when discipline changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione uma disciplina</option>
              {disciplines.map((discipline) => (
                <option key={discipline.id} value={discipline.id}>
                  {discipline.name}
                </option>
              ))}
            </select>
          </div>

          {/* Matéria */}
          {disciplineId && subjects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Matéria (opcional)
              </label>
              <select
                value={subjectId || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSubjectId(value ? Number(value) : undefined);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione uma matéria</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre esta sessão..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Botões */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Agendar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PomodoroScheduleModal;