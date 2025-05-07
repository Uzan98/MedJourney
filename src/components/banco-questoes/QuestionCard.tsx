import React from 'react';
import { Question } from '@/services/questions-bank.service';
import { Discipline } from '@/lib/supabase';
import { 
  BookOpen, 
  Tag, 
  Circle, 
  Eye, 
  Edit, 
  Trash2,
  FileText,
  Clock,
  CalendarDays
} from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  disciplines: Discipline[];
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onView,
  onEdit,
  onDelete,
  disciplines
}) => {
  // Função para obter o nome da disciplina pelo ID
  const getDisciplineName = (id: number | undefined) => {
    if (!id) return 'Sem disciplina';
    const discipline = disciplines.find(d => d.id === id);
    return discipline ? discipline.name : 'Disciplina não encontrada';
  };

  // Função para obter a cor de dificuldade
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'baixa':
        return 'bg-green-100 text-green-800';
      case 'média':
        return 'bg-yellow-100 text-yellow-800';
      case 'alta':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Função para obter o label do tipo de questão
  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Múltipla Escolha';
      case 'true_false':
        return 'Verdadeiro/Falso';
      case 'essay':
        return 'Dissertativa';
      default:
        return 'Desconhecido';
    }
  };

  // Função para formatar a data
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-lg text-gray-900 mb-2">
            {/* Limitar o tamanho do conteúdo para exibição */}
            {question.content.length > 100
              ? question.content.substring(0, 100) + '...'
              : question.content}
          </h3>
          
          <div className="flex space-x-1">
            <button 
              onClick={onView}
              className="p-1.5 rounded-full text-blue-600 hover:bg-blue-50"
              title="Visualizar"
            >
              <Eye className="h-5 w-5" />
            </button>
            <button 
              onClick={onEdit}
              className="p-1.5 rounded-full text-yellow-600 hover:bg-yellow-50"
              title="Editar"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button 
              onClick={onDelete}
              className="p-1.5 rounded-full text-red-600 hover:bg-red-50"
              title="Excluir"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          <div className="flex items-center text-sm text-gray-600">
            <BookOpen className="h-4 w-4 mr-1.5 text-blue-500" />
            <span>{getDisciplineName(question.discipline_id)}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <FileText className="h-4 w-4 mr-1.5 text-purple-500" />
            <span>{getQuestionTypeLabel(question.question_type)}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <div className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
              <Circle className="h-3 w-3 mr-1" />
              <span>Dificuldade: {question.difficulty}</span>
            </div>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <CalendarDays className="h-4 w-4 mr-1.5 text-gray-500" />
            <span>Criada em: {formatDate(question.created_at)}</span>
          </div>
        </div>
        
        {question.tags && question.tags.length > 0 && (
          <div className="mt-3 flex items-start">
            <Tag className="h-4 w-4 mr-1.5 text-blue-500 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {question.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard; 