"use client";

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

// Exportar uma configuração de geração estática para evitar pré-renderização durante o build
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const addMetadataColumnSql = `
-- Script para adicionar a coluna metadata à tabela smart_plan_sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'smart_plan_sessions' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE smart_plan_sessions ADD COLUMN metadata JSONB;
        RAISE NOTICE 'Coluna metadata adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna metadata já existe';
    END IF;
END$$;

-- Comentário para documentar a alteração
COMMENT ON COLUMN smart_plan_sessions.metadata IS 'Campo para armazenar metadados adicionais da sessão, como intervalo de revisão, dificuldade e importância';
`;

export default function UpdateSchemaPage() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const updateSchema = async () => {
    try {
      setIsUpdating(true);
      setResult(null);

      // Executar o script usando a função SQL execute (se disponível)
      const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: addMetadataColumnSql
      }).single();

      if (error) {
        console.error('Erro ao executar SQL:', error);
        // Tentar via método alternativo através de função definida na aplicação
        await supabase.functions.invoke('execute-sql', {
          body: { sql: addMetadataColumnSql }
        });
        
        setResult('Script executado. Verifique os logs para confirmar o sucesso.');
        toast.success('Script SQL executado com sucesso!');
      } else {
        setResult(JSON.stringify(data, null, 2));
        toast.success('Esquema atualizado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao atualizar esquema:', error);
      setResult(`Erro: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('Erro ao atualizar o esquema do banco de dados');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-4">Atualizar Esquema do Banco de Dados</h1>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Adicionar coluna metadata à tabela smart_plan_sessions</h2>
        <p className="mb-4 text-gray-700">
          Este script irá adicionar a coluna <code className="bg-gray-100 px-1 py-0.5 rounded">metadata</code> do tipo 
          <code className="bg-gray-100 px-1 py-0.5 rounded mx-1">JSONB</code>
          à tabela <code className="bg-gray-100 px-1 py-0.5 rounded">smart_plan_sessions</code>. 
          Esta coluna é necessária para armazenar metadados adicionais como intervalo de revisão, dificuldade e importância.
        </p>
        
        <div className="bg-gray-800 text-white p-4 rounded-lg mb-4 overflow-auto max-h-60">
          <pre className="text-sm">{addMetadataColumnSql}</pre>
        </div>
        
        <Button 
          onClick={updateSchema}
          disabled={isUpdating}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isUpdating ? 'Atualizando...' : 'Executar Atualização'}
        </Button>
        
        {result && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Resultado:</h3>
            <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-60">
              <pre className="text-sm">{result}</pre>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Nota:</strong> Execute esta atualização apenas uma vez. 
              Se você já executou o script anteriormente, ele verificará se a coluna já existe antes de tentar adicioná-la novamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
