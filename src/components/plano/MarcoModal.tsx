"use client";

import React, { useState, useEffect } from 'react';
import { X, Flag } from 'lucide-react';
import { toast } from '@/components/ui/toast';

// Definir interface para o tipo Marco
export interface Marco {
  id: string;
  titulo: string;
  tipo: 'prova' | 'trabalho' | 'simulado' | 'concluido';
  data: string;
  diasRestantes: number | 'Concluído';
  progresso: number;
}

interface MarcoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (marco: Marco) => void;
}

const MarcoModal: React.FC<MarcoModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<'prova' | 'trabalho' | 'simulado'>('prova');
  const [data, setData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetar formulário ao fechar
  useEffect(() => {
    if (!isOpen) {
      setTitulo('');
      setTipo('prova');
      setData('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar campos obrigatórios
      if (!titulo || !data) {
        throw new Error('Título e data são obrigatórios');
      }

      // Validar data (deve ser futura)
      const dataMarco = new Date(data);
      if (isNaN(dataMarco.getTime())) {
        throw new Error('Data inválida');
      }
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      if (dataMarco < hoje) {
        throw new Error('A data deve ser igual ou posterior à data atual');
      }

      // Calcular dias restantes
      const diffTime = Math.abs(dataMarco.getTime() - hoje.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Criar novo marco
      const novoMarco: Marco = {
        id: `marco-${Date.now()}`, // ID temporário
        titulo,
        tipo,
        data: dataMarco.toLocaleDateString('pt-BR'),
        diasRestantes: diffDays,
        progresso: 0 // Começa com 0% de progresso
      };

      // Em uma implementação real, você faria uma chamada API aqui
      // await addMarco(novoMarco);

      // Simular atraso de API
      setTimeout(() => {
        // Notificar o componente pai
        onSuccess(novoMarco);
        setLoading(false);
        
        // Mostrar toast de confirmação
        toast.success(`Marco "${titulo}" adicionado com sucesso!`);
      }, 500);

    } catch (err) {
      console.error('Erro ao adicionar marco:', err);
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado');
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
              Adicionar Novo Marco
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
              {/* Título do Marco */}
              <div>
                <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
                  Título do Marco *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Flag className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Prova de Anatomia"
                    required
                  />
                </div>
              </div>

              {/* Tipo de Marco */}
              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Marco *
                </label>
                <select
                  id="tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as 'prova' | 'trabalho' | 'simulado')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="prova">Prova</option>
                  <option value="trabalho">Trabalho</option>
                  <option value="simulado">Simulado</option>
                </select>
              </div>

              {/* Data do Marco */}
              <div>
                <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-1">
                  Data do Marco *
                </label>
                <input
                  type="date"
                  id="data"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
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
                  {loading ? 'Salvando...' : 'Adicionar Marco'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MarcoModal; 
