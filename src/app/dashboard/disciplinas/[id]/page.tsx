"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { Discipline, Subject } from '@/lib/supabase';
import { 
  Book, List, Plus, ArrowLeft, AlertCircle, BookOpen, 
  Calendar, Clock, BarChart3, FileText, BookMarked, CheckCircle, Flag,
  PlusCircle, Circle, ChevronsUpDown, MoreVertical, Edit, Trash2, Users
} from 'lucide-react';
import Link from 'next/link';
import SubjectModal from '@/components/estudos/SubjectModal';

import AttendanceControlTab from '@/components/estudos/AttendanceControlTab';
import { toast } from '@/components/ui/toast';
import { StudyStreakService } from '@/lib/study-streak-service';

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [completingSubject, setCompletingSubject] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubjectId, setDeletingSubjectId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'subjects' | 'attendance'>('subjects');

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

  // Adicionar event listener para fechar menus quando clicar fora
  useEffect(() => {
    // Função que fecha o menu quando clicar fora dele
    const handleClickOutside = (event: MouseEvent) => {
      // Não fechar o menu se o clique for em um botão de opções
      const target = event.target as HTMLElement;
      if (target.closest('[data-options-button]')) {
        return;
      }
      closeAllMenus();
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Função para fechar todos os menus quando clicar fora
  const closeAllMenus = () => {
    setOpenMenuId(null);
  };

  // Função para gerenciar o menu de opções
  const toggleOptionsMenu = (e: React.MouseEvent, subjectId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Se já está aberto, fecha. Se está fechado, abre
    const newOpenMenuId = openMenuId === subjectId ? null : subjectId;
    console.log(`Toggling menu for subject ${subjectId}, current: ${openMenuId}, new: ${newOpenMenuId}`);
    setOpenMenuId(newOpenMenuId);
  };

  // Função para iniciar a edição de um assunto
  const handleEditClick = (e: React.MouseEvent, subject: Subject) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Pequeno atraso para evitar conflito com outros eventos
    setTimeout(() => {
      setEditingSubject(subject);
      setIsEditModalOpen(true);
      setOpenMenuId(null);
    }, 10);
  };

  // Função chamada após editar com sucesso
  const handleEditSuccess = () => {
    loadDisciplineData(); // Recarregar os dados
    setIsEditModalOpen(false);
    setEditingSubject(null);
  };

  // Função para iniciar o processo de exclusão
  const handleDeleteClick = (e: React.MouseEvent, subjectId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Pequeno atraso para evitar conflito com outros eventos
    setTimeout(() => {
      setDeletingSubjectId(subjectId);
      setShowDeleteConfirm(true);
      setOpenMenuId(null);
    }, 10);
  };

  // Função para confirmar a exclusão
  const confirmDelete = async () => {
    if (!deletingSubjectId) return;
    
    try {
      // Implementar a chamada para excluir o assunto
      const success = await DisciplinesRestService.deleteSubject(deletingSubjectId);
      
      if (success) {
        toast.success("Assunto excluído com sucesso!");
        loadDisciplineData(); // Recarregar a lista
      } else {
        toast.error("Erro ao excluir assunto. Tente novamente.");
      }
    } catch (err) {
      console.error("Erro ao excluir assunto:", err);
      toast.error("Erro ao excluir assunto. Tente novamente.");
    } finally {
      setShowDeleteConfirm(false);
      setDeletingSubjectId(null);
    }
  };

  // Função para cancelar a exclusão
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeletingSubjectId(null);
  };

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

  // Função para marcar um assunto como concluído
  const handleCompleteSubject = async (subjectId: number) => {
    try {
      setCompletingSubject(subjectId);
      
      // Registrar a atividade de conclusão do assunto
      const success = await StudyStreakService.recordSubjectCompleted(subjectId);
      
      if (success) {
        toast.success('Assunto concluído! Sua sequência de estudos foi atualizada.');
        
        // Aqui você poderia atualizar o status do assunto no banco de dados
        // Por exemplo, atualizando um campo 'completed' ou 'status'
        
        // Recarregar os dados para refletir as alterações
        loadDisciplineData();
      } else {
        toast.error('Não foi possível registrar a conclusão do assunto.');
      }
    } catch (error) {
      console.error('Erro ao concluir assunto:', error);
      toast.error('Erro ao concluir assunto');
    } finally {
      setCompletingSubject(null);
    }
  };

  const renderSubjectsList = () => {
    if (subjects.length === 0) {
      return (
        <>
          {/* Empty state - Desktop */}
          <div className="text-center py-10 hidden md:block">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhum assunto cadastrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece adicionando assuntos a esta disciplina.
            </p>
            <div className="mt-6">
              <button
                onClick={openCreateModal}
                className="inline-flex items-center px-4 py-2 border border-transparent 
                           rounded-md shadow-sm text-sm font-medium text-white 
                           bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
                Novo Assunto
              </button>
            </div>
          </div>
          
          {/* Empty state - Mobile */}
          <div className="text-center py-8 md:hidden">
            <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhum assunto</h3>
            <p className="mt-1 text-xs text-gray-500">
              Adicione assuntos para começar.
            </p>
            <div className="mt-4">
              <button
                onClick={openCreateModal}
                className="inline-flex items-center px-3 py-2 border border-transparent 
                           rounded-lg shadow-sm text-sm font-medium text-white 
                           bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                <PlusCircle className="-ml-1 mr-1 h-4 w-4" />
                Novo Assunto
              </button>
            </div>
          </div>
        </>
      );
    }
    
    return (
      <>
        {/* Desktop Grid */}
        <div className="mt-6 grid gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 hidden md:grid">
          {subjects.map((subject) => (
            <div key={subject.id} className="bg-white overflow-hidden shadow rounded-lg relative group">
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900 truncate pr-2">{subject.title}</h3>
                  
                  {/* Menu de opções - posicionado no canto superior direito */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => toggleOptionsMenu(e, subject.id)}
                      className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors flex items-center justify-center"
                      title="Opções"
                      data-options-button="true"
                      style={{ minWidth: '28px', minHeight: '28px' }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    
                    {/* Menu dropdown */}
                    {openMenuId === subject.id && (
                      <div 
                        className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg z-10 py-1 border border-gray-200"
                        data-options-button="true"
                      >
                        <button
                          onClick={(e) => handleEditClick(e, subject)}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                          data-options-button="true"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar assunto
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, subject.id)}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                          data-options-button="true"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir assunto
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-500 line-clamp-3 mb-3">
                  {subject.content || 'Sem descrição'}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Clock className="mr-1 h-3 w-3" />
                    {subject.estimated_hours || 0}h estimadas
                  </span>
                  
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                   ${subject.importance === 'alta' ? 'bg-purple-100 text-purple-800' : 
                                     subject.importance === 'média' ? 'bg-blue-100 text-blue-800' : 
                                     'bg-gray-100 text-gray-800'}`}>
                    <Flag className="mr-1 h-3 w-3" />
                    Importância: {subject.importance}
                  </span>
                  
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                   ${subject.difficulty === 'alta' ? 'bg-red-100 text-red-800' : 
                                     subject.difficulty === 'média' ? 'bg-yellow-100 text-yellow-800' : 
                                     'bg-green-100 text-green-800'}`}>
                    <BookOpen className="mr-1 h-3 w-3" />
                    Dificuldade: {subject.difficulty}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 px-5 py-3 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Criado em {formatDate(subject.created_at)}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleCompleteSubject(subject.id)}
                    disabled={completingSubject === subject.id}
                    className={`inline-flex items-center px-2 py-1 border border-transparent 
                               rounded text-xs font-medium text-white 
                               ${completingSubject === subject.id 
                                 ? 'bg-gray-400 cursor-not-allowed' 
                                 : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {completingSubject === subject.id ? (
                      <div className="h-3 w-3 border-t-2 border-white rounded-full animate-spin mr-1"></div>
                    ) : (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    )}
                    Concluído
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Mobile List */}
        <div className="mt-4 space-y-3 md:hidden">
          {subjects.map((subject) => (
            <div key={subject.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-medium text-gray-900 flex-1 pr-2">{subject.title}</h3>
                  
                  {/* Menu de opções mobile */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => toggleOptionsMenu(e, subject.id)}
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                      title="Opções"
                      data-options-button="true"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    
                    {/* Menu dropdown mobile */}
                    {openMenuId === subject.id && (
                      <div 
                        className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg z-10 py-1 border border-gray-200"
                        data-options-button="true"
                      >
                        <button
                          onClick={(e) => handleEditClick(e, subject)}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                          data-options-button="true"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(e, subject.id)}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                          data-options-button="true"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {subject.content && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {subject.content}
                  </p>
                )}
                
                {/* Tags compactas para mobile */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Clock className="mr-1 h-3 w-3" />
                    {subject.estimated_hours || 0}h
                  </span>
                  
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium 
                                   ${subject.importance === 'alta' ? 'bg-purple-100 text-purple-800' : 
                                     subject.importance === 'média' ? 'bg-blue-100 text-blue-800' : 
                                     'bg-gray-100 text-gray-800'}`}>
                    <Flag className="mr-1 h-3 w-3" />
                    {subject.importance}
                  </span>
                  
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium 
                                   ${subject.difficulty === 'alta' ? 'bg-red-100 text-red-800' : 
                                     subject.difficulty === 'média' ? 'bg-yellow-100 text-yellow-800' : 
                                     'bg-green-100 text-green-800'}`}>
                    <BookOpen className="mr-1 h-3 w-3" />
                    {subject.difficulty}
                  </span>
                </div>
                
                {/* Footer mobile */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    {formatDate(subject.created_at)}
                  </div>
                  
                  <button
                    onClick={() => handleCompleteSubject(subject.id)}
                    disabled={completingSubject === subject.id}
                    className={`inline-flex items-center px-3 py-1.5 border border-transparent 
                               rounded-lg text-xs font-medium text-white transition-colors 
                               ${completingSubject === subject.id 
                                 ? 'bg-gray-400 cursor-not-allowed' 
                                 : 'bg-green-600 hover:bg-green-700 active:bg-green-800'}`}
                  >
                    {completingSubject === subject.id ? (
                      <div className="h-3 w-3 border-t-2 border-white rounded-full animate-spin mr-1"></div>
                    ) : (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    )}
                    Concluído
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="container mx-auto px-6 md:px-8 lg:px-12 py-6 pb-28 md:pb-6">
      {/* Desktop Back Button */}
      <div className="mb-6 hidden md:block">
        <Link 
          href="/dashboard/disciplinas" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span>Voltar para Disciplinas</span>
        </Link>
      </div>
      
      {/* Mobile Back Button */}
      <div className="mb-4 md:hidden">
        <Link 
          href="/dashboard/disciplinas" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium text-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Voltar</span>
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
          {/* Cabeçalho da disciplina - Desktop */}
          <div className={`bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 mb-8 text-white shadow-lg hidden md:block`}>
            {loading ? (
              <div className="animate-pulse h-8 bg-white/20 rounded w-1/4 mb-2"></div>
            ) : (
              <div className="flex justify-between items-start mb-2">
                <h1 className="text-3xl font-bold">{discipline.name}</h1>
                <div className="flex space-x-3">

                  <button
                    onClick={openCreateModal}
                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Novo Assunto</span>
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-6">
              <div className="bg-white/20 p-4 rounded-lg">
                <BookOpen className="h-10 w-10 text-white" />
              </div>
              
              <div className="flex-1">
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
          
          {/* Cabeçalho da disciplina - Mobile */}
           <div className={`bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 mb-6 text-white shadow-lg md:hidden`}>
             {loading ? (
               <div className="animate-pulse h-6 bg-white/20 rounded w-3/4 mb-2"></div>
             ) : (
               <>
                 <div className="flex items-center gap-3 mb-3">
                   <div className="bg-white/20 p-2 rounded-lg">
                     <BookOpen className="h-6 w-6 text-white" />
                   </div>
                   <div className="flex-1">
                     <h1 className="text-lg font-bold">{discipline.name}</h1>
                     <div className="text-white/80 text-xs">
                       {subjects.length} {subjects.length === 1 ? 'assunto' : 'assuntos'}
                     </div>
                   </div>
                 </div>
                 
                 {discipline.description && (
                   <p className="text-white/90 text-sm mb-3 line-clamp-2">{discipline.description}</p>
                 )}
                 
                 <div className="flex gap-2">

                   <button
                     onClick={openCreateModal}
                     className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg flex items-center space-x-1 transition-colors text-sm flex-1"
                   >
                     <Plus className="h-4 w-4" />
                     <span>Novo</span>
                   </button>
                 </div>
               </>
             )}
           </div>

          {/* Sistema de Abas - Desktop */}
           <div className="mt-10 hidden md:block">
             {/* Navegação das Abas */}
             <div className="border-b border-gray-200">
               <nav className="-mb-px flex space-x-8">
                 <button
                   onClick={() => setActiveTab('subjects')}
                   className={`py-2 px-1 border-b-2 font-medium text-sm ${
                     activeTab === 'subjects'
                       ? 'border-blue-500 text-blue-600'
                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                   }`}
                 >
                   <div className="flex items-center gap-2">
                     <BookOpen className="w-4 h-4" />
                     Assuntos
                   </div>
                 </button>
                 <button
                   onClick={() => setActiveTab('attendance')}
                   className={`py-2 px-1 border-b-2 font-medium text-sm ${
                     activeTab === 'attendance'
                       ? 'border-blue-500 text-blue-600'
                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                   }`}
                 >
                   <div className="flex items-center gap-2">
                     <Users className="w-4 h-4" />
                     Controle de Faltas
                   </div>
                 </button>
               </nav>
             </div>
           </div>
           
           {/* Sistema de Abas - Mobile */}
           <div className="mt-6 md:hidden">
             {/* Navegação das Abas Mobile */}
             <div className="bg-gray-100 p-1 rounded-lg">
               <div className="grid grid-cols-2 gap-1">
                 <button
                   onClick={() => setActiveTab('subjects')}
                   className={`py-3 px-4 rounded-md font-medium text-sm transition-all ${
                     activeTab === 'subjects'
                       ? 'bg-white text-blue-600 shadow-sm'
                       : 'text-gray-600 hover:text-gray-800'
                   }`}
                 >
                   <div className="flex items-center justify-center gap-2">
                     <BookOpen className="w-4 h-4" />
                     <span>Assuntos</span>
                   </div>
                 </button>
                 <button
                   onClick={() => setActiveTab('attendance')}
                   className={`py-3 px-4 rounded-md font-medium text-sm transition-all ${
                     activeTab === 'attendance'
                       ? 'bg-white text-blue-600 shadow-sm'
                       : 'text-gray-600 hover:text-gray-800'
                   }`}
                 >
                   <div className="flex items-center justify-center gap-2">
                     <Users className="w-4 h-4" />
                     <span>Faltas</span>
                   </div>
                 </button>
               </div>
             </div>
           </div>

            {/* Conteúdo das Abas - Desktop */}
             <div className="mt-6 hidden md:block">
               {activeTab === 'subjects' && (
                 <div>
                   <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-bold text-gray-900">
                       Assuntos da Disciplina
                     </h2>
                     <button
                       onClick={openCreateModal}
                       className="inline-flex items-center px-4 py-2 border border-transparent 
                                 rounded-md shadow-sm text-sm font-medium text-white 
                                 bg-blue-600 hover:bg-blue-700 focus:outline-none"
                     >
                       <PlusCircle className="-ml-1 mr-2 h-5 w-5" />
                       Novo Assunto
                     </button>
                   </div>

                   {loading ? (
                     <div className="text-center py-10">
                       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                       <p className="mt-3 text-sm text-gray-500">Carregando assuntos...</p>
                     </div>
                   ) : (
                     renderSubjectsList()
                   )}
                 </div>
               )}

               {activeTab === 'attendance' && (
                 <div>
                   <div className="mb-6">
                     <h2 className="text-lg font-bold text-gray-900 mb-2">
                       Controle de Faltas
                     </h2>
                     <p className="text-gray-600 text-sm">
                       Gerencie as faltas e acompanhe a frequência.
                     </p>
                   </div>
                   
                   <AttendanceControlTab 
                     discipline={discipline} 
                     onDisciplineUpdate={setDiscipline}
                   />
                 </div>
               )}
              </div>
              
              {/* Conteúdo das Abas - Mobile */}
              <div className="mt-4 md:hidden">
                {activeTab === 'subjects' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold text-gray-900">
                        Assuntos
                      </h2>
                      <button
                        onClick={openCreateModal}
                        className="inline-flex items-center px-3 py-2 border border-transparent 
                                  rounded-lg shadow-sm text-sm font-medium text-white 
                                  bg-blue-600 hover:bg-blue-700 focus:outline-none"
                      >
                        <PlusCircle className="-ml-1 mr-1 h-4 w-4" />
                        Novo
                      </button>
                    </div>

                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">Carregando...</p>
                      </div>
                    ) : (
                      renderSubjectsList()
                    )}
                  </div>
                )}

                {activeTab === 'attendance' && (
                  <div>
                    <div className="mb-4">
                      <h2 className="text-lg font-bold text-gray-900 mb-2">
                        Controle de Faltas
                      </h2>
                      <p className="text-gray-600 text-sm">
                        Gerencie as faltas e acompanhe a frequência.
                      </p>
                    </div>
                    
                    <AttendanceControlTab 
                      discipline={discipline} 
                      onDisciplineUpdate={setDiscipline}
                    />
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
      
      {/* Modal para editar assunto */}
      {discipline && editingSubject && (
        <SubjectModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingSubject(null);
          }}
          onSuccess={handleEditSuccess}
          disciplineId={disciplineId}
          disciplineName={discipline.name}
          subjectToEdit={editingSubject}
        />
      )}
      


      {/* Modal de confirmação de exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Confirmar exclusão</h2>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir este assunto? Essa ação não pode ser desfeita.
            </p>
            
            <div className="flex space-x-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}