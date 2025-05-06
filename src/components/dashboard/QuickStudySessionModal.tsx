import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, BookOpen, X, Check, CalendarClock } from 'lucide-react';
import { registerStudySession } from '@/services/study-activities.service';
import { toast } from 'react-hot-toast';
import { Discipline, Subject } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

interface QuickStudySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickStudySessionModal: React.FC<QuickStudySessionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Carrega as disciplinas e assuntos do usuário
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setIsLoadingData(true);

      try {
        // Busca disciplinas
        const { data: disciplinesData, error: disciplinesError } = await supabase
          .from('disciplines')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true });

        if (disciplinesError) throw disciplinesError;
        setDisciplines(disciplinesData || []);

        // Busca assuntos
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', user.id)
          .order('title', { ascending: true });

        if (subjectsError) throw subjectsError;
        setSubjects(subjectsData || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Não foi possível carregar suas disciplinas e assuntos');
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [user, isOpen]);

  // Filtra os assuntos quando uma disciplina é selecionada
  useEffect(() => {
    if (selectedDiscipline) {
      const filtered = subjects.filter(
        (subject) => subject.discipline_id === Number(selectedDiscipline)
      );
      setFilteredSubjects(filtered);
      // Limpa o assunto selecionado se não estiver na lista filtrada
      if (
        filtered.length > 0 &&
        !filtered.some((s) => s.id === Number(selectedSubject))
      ) {
        setSelectedSubject('');
      }
    } else {
      setFilteredSubjects([]);
      setSelectedSubject('');
    }
  }, [selectedDiscipline, subjects, selectedSubject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedSubject || !selectedDiscipline || duration <= 0) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setIsLoading(true);

    const sessionData = {
      user_id: user.id,
      subject_id: selectedSubject,
      duration_minutes: duration,
      date: new Date().toISOString(),
      notes: notes || undefined,
    };

    try {
      const success = await registerStudySession(sessionData);
      if (success) {
        toast.success('Sessão de estudo registrada com sucesso!');
        onSuccess?.();
        onClose();
        
        // Limpa os campos
        setSelectedDiscipline('');
        setSelectedSubject('');
        setDuration(30);
        setNotes('');
      } else {
        toast.error('Não foi possível registrar a sessão de estudo');
      }
    } catch (error) {
      console.error('Erro ao registrar sessão:', error);
      toast.error('Ocorreu um erro ao registrar sua sessão de estudo');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <CalendarClock className="h-5 w-5 text-purple-500 mr-2" />
            Registrar Sessão de Estudo
          </h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
            disabled={isLoading}
          >
            <span className="sr-only">Fechar</span>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5">
            <div className="space-y-4">
              <div>
                <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 mb-1">
                  Disciplina
                </label>
                <select
                  id="discipline"
                  value={selectedDiscipline}
                  onChange={(e) => setSelectedDiscipline(e.target.value)}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading || isLoadingData}
                  required
                >
                  <option value="">Selecione uma disciplina</option>
                  {disciplines.map((discipline) => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Assunto
                </label>
                <select
                  id="subject"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedDiscipline || isLoading || isLoadingData}
                  required
                >
                  <option value="">Selecione um assunto</option>
                  {filteredSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Duração (minutos)
                </label>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-2" />
                  <input
                    type="number"
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                    min="1"
                    max="480"
                    className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Anotações (opcional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                  placeholder="O que você estudou nesta sessão?"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-5 py-4 rounded-b-lg flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !selectedDiscipline || !selectedSubject}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Registrando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Registrar Sessão
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickStudySessionModal; 