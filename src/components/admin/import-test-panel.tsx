'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { testFunctions } from '@/utils/test-import-system';
import { importQuestionsFromCompleteExam } from '@/utils/import-questions-from-exam';
import { supabase } from '@/lib/supabase';
import { Play, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

interface CompleteExam {
  id: number;
  title: string;
  total_questions: number;
}

export default function ImportTestPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [availableExams, setAvailableExams] = useState<CompleteExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  // Carregar provas disponíveis
  const loadAvailableExams = async () => {
    try {
      const { data, error } = await supabase
        .from('complete_exams')
        .select('id, title, total_questions')
        .eq('is_public', true)
        .limit(10);

      if (error) {
        console.error('Erro ao carregar provas:', error);
        return;
      }

      setAvailableExams(data || []);
    } catch (error) {
      console.error('Erro ao carregar provas:', error);
    }
  };

  // Executar todos os testes
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      const results = await testFunctions.runAllTests();
      setTestResults(results);
    } catch (error) {
      console.error('Erro ao executar testes:', error);
      setTestResults([{
        success: false,
        message: `Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  // Testar importação de prova específica
  const testExamImport = async (examId: number) => {
    setIsRunning(true);
    setImportResult(null);
    
    try {
      const result = await importQuestionsFromCompleteExam({
        examId,
        skipLimitCheck: true
      });
      
      setImportResult(result);
    } catch (error) {
      console.error('Erro na importação:', error);
      setImportResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: 1,
        errorMessages: [error instanceof Error ? error.message : 'Erro desconhecido']
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Renderizar ícone de status
  const renderStatusIcon = (success: boolean) => {
    if (success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  React.useEffect(() => {
    loadAvailableExams();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Painel de Testes - Sistema de Importação
          </CardTitle>
          <CardDescription>
            Teste o sistema de importação de questões com prevenção de duplicações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Executar Todos os Testes
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-3">
              <Separator />
              <h3 className="font-semibold">Resultados dos Testes</h3>
              
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {renderStatusIcon(result.success)}
                  <div className="flex-1">
                    <p className="font-medium">{result.message}</p>
                    {result.details && (
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex gap-2 mt-4">
                {testResults.every(r => r.success) ? (
                  <Badge variant="default" className="bg-green-500">
                    ✅ Todos os testes passaram
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    ❌ Alguns testes falharam
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teste de Importação de Prova Específica</CardTitle>
          <CardDescription>
            Teste a importação de questões de uma prova completa específica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableExams.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium">Provas Disponíveis:</h4>
              {availableExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{exam.title}</p>
                    <p className="text-sm text-gray-600">{exam.total_questions} questões</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => testExamImport(exam.id)}
                    disabled={isRunning}
                  >
                    {isRunning && selectedExam === exam.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Testar Importação'
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Nenhuma prova pública disponível para teste</p>
          )}

          {importResult && (
            <div className="space-y-3">
              <Separator />
              <h4 className="font-medium">Resultado da Importação</h4>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  {renderStatusIcon(importResult.success)}
                  <span className="font-medium">
                    {importResult.success ? 'Importação Concluída' : 'Importação com Erros'}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-green-600">Importadas</p>
                    <p className="text-2xl font-bold">{importResult.imported}</p>
                  </div>
                  <div>
                    <p className="font-medium text-yellow-600">Puladas</p>
                    <p className="text-2xl font-bold">{importResult.skipped}</p>
                  </div>
                  <div>
                    <p className="font-medium text-red-600">Erros</p>
                    <p className="text-2xl font-bold">{importResult.errors}</p>
                  </div>
                </div>

                {importResult.errorMessages && importResult.errorMessages.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium text-red-600 mb-2">Mensagens de Erro:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {importResult.errorMessages.map((msg: string, index: number) => (
                        <li key={index} className="text-red-600">{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}