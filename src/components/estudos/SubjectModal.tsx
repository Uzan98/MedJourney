"use client";

import React, { useState, useEffect } from 'react';
import { X, BookOpen } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { DisciplinesRestService } from '@/lib/supabase-rest';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  disciplineId: number;
  disciplineName: string;
}

const difficultyOptions = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'média', label: 'Média' },
  { value: 'alta', label: 'Alta' },
];

const importanceOptions = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'média', label: 'Média' },
  { value: 'alta', label: 'Alta' },
];

const SubjectModal: React.FC<SubjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  disciplineId,
  disciplineName
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [difficulty, setDifficulty] = useState<'baixa' | 'média' | 'alta'>('média');
  const [importance, setImportance] = useState<'baixa' | 'média' | 'alta'>('média');
  const [estimatedHours, setEstimatedHours] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetar formulário quando o modal é fechado
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setContent('');
      setDifficulty('média');
      setImportance('média');
      setEstimatedHours(2);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) {
      setError('O título do assunto é obrigatório');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Criando assunto:', {
        disciplineId,
        title,
        content,
        difficulty,
        importance,
        estimatedHours
      });
      
      // Criar o assunto usando o serviço
      const newSubject = await DisciplinesRestService.createSubject(
        disciplineId,
        title,
        content,
        difficulty,
        importance,
        estimatedHours
      );
      
      if (!newSubject) {
        throw new Error('Erro ao criar assunto');
      }
      
      toast.success(`Assunto "${title}" criado com sucesso!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar assunto:', error);
      setError('Não foi possível criar o assunto. Tente novamente.');
      toast.error('Erro ao criar assunto');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Adicionar Assunto a {disciplineName}
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
              {/* Título do Assunto */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Título do Assunto *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Sistema Cardiovascular"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Dificuldade */}
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  Dificuldade
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'baixa' | 'média' | 'alta')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {difficultyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Importância */}
              <div>
                <label htmlFor="importance" className="block text-sm font-medium text-gray-700 mb-1">
                  Importância
                </label>
                <select
                  id="importance"
                  value={importance}
                  onChange={(e) => setImportance(e.target.value as 'baixa' | 'média' | 'alta')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {importanceOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tempo estimado de estudo */}
              <div>
                <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700 mb-1">
                  Tempo estimado de estudo (horas)
                </label>
                <input
                  type="number"
                  id="estimatedHours"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0.5"
                  step="0.5"
                  disabled={loading}
                />
              </div>

              {/* Conteúdo */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Conteúdo (opcional)
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={5}
                  placeholder="Detalhes sobre este assunto, tópicos importantes ou observações"
                  disabled={loading}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : 'Adicionar Assunto'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubjectModal; 