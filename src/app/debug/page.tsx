"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function DebugPage() {
  const { user, session, isAuthenticated, isLoading, refreshSession } = useAuth();
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Função para buscar dados da API de debug
  const fetchDebugData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth-debug');
      const data = await response.json();
      setApiData(data);
    } catch (error) {
      console.error('Erro ao buscar dados de debug:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Carregar os dados quando a página carregar
  useEffect(() => {
    fetchDebugData();
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Diagnóstico de Autenticação</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Estado do Context Auth</h2>
          <div className="bg-gray-50 p-4 rounded-md border">
            <p><strong>Autenticado:</strong> {isAuthenticated ? 'Sim' : 'Não'}</p>
            <p><strong>Carregando:</strong> {isLoading ? 'Sim' : 'Não'}</p>
            <p><strong>Usuário ID:</strong> {user?.id || 'Não disponível'}</p>
            <p><strong>Email:</strong> {user?.email || 'Não disponível'}</p>
            <p><strong>Sessão:</strong> {session ? 'Existe' : 'Não existe'}</p>
          </div>
          
          <div className="mt-3">
            <button
              onClick={refreshSession}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-3"
            >
              Atualizar Sessão
            </button>
            <button
              onClick={fetchDebugData}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Atualizar Dados da API
            </button>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Resposta da API de Debug</h2>
          <div className="bg-gray-50 p-4 rounded-md border overflow-auto max-h-96">
            {loading ? (
              <p>Carregando dados...</p>
            ) : apiData ? (
              <pre className="text-sm">{JSON.stringify(apiData, null, 2)}</pre>
            ) : (
              <p>Nenhum dado disponível</p>
            )}
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Links Úteis</h2>
          <ul className="space-y-2 list-disc pl-5">
            <li>
              <Link href="/" className="text-blue-600 hover:underline">
                Página Inicial
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="text-blue-600 hover:underline">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Página de Login
              </Link>
            </li>
            <li>
              <a href="/api/auth-debug" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                API de Debug (JSON)
              </a>
            </li>
          </ul>
        </div>
        
        <div className="mt-6 pt-6 border-t">
          <p className="text-gray-500 text-sm">
            Esta página é apenas para diagnóstico. Use-a para verificar se a autenticação está funcionando corretamente.
          </p>
        </div>
      </div>
    </div>
  );
} 