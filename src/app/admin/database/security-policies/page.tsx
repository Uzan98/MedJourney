"use client";

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase';
import { Shield, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function SecurityPoliciesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [showPolicies, setShowPolicies] = useState(false);
  
  // SQL para configurar as políticas de segurança
  const securityPoliciesSQL = `
-- Habilitar RLS para a tabela questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Política para permitir que todos os usuários leiam questões públicas
CREATE POLICY IF NOT EXISTS "Questões públicas são visíveis para todos" ON questions
FOR SELECT USING (is_public = true);

-- Política para permitir que os usuários leiam suas próprias questões
CREATE POLICY IF NOT EXISTS "Usuários podem ler suas próprias questões" ON questions
FOR SELECT USING (auth.uid() = user_id);

-- Política para permitir que apenas os proprietários insiram novas questões
CREATE POLICY IF NOT EXISTS "Usuários só podem inserir suas próprias questões" ON questions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para permitir que apenas os proprietários atualizem suas questões
CREATE POLICY IF NOT EXISTS "Usuários só podem atualizar suas próprias questões" ON questions
FOR UPDATE USING (auth.uid() = user_id);

-- Política para permitir que apenas os proprietários excluam suas questões
CREATE POLICY IF NOT EXISTS "Usuários só podem excluir suas próprias questões" ON questions
FOR DELETE USING (auth.uid() = user_id);

-- Habilitar RLS para a tabela answer_options
ALTER TABLE answer_options ENABLE ROW LEVEL SECURITY;

-- Política para permitir que todos os usuários leiam opções de respostas para questões públicas
CREATE POLICY IF NOT EXISTS "Opções de resposta para questões públicas são visíveis para todos" ON answer_options
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM questions
    WHERE questions.id = answer_options.question_id
    AND questions.is_public = true
  )
);

-- Política para permitir que os usuários leiam opções de resposta das suas próprias questões
CREATE POLICY IF NOT EXISTS "Usuários podem ler opções de resposta das suas próprias questões" ON answer_options
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  )
);

-- Política para permitir que apenas os proprietários insiram novas opções de resposta
CREATE POLICY IF NOT EXISTS "Usuários só podem inserir opções para suas próprias questões" ON answer_options
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  )
);

-- Política para permitir que apenas os proprietários atualizem opções de resposta
CREATE POLICY IF NOT EXISTS "Usuários só podem atualizar opções das suas próprias questões" ON answer_options
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  )
);

-- Política para permitir que apenas os proprietários excluam opções de resposta
CREATE POLICY IF NOT EXISTS "Usuários só podem excluir opções das suas próprias questões" ON answer_options
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM questions
    WHERE questions.id = answer_options.question_id
    AND questions.user_id = auth.uid()
  )
);
`;

  // Aplicar as políticas de segurança
  const applySecurityPolicies = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Executar o SQL para configurar as políticas
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: securityPoliciesSQL
      });
      
      if (error) {
        throw error;
      }
      
      setResult({
        success: true,
        message: 'Políticas de segurança aplicadas com sucesso!'
      });
      
      toast.success('Políticas de segurança aplicadas com sucesso!');
      
      // Atualizar a lista de políticas
      await fetchPolicies();
    } catch (error) {
      console.error('Erro ao aplicar políticas de segurança:', error);
      setResult({
        success: false,
        message: `Erro ao aplicar políticas de segurança: ${(error as any).message || 'Erro desconhecido'}`
      });
      toast.error('Erro ao aplicar políticas de segurança');
    } finally {
      setLoading(false);
    }
  };
  
  // Buscar políticas existentes
  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Consultar políticas existentes
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
          FROM pg_policies
          WHERE tablename IN ('questions', 'answer_options')
          ORDER BY tablename, policyname;
        `
      });
      
      if (error) {
        throw error;
      }
      
      setPolicies(data || []);
      setShowPolicies(true);
    } catch (error) {
      console.error('Erro ao buscar políticas:', error);
      toast.error('Erro ao buscar políticas de segurança');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Shield className="h-8 w-8 text-blue-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-800">Políticas de Segurança</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Configurar Políticas de Segurança</h2>
        
        <p className="mb-4 text-gray-600">
          Esta página permite configurar políticas de segurança Row Level Security (RLS) no banco de dados.
          Isso garante que os usuários só possam acessar e modificar seus próprios dados, mesmo se houver
          tentativas de contornar as verificações de segurança do frontend.
        </p>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Políticas que serão aplicadas:</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-600">
            <li>Apenas o proprietário pode editar suas próprias questões</li>
            <li>Apenas o proprietário pode excluir suas próprias questões</li>
            <li>Apenas o proprietário pode alterar o status público/privado de suas questões</li>
            <li>Todos os usuários podem visualizar questões públicas</li>
            <li>Apenas o proprietário pode visualizar suas questões privadas</li>
          </ul>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={applySecurityPolicies}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Aplicar Políticas de Segurança
              </>
            )}
          </button>
          
          <button
            onClick={fetchPolicies}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Verificar Políticas Existentes
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
            </div>
          </div>
        </div>
      )}
      
      {showPolicies && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Políticas Existentes</h2>
          
          {policies.length === 0 ? (
            <p className="text-gray-600">Nenhuma política encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tabela</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Política</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comando</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usando (USING)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Com verificação (WITH CHECK)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {policies.map((policy, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{policy.tablename}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{policy.policyname}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{policy.cmd}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{policy.qual || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{policy.with_check || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 