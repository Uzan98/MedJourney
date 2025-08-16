import React, { useState } from 'react';
import Link from 'next/link';
import { Question, QuestionsBankService } from '@/services/questions-bank.service';
import { Trash2, Eye, Book, Lock, Globe, User, Plus, Loader2, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface QuestionCardProps {
  question: Question;
  onDelete?: (id: number) => void;
  disciplineName?: string;
  onAccess?: () => boolean;
  isGenomeBank?: boolean;
  onQuestionAdded?: (questionId: number) => void;
}

export default function QuestionCard({ question, onDelete, disciplineName, onAccess, isGenomeBank = false, onQuestionAdded }: QuestionCardProps) {
  const [isAddingToBank, setIsAddingToBank] = useState(false);

  // Função para adicionar a questão ao banco pessoal
  const handleAddToMyBank = async () => {
    if (!question.id) return;
    
    try {
      setIsAddingToBank(true);
      const newQuestionId = await QuestionsBankService.clonePublicQuestion(question.id);
      
      if (newQuestionId) {
        toast.success('Questão adicionada ao seu banco com sucesso!');
        if (onQuestionAdded) {
          onQuestionAdded(newQuestionId);
        }
      }
    } catch (error) {
      console.error('Erro ao adicionar questão ao banco pessoal:', error);
      toast.error('Erro ao adicionar questão ao seu banco');
    } finally {
      setIsAddingToBank(false);
    }
  };

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

  // Handler para verificar acesso antes de navegar para a questão
  const handleQuestionAccess = (e: React.MouseEvent) => {
    if (onAccess && !onAccess()) {
      e.preventDefault();
    }
  };

  const normalizedDifficulty = normalizeDifficulty(question.difficulty);
  
  // Determinar qual nome de disciplina usar
  const displayDisciplineName = question.discipline_name || disciplineName || 'Sem disciplina';

  return (
    <div className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border ${
      isGenomeBank 
        ? 'border-purple-100' 
        : question.from_genoma_bank 
          ? 'border-purple-200' 
          : 'border-gray-100'
    }`}>
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center mb-3">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              normalizedDifficulty === 'baixa' ? 'bg-green-500' : 
              normalizedDifficulty === 'media' ? 'bg-yellow-500' : 
              normalizedDifficulty === 'alta' ? 'bg-red-500' : 'bg-gray-500'
            }`}></div>
            <span className="text-xs font-medium text-gray-500 uppercase">{getQuestionTypeLabel(question.question_type)}</span>
            
            {/* Indicador de questão pública */}
            {question.is_public && !isGenomeBank && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Globe className="h-3 w-3 mr-1" />
                Pública
              </span>
            )}
            
            {/* Indicador de questão adicionada do Genoma Bank */}
            {question.from_genoma_bank && !isGenomeBank && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <Download className="h-3 w-3 mr-1" />
                Genoma Bank
              </span>
            )}
          </div>
          <div className="flex space-x-1">
            <Link
              href={`/banco-questoes/questao/${question.id}`}
              onClick={handleQuestionAccess}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative group"
            >
              <Eye className="h-4 w-4" />
              {onAccess && (
                <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 -bottom-8 left-1/2 transform -translate-x-1/2 w-max">
                  Visualizar
                </span>
              )}
            </Link>
            
            {/* Mostrar botão de exclusão apenas se não for do Genoma Bank */}
            {(!isGenomeBank && onDelete) && (
              <button
                onClick={() => question.id && onDelete(question.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors relative group"
              >
                <Trash2 className="h-4 w-4" />
                <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 -bottom-8 left-1/2 transform -translate-x-1/2 w-max">
                  Excluir
                </span>
              </button>
            )}
            
            {/* Botão para adicionar ao banco pessoal quando for do Genoma Bank */}
            {isGenomeBank && (
              <button
                onClick={handleAddToMyBank}
                disabled={isAddingToBank}
                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors relative group"
              >
                {isAddingToBank ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 -bottom-8 left-1/2 transform -translate-x-1/2 w-max">
                  Adicionar ao meu banco
                </span>
              </button>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <div 
            className="quill-content text-gray-800 font-medium line-clamp-2 text-base max-w-none"
            dangerouslySetInnerHTML={{ __html: question.content || '' }}
          />
        </div>
        
        <div className="flex flex-wrap items-center justify-between mt-4">
          <div className="flex items-center text-gray-500 text-sm">
            <Book className="h-4 w-4 mr-1.5" />
            <span>{displayDisciplineName}</span>
          </div>
          
          <div className="text-gray-400 text-xs">
            {formatDate(question.created_at)}
          </div>
        </div>
        
        {/* Mostrar informações do criador se for do Genoma Bank */}
        {isGenomeBank && question.creator_name && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-gray-500 text-sm">
              <User className="h-3.5 w-3.5 mr-1.5" />
              <span>Criado por: {question.creator_name}</span>
            </div>
          </div>
        )}
        
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
        
        {/* Botão adicionar ao banco (versão grande) para o Genoma Bank */}
        {isGenomeBank && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleAddToMyBank}
              disabled={isAddingToBank}
              className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-300"
            >
              {isAddingToBank ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar ao meu banco
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
