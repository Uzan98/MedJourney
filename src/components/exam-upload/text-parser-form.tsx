'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { TextParserService, type TextParserResult } from '@/services/text-parser.service';

interface FormData {
  title: string;
  institution: string;
  year: string;
  subject: string;
  difficulty: string;
  examType: string;
  textContent: string;
  answerKey: string;
}

export function TextParserForm() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TextParserResult | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    institution: '',
    year: '',
    subject: '',
    difficulty: 'medium',
    examType: 'residencia',
    textContent: '',
    answerKey: ''
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const processText = async () => {
    if (!formData.textContent.trim()) {
      alert('Por favor, cole o texto da prova');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      console.log('🚀 Iniciando processamento do texto...');
      
      // Usar o novo serviço de parser de texto
      const parserResult = TextParserService.parseText(formData.textContent);
      
      console.log('📊 Resultado do parser:', parserResult);
      
      // Se há gabarito, processar e aplicar às questões
      if (parserResult.success && parserResult.exam && formData.answerKey.trim()) {
        console.log('🔑 Processando gabarito...');
        const answerKey = TextParserService.extractAnswerKey(formData.answerKey);
        
        if (answerKey.size > 0) {
          const questionsWithAnswers = TextParserService.applyAnswerKey(
            parserResult.exam.questions,
            answerKey
          );
          
          parserResult.exam.questions = questionsWithAnswers;
          console.log(`✅ Gabarito aplicado a ${answerKey.size} questões`);
        }
      }
      
      setResult(parserResult);

      if (parserResult.success && parserResult.exam) {
        // Preencher dados automaticamente se não foram fornecidos
        const updatedFormData = {
          ...formData,
          title: formData.title || parserResult.exam.title,
          institution: formData.institution || parserResult.exam.institution || '',
          year: formData.year || (parserResult.exam.year ? parserResult.exam.year.toString() : '')
        };
        setFormData(updatedFormData);
      }
    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      setResult({
        success: false,
        error: 'Erro interno no processamento do texto'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!result?.success || !result.exam) {
      alert('Processe o texto primeiro');
      return;
    }

    try {
      const examData = {
        ...result.exam,
        title: formData.title,
        institution: formData.institution,
        year: formData.year ? parseInt(formData.year) : undefined,
        subject: formData.subject,
        difficulty: formData.difficulty,
        examType: formData.examType
      };

      // Salvar no localStorage temporariamente
      localStorage.setItem('pendingExam', JSON.stringify(examData));
      
      // Redirecionar para página de revisão
      router.push('/simulados/provas-integra/review');
    } catch (error) {
      console.error('Erro ao salvar prova:', error);
      alert('Erro ao salvar a prova');
    }
  };

  return (
    <div className="space-y-6">
      {/* Área de Texto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cole o Texto da Prova
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Cole aqui o texto completo da prova...\n\nExemplo:\nExame Nacional de Revalidação de Diplomas Médicos de 2025.1\n\n1) Homem de 62 anos vai a uma unidade de pronto atendimento...\nA) Primeira alternativa\nB) Segunda alternativa\nC) Terceira alternativa\nD) Quarta alternativa\n\n2) Próxima questão..."
            value={formData.textContent}
            onChange={(e) => handleInputChange('textContent', e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {formData.textContent.length} caracteres
            </span>
            <Button 
              onClick={processText}
              disabled={isProcessing || !formData.textContent.trim()}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Processar Texto'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Área de Gabarito */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Gabarito (Opcional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Cole aqui o gabarito da prova (opcional)...\n\nExemplo:\n1) B - 2) A - 3) A - 4) B - 5) D - 6) C - 7) B - 8) A - 9) C - 10) B - 11) A - 12) A - 13) D - 14) A - 15) B - 16) B - 17) D - 18) D - 19) B - 20) C"
            value={formData.answerKey}
            onChange={(e) => handleInputChange('answerKey', e.target.value)}
            className="min-h-[120px] font-mono text-sm"
          />
          <div className="mt-2 text-sm text-gray-500">
            💡 O gabarito será aplicado automaticamente às questões processadas
          </div>
        </CardContent>
      </Card>

      {/* Resultado do Processamento */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Resultado do Processamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success && result.exam ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    ✅ Processamento concluído com sucesso! 
                    Encontradas <strong>{result.exam.questions.length}</strong> questões.
                  </AlertDescription>
                </Alert>
                
                {result.warnings && result.warnings.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Avisos:</strong>
                      <ul className="mt-2 list-disc list-inside">
                        {result.warnings.map((warning, index) => (
                          <li key={index} className="text-sm">{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Questões encontradas:</strong> {result.exam.questions.length}
                  </div>
                  <div>
                    <strong>Título detectado:</strong> {result.exam.title}
                  </div>
                  {result.exam.institution && (
                    <div>
                      <strong>Instituição:</strong> {result.exam.institution}
                    </div>
                  )}
                  {result.exam.year && (
                    <div>
                      <strong>Ano:</strong> {result.exam.year}
                    </div>
                  )}
                  <div>
                    <strong>Questões com gabarito:</strong> {result.exam.questions.filter(q => q.correctAnswer).length}
                  </div>
                  {formData.answerKey.trim() && (
                    <div className="text-green-600">
                      <strong>✅ Gabarito aplicado</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ❌ Erro no processamento: {result.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dados da Prova */}
      {result?.success && (
        <Card>
          <CardHeader>
            <CardTitle>Dados da Prova</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título da Prova *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Ex: Revalida 2025.1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="institution">Instituição</Label>
                <Input
                  id="institution"
                  value={formData.institution}
                  onChange={(e) => handleInputChange('institution', e.target.value)}
                  placeholder="Ex: INEP"
                />
              </div>
              
              <div>
                <Label htmlFor="year">Ano</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  placeholder="Ex: 2025"
                />
              </div>
              
              <div>
                <Label htmlFor="subject">Matéria/Área</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Ex: Medicina, Clínica Médica"
                />
              </div>
              
              <div>
                <Label htmlFor="examType">Tipo de Prova</Label>
                <select
                  id="examType"
                  value={formData.examType}
                  onChange={(e) => handleInputChange('examType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="residencia">Residência Médica</option>
                  <option value="concurso">Concurso Público</option>
                  <option value="vestibular">Vestibular</option>
                  <option value="enem">ENEM</option>
                  <option value="certificacao">Certificação</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="difficulty">Dificuldade</Label>
                <select
                  id="difficulty"
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="easy">Fácil</option>
                  <option value="medium">Médio</option>
                  <option value="hard">Difícil</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={handleSubmit}
                disabled={!result?.success || !formData.title.trim()}
                className="flex items-center gap-2"
              >
                Continuar para Revisão
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}