'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { StudyGroupService } from '@/services/study-group.service';
import { Exam, ExamsService } from '@/services/exams.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddExamModalProps {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
  onExamAdded: () => void;
}

export default function AddExamModal({ groupId, isOpen, onClose, onExamAdded }: AddExamModalProps) {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      loadAvailableExams();
      // Prevenir scroll do body quando modal estiver aberto
      document.body.style.overflow = 'hidden';
    } else {
      // Restaurar scroll do body quando modal for fechado
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function para garantir que o scroll seja restaurado
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, groupId]);
  
  // Fechar modal com tecla Escape
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);
  
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredExams(availableExams);
    } else {
      const filtered = availableExams.filter(
        exam => exam.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredExams(filtered);
    }
  }, [searchTerm, availableExams]);
  
  const loadAvailableExams = async () => {
    setLoading(true);
    try {
      const exams = await StudyGroupService.getUserExamsForGroup(groupId);
      setAvailableExams(exams);
      setFilteredExams(exams);
    } catch (error) {
      console.error('Erro ao carregar simulados disponíveis:', error);
      toast.error('Erro ao carregar simulados');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddExam = async () => {
    if (!selectedExamId) {
      toast.error('Selecione um simulado para adicionar');
      return;
    }
    
    setAdding(true);
    try {
      const success = await StudyGroupService.addExamToGroup(groupId, selectedExamId);
      if (success) {
        toast.success('Simulado adicionado ao grupo com sucesso');
        onExamAdded();
        onClose();
      } else {
        toast.error('Erro ao adicionar simulado ao grupo');
      }
    } catch (error) {
      console.error('Erro ao adicionar simulado:', error);
      toast.error('Ocorreu um erro ao adicionar o simulado');
    } finally {
      setAdding(false);
    }
  };
  
  if (!isOpen) return null;
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">Adicionar Simulado ao Grupo</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 flex-shrink-0"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-3 sm:p-4 border-b flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar simulados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 min-h-0">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 mb-3">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <p className="text-gray-600 mb-2">Nenhum simulado disponível</p>
              <p className="text-sm text-gray-500">
                Você precisa criar simulados antes de adicioná-los ao grupo
              </p>
              <Button 
                onClick={() => window.open('/simulados/novo', '_blank')}
                variant="outline"
                className="mt-4"
              >
                Criar Novo Simulado
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExams.map(exam => (
                <div 
                  key={exam.id} 
                  className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedExamId === exam.id 
                      ? 'bg-blue-50 border-2 border-blue-200 shadow-sm' 
                      : 'hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => setSelectedExamId(exam.id || null)}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 text-sm sm:text-base truncate">{exam.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                        {exam.description || 'Sem descrição'}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      selectedExamId === exam.id 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {selectedExamId === exam.id && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-3 sm:p-4 border-t bg-gray-50 flex flex-col sm:flex-row justify-end gap-2 sm:gap-0 flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto sm:mr-2 order-2 sm:order-1"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleAddExam}
            disabled={!selectedExamId || adding || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto order-1 sm:order-2"
          >
            {adding ? (
              <>
                <span className="animate-spin mr-2">⟳</span> Adicionando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1.5" /> Adicionar Simulado
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
  
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
 
