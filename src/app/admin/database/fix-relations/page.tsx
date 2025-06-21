'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function FixRelationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runFixScript = async () => {
    if (!user) {
      setError('Você precisa estar autenticado para executar esta operação');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // Script SQL para corrigir as relações entre tabelas
      const script = `
      -- Verificar se a relação entre questions e disciplines existe
      DO $$
      BEGIN
          -- Verificar se a chave estrangeira já existe
          IF NOT EXISTS (
              SELECT 1
              FROM information_schema.table_constraints tc
              JOIN information_schema.constraint_column_usage ccu 
                  ON tc.constraint_name = ccu.constraint_name
              WHERE tc.constraint_type = 'FOREIGN KEY' 
                  AND tc.table_name = 'questions'
                  AND ccu.table_name = 'disciplines'
                  AND ccu.column_name = 'id'
          ) THEN
              -- Se não existir, verificar se a coluna discipline_id existe na tabela questions
              IF EXISTS (
                  SELECT 1
                  FROM information_schema.columns
                  WHERE table_name = 'questions'
                  AND column_name = 'discipline_id'
              ) THEN
                  -- Adicionar a chave estrangeira
                  ALTER TABLE public.questions
                  ADD CONSTRAINT fk_questions_discipline
                  FOREIGN KEY (discipline_id)
                  REFERENCES public.disciplines(id)
                  ON DELETE SET NULL;
                  
                  RAISE NOTICE 'Chave estrangeira adicionada entre questions.discipline_id e disciplines.id';
              ELSE
                  RAISE NOTICE 'Coluna discipline_id não existe na tabela questions';
              END IF;
          ELSE
              RAISE NOTICE 'Chave estrangeira entre questions e disciplines já existe';
          END IF;
      END
      $$;

      -- Adicionar explicitamente as relações RLS para permitir junções
      DO $$
      BEGIN
          -- Verificar se a constraint existe antes de adicionar o comentário
          IF EXISTS (
              SELECT 1
              FROM information_schema.table_constraints
              WHERE constraint_name = 'fk_questions_discipline'
              AND table_name = 'questions'
          ) THEN
              EXECUTE 'COMMENT ON CONSTRAINT fk_questions_discipline ON public.questions IS 
              ''@foreignKey (discipline_id) references public.disciplines (id)''';
              
              RAISE NOTICE 'Comentário adicionado à constraint fk_questions_discipline';
          END IF;
      END
      $$;

      -- Verificar se as tabelas têm as políticas RLS adequadas
      DO $$
      BEGIN
          -- Verificar se RLS está habilitado para questions
          IF NOT EXISTS (
              SELECT 1
              FROM pg_tables
              WHERE tablename = 'questions'
              AND rowsecurity = true
          ) THEN
              ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
              RAISE NOTICE 'RLS habilitado para a tabela questions';
          END IF;
          
          -- Verificar se RLS está habilitado para disciplines
          IF NOT EXISTS (
              SELECT 1
              FROM pg_tables
              WHERE tablename = 'disciplines'
              AND rowsecurity = true
          ) THEN
              ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
              RAISE NOTICE 'RLS habilitado para a tabela disciplines';
          END IF;
      END
      $$;
      `;

      // Executar o script SQL
      const { data, error } = await supabase.rpc('exec_sql', { sql: script });

      if (error) {
        throw error;
      }

      // Verificar se as relações estão funcionando
      const { data: testData, error: testError } = await supabase
        .from('questions')
        .select(`
          id,
          content,
          disciplines (
            id,
            name
          )
        `)
        .limit(1);

      if (testError) {
        setResult('Script executado, mas ainda há problemas com as relações. Erro no teste: ' + testError.message);
      } else {
        setResult('Script executado com sucesso! Relações corrigidas.');
      }
    } catch (err: any) {
      setError('Erro ao executar script: ' + (err.message || 'Erro desconhecido'));
      console.error('Erro completo:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Corrigir Relações entre Tabelas</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <p className="mb-4">
          Esta ferramenta corrige as relações entre as tabelas <code>questions</code> e <code>disciplines</code> no banco de dados.
          Isso resolverá o problema de desempenho por disciplina nos simulados.
        </p>
        
        <button
          onClick={runFixScript}
          disabled={loading}
          className={`px-4 py-2 rounded-md ${
            loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          } text-white font-medium`}
        >
          {loading ? 'Executando...' : 'Executar Script de Correção'}
        </button>
      </div>
      
      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md mb-6">
          <p className="font-medium">Resultado:</p>
          <p>{result}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6">
          <p className="font-medium">Erro:</p>
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-gray-100 p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Informações Adicionais</h2>
        <p className="mb-2">
          Este script realiza as seguintes operações:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Verifica se existe a chave estrangeira entre <code>questions.discipline_id</code> e <code>disciplines.id</code></li>
          <li>Adiciona a chave estrangeira se ela não existir</li>
          <li>Adiciona comentários para o Supabase entender as relações</li>
          <li>Verifica se o Row Level Security (RLS) está habilitado para as tabelas</li>
        </ul>
        <p>
          Após executar este script, o desempenho por disciplina nos simulados deve funcionar corretamente.
        </p>
      </div>
    </div>
  );
} 