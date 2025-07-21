'use client';

import { useState } from 'react';
import { X, Share2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudyGroupService } from '@/services/study-group.service';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (groupId: string) => void;
}

export default function JoinGroupModal({ isOpen, onClose, onJoin }: JoinGroupModalProps) {
  const [accessCode, setAccessCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (!isOpen) return null;
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Converter para maiúsculas e limitar a 6 caracteres
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
    setAccessCode(value);
    setError(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessCode) {
      setError('Digite um código de acesso');
      return;
    }
    
    if (accessCode.length !== 6) {
      setError('O código deve ter 6 caracteres');
      return;
    }
    
    setIsJoining(true);
    setError(null);
    
    try {
      const result = await StudyGroupService.joinGroupByCode(accessCode);
      
      if (result.success && result.groupId) {
        onJoin(result.groupId);
        onClose();
      } else {
        setError(result.message || 'Erro ao entrar no grupo');
      }
    } catch (err) {
      setError('Ocorreu um erro ao processar sua solicitação');
      console.error('Erro ao entrar no grupo:', err);
    } finally {
      setIsJoining(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 flex justify-between items-center">
          <h2 className="text-white font-bold flex items-center">
            <Share2 className="h-5 w-5 mr-2" />
            Entrar com Código
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-green-500/20 text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-5">
          <p className="text-gray-600 mb-4">
            Digite o código de 6 caracteres do grupo para entrar. 
            Uma vez que você entrar, poderá acessar o grupo a qualquer momento.
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label 
                htmlFor="accessCode"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Código de Acesso
              </label>
              <Input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={handleInputChange}
                placeholder="ABCD12"
                className="w-full rounded-lg border-gray-300 text-lg text-center tracking-widest font-mono uppercase h-12"
                maxLength={6}
                autoFocus
              />
              
              {error && (
                <div className="mt-3 flex items-center text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  <span>{error}</span>
                </div>
              )}
            </div>
            
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
                disabled={isJoining || accessCode.length !== 6}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar no Grupo'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
