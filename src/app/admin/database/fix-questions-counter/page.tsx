"use client";

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase';
import { Database, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function FixQuestionsCounterPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // SQL para verificar o gatilho de contagem de questões
  const checkQuestionsCounterSQL = `
-- Verificar se o gatilho de contagem de questões existe
SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trigger_questions_per_day_limit'
) AS trigger_exists;

-- Verificar as colunas da tabela questions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'questions'
ORDER BY ordinal_position;
`;

  // Verificar o contador de questões
  const checkQuestionsCounter = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Executar o SQL para verificar o contador
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: checkQuestionsCounterSQL
      });
      
      if (error) {
        throw error;
      }
      
      setResult({
        success: true,
        message: 'Verificação concluída com sucesso!',
        data: data
      });
      
      toast.success('Verificação concluída com sucesso!');
    } catch (error) {
      console.error('Erro ao verificar contador de questões:', error);
      setResult({
        success: false,
        message: `Erro ao verificar contador: ${(error as any).message || 'Erro desconhecido'}`
      });
      toast.error('Erro ao verificar contador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Database className="h-8 w-8 text-blue-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Contador de Questões</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Problema com o Contador de Questões</h2>
        
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                <strong>Problema identificado:</strong> Quando um usuário adiciona uma questão do Genoma Bank ao seu banco pessoal, 
                o contador de questões diárias está sendo incrementado duas vezes.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Causa do Problema:</h3>
          <p className="text-gray-600 mb-4">
            O problema ocorre porque existem dois mecanismos que incrementam o contador de questões diárias:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-600">
            <li>
              <strong>Gatilho no Banco de Dados:</strong> Existe um gatilho chamado <code className="bg-gray-100 px-1 py-0.5 rounded">trigger_questions_per_day_limit</code> 
              na tabela <code className="bg-gray-100 px-1 py-0.5 rounded">questions</code> que é acionado automaticamente quando uma nova questão é inserida.
            </li>
            <li>
              <strong>Método no Código:</strong> O método <code className="bg-gray-100 px-1 py-0.5 rounded">addQuestion</code> no serviço 
              <code className="bg-gray-100 px-1 py-0.5 rounded">QuestionsBankService</code> também chama 
              <code className="bg-gray-100 px-1 py-0.5 rounded">incrementQuestionsUsedCounter</code>.
            </li>
          </ol>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Solução Implementada:</h3>
          <p className="text-gray-600 mb-4">
            A solução foi modificar o código para evitar a duplicação na contagem:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-600">
            <li>
              Adicionamos um parâmetro <code className="bg-gray-100 px-1 py-0.5 rounded">skipCounter</code> ao método 
              <code className="bg-gray-100 px-1 py-0.5 rounded">addQuestion</code> que permite pular a chamada ao 
              <code className="bg-gray-100 px-1 py-0.5 rounded">incrementQuestionsUsedCounter</code>.
            </li>
            <li>
              Modificamos o método <code className="bg-gray-100 px-1 py-0.5 rounded">clonePublicQuestion</code> para usar 
              <code className="bg-gray-100 px-1 py-0.5 rounded">addQuestion</code> com <code className="bg-gray-100 px-1 py-0.5 rounded">skipCounter=true</code>.
            </li>
            <li>
              Desta forma, quando uma questão é clonada do Genoma Bank, apenas o gatilho do banco de dados incrementa o contador, 
              evitando a duplicação.
            </li>
          </ol>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={checkQuestionsCounter}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Verificar Configuração
              </>
            )}
          </button>
        </div>
      </div>
      
      {result && (
        <div className={`bg-white rounded-xl shadow-md p-6 mb-6 border-l-4 ${
          result.success ? 'border-green-500' : 'border-red-500'
        }`}>
          <div className="flex items-start">
            {result.success ? (
              <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" />
            )}
            <div>
              <h3 className={`text-lg font-medium ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.success ? 'Sucesso!' : 'Erro'}
              </h3>
              <p className="text-gray-600 mt-1">{result.message}</p>
              
              {result.data && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Resultado da Verificação:</h4>
                  <pre className="bg-gray-50 p-3 rounded-md text-xs overflow-auto max-h-80">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 