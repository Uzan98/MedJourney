"use client";

import React, { useState } from 'react';
import AppLayout from '../../../components/layout/AppLayout';
import { Database, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from '../../../components/ui/Toast';

export default function AdminDatabasePage() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [apiKey, setApiKey] = useState('');

  const executarAtualizacao = async (acao: string) => {
    if (!apiKey) {
      toast.error('Por favor, insira a chave de API');
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const response = await fetch('/api/sql/update-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ action: acao })
      });

      const data = await response.json();
      setResultado(data);

      if (data.success) {
        toast.success(data.message || 'Operação realizada com sucesso');
      } else {
        toast.error(data.error || 'Erro ao executar a operação');
      }
    } catch (error) {
      console.error('Erro ao executar atualização:', error);
      setResultado({
        success: false,
        error: 'Erro ao comunicar com o servidor'
      });
      toast.error('Erro ao comunicar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Database className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-800">Administração do Banco de Dados</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Atualização de Esquema</h2>
          
          <div className="mb-4">
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Chave de API:
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Insira a chave de API"
            />
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Adicionar coluna MetaData</h3>
              <p className="text-sm text-gray-600 mb-3">
                Adiciona a coluna MetaData à tabela StudyPlans para armazenar dados detalhados dos planos de estudo.
              </p>
              <button
                onClick={() => executarAtualizacao('add-metadata-column')}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>{loading ? 'Executando...' : 'Executar'}</span>
              </button>
            </div>
          </div>
        </div>

        {resultado && (
          <div className={`
            bg-white rounded-xl border border-gray-200 shadow-sm p-6
            ${resultado.success ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}
          `}>
            <div className="flex items-start">
              {resultado.success ? (
                <Check className="w-6 h-6 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
              )}
              <div>
                <h3 className={`font-medium ${resultado.success ? 'text-green-800' : 'text-red-800'}`}>
                  {resultado.success ? 'Operação concluída' : 'Erro'}
                </h3>
                <p className="text-sm mt-1">
                  {resultado.success ? resultado.message : resultado.error}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
} 