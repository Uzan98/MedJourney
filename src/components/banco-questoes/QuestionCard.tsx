import React from 'react';
import Link from 'next/link';
import { Question } from '@/services/questions-bank.service';
import { Edit, Trash2, Eye, Book } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  onDelete: (id: number) => void;
  disciplineName?: string;
}

export default function QuestionCard({ question, onDelete, disciplineName }: QuestionCardProps) {
  // Função para obter a cor da dificuldade
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'baixa':
        return 'bg-green-100 text-green-800';
      case 'média':
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'alta':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Função para obter o label do tipo de questão
  const getQuestionTypeLabel = (type?: string) => {
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
  
  // Função para normalizar a dificuldade e lidar com ambas as variações (média/media)
  const normalizeDifficulty = (difficulty?: string): string => {
    if (!difficulty) return 'media';
    return difficulty.toLowerCase() === 'média' ? 'media' : difficulty.toLowerCase();
  };

  const normalizedDifficulty = normalizeDifficulty(question.difficulty);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center mb-3">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              normalizedDifficulty === 'baixa' ? 'bg-green-500' : 
              normalizedDifficulty === 'media' ? 'bg-yellow-500' : 
              normalizedDifficulty === 'alta' ? 'bg-red-500' : 'bg-gray-500'
            }`}></div>
            <span className="text-xs font-medium text-gray-500 uppercase">{getQuestionTypeLabel(question.question_type)}</span>
          </div>
          <div className="flex space-x-1">
            <Link
              href={`/banco-questoes/questao/${question.id}`}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Eye className="h-4 w-4" />
            </Link>
            <Link
              href={`/banco-questoes/questao/${question.id}/editar`}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit className="h-4 w-4" />
            </Link>
            <button
              onClick={() => question.id && onDelete(question.id)}
              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-gray-800 font-medium line-clamp-2 text-base">{question.content}</h3>
        </div>
        
        <div className="flex flex-wrap items-center justify-between mt-4">
          <div className="flex items-center text-gray-500 text-sm">
            <Book className="h-4 w-4 mr-1.5" />
            <span>{disciplineName || 'Sem disciplina'}</span>
          </div>
          
          <div className="text-gray-400 text-xs">
            {formatDate(question.created_at)}
          </div>
        </div>
        
        {question.tags && question.tags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-1.5">
              {question.tags.map((tag, idx) => (
                <span 
                  key={idx} 
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
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
} 
