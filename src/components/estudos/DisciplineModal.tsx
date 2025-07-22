"use client";

import React, { useState, useEffect } from 'react';
import { X, BookOpen, Palette, CreditCard } from 'lucide-react';
import { toast } from '@/components/ui/toast-interface';
import { ThemePicker } from '@/components/ui/theme-components';
import { DisciplinesRestService } from '@/lib/supabase-rest';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Discipline } from '@/lib/supabase';
import { useSubscription } from '@/contexts/SubscriptionContext';

interface DisciplineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  disciplineToEdit?: Discipline | null;
}

const DisciplineModal: React.FC<DisciplineModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  disciplineToEdit
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('azul'); // tema padrão
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLimitError, setShowLimitError] = useState(false);
  const isEditing = !!disciplineToEdit;
  const router = useRouter();
  
  // Usar o contexto de assinatura para verificar limites
  const { hasReachedLimit, subscriptionLimits, refreshLimits } = useSubscription();

  // Preencher o formulário com os dados da disciplina a ser editada
  useEffect(() => {
    if (isOpen && disciplineToEdit) {
      setName(disciplineToEdit.name || '');
      setDescription(disciplineToEdit.description || '');
      setTheme(disciplineToEdit.theme || 'azul');
    } else if (isOpen && !disciplineToEdit) {
      // Resetar o formulário para criação
      setName('');
      setDescription('');
      setTheme('azul');
    }
    setError(null);
    setShowLimitError(false);
  }, [isOpen, disciplineToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || name.trim() === "") {
      setError("Nome da disciplina não pode ser vazio.");
      return;
    }

    if (name.length > 50) {
      setError("Nome da disciplina não pode ter mais que 50 caracteres.");
      return;
    }

    // Verificar limite de disciplinas apenas para criação (não para edição)
    if (!isEditing) {
      try {
        // Atualizar os limites em tempo real antes de verificar
        await refreshLimits();
        
        // Verificar novamente após atualização
        if (hasReachedLimit('disciplines')) {
          setShowLimitError(true);
          return;
        }
      } catch (error) {
        console.error("Erro ao atualizar limites de assinatura:", error);
        // Continuar mesmo com erro para não bloquear o usuário
      }
    }

    try {
      setLoading(true);
      setError("");

      let success;
      
      if (isEditing && disciplineToEdit) {
        // Atualizar disciplina existente
        success = await DisciplinesRestService.updateDiscipline(disciplineToEdit.id, {
          name,
          description,
          theme,
        });
        
        if (success) {
          toast.success("Disciplina atualizada com sucesso!");
        } else {
          toast.error("Erro ao atualizar disciplina. Tente novamente.");
        }
      } else {
        // Criar nova disciplina
        const discipline = await DisciplinesRestService.createDiscipline({
          name,
          description,
          theme,
        });
        
        success = !!discipline;
        
        if (success) {
          toast.success("Disciplina criada com sucesso!");
          // Atualizar limites após criação bem-sucedida
          refreshLimits();
        } else {
          toast.error("Erro ao criar disciplina. Tente novamente.");
        }
      }

      if (success) {
        resetForm();
        onClose();
        onSuccess();
      }
    } catch (err) {
      console.error(isEditing ? "Error updating discipline:" : "Error creating discipline:", err);
      toast.error(isEditing ? "Erro ao atualizar disciplina." : "Erro ao criar disciplina.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTheme('azul');
    setError(null);
    setShowLimitError(false);
  };

  const handleUpgradeClick = () => {
    onClose();
    router.push('/perfil/assinatura');
  };

  if (!isOpen) return null;

  // Se o usuário atingiu o limite, mostrar uma mensagem especial
  if (showLimitError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Limite de disciplinas atingido</h2>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded mb-6">
              <p className="text-amber-800">
                Você já atingiu o limite de <strong>{subscriptionLimits?.disciplinesLimit}</strong> disciplinas do seu plano atual.
              </p>
            </div>
            
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Para adicionar mais disciplinas, você pode:</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Fazer upgrade para um plano com mais disciplinas</li>
                <li>Excluir disciplinas não utilizadas para liberar espaço</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpgradeClick}
                className="flex-1 py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Ver planos
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              {isEditing ? 'Editar Disciplina' : 'Adicionar Nova Disciplina'}
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
              {/* Nome da Disciplina */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Disciplina *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Anatomia"
                    required
                  />
                </div>
              </div>

              {/* Tema da Disciplina */}
              <ThemePicker 
                value={theme}
                onChange={setTheme}
                label="Tema da Disciplina"
              />

              {/* Descrição */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descreva a disciplina e seus tópicos principais"
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Adicionar Disciplina'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DisciplineModal; 
