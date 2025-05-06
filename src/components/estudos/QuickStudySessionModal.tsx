import { useState, useEffect } from "react";
import { StudyStreakService } from "@/lib/study-streak-service";
import { StudySessionService } from "@/services/study-sessions.service";
import { toast } from "react-hot-toast";
import { 
  Clock, 
  BookOpen, 
  CheckCircle, 
  X,
  Loader2
} from "lucide-react";
import { DisciplinesRestService } from "@/lib/supabase-rest";
import { Discipline } from "@/lib/supabase";

interface QuickStudySessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  disciplineId?: number;
  disciplineName?: string;
  initialDuration?: number;
  initialNotes?: string;
}

const QuickStudySessionModal: React.FC<QuickStudySessionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  disciplineId,
  disciplineName,
  initialDuration,
  initialNotes
}) => {
  const [duration, setDuration] = useState<number>(initialDuration || 30);
  const [notes, setNotes] = useState<string>(initialNotes || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDisciplines, setLoadingDisciplines] = useState<boolean>(false);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string | null>(disciplineId ? disciplineId.toString() : null);
  const [selectedDisciplineName, setSelectedDisciplineName] = useState<string | null>(disciplineName || null);

  // Carregar disciplinas quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      loadDisciplines();
    }
  }, [isOpen]);

  // Atualizar a duração e notas quando as props iniciais mudarem
  useEffect(() => {
    if (initialDuration) {
      setDuration(initialDuration);
    }
    if (initialNotes) {
      setNotes(initialNotes);
    }
  }, [initialDuration, initialNotes]);

  // Função para carregar as disciplinas do usuário
  const loadDisciplines = async () => {
    try {
      setLoadingDisciplines(true);
      
      // Buscar disciplinas do usuário e disciplinas do sistema
      const userDisciplines = await DisciplinesRestService.getDisciplines(true);
      
      if (userDisciplines && userDisciplines.length > 0) {
        // Não filtrar - usar todas as disciplinas retornadas pelo serviço
        // O parâmetro true em getDisciplines já retorna as disciplinas
        // relevantes (do usuário + do sistema)
        setDisciplines(userDisciplines);
        
        // Se temos disciplineId como prop, selecione-a
        if (disciplineId) {
          setSelectedDisciplineId(disciplineId.toString());
          setSelectedDisciplineName(findDisciplineName(disciplineId.toString(), userDisciplines));
        } 
        // Caso contrário, selecione a primeira disciplina
        else if (userDisciplines.length > 0) {
          setSelectedDisciplineId(userDisciplines[0].id.toString());
          setSelectedDisciplineName(userDisciplines[0].name);
        }
      } else {
        setDisciplines([]);
      }
    } catch (error) {
      console.error("Erro ao carregar disciplinas:", error);
      setDisciplines([]);
    } finally {
      setLoadingDisciplines(false);
    }
  };

  // Função auxiliar para encontrar o nome da disciplina pelo ID
  const findDisciplineName = (id: string, disciplines: Discipline[]): string | null => {
    const discipline = disciplines.find(d => d.id.toString() === id);
    return discipline ? discipline.name : null;
  };

  // Função para lidar com mudança de disciplina selecionada
  const handleDisciplineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const disciplineId = e.target.value;
    setSelectedDisciplineId(disciplineId);
    setSelectedDisciplineName(findDisciplineName(disciplineId, disciplines));
  };

  // Função para lidar com o envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (duration <= 0) {
      toast.error("A duração deve ser maior que zero");
      return;
    }

    if (!selectedDisciplineId) {
      toast.error("Selecione uma disciplina");
      return;
    }

    try {
      setLoading(true);

      // Registrar a sessão de estudo usando o StudySessionService
      const result = await StudySessionService.recordQuickSession(
        parseInt(selectedDisciplineId),
        duration,
        notes
      );

      if (result) {
        toast.success("Sessão de estudo registrada com sucesso!");
        
        // Resetar formulário
        setDuration(30);
        setNotes("");
        
        // Chamar callback de sucesso
        if (onSuccess) {
          onSuccess();
        }
        
        // Fechar o modal
        onClose();
      } else {
        toast.error("Não foi possível registrar a sessão de estudo");
      }
    } catch (error) {
      console.error("Erro ao registrar sessão de estudo:", error);
      toast.error("Ocorreu um erro ao registrar a sessão");
    } finally {
      setLoading(false);
    }
  };

  // Se o modal não estiver aberto, não renderizar nada
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-medium flex items-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Registrar Sessão de Estudo Rápida
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Seletor de disciplina */}
            <div>
              <label
                htmlFor="discipline"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Disciplina
              </label>
              {loadingDisciplines ? (
                <div className="flex items-center space-x-2 py-2">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <span className="text-sm text-gray-500">Carregando disciplinas...</span>
                </div>
              ) : disciplines.length > 0 ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                  </div>
                  <select
                    id="discipline"
                    value={selectedDisciplineId || ""}
                    onChange={handleDisciplineChange}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selecione uma disciplina</option>
                    {disciplines.map((discipline) => (
                      <option key={discipline.id} value={discipline.id.toString()}>
                        {discipline.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800">
                  Você não tem disciplinas cadastradas. Por favor, crie disciplinas no menu Disciplinas.
                </div>
              )}
            </div>

            {/* Duração */}
            <div>
              <label
                htmlFor="duration"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Duração (minutos)
              </label>
              <input
                type="number"
                id="duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="1"
                max="480"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Informe quanto tempo você estudou (em minutos)
              </p>
            </div>

            {/* Seletor rápido de duração */}
            <div className="flex flex-wrap gap-2">
              {[15, 30, 45, 60, 90, 120].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDuration(min)}
                  className={`px-3 py-1 text-xs rounded-full ${
                    duration === min
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>

            {/* Notas */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notas (opcional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descreva o que você estudou..."
              />
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
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading || disciplines.length === 0}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                  <span>Registrando...</span>
                </div>
              ) : (
                "Registrar Sessão"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickStudySessionModal; 