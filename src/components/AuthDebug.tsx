'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * Componente para debug de autenticação
 */
export default function AuthDebug() {
  const { user, session, refreshSession } = useAuth();
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authSessionData, setAuthSessionData] = useState<any>(null);
  const [authSessionLoading, setAuthSessionLoading] = useState(false);

  const checkSupabaseSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        setError(error.message);
      } else {
        setSessionData(data);
      }
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const testCreateDiscipline = async () => {
    try {
      setApiLoading(true);
      setError(null);
      
      const response = await fetch('/api/disciplines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Teste ${new Date().toISOString().substring(0, 19)}`,
          description: 'Disciplina de teste para verificar autenticação',
        }),
      });
      
      const data = await response.json();
      
      setApiResult({
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      });
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
    } finally {
      setApiLoading(false);
    }
  };

  const testAuthSession = async () => {
    try {
      setAuthSessionLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth-session');
      const data = await response.json();
      
      setAuthSessionData(data);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
    } finally {
      setAuthSessionLoading(false);
    }
  };

  // Verificar sessão ao montar o componente
  useEffect(() => {
    checkSupabaseSession();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 overflow-hidden">
      <h2 className="text-xl font-bold mb-4">Diagnóstico de Autenticação</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Usuário Atual</h3>
          <div className="bg-gray-50 p-4 rounded-lg border overflow-auto max-h-64">
            <pre className="whitespace-pre-wrap">
              {user ? JSON.stringify(user, null, 2) : 'Não autenticado'}
            </pre>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Sessão Context Auth</h3>
          <div className="bg-gray-50 p-4 rounded-lg border overflow-auto max-h-64">
            <pre className="whitespace-pre-wrap">
              {session ? JSON.stringify(session, null, 2) : 'Sem sessão'}
            </pre>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Sessão Supabase Direto</h3>
          <div className="bg-gray-50 p-4 rounded-lg border overflow-auto max-h-64">
            {loading ? (
              <div className="text-center">Carregando...</div>
            ) : (
              <pre className="whitespace-pre-wrap">
                {sessionData ? JSON.stringify(sessionData, null, 2) : 'Sem dados'}
              </pre>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Endpoint Auth Session</h3>
          <div className="bg-gray-50 p-4 rounded-lg border overflow-auto max-h-64">
            {authSessionLoading ? (
              <div className="text-center">Carregando...</div>
            ) : (
              <pre className="whitespace-pre-wrap">
                {authSessionData ? JSON.stringify(authSessionData, null, 2) : 'Sem dados'}
              </pre>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Teste API</h3>
          <div className="bg-gray-50 p-4 rounded-lg border overflow-auto max-h-64">
            {apiLoading ? (
              <div className="text-center">Carregando...</div>
            ) : (
              <pre className="whitespace-pre-wrap">
                {apiResult ? JSON.stringify(apiResult, null, 2) : 'Sem dados'}
              </pre>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3">
        <button
          onClick={refreshSession}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          disabled={loading}
        >
          Atualizar Sessão Context
        </button>
        
        <button
          onClick={checkSupabaseSession}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
          disabled={loading}
        >
          Verificar Sessão Supabase
        </button>
        
        <button
          onClick={testAuthSession}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md"
          disabled={authSessionLoading}
        >
          Testar Auth Session
        </button>
        
        <button
          onClick={testCreateDiscipline}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md"
          disabled={apiLoading}
        >
          Testar API
        </button>
      </div>
    </div>
  );
} 