"use client";

import React, { useState, useEffect } from 'react';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline } from '@/lib/supabase';
import { Plus, Book, ChevronRight, AlertCircle, Bookmark, Clock, Calendar, FileText } from 'lucide-react';
import DisciplineModal from './DisciplineModal';
import { toast } from '../ui/Toast';
import Link from 'next/link';

// Função para obter cores baseadas no tema da disciplina
const getThemeColors = (theme: string | null) => {
  // Mapeamento de IDs de tema em português para as chaves em inglês
  const themeMapping: Record<string, string> = {
    'azul': 'blue',
    'verde': 'green',
    'roxo': 'purple',
    'vermelho': 'red',
    'amarelo': 'yellow',
    'rosa': 'pink',
    'indigo': 'indigo',
    'laranja': 'orange',
    'ciano': 'cyan'
  };

  // Converter tema de português para inglês se necessário
  const themeKey = theme ? (themeMapping[theme] || theme) : 'blue';

  const themes: Record<string, {bg: string, border: string, text: string, light: string}> = {
    'blue': {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-700',
      light: 'bg-blue-100'
    },
    'green': {
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-700',
      light: 'bg-green-100'
    },
    'purple': {
      bg: 'bg-purple-50',
      border: 'border-purple-500',
      text: 'text-purple-700',
      light: 'bg-purple-100'
    },
    'red': {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-700',
      light: 'bg-red-100'
    },
    'yellow': {
      bg: 'bg-yellow-50',
      border: 'border-yellow-500',
      text: 'text-yellow-700',
      light: 'bg-yellow-100'
    },
    'pink': {
      bg: 'bg-pink-50',
      border: 'border-pink-500',
      text: 'text-pink-700',
      light: 'bg-pink-100'
    },
    'indigo': {
      bg: 'bg-indigo-50',
      border: 'border-indigo-500',
      text: 'text-indigo-700',
      light: 'bg-indigo-100'
    },
    'orange': {
      bg: 'bg-orange-50',
      border: 'border-orange-500',
      text: 'text-orange-700',
      light: 'bg-orange-100'
    },
    'cyan': {
      bg: 'bg-cyan-50',
      border: 'border-cyan-500',
      text: 'text-cyan-700',
      light: 'bg-cyan-100'
    }
  };

  // Usar azul como padrão se o tema não existir ou for null
  return themes[themeKey] || themes.blue;
};

// Ícones para os temas de disciplina
const getThemeIcon = (theme: string | null) => {
  // Mapeamento de IDs de tema em português para as chaves em inglês
  const themeMapping: Record<string, string> = {
    'azul': 'blue',
    'verde': 'green',
    'roxo': 'purple',
    'vermelho': 'red',
    'amarelo': 'yellow',
    'rosa': 'pink',
    'indigo': 'indigo',
    'laranja': 'orange',
    'ciano': 'cyan'
  };

  // Converter tema de português para inglês se necessário
  const themeKey = theme ? (themeMapping[theme] || theme) : 'blue';

  const icons: Record<string, React.ReactNode> = {
    'blue': <Book className="h-8 w-8 text-blue-500" />,
    'green': <FileText className="h-8 w-8 text-green-500" />,
    'purple': <Bookmark className="h-8 w-8 text-purple-500" />,
    'red': <AlertCircle className="h-8 w-8 text-red-500" />,
    'yellow': <Clock className="h-8 w-8 text-yellow-500" />,
    'pink': <Calendar className="h-8 w-8 text-pink-500" />,
    'indigo': <Book className="h-8 w-8 text-indigo-500" />,
    'orange': <Bookmark className="h-8 w-8 text-orange-500" />,
    'cyan': <FileText className="h-8 w-8 text-cyan-500" />
  };

  return icons[themeKey] || icons.blue;
};

/**
 * Componente para listar disciplinas e permitir a criação de novas
 */
export default function DisciplinesList() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Função para carregar disciplinas
  const loadDisciplines = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await DisciplinesRestService.getDisciplines(true);
      setDisciplines(data);
    } catch (err) {
      console.error("Erro ao carregar disciplinas:", err);
      setError("Não foi possível carregar as disciplinas. Tente novamente mais tarde.");
      toast.error("Erro ao carregar disciplinas");
    } finally {
      setLoading(false);
    }
  };

  // Carregar disciplinas quando o componente montar
  useEffect(() => {
    loadDisciplines();
  }, []);

  // Função para abrir o modal de criação
  const openCreateModal = () => {
    setIsModalOpen(true);
  };

  // Função chamada após criar com sucesso
  const handleCreateSuccess = () => {
    loadDisciplines(); // Recarregar a lista
  };

  // Formatar a data para um formato mais legível
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Minhas Disciplinas</h2>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all hover:shadow"
        >
          <Plus size={16} />
          <span>Nova Disciplina</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 rounded-full bg-white"></div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 shadow-sm">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      ) : disciplines.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-10 text-center shadow-sm">
          <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Book className="h-10 w-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Nenhuma disciplina encontrada</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Comece adicionando sua primeira disciplina para organizar seus estudos de forma mais eficiente.
          </p>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={18} />
            <span>Adicionar Disciplina</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {disciplines.map((discipline) => {
            const colors = getThemeColors(discipline.theme);
            return (
              <Link 
                key={discipline.id} 
                href={`/dashboard/disciplinas/${discipline.id}`}
                className={`relative group overflow-hidden ${colors.bg} rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border ${colors.border}`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 -mt-10 -mr-10 rounded-full opacity-10 bg-gradient-to-br from-white to-black"></div>
                
                <div className="p-6 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex-shrink-0 mb-4">
                      {getThemeIcon(discipline.theme)}
                    </div>
                    <ChevronRight className={`h-5 w-5 ${colors.text} opacity-50 group-hover:opacity-100 transition-opacity`} />
                  </div>
                  
                  <h3 className={`text-lg font-bold ${colors.text} mb-2`}>{discipline.name}</h3>
                  
                  {discipline.description && (
                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                      {discipline.description}
                    </p>
                  )}
                  
                  <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs text-gray-500 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(discipline.created_at)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${colors.light} ${colors.text}`}>
                      {discipline.is_system ? 'Sistema' : 'Personalizada'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modal para criar disciplina */}
      <DisciplineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
} 