import DisciplinesList from '@/components/estudos/DisciplinesList';
import { BookOpen, Lightbulb, Brain } from 'lucide-react';

export default function DisciplinasPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Cabeçalho da página com design mais moderno */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 mb-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-3">Disciplinas</h1>
        <p className="text-blue-100 max-w-2xl mb-6">
          Organize suas matérias de estudo, adicione assuntos importantes e acompanhe seu progresso acadêmico de forma eficiente.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg flex items-start">
            <BookOpen className="h-6 w-6 mr-3 text-blue-200 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white">Organize</h3>
              <p className="text-blue-100 text-sm">Crie disciplinas e categorize seus assuntos de estudo</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg flex items-start">
            <Lightbulb className="h-6 w-6 mr-3 text-blue-200 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white">Priorize</h3>
              <p className="text-blue-100 text-sm">Defina importância e dificuldade para cada assunto</p>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg flex items-start">
            <Brain className="h-6 w-6 mr-3 text-blue-200 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-white">Aprenda</h3>
              <p className="text-blue-100 text-sm">Estude de forma estruturada e aumente sua retenção</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lista de disciplinas */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <DisciplinesList />
      </div>
    </div>
  );
} 