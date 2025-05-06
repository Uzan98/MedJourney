"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline, Subject } from '@/lib/supabase';
import { 
  Book, List, Plus, ArrowLeft, AlertCircle, BookOpen, 
  Calendar, Clock, BarChart3, FileText, BookMarked
} from 'lucide-react';
import Link from 'next/link';
import SubjectModal from '@/components/estudos/SubjectModal';
import { toast } from '@/components/ui/Toast';

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

  const themes: Record<string, {bg: string, border: string, text: string, gradient: string}> = {
    'blue': {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      text: 'text-blue-700',
      gradient: 'from-blue-600 to-blue-800'
    },
    'green': {
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-700',
      gradient: 'from-green-600 to-green-800'
    },
    'purple': {
      bg: 'bg-purple-50',
      border: 'border-purple-500',
      text: 'text-purple-700',
      gradient: 'from-purple-600 to-purple-800'
    },
    'red': {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-700',
      gradient: 'from-red-600 to-red-800'
    },
    'yellow': {
      bg: 'bg-yellow-50',
      border: 'border-yellow-500',
      text: 'text-yellow-700',
      gradient: 'from-yellow-600 to-yellow-800'
    },
    'pink': {
      bg: 'bg-pink-50',
      border: 'border-pink-500',
      text: 'text-pink-700',
      gradient: 'from-pink-600 to-pink-800'
    },
    'indigo': {
      bg: 'bg-indigo-50',
      border: 'border-indigo-500',
      text: 'text-indigo-700',
      gradient: 'from-indigo-600 to-indigo-800'
    },
    'orange': {
      bg: 'bg-orange-50',
      border: 'border-orange-500',
      text: 'text-orange-700',
      gradient: 'from-orange-600 to-orange-800'
    },
    'cyan': {
      bg: 'bg-cyan-50',
      border: 'border-cyan-500',
      text: 'text-cyan-700',
      gradient: 'from-cyan-600 to-cyan-800'
    },
  };

  // Usar azul como padrão se o tema não existir ou for null
  return themes[themeKey] || themes.blue;
};

export default function DisciplineDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const disciplineId = Number(params.id);

  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Função para carregar dados da disciplina e seus assuntos
  const loadDisciplineData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Primeiro, carregar a disciplina
      const disciplines = await DisciplinesRestService.getDisciplines();
      const foundDiscipline = disciplines.find(d => d.id === disciplineId);
      
      if (!foundDiscipline) {
        throw new Error('Disciplina não encontrada');
      }
      
      setDiscipline(foundDiscipline);
      
      // Em seguida, carregar os assuntos
      const subjectsData = await DisciplinesRestService.getSubjects(disciplineId);
      setSubjects(subjectsData);
    } catch (err) {
      console.error('Erro ao carregar dados da disciplina:', err);
      setError('Não foi possível carregar os dados da disciplina. Tente novamente mais tarde.');
      toast.error('Erro ao carregar dados da disciplina');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados quando o componente montar ou o ID mudar
  useEffect(() => {
    loadDisciplineData();
  }, [disciplineId]);

  // Função para abrir o modal de criação de assunto
  const openCreateModal = () => {
    setIsModalOpen(true);
  };

  // Função chamada após criar assunto com sucesso
  const handleCreateSuccess = () => {
    loadDisciplineData(); // Recarregar os dados
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

  // Obter as cores do tema da disciplina
  const colors = discipline ? getThemeColors(discipline.theme) : getThemeColors(null);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Link 
          href="/dashboard/disciplinas" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span>Voltar para Disciplinas</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
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
      ) : discipline ? (
        <>
          {/* Cabeçalho da disciplina */}
          <div className={`bg-gradient-to-r ${colors.gradient} rounded-xl shadow-lg text-white overflow-hidden mb-8`}>
            <div className="relative p-8">
              {/* Círculos decorativos */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white opacity-10 -mt-10 -mr-10"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white opacity-10 -mb-10 -ml-10"></div>
            
              <div className="flex items-start gap-6">
                <div className="bg-white/20 p-4 rounded-lg">
                  <BookOpen className="h-10 w-10 text-white" />
                </div>
                
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{discipline.name}</h1>
                  
                  {discipline.description && (
                    <p className="text-white/90 mb-4 max-w-2xl">{discipline.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 mt-4">
                    <div className="bg-white/20 px-3 py-1.5 rounded-full text-sm flex items-center">
                      <Calendar className="h-4 w-4 mr-1.5" />
                      Criado em {formatDate(discipline.created_at)}
                    </div>
                    
                    <div className="bg-white/20 px-3 py-1.5 rounded-full text-sm flex items-center">
                      <Book className="h-4 w-4 mr-1.5" />
                      {subjects.length} {subjects.length === 1 ? 'assunto' : 'assuntos'}
                    </div>
                    
                    <div className="bg-white/20 px-3 py-1.5 rounded-full text-sm flex items-center">
                      <BarChart3 className="h-4 w-4 mr-1.5" />
                      {discipline.is_system ? 'Disciplina do Sistema' : 'Disciplina Personalizada'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de assuntos */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <List className="h-5 w-5 mr-2 text-gray-600" />
                Assuntos
              </h2>
              <button
                onClick={openCreateModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all hover:shadow"
              >
                <Plus size={16} />
                <span>Novo Assunto</span>
              </button>
            </div>

            {subjects.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-10 text-center">
                <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <BookMarked className="h-10 w-10 text-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">Nenhum assunto encontrado</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Comece adicionando assuntos à esta disciplina para organizar seus estudos de forma mais estruturada.
                </p>
                <button
                  onClick={openCreateModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Plus size={18} />
                  <span>Adicionar Assunto</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {subjects.map(subject => (
                  <div 
                    key={subject.id} 
                    className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 p-5 shadow-sm hover:shadow transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-gray-500" />
                          {subject.title}
                        </h3>
                        
                        {/* Badges para dificuldade, importância e horas estimadas */}
                        <div className="flex flex-wrap gap-2 mt-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
                            subject.difficulty === 'alta' ? 'bg-red-100 text-red-800' : 
                            subject.difficulty === 'média' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Dificuldade: {subject.difficulty || 'média'}
                          </span>
                          
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
                            subject.importance === 'alta' ? 'bg-purple-100 text-purple-800' : 
                            subject.importance === 'média' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            <BookMarked className="h-3 w-3 mr-1" />
                            Importância: {subject.importance || 'média'}
                          </span>
                          
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {subject.estimated_hours || 2} horas de estudo
                          </span>
                        </div>
                        
                        {subject.content && (
                          <div className="mt-3 text-gray-600 text-sm bg-gray-50 p-3 rounded-md">
                            {subject.content}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex md:flex-col gap-3 mt-2 md:mt-0">
                        <button 
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
                          onClick={() => {/* Editar assunto */}}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 shadow-sm">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p>Disciplina não encontrada. Verifique o ID fornecido.</p>
          </div>
        </div>
      )}

      {/* Modal para criar assunto */}
      {discipline && (
        <SubjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleCreateSuccess}
          disciplineId={disciplineId}
          disciplineName={discipline.name}
        />
      )}
    </div>
  );
} 