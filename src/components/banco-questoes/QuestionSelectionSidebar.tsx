'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Plus, FileText, ChevronRight, ListPlus } from 'lucide-react';
import { Question } from '@/services/questions-bank.service';
import { Exam, ExamsService } from '@/services/exams.service';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface QuestionSelectionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedQuestions: Question[];
  onClearSelection: () => void;
  onCreateNewExam: () => void;
  onAddToExistingExam: (examId: number) => void;
}

export default function QuestionSelectionSidebar({
  isOpen,
  onClose,
  selectedQuestions,
  onClearSelection,
  onCreateNewExam,
  onAddToExistingExam
}: QuestionSelectionSidebarProps) {
  const router = useRouter();
  const [userExams, setUserExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [isAddingToExam, setIsAddingToExam] = useState(false);

  // Carregar simulados do usuário
  useEffect(() => {
    if (isOpen) {
      loadUserExams();
    }
  }, [isOpen]);

  const loadUserExams = async () => {
    setIsLoading(true);
    try {
      const exams = await ExamsService.getUserExams();
      setUserExams(exams);
    } catch (error) {
      console.error('Erro ao carregar simulados:', error);
      toast.error('Não foi possível carregar seus simulados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewExam = async () => {
    setIsLoading(true);
    try {
      // Criar novo simulado
      const newExam: Exam = {
        title: `Novo simulado (${new Date().toLocaleDateString()})`,
        description: `Simulado criado a partir de ${selectedQuestions.length} questões selecionadas do Genoma Bank`,
        time_limit: 120, // 2 horas por padrão
        is_public: false,
        shuffle_questions: true,
        show_answers: true
      };
      
      const examId = await ExamsService.addExam(newExam);
      
      if (examId) {
        // Adicionar questões ao novo simulado
        const questionIds = selectedQuestions.map(q => q.id);
        const success = await ExamsService.addQuestionsToExam(examId, questionIds);
        
        if (success) {
          toast.success('Novo simulado criado com sucesso!');
          onClose();
          onClearSelection();
          
          // Redirecionar para a página do simulado
          router.push(`/simulados/${examId}`);
        } else {
          toast.error('Erro ao adicionar questões ao simulado');
        }
      } else {
        toast.error('Erro ao criar novo simulado');
      }
    } catch (error) {
      console.error('Erro ao criar simulado:', error);
      toast.error('Ocorreu um erro ao criar o simulado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToExistingExam = async () => {
    if (!selectedExamId) {
      toast.error('Selecione um simulado para adicionar as questões');
      return;
    }
    
    setIsAddingToExam(true);
    try {
      // Obter IDs das questões selecionadas
      const questionIds = selectedQuestions.map(q => q.id);
      
      // Adicionar questões ao simulado
      const success = await ExamsService.addQuestionsToExam(selectedExamId, questionIds);
      
      if (success) {
        toast.success(`${questionIds.length} questões adicionadas ao simulado`);
        onClose();
        onClearSelection();
        
        // Redirecionar para a página do simulado
        router.push(`/simulados/${selectedExamId}`);
      } else {
        toast.error('Erro ao adicionar questões ao simulado');
      }
    } catch (error) {
      console.error('Erro ao adicionar questões:', error);
      toast.error('Ocorreu um erro ao adicionar as questões');
    } finally {
      setIsAddingToExam(false);
    }
  };

  // Overlay para fechar ao clicar fora
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay escuro */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={handleOverlayClick}
      />
      
      {/* Barra lateral */}
      <div
        className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white shadow-lg z-50 flex flex-col"
      >
        {/* Cabeçalho */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Questões Selecionadas</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Contador de questões */}
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <p className="text-blue-800 font-medium">
            {selectedQuestions.length} questões selecionadas
          </p>
        </div>

      {/* Lista de questões selecionadas */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedQuestions.length > 0 ? (
          <ul className="space-y-3">
            {selectedQuestions.map((question) => (
              <li
                key={question.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="text-sm font-medium truncate">{question.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {question.discipline_name} • {question.difficulty}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma questão selecionada</p>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <button
          onClick={onClearSelection}
          className="w-full text-gray-600 text-sm py-2 hover:text-gray-800"
          disabled={selectedQuestions.length === 0 || isLoading || isAddingToExam}
        >
          Limpar seleção
        </button>

        <button
          onClick={handleCreateNewExam}
          disabled={selectedQuestions.length === 0 || isLoading || isAddingToExam}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Criando...
            </span>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Criar novo simulado
            </>
          )}
        </button>

        <div className="space-y-2">
          <p className="text-sm font-medium">Ou adicionar a um simulado existente:</p>
          
          <select
            value={selectedExamId || ''}
            onChange={(e) => setSelectedExamId(Number(e.target.value) || null)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
            disabled={isLoading || isAddingToExam || userExams.length === 0}
          >
            <option value="">Selecione um simulado</option>
            {userExams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleAddToExistingExam}
            disabled={!selectedExamId || selectedQuestions.length === 0 || isLoading || isAddingToExam}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingToExam ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adicionando...
              </span>
            ) : (
              <>
                <ListPlus className="h-4 w-4" />
                Adicionar ao simulado
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}