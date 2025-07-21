'use client';

import { useState } from 'react';
import { X, Plus, Loader2, AlertTriangle, Lock, Unlock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StudyGroup, StudyGroupService } from '@/services/study-group.service';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (groupId: string) => void;
}

export default function CreateGroupModal({ isOpen, onClose, onCreated }: CreateGroupModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<StudyGroup>>({
    name: '',
    description: '',
    is_private: true,
    max_members: 20,
    color_theme: 'blue',
    access_code: generateRandomCode()
  });
  
  if (!isOpen) return null;
  
  // Função para gerar um código de acesso aleatório de 6 caracteres
  function generateRandomCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };
  
  const togglePrivacy = () => {
    setFormData(prev => ({
      ...prev,
      is_private: !prev.is_private
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.name.trim().length < 3) {
      setError('O nome do grupo deve ter pelo menos 3 caracteres');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      const group = await StudyGroupService.createGroup({
        ...formData,
        access_code: formData.access_code || generateRandomCode()
      });
      
      if (group && group.id) {
        onCreated(group.id);
        resetForm();
        onClose();
      } else {
        setError('Erro ao criar o grupo');
      }
    } catch (err) {
      setError('Ocorreu um erro ao processar sua solicitação');
      console.error('Erro ao criar grupo:', err);
    } finally {
      setIsCreating(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_private: true,
      max_members: 20,
      color_theme: 'blue',
      access_code: generateRandomCode()
    });
    setError(null);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex justify-between items-center">
          <h2 className="text-white font-bold flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Criar Novo Grupo
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-blue-500/20 text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-5">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label 
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nome do Grupo*
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Grupo de Anatomia"
                className="w-full rounded-lg border-gray-300"
                maxLength={50}
                autoFocus
                required
              />
            </div>
            
            <div className="mb-4">
              <label 
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Descrição
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                placeholder="Descrição do grupo de estudos (opcional)"
                className="w-full rounded-lg border-gray-300 resize-none"
                rows={3}
                maxLength={200}
              />
            </div>
            
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {formData.is_private ? (
                    <Lock className="h-4 w-4 text-gray-700 mr-2" />
                  ) : (
                    <Unlock className="h-4 w-4 text-gray-700 mr-2" />
                  )}
                  <span className="text-sm font-medium text-gray-700">Privacidade do Grupo</span>
                </div>
                <button
                  type="button"
                  onClick={togglePrivacy}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    formData.is_private 
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {formData.is_private ? 'Privado' : 'Público'}
                </button>
              </div>
              
              <div className="flex items-start text-xs text-gray-500">
                <Info className="h-3.5 w-3.5 text-gray-400 mr-1.5 mt-0.5 flex-shrink-0" />
                <p>
                  {formData.is_private 
                    ? 'Apenas pessoas com o código de acesso podem entrar no grupo.' 
                    : 'Qualquer pessoa pode encontrar e entrar no grupo usando o código.'}
                </p>
              </div>
            </div>
            
            {error && (
              <div className="mb-4 flex items-center text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-lg border-gray-300"
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                disabled={isCreating || !formData.name || formData.name.trim().length < 3}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Grupo'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
