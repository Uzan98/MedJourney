import { Flame, Info, CheckCircle, CalendarClock, BookOpen, PenLine } from 'lucide-react';

interface StudyActivityInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

const StudyActivityInfo: React.FC<StudyActivityInfoProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Flame className="h-5 w-5 text-orange-500 mr-2" />
            Sequência de Estudos
          </h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-500"
            onClick={onClose}
          >
            <span className="sr-only">Fechar</span>
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-700">
                Sua sequência de estudos é um registro dos dias consecutivos em que você realizou 
                pelo menos uma atividade de estudo na plataforma.
              </p>
            </div>
          </div>

          <h4 className="font-medium text-gray-900 mt-6 mb-3">
            Como aumentar sua sequência:
          </h4>

          <ul className="space-y-4">
            <li className="flex">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Concluir um assunto</p>
                <p className="text-sm text-gray-500">
                  Marque um assunto como concluído nas páginas de disciplinas
                </p>
              </div>
            </li>
            <li className="flex">
              <CalendarClock className="h-5 w-5 text-purple-500 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Registrar uma sessão de estudo</p>
                <p className="text-sm text-gray-500">
                  Use o botão flutuante no dashboard para registrar seu tempo de estudo
                </p>
              </div>
            </li>
            <li className="flex">
              <BookOpen className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Completar um quiz</p>
                <p className="text-sm text-gray-500">
                  Finalize um quiz na seção de revisões
                </p>
              </div>
            </li>
            <li className="flex">
              <PenLine className="h-5 w-5 text-amber-500 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Criar anotações</p>
                <p className="text-sm text-gray-500">
                  Adicione notas de estudo aos seus assuntos
                </p>
              </div>
            </li>
          </ul>

          <div className="bg-orange-50 p-4 rounded-md mt-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-800">Lembre-se:</h3>
                <div className="mt-2 text-sm text-orange-700">
                  <p>
                    Para manter sua sequência ativa, realize pelo menos uma atividade de estudo por dia.
                    Sua sequência é reiniciada se ficar um dia inteiro sem estudar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-5 py-4 rounded-b-lg">
          <button
            type="button"
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
            onClick={onClose}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyActivityInfo; 