"use client";

import { useState } from 'react';
import { ArrowLeft, Database, RefreshCcw, Check, AlertTriangle, Code } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

// Exportar uma configuração de geração estática para evitar pré-renderização durante o build
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function SetupFunctionsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    success: boolean;
    message: string;
    details?: string;
  }[]>([]);

  const createSqlExecuteFunction = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      // Verificar se a função já existe
      const { data: functionExists, error: checkError } = await supabase
        .rpc('function_exists', { function_name: 'execute_sql' });
      
      if (checkError) {
        // A função de verificação pode não existir ainda
        console.log('Erro ao verificar função (pode ser esperado):', checkError);
      } else if (functionExists) {
        setResults(prev => [...prev, {
          success: true,
          message: 'A função execute_sql já existe!'
        }]);
        setLoading(false);
        return;
      }
      
      // SQL para criar a função que verifica se uma função existe
      const createFunctionExistsQuery = `
        CREATE OR REPLACE FUNCTION function_exists(function_name TEXT)
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = function_name
            AND n.nspname = 'public'
          );
        END;
        $$;
      `;
      
      // Executar como superusuário via cliente de serviço
      const { error: functionExistsError } = await supabase.rpc('admin_query', { 
        query: createFunctionExistsQuery 
      });
      
      if (functionExistsError) {
        setResults(prev => [...prev, {
          success: false,
          message: 'Erro ao criar função function_exists',
          details: functionExistsError.message
        }]);
      } else {
        setResults(prev => [...prev, {
          success: true,
          message: 'Função function_exists criada com sucesso!'
        }]);
      }
      
      // SQL para criar a função execute_sql
      const createExecuteSqlQuery = `
        CREATE OR REPLACE FUNCTION execute_sql(query TEXT)
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result JSONB;
        BEGIN
          EXECUTE query;
          result := '{"success": true}'::JSONB;
          RETURN result;
        EXCEPTION WHEN OTHERS THEN
          result := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
          );
          RETURN result;
        END;
        $$;
        
        -- Definir permissões de segurança para a função
        REVOKE ALL ON FUNCTION execute_sql(TEXT) FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO authenticated;
        GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO service_role;
      `;
      
      // Executar como superusuário via cliente de serviço
      const { error: executeSqlError } = await supabase.rpc('admin_query', { 
        query: createExecuteSqlQuery 
      });
      
      if (executeSqlError) {
        setResults(prev => [...prev, {
          success: false,
          message: 'Erro ao criar função execute_sql',
          details: executeSqlError.message
        }]);
        
        // Se a função admin_query não existir, mostrar instruções de como criá-la manualmente
        if (executeSqlError.message.includes('function admin_query() does not exist')) {
          setResults(prev => [...prev, {
            success: false,
            message: 'A função admin_query não existe. Execute o seguinte SQL no console SQL do Supabase:',
            details: `
CREATE OR REPLACE FUNCTION admin_query(query text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  EXECUTE query;
  result := '{"success": true}'::JSONB;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
  RETURN result;
END;
$$;

-- Definir permissões de segurança para a função
REVOKE ALL ON FUNCTION admin_query(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_query(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_query(TEXT) TO service_role;
`
          }]);
        }
      } else {
        setResults(prev => [...prev, {
          success: true,
          message: 'Função execute_sql criada com sucesso!'
        }]);
        toast.success('Configuração concluída com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao configurar funções:', error);
      setResults(prev => [...prev, {
        success: false,
        message: 'Erro não esperado ao configurar funções',
        details: error instanceof Error ? error.message : String(error)
      }]);
      toast.error('Erro ao configurar funções');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/admin/database"
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para Administração
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <Code className="h-6 w-6 text-blue-600 mr-2" />
          Configuração de Funções SQL
        </h1>
        
        <p className="text-gray-600 mb-4">
          Esta página irá criar ou atualizar funções SQL necessárias para o funcionamento dos módulos
          do aplicativo no banco de dados Supabase.
        </p>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Atenção:</strong> Esta operação deve ser executada por um administrador com acesso ao 
                banco de dados. Você precisará criar manualmente a função <code>admin_query</code> no console SQL 
                do Supabase se ela ainda não existir.
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={createSqlExecuteFunction}
          disabled={loading}
          className={`px-4 py-2 rounded-md flex items-center justify-center ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } transition-colors`}
        >
          {loading ? (
            <>
              <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
              Configurando...
            </>
          ) : (
            <>
              <Code className="h-4 w-4 mr-2" />
              Configurar Funções SQL
            </>
          )}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Resultados</h2>
          
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-md flex items-start ${
                  result.success ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'
                }`}
              >
                {result.success ? (
                  <Check className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                )}
                
                <div>
                  <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                    {result.message}
                  </p>
                  {result.details && (
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {result.details}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 